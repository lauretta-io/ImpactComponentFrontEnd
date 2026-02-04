import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const environments = [
  "Urban street", "Office building", "Shopping mall", "Park", "Residential area",
  "Industrial facility", "Airport terminal", "Train station", "Parking lot", "School campus"
];

const activities = [
  "People walking normally in an orderly fashion. Some individuals are checking their phones while others are engaged in conversation. A few pedestrians are carrying shopping bags.",
  "Group gathering for what appears to be a scheduled meeting or social event. Participants are standing in a circular formation, actively gesturing and communicating.",
  "Steady vehicle traffic flowing through the area. Multiple cars, trucks, and possibly buses are visible. Traffic appears to be moving at normal speeds with no signs of congestion.",
  "Construction work in progress. Workers wearing safety equipment are operating machinery and moving materials. Safety barriers and warning signs are properly positioned.",
  "Delivery personnel unloading packages from a commercial vehicle. Individual is wearing company uniform and following standard delivery protocols.",
  "Maintenance activity being performed by authorized personnel. Equipment and tools are visible, and the work area is properly cordoned off for safety.",
  "Public event with organized crowd management. Attendees are following designated pathways and security measures appear to be in place.",
  "Emergency response team arriving on scene. First responders are deploying equipment and establishing a perimeter. Situation appears controlled.",
  "Routine operations proceeding normally. Individuals are going about their regular activities without any signs of disruption or unusual behavior.",
  "Crowd movement through a public space. Flow appears natural and controlled with people moving in predictable patterns consistent with the location."
];

const threats = [
  "None detected", "Minor: Unattended package requiring inspection", "Minor: Unusual gathering pattern",
  "Medium: Unauthorized access to restricted area", "None - all clear", "None - normal activity"
];

function simulateAnalysis() {
  const peopleCount = Math.floor(Math.random() * 15);
  const environment = environments[Math.floor(Math.random() * environments.length)];
  const activity = activities[Math.floor(Math.random() * activities.length)];
  const threat = threats[Math.floor(Math.random() * threats.length)];
  const isAnomaly = Math.random() > 0.7;

  return {
    environment,
    activity,
    people_count: peopleCount,
    threats: threat,
    is_anomaly: isAnomaly,
    anomaly_reason: isAnomaly
      ? "Unusual pattern detected in crowd movement that deviates from normal behavior for this environment"
      : "Normal activity for this environment with expected patterns and behavior"
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const camera1Url = `https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800`;
    const camera2Url = `https://images.pexels.com/photos/2881233/pexels-photo-2881233.jpeg?auto=compress&cs=tinysrgb&w=800`;

    const captureTime = Math.floor(Math.random() * 200) + 150;
    await sleep(captureTime);

    const splattingTime = Math.floor(Math.random() * 1500) + 1000;
    await sleep(splattingTime);

    const plyUrl = `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/ply/ascii/dolphins.ply`;

    const processingTime = Math.floor(Math.random() * 800) + 500;
    await sleep(processingTime);

    const analysis = simulateAnalysis();
    const totalTime = captureTime + splattingTime + processingTime;

    const result = {
      success: true,
      camera1_url: camera1Url,
      camera2_url: camera2Url,
      ply_file_url: plyUrl,
      images_captured_time: captureTime,
      gaussian_splatting_time: splattingTime,
      processing_time: processingTime,
      total_time: totalTime,
      ...analysis
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
