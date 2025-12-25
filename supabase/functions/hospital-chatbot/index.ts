import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const tools = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book an appointment with a doctor for the patient. Use this when the patient explicitly wants to book an appointment.",
      parameters: {
        type: "object",
        properties: {
          doctor_id: {
            type: "string",
            description: "The UUID of the doctor to book with"
          },
          scheduled_date: {
            type: "string",
            description: "The date for the appointment in YYYY-MM-DD format"
          },
          scheduled_time: {
            type: "string",
            description: "The time for the appointment (e.g., '09:00 AM', '02:30 PM')"
          },
          symptoms: {
            type: "string",
            description: "Description of the patient's symptoms"
          }
        },
        required: ["doctor_id", "scheduled_date", "scheduled_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_slots",
      description: "Get available appointment slots for a specific doctor on a specific date",
      parameters: {
        type: "object",
        properties: {
          doctor_id: {
            type: "string",
            description: "The UUID of the doctor"
          },
          date: {
            type: "string",
            description: "The date to check in YYYY-MM-DD format"
          }
        },
        required: ["doctor_id", "date"]
      }
    }
  }
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  supabase: any,
  patientId: string | null
): Promise<string> {
  console.log(`Executing tool: ${toolName} with args:`, args);

  if (toolName === "book_appointment") {
    if (!patientId) {
      return JSON.stringify({ 
        success: false, 
        error: "Patient not registered. Please register as a patient first before booking appointments." 
      });
    }

    const { doctor_id, scheduled_date, scheduled_time, symptoms } = args as {
      doctor_id: string;
      scheduled_date: string;
      scheduled_time: string;
      symptoms?: string;
    };

    // Get doctor info
    const { data: doctor } = await supabase
      .from("doctors")
      .select("name, specialty")
      .eq("id", doctor_id)
      .single();

    if (!doctor) {
      return JSON.stringify({ success: false, error: "Doctor not found" });
    }

    // Create appointment
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: patientId,
        doctor_id,
        scheduled_date,
        scheduled_time,
        symptoms: symptoms || null,
        status: "scheduled"
      })
      .select()
      .single();

    if (error) {
      console.error("Appointment booking error:", error);
      return JSON.stringify({ success: false, error: "Failed to book appointment. Please try again." });
    }

    return JSON.stringify({
      success: true,
      appointment: {
        id: appointment?.id,
        doctor_name: doctor?.name,
        specialty: doctor?.specialty,
        date: scheduled_date,
        time: scheduled_time
      },
      message: `Successfully booked appointment with Dr. ${doctor?.name} (${doctor?.specialty}) on ${scheduled_date} at ${scheduled_time}`
    });
  }

  if (toolName === "get_available_slots") {
    const { doctor_id, date } = args as { doctor_id: string; date: string };

    // Get existing appointments for that doctor on that date
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("scheduled_time")
      .eq("doctor_id", doctor_id)
      .eq("scheduled_date", date)
      .in("status", ["scheduled", "confirmed"]);

    const bookedTimes = existingAppointments?.map((a: any) => a.scheduled_time) || [];

    const allSlots = [
      "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "12:00 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"
    ];

    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    return JSON.stringify({
      date,
      available_slots: availableSlots,
      booked_count: bookedTimes.length,
      total_slots: allSlots.length
    });
  }

  return JSON.stringify({ error: "Unknown tool" });
}

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

    // Get available doctors with IDs for booking
    const { data: doctors } = await supabase
      .from("doctors")
      .select("id, name, specialty, is_available, next_available, available_slots")
      .eq("is_available", true);

    if (doctors && doctors.length > 0) {
      contextData += "\n\nAVAILABLE DOCTORS (use these IDs for booking):\n";
      doctors.forEach((doc) => {
        contextData += `- Dr. ${doc.name} (${doc.specialty}) - ID: ${doc.id}, ${doc.available_slots} slots, next available: ${doc.next_available}\n`;
      });
    }

    // Get today's date for context
    const today = new Date().toISOString().split('T')[0];
    contextData += `\nTODAY'S DATE: ${today}\n`;

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

2. **APPOINTMENT BOOKING**: You can directly book appointments for patients!
   - When a patient wants to book, use the book_appointment tool
   - First recommend a suitable doctor based on their symptoms
   - Confirm the date and time they prefer
   - Use get_available_slots to check availability if needed
   - After booking, confirm the details with the patient

3. **MEDICAL Q&A**: Answer general health questions about:
   - Common conditions and symptoms
   - Preventive care and wellness tips
   - Medication information (general, not prescriptive)
   - Hospital services and facilities

4. **QUEUE STATUS**: When asked about queue or wait times:
   - Provide their current queue position if available
   - Estimate wait times
   - Suggest ways to pass time

CONTEXT DATA:${contextData}

BOOKING WORKFLOW:
1. If patient wants to book, recommend a doctor based on symptoms
2. Ask for preferred date (suggest today: ${today} or tomorrow)
3. Check available slots using get_available_slots if needed
4. Confirm and book using book_appointment
5. Provide confirmation with all details

IMPORTANT GUIDELINES:
- Always be empathetic and professional
- Never provide specific medical diagnoses
- Always recommend seeing a doctor for serious symptoms
- If symptoms sound severe (chest pain, difficulty breathing, severe bleeding), advise immediate emergency care
- Be concise but thorough
- Use the doctor IDs from context when booking
- ${patientId ? "Patient is registered and can book appointments." : "Patient is NOT registered. They need to register before booking appointments."}`;

    // First API call with tools
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
        tools,
        tool_choice: "auto",
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

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    // Check if there are tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(
          toolCall.function.name,
          args,
          supabase,
          patientId
        );

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Second API call with tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            assistantMessage,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error("Failed to get follow-up response");
      }

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls, stream directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    return new Response(streamResponse.body, {
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
