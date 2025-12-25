import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  tokenId: string;
  patientName: string;
  tokenNumber: string;
  type: "called" | "upcoming" | "reminder";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenId, patientName, tokenNumber, type }: NotificationRequest =
      await req.json();

    console.log(`Processing ${type} notification for token ${tokenNumber}`);

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get patient email from the queue token
    const { data: tokenData, error: tokenError } = await supabase
      .from("queue_tokens")
      .select(`
        *,
        patients (email, first_name, last_name, notification_email)
      `)
      .eq("id", tokenId)
      .single();

    if (tokenError || !tokenData) {
      console.error("Failed to fetch token data:", tokenError);
      return new Response(
        JSON.stringify({ error: "Token not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientEmail =
      tokenData.patients?.notification_email || tokenData.patients?.email;

    if (!patientEmail) {
      console.log("No email found for patient, skipping notification");
      return new Response(
        JSON.stringify({ message: "No email configured for patient" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, logging notification instead");
      console.log(`Would send ${type} notification to ${patientEmail} for token ${tokenNumber}`);
      
      return new Response(
        JSON.stringify({ 
          message: "Notification logged (email service not configured)",
          type,
          tokenNumber,
          patientEmail
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content based on notification type
    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "called":
        subject = `🏥 Your Turn! Token ${tokenNumber}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0ea5e9 100%); padding: 30px; border-radius: 12px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">It's Your Turn!</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #334155;">Hello ${patientName},</p>
              <p style="font-size: 16px; color: #475569;">Your token number <strong style="color: #0d9488;">${tokenNumber}</strong> has been called.</p>
              <div style="background: #0d9488; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;">Please proceed to</p>
                <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">Consultation Room</p>
              </div>
              <p style="font-size: 14px; color: #64748b;">Thank you for your patience.</p>
            </div>
          </div>
        `;
        break;

      case "upcoming":
        subject = `⏰ Get Ready - Token ${tokenNumber}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; border-radius: 12px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Your Turn is Coming!</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #334155;">Hello ${patientName},</p>
              <p style="font-size: 16px; color: #475569;">Your token <strong style="color: #f59e0b;">${tokenNumber}</strong> will be called soon.</p>
              <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; color: #92400e;">Please be ready near the consultation area</p>
              </div>
              <p style="font-size: 14px; color: #64748b;">Estimated wait: 5-10 minutes</p>
            </div>
          </div>
        `;
        break;

      case "reminder":
        subject = `📋 Queue Update - Token ${tokenNumber}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Queue Update</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #334155;">Hello ${patientName},</p>
              <p style="font-size: 16px; color: #475569;">This is a reminder about your queue token <strong>${tokenNumber}</strong>.</p>
              <p style="font-size: 14px; color: #64748b;">Please stay nearby for your turn.</p>
            </div>
          </div>
        `;
        break;
    }

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MediAI Hospital <notifications@resend.dev>",
        to: [patientEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-queue-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
