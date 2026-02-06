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

    if (![0, 1, 2, 3].includes(id)) {
      return res.status(400).json({
        error: 'Invalid id. Must be 0 (image capture), 1 (Gaussian Splatting), 2 (Image Processed), or 3 (Total Time)'
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
