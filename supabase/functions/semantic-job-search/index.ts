import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  industry: string | null;
  skill_level: string;
  location: string | null;
  location_type: string;
  company_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location } = await req.json();
    
    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ matchingJobIds: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Semantic search request: query="${query}", location="${location}"`);

    // Fetch all active jobs from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: jobs, error: dbError } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        description,
        skills,
        industry,
        skill_level,
        location,
        location_type,
        company:company_profiles(company_name)
      `)
      .eq("status", "active");

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to fetch jobs");
    }

    // Transform jobs for AI analysis
    const jobSummaries = (jobs || []).map((job: any) => ({
      id: job.id,
      title: job.title,
      description: job.description?.substring(0, 200) || "",
      skills: job.skills?.join(", ") || "",
      industry: job.industry || "general",
      skill_level: job.skill_level,
      location: job.location || "Remote",
      location_type: job.location_type,
      company_name: job.company?.company_name || "Unknown",
    }));

    // If no jobs in database, return empty
    if (jobSummaries.length === 0) {
      console.log("No jobs in database to search");
      return new Response(
        JSON.stringify({ matchingJobIds: [], aiRanking: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to semantically match jobs
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are a job search assistant. Given a search query and a list of jobs, identify which jobs semantically match the query. Consider:
- Job titles that mean similar things (e.g., "developer" matches "engineer", "coder", "programmer")
- Skills that are related (e.g., "React" matches "frontend", "JavaScript")
- Industry relevance
- Experience level implications

Return ONLY a JSON array of job IDs that match, ordered by relevance (most relevant first).
If no jobs match, return an empty array [].
Do not include any explanation, just the JSON array.`;

    const userPrompt = `Search query: "${query}"${location ? ` in location: "${location}"` : ""}

Available jobs:
${JSON.stringify(jobSummaries, null, 2)}

Return the matching job IDs as a JSON array:`;

    console.log(`Calling AI with ${jobSummaries.length} jobs to analyze`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    console.log("AI response:", aiContent);

    // Parse the AI response
    let matchingJobIds: string[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      matchingJobIds = JSON.parse(cleanedContent);
      
      if (!Array.isArray(matchingJobIds)) {
        matchingJobIds = [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      matchingJobIds = [];
    }

    console.log(`Found ${matchingJobIds.length} matching jobs`);

    return new Response(
      JSON.stringify({ matchingJobIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Semantic search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, matchingJobIds: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
