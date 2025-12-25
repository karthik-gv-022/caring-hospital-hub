import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const doctors = [
  { name: "Dr. Sarah Chen", specialty: "Cardiology", waitTime: "~15 min" },
  { name: "Dr. Michael Park", specialty: "Neurology", waitTime: "~20 min" },
  { name: "Dr. Lisa Wang", specialty: "Pediatrics", waitTime: "~10 min" },
  { name: "Dr. David Kim", specialty: "Orthopedics", waitTime: "~25 min" },
  { name: "Dr. Jennifer Lee", specialty: "Dermatology", waitTime: "~15 min" },
  { name: "Dr. Robert Taylor", specialty: "Internal Medicine", waitTime: "~20 min" },
  { name: "Dr. Amanda White", specialty: "Ophthalmology", waitTime: "~30 min" },
  { name: "Dr. Thomas Brown", specialty: "General Surgery", waitTime: "~35 min" },
  { name: "Dr. Emily Martinez", specialty: "Pulmonology", waitTime: "~25 min" },
  { name: "Dr. James Wilson", specialty: "Gastroenterology", waitTime: "~20 min" },
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms } = await req.json();
    
    if (!symptoms || symptoms.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Symptoms are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    console.log("Analyzing symptoms:", symptoms);

    const systemPrompt = `You are a medical triage AI assistant for a hospital management system. Your role is to analyze patient symptoms and recommend the most appropriate medical specialists.

Available doctors and their specialties:
${doctors.map(d => `- ${d.name}: ${d.specialty}`).join('\n')}

When analyzing symptoms, you must:
1. Consider the primary symptoms and their severity
2. Match symptoms to the most relevant medical specialties
3. Provide a match score (0-100) based on symptom-specialty relevance
4. Give a brief, clear reason for each recommendation

IMPORTANT: You must respond with valid JSON in this exact format:
{
  "recommendations": [
    {
      "doctorName": "Dr. Name",
      "specialty": "Specialty",
      "matchScore": 95,
      "reason": "Brief explanation why this doctor is recommended"
    }
  ]
}

Provide 2-3 recommendations, ordered by match score (highest first). Be concise but helpful.`;

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
          { role: "user", content: `Patient symptoms: ${symptoms}\n\nAnalyze these symptoms and recommend the most appropriate doctors from the available list.` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error("Failed to analyze symptoms");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", data);
      throw new Error("Invalid AI response");
    }

    console.log("AI response:", content);

    // Parse the JSON response from the AI
    let parsedResponse;
    try {
      // Extract JSON from the response (handle markdown code blocks if present)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      parsedResponse = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      throw new Error("Failed to parse AI recommendations");
    }

    // Enrich recommendations with wait times
    const enrichedRecommendations = parsedResponse.recommendations.map((rec: any) => {
      const doctor = doctors.find(d => d.name === rec.doctorName);
      return {
        ...rec,
        waitTime: doctor?.waitTime || "~20 min"
      };
    });

    return new Response(
      JSON.stringify({ recommendations: enrichedRecommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-symptoms function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
