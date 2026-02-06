import express from 'express';
import cors from 'cors';
import { saveAnalysis, getAnalyses, saveTimestamp, getTimestamps, saveModelPath, getModels } from './storage.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/update-analysis', async (req, res) => {
  try {
    const { environment, description, number_of_people, threats, is_anomaly, anomaly_reason, analysis_id } = req.body;

    if (!environment || !description || number_of_people === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: environment, description, number_of_people'
      });
    }

    const analysisData = {
      id: analysis_id,
      environment,
      description,
      number_of_people,
      threats: threats || null,
      is_anomaly: is_anomaly || false,
      anomaly_reason: anomaly_reason || null
    };

    const result = await saveAnalysis(analysisData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analyses', async (req, res) => {
  try {
    const analyses = await getAnalyses();
    res.json({ success: true, data: analyses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/record-timestamp', async (req, res) => {
  try {
    const { id, time, analysis_id } = req.body;

    if (id === undefined || time === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: id (0-2), time (milliseconds)'
      });
    }

    if (![0, 1, 2].includes(id)) {
      return res.status(400).json({
        error: 'Invalid id. Must be 0 (image capture), 1 (Gaussian Splatting), or 2 (Image Processed)'
      });
    }

    const timestampData = {
      event_id: id,
      timestamp_ms: time,
      analysis_id: analysis_id || null
    };

    const result = await saveTimestamp(timestampData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/timestamps', async (req, res) => {
  try {
    const timestamps = await getTimestamps();
    res.json({ success: true, data: timestamps });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/refresh-model', async (req, res) => {
  try {
    const { folder_name } = req.body;

    if (!folder_name) {
      return res.status(400).json({
        error: 'Missing required field: folder_name'
      });
    }

    const supportedExtensions = ['.ply', '.gltf', '.glb'];
    const modelUrl = `/${folder_name}/output.ply`;

    const modelData = {
      folder_name,
      model_url: modelUrl,
      extension: '.ply'
    };

    const result = await saveModelPath(modelData);

    res.json({
      success: true,
      data: {
        ...result,
        message: 'Model URL prepared for refresh'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const models = await getModels();
    res.json({ success: true, data: models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

function simulateProcessing() {
  const captureTime = Math.floor(Math.random() * 200) + 150;
  const splattingTime = Math.floor(Math.random() * 1500) + 1000;
  const processingTime = Math.floor(Math.random() * 800) + 500;
  const peopleCount = Math.floor(Math.random() * 15);
  const isAnomaly = Math.random() > 0.7;

  return {
    images_captured_time: captureTime,
    gaussian_splatting_time: splattingTime,
    processing_time: processingTime,
    total_time: captureTime + splattingTime + processingTime,
    ply_file_url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/ply/ascii/dolphins.ply',
    environment: environments[Math.floor(Math.random() * environments.length)],
    activity: activities[Math.floor(Math.random() * activities.length)],
    people_count: peopleCount,
    threats: threats[Math.floor(Math.random() * threats.length)],
    is_anomaly: isAnomaly,
    anomaly_reason: isAnomaly
      ? "Unusual pattern detected in crowd movement that deviates from normal behavior for this environment"
      : "Normal activity for this environment with expected patterns and behavior"
  };
}

app.post('/api/capture-images', async (req, res) => {
  try {
    const { camera1_image, camera2_image } = req.body;

    if (!camera1_image || !camera2_image) {
      return res.status(400).json({
        error: 'Missing required fields: camera1_image, camera2_image'
      });
    }

    console.log(`Images received: Camera 1 (${camera1_image.length} bytes), Camera 2 (${camera2_image.length} bytes)`);
    console.log('Starting processing...');

    const processingResults = simulateProcessing();

    await new Promise(resolve => setTimeout(resolve, processingResults.total_time));

    console.log('Processing complete:', {
      total_time: processingResults.total_time,
      environment: processingResults.environment,
      people_count: processingResults.people_count
    });

    res.json({
      success: true,
      data: {
        camera1_image,
        camera2_image,
        ...processingResults,
        captured_at: new Date().toISOString()
      },
      message: 'Images processed successfully'
    });
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
