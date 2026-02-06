import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analysis.json');
const TIMESTAMPS_FILE = path.join(DATA_DIR, 'timestamps.json');
const MODELS_FILE = path.join(DATA_DIR, 'models.json');

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function saveAnalysis(analysisData) {
  const analyses = await readJsonFile(ANALYSIS_FILE);
  const id = analysisData.id || Date.now().toString();
  const timestamp = new Date().toISOString();

  const existingIndex = analyses.findIndex(a => a.id === id);
  const newAnalysis = {
    id,
    ...analysisData,
    created_at: existingIndex >= 0 ? analyses[existingIndex].created_at : timestamp,
    updated_at: timestamp
  };

  if (existingIndex >= 0) {
    analyses[existingIndex] = newAnalysis;
  } else {
    analyses.push(newAnalysis);
  }

  await writeJsonFile(ANALYSIS_FILE, analyses);
  return newAnalysis;
}

export async function getAnalyses() {
  return await readJsonFile(ANALYSIS_FILE);
}

export async function saveTimestamp(timestampData) {
  const timestamps = await readJsonFile(TIMESTAMPS_FILE);
  const newTimestamp = {
    id: Date.now().toString(),
    ...timestampData,
    created_at: new Date().toISOString()
  };

  timestamps.push(newTimestamp);
  await writeJsonFile(TIMESTAMPS_FILE, timestamps);
  return newTimestamp;
}

export async function getTimestamps() {
  return await readJsonFile(TIMESTAMPS_FILE);
}

export async function saveModelPath(modelData) {
  const models = await readJsonFile(MODELS_FILE);
  const newModel = {
    id: Date.now().toString(),
    ...modelData,
    created_at: new Date().toISOString()
  };

  models.push(newModel);
  await writeJsonFile(MODELS_FILE, models);
  return newModel;
}

export async function getModels() {
  return await readJsonFile(MODELS_FILE);
}
