import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TimestampInput {
  id: number;
  time: number;
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

    const body: TimestampInput = await req.json();

    const { id, time, analysis_id } = body;

    if (id === undefined || time === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: id (0-2), time (milliseconds)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (![0, 1, 2].includes(id)) {
      return new Response(
        JSON.stringify({ error: "Invalid id. Must be 0 (image capture), 1 (Gaussian Splatting), or 2 (Image Processed)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const insertData: any = {
      event_id: id,
      timestamp_ms: time,
    };

    if (analysis_id) {
      insertData.analysis_id = analysis_id;
    }

    const { data, error } = await supabase
      .from("processing_timestamps")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
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
