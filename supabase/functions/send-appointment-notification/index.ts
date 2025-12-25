import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: "confirmation" | "reminder" | "cancelled";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, doctorId, date, time, type }: NotificationRequest =
      await req.json();

    console.log(`Processing ${type} appointment notification`);

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("first_name, last_name, email, notification_email")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      console.error("Failed to fetch patient:", patientError);
      return new Response(
        JSON.stringify({ error: "Patient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get doctor info
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("name, specialty")
      .eq("id", doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error("Failed to fetch doctor:", doctorError);
      return new Response(
        JSON.stringify({ error: "Doctor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientEmail = patient.notification_email || patient.email;
    const patientName = `${patient.first_name} ${patient.last_name}`;

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
      console.log(`Would send ${type} notification to ${patientEmail}`);
      console.log(`Appointment: ${date} at ${time} with ${doctor.name}`);
      
      return new Response(
        JSON.stringify({ 
          message: "Notification logged (email service not configured)",
          type,
          patientEmail,
          date,
          time,
          doctor: doctor.name
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build email content based on notification type
    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "confirmation":
        subject = `✅ Appointment Confirmed - ${formattedDate}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0ea5e9 100%); padding: 30px; border-radius: 12px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Confirmed!</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #334155;">Hello ${patientName},</p>
              <p style="font-size: 16px; color: #475569;">Your appointment has been successfully scheduled.</p>
              
              <div style="background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Doctor</td>
                    <td style="padding: 10px 0; font-weight: bold; color: #0d9488;">${doctor.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Specialty</td>
                    <td style="padding: 10px 0; color: #334155;">${doctor.specialty}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Date</td>
                    <td style="padding: 10px 0; color: #334155;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">Time</td>
                    <td style="padding: 10px 0; font-weight: bold; color: #334155;">${time}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">Please arrive 15 minutes before your scheduled time.</p>
              <p style="font-size: 14px; color: #64748b;">If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
            </div>
          </div>
        `;
        break;

      case "reminder":
        subject = `⏰ Appointment Reminder - Tomorrow at ${time}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; border-radius: 12px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Reminder</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #334155;">Hello ${patientName},</p>
              <p style="font-size: 16px; color: #475569;">This is a reminder about your upcoming appointment.</p>
              
              <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #92400e;">Tomorrow</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #92400e;">${time}</p>
                <p style="margin: 10px 0 0; color: #92400e;">with ${doctor.name}</p>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">Please arrive 15 minutes before your scheduled time.</p>
            </div>
          </div>
        `;
        break;

      case "cancelled":
        subject = `❌ Appointment Cancelled - ${formattedDate}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #334155;">Hello ${patientName},</p>
              <p style="font-size: 16px; color: #475569;">Your appointment has been cancelled.</p>
              
              <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #dc2626;">
                  <strong>Cancelled:</strong> ${formattedDate} at ${time} with ${doctor.name}
                </p>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">If you'd like to reschedule, please book a new appointment through our system.</p>
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
    console.error("Error in send-appointment-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
