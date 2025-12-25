import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, patientId, userId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch context data for the chatbot
    let contextData = "";

    // Get available doctors
    const { data: doctors } = await supabase
      .from("doctors")
      .select("id, name, specialty, is_available, next_available, available_slots")
      .eq("is_available", true);

    if (doctors && doctors.length > 0) {
      contextData += "\n\nAVAILABLE DOCTORS:\n";
      doctors.forEach((doc) => {
        contextData += `- Dr. ${doc.name} (${doc.specialty}): ${doc.available_slots} slots, next available ${doc.next_available}\n`;
      });
    }

    // Get patient's queue status if patientId provided
    if (patientId) {
      const { data: queueTokens } = await supabase
        .from("queue_tokens")
        .select("token_number, department, position, status, estimated_wait_minutes, doctor:doctors(name)")
        .eq("patient_id", patientId)
        .in("status", ["waiting", "in-progress"])
        .order("created_at", { ascending: false });

      if (queueTokens && queueTokens.length > 0) {
        contextData += "\n\nPATIENT'S CURRENT QUEUE STATUS:\n";
        queueTokens.forEach((token: any) => {
          contextData += `- Token ${token.token_number}: ${token.department}, Position #${token.position}, Status: ${token.status}, Wait: ~${token.estimated_wait_minutes} min\n`;
        });
      }

      // Get patient's upcoming appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("scheduled_date, scheduled_time, status, symptoms, doctor:doctors(name, specialty)")
        .eq("patient_id", patientId)
        .in("status", ["scheduled", "confirmed", "pending"])
        .order("scheduled_date", { ascending: true });

      if (appointments && appointments.length > 0) {
        contextData += "\n\nPATIENT'S UPCOMING APPOINTMENTS:\n";
        appointments.forEach((apt: any) => {
          contextData += `- ${apt.scheduled_date} at ${apt.scheduled_time} with Dr. ${apt.doctor?.name} (${apt.doctor?.specialty}): ${apt.status}\n`;
        });
      }
    }

    const systemPrompt = `You are MediAI, an intelligent hospital assistant for the MediAI Hospital System. You help patients with:

1. **SYMPTOM CHECKER**: When patients describe symptoms, analyze them and recommend:
   - Which medical specialty/department they should visit
   - Which available doctor would be most suitable
   - Urgency level (emergency, urgent, routine)
   - General health advice (always remind them this is not a substitute for professional medical advice)

2. **APPOINTMENT ASSISTANT**: Help patients:
   - Find available doctors and their specialties
   - Recommend appointment times
   - Answer questions about the booking process
   - Explain what to expect during appointments

3. **MEDICAL Q&A**: Answer general health questions about:
   - Common conditions and symptoms
   - Preventive care and wellness tips
   - Medication information (general, not prescriptive)
   - Hospital services and facilities

4. **QUEUE STATUS**: When asked about queue or wait times:
   - Provide their current queue position if available
   - Estimate wait times
   - Suggest ways to pass time or if they should step out briefly

CONTEXT DATA:${contextData}

IMPORTANT GUIDELINES:
- Always be empathetic and professional
- Never provide specific medical diagnoses
- Always recommend seeing a doctor for serious symptoms
- If symptoms sound severe (chest pain, difficulty breathing, severe bleeding), advise immediate emergency care
- Be concise but thorough
- Use the context data to give personalized responses about doctors and appointments
- Format responses with clear sections when appropriate`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
