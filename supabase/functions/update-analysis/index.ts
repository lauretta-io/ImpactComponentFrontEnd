import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisInput {
  environment: string;
  description: string;
  number_of_people: number;
  threats: string | null;
  is_anomaly: boolean;
  anomaly_reason: string | null;
  analysis_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: AnalysisInput = await req.json();

    const { environment, description, number_of_people, threats, is_anomaly, anomaly_reason, analysis_id } = body;

    if (!environment || !description || number_of_people === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: environment, description, number_of_people" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    if (analysis_id) {
      const { data, error } = await supabase
        .from("analysis_data")
        .update({
          environment,
          description,
          number_of_people,
          threats,
          is_anomaly,
          anomaly_reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", analysis_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("analysis_data")
        .insert({
          environment,
          description,
          number_of_people,
          threats,
          is_anomaly,
          anomaly_reason,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
