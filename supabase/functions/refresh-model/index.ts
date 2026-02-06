import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RefreshModelInput {
  folder_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: RefreshModelInput = await req.json();

    const { folder_name } = body;

    if (!folder_name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: folder_name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supportedExtensions = ['.ply', '.gltf', '.glb'];
    let modelUrl = null;
    let foundExtension = null;

    for (const ext of supportedExtensions) {
      const testUrl = `/${folder_name}/model${ext}`;

      try {
        const response = await fetch(new URL(testUrl, req.url).href, { method: 'HEAD' });
        if (response.ok) {
          modelUrl = testUrl;
          foundExtension = ext;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!modelUrl) {
      modelUrl = `/${folder_name}/output.ply`;
      foundExtension = '.ply';
    }

    const result = {
      success: true,
      model_url: modelUrl,
      folder_name: folder_name,
      extension: foundExtension,
      message: "Model URL prepared for refresh"
    };

    return new Response(
      JSON.stringify(result),
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
