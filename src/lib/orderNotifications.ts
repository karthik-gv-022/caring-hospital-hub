import { supabase } from "@/integrations/supabase/client";

export async function sendOrderNotification(orderId: string, newStatus: string) {
  try {
    const { data, error } = await supabase.functions.invoke("send-order-notification", {
      body: { orderId, newStatus },
    });

    if (error) {
      console.error("Failed to send order notification:", error);
      return { success: false, error };
    }

    console.log("Order notification sent:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Error sending order notification:", err);
    return { success: false, error: err };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const { data, error } = await supabase
    .from("pharmacy_orders")
    .update({ 
      status: newStatus,
      ...(newStatus === "delivered" ? { delivered_at: new Date().toISOString() } : {})
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Send notification in background
  sendOrderNotification(orderId, newStatus);

  return data;
}
