import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  newStatus: string;
}

const statusMessages: Record<string, { subject: string; title: string; message: string }> = {
  confirmed: {
    subject: "Order Confirmed - MediAI Pharmacy",
    title: "Your Order is Confirmed! ✅",
    message: "Great news! Your pharmacy order has been confirmed and the pharmacy is preparing your medicines.",
  },
  preparing: {
    subject: "Order Being Prepared - MediAI Pharmacy",
    title: "Your Medicines are Being Prepared 💊",
    message: "The pharmacy is now preparing your medicines. They will be dispatched soon.",
  },
  out_for_delivery: {
    subject: "Order Out for Delivery - MediAI Pharmacy",
    title: "Your Order is On Its Way! 🚚",
    message: "Exciting news! Your order is out for delivery. Please keep your phone handy for the delivery person.",
  },
  delivered: {
    subject: "Order Delivered - MediAI Pharmacy",
    title: "Order Delivered Successfully! 🎉",
    message: "Your order has been delivered. Thank you for using MediAI Pharmacy. We hope you feel better soon!",
  },
  cancelled: {
    subject: "Order Cancelled - MediAI Pharmacy",
    title: "Order Cancelled ❌",
    message: "Your order has been cancelled. If you didn't request this cancellation, please contact us immediately.",
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, newStatus }: OrderNotificationRequest = await req.json();

    console.log(`Sending notification for order ${orderId}, status: ${newStatus}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch order details with patient info
    const { data: order, error: orderError } = await supabase
      .from("pharmacy_orders")
      .select(`
        *,
        pharmacy:pharmacies(name, phone),
        patient:patients(first_name, last_name, email, phone),
        pharmacy_order_items(medicine_name, quantity, total_price)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientEmail = order.patient?.email;
    const patientName = `${order.patient?.first_name || ""} ${order.patient?.last_name || ""}`.trim() || "Patient";

    if (!patientEmail) {
      console.log("No email address found for patient");
      return new Response(
        JSON.stringify({ message: "No email address found for patient" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) {
      console.log("No template for status:", newStatus);
      return new Response(
        JSON.stringify({ message: "No template for this status" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build order items HTML
    const itemsHtml = order.pharmacy_order_items
      .map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.medicine_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total_price.toFixed(2)}</td>
        </tr>
      `)
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MediAI Pharmacy</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #0d9488; margin-top: 0;">${statusInfo.title}</h2>
          
          <p>Hello ${patientName},</p>
          <p>${statusInfo.message}</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #333;">Order Details</h3>
            <p><strong>Order Number:</strong> #${order.order_number}</p>
            <p><strong>Pharmacy:</strong> ${order.pharmacy?.name || "MediAI Pharmacy"}</p>
            ${order.estimated_delivery && newStatus === "out_for_delivery" ? `
              <p><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery).toLocaleString()}</p>
            ` : ""}
            
            <h4 style="margin-bottom: 10px;">Items:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; text-align: left;">Medicine</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 8px; font-weight: bold;">Subtotal</td>
                  <td style="padding: 8px; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 8px;">Delivery Fee</td>
                  <td style="padding: 8px; text-align: right;">₹${order.delivery_fee.toFixed(2)}</td>
                </tr>
                <tr style="background: #0d9488; color: white;">
                  <td colspan="2" style="padding: 12px; font-weight: bold; border-radius: 0 0 0 8px;">Total</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; border-radius: 0 0 8px 0;">₹${order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Delivery Address</h4>
            <p style="margin: 0; color: #666;">${order.delivery_address}</p>
            <p style="margin: 5px 0 0; color: #666;">📞 ${order.delivery_phone}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please contact our support team or the pharmacy directly.
          </p>
          
          <p style="margin-bottom: 0;">Best regards,<br><strong>MediAI Pharmacy Team</strong></p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>This is an automated message from MediAI Hospital System.</p>
          <p>© ${new Date().getFullYear()} MediAI. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "MediAI Pharmacy <onboarding@resend.dev>",
      to: [patientEmail],
      subject: statusInfo.subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
