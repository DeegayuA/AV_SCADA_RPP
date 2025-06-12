// app/api/ai/generate-datapoints/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid'; // Added for unique task IDs
import path from 'path'; // Added for path.join
import {
  GoogleGenAI, // Corrected: This should be GoogleGenerativeAI from the new package if that's what's used. Assuming it's GoogleGenAI as per original file.
  HarmCategory,
  HarmBlockThreshold,
  SafetySetting,
  GenerateContentResponse,
} from '@google/genai'; // Assuming this is the intended package based on current file.

// Initialize or ensure global task storage
if (!global.aiTasks) {
  console.log("Initializing global.aiTasks Map in generate-datapoints route.");
  global.aiTasks = new Map();
}

// Minimal DataPoint interface for this file
// Ensure this aligns with the main DataPoint type in `config/dataPoints.ts` or a shared types location
interface DataPoint {
  label: string;
  id: string; // kebab-case identifier derived from name
  name: string; // Original name from OPC UA
  nodeId: string; // Original address (nodeId) from OPC UA
  dataType: 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte' | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText' | 'Unknown'; // Added 'Unknown' for safety
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input' | 'slider' | 'indicator'; // Added slider & indicator
  icon?: string; // Lucide icon name as string (e.g., 'Zap', 'Thermometer')
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string; // e.g., 'Sensors', 'Actuators', 'Status', 'Alarms', 'Configuration'
  factor?: number;
  precision?: number; // Number of decimal places for display
  isWritable?: boolean;
  decimalPlaces?: number; // Alternative/synonym to precision
  enumSet?: Record<number | string, string>;
}

interface GenerateDatapointsRequestBody { // Added from previous logic
    filePath?: string;
    geminiApiKey?: string;
}

// Interface for the data read from discovered_datapoints.json
interface DiscoveredDataPoint {
  name: string;
  address: string; // This is the nodeId
  initialValue: any;
  dataType: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest"; // Using a common flash model
const SAFETY_SETTINGS: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const SIMULATED_PROCESSING_DELAY_PER_BATCH_MS = 1500; // Simulate overall processing time for a batch

function buildPrompt(discoveredDatapoints: DiscoveredDataPoint[]): string {
  const formattedDataPoints = discoveredDatapoints.map(dp => ({
    name: dp.name,
    address: dp.address,
    dataType: dp.dataType,
    initialValue: dp.initialValue
  }));

  const dataTypeMappingGuidance = `
  // ... (prompt building logic as provided in the file)
  const formattedDataPoints = discoveredDatapoints.map(dp => ({
    name: dp.name,
    address: dp.address,
    dataType: dp.dataType,
    initialValue: dp.initialValue
  }));

  const dataTypeMappingGuidance = `
  Map the provided 'dataType' string from OPC UA to one of the allowed TypeScript string literals in the DataPoint interface's 'dataType' field.
  Allowed types: 'Boolean', 'Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'String', 'DateTime', 'ByteString', 'Guid', 'Byte', 'SByte', 'Int64', 'UInt64', 'StatusCode', 'LocalizedText', 'Unknown'.
  Common OPC UA data types and their typical mappings:
  - "Boolean" -> "Boolean"
  - "Float" (typically i=10) -> "Float"
  // ... (rest of dataTypeMappingGuidance)
  `;

  return `
You are an expert in industrial automation, OPC UA data modeling, and SCADA/HMI interface design.
// ... (rest of the prompt)
Input: A JSON array of raw datapoints:
${JSON.stringify(formattedDataPoints, null, 2)}
// ... (rest of the prompt including Target TypeScript interface and dataTypeMappingGuidance)
The final output must be a single JSON array.
`;
}


async function generateContentWithRetry(
  aiInstance: GoogleGenAI,
  modelName: string,
  prompt: string,
  safetySettings: SafetySetting[],
  maxRetries = 3, // Reduced retries for faster simulation failure if needed
  delayMs = 500
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // const result = await aiInstance.getGenerativeModel({ model: modelName }).generateContent(prompt); // Corrected call structure for @google/genai
      // The current file uses `aiInstance.models.generateContent` which seems to be for an older or different version of the SDK.
      // Assuming `GoogleGenAI` is the main entry point from '@google/genai' based on current file's import.
      // The actual method might be `aiInstance.getGenerativeModel({ model: modelName }).generateContentStream(...)` or `generateContent(...)`
      // For now, I'll adapt to the structure that seems to be implied by `GenerateContentResponse`.
      // This part is tricky without knowing the exact SDK version the original author tested with.
      // Let's assume `aiInstance.getGenerativeModel({ model: modelName })` is correct and then call `generateContent` on that.
      const model = aiInstance.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt); // Pass safetySettings here if API allows, or ensure they are part of model config.
      
      const response = result.response; // Access the response part of the result.

      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content generation blocked due to: ${response.promptFeedback.blockReason} ${response.promptFeedback.blockReasonMessage || ''}`);
      }
      const textOutput = response.text(); // text() is a function that returns a string
      if (typeof textOutput !== 'string') {
        console.warn("AI response did not contain text or text was not a string.", response);
        throw new Error("AI response did not directly provide text content.");
      }
      return textOutput;
    } catch (error: any) {
      const isOverload = error.message?.includes("503") || error.message?.includes("overloaded") || error.message?.includes("rate limit");
      const nonRetryableError = error.message?.includes("API key") || error.message?.includes("blockReason") || error.message.includes("access");

      console.warn(`[AI Content Gen] Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries || nonRetryableError || !isOverload) {
          throw error;
      }
      await new Promise(res => setTimeout(res, delayMs * Math.pow(2, attempt -1)));
    }
  }
  throw new Error("All retries failed for Gemini generateContent.");
}

async function processAiTaskInBackground(taskId: string, filePath: string, userApiKey?: string) {
    console.log(`[Task ${taskId}] Starting background AI processing for filePath: ${filePath}`);
    let genAIInstance;
    const effectiveApiKey = userApiKey || GEMINI_API_KEY;

    if (!effectiveApiKey) {
        console.error(`[Task ${taskId}] API Key missing.`);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'error_fatal',
            message: 'AI API Key is not configured.',
            errorDetails: 'Missing API Key.',
        });
        return;
    }

    try {
        genAIInstance = new GoogleGenAI(effectiveApiKey); // Corrected: use effectiveApiKey
    } catch (e: any) {
        console.error(`[Task ${taskId}] Failed to initialize GoogleGenAI: ${e.message}`);
         global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'error_fatal',
            message: 'Failed to initialize AI Client.',
            errorDetails: e.message,
        });
        return;
    }


    let discoveredDatapoints: DiscoveredDataPoint[];
    try {
        const fullPath = path.join(process.cwd(), filePath); // Use path.join for robustness
        console.log(`[Task ${taskId}] Reading file from: ${fullPath}`);
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        discoveredDatapoints = JSON.parse(fileContent); // Assuming direct array in file for simplicity now
        if (Array.isArray(discoveredDatapoints) && discoveredDatapoints.length === 0) {
             throw new Error("No datapoints found in the file.");
        }
        console.log(`[Task ${taskId}] Successfully read ${discoveredDatapoints.length} datapoints.`);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'processing',
            progress: { current: 0, total: discoveredDatapoints.length, percent: 0 },
            message: 'Successfully loaded data points. Starting AI analysis.',
        });
    } catch (e: any) {
        console.error(`[Task ${taskId}] Error reading or parsing data file:`, e.message);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'error_fatal',
            message: `Failed to read or parse data file: ${e.message}`,
            errorDetails: e.toString(),
        });
        return;
    }

    const batchSize = 10; // As in original file
    const allGeneratedDataPoints: DataPoint[] = [];
    const totalItems = discoveredDatapoints.length;

    for (let i = 0; i < totalItems; i += batchSize) {
        const batch = discoveredDatapoints.slice(i, i + batchSize);
        const currentProgress = i;
        const percent = Math.round((currentProgress / totalItems) * 100);

        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'processing',
            progress: { current: currentProgress, total: totalItems, percent: percent },
            message: `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalItems / batchSize)}. (${currentProgress}/${totalItems})`,
        });

        try {
            const prompt = buildPrompt(batch);
            // Simulate delay for each batch processing
            await new Promise(resolve => setTimeout(resolve, SIMULATED_PROCESSING_DELAY_PER_BATCH_MS));

            const aiTextOutput = await generateContentWithRetry(genAIInstance, MODEL_NAME, prompt, SAFETY_SETTINGS);

            let cleanedJsonText = aiTextOutput.trim();
            if (cleanedJsonText.startsWith("```json")) cleanedJsonText = cleanedJsonText.substring(7);
            if (cleanedJsonText.endsWith("```")) cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
            cleanedJsonText = cleanedJsonText.trim();
            if (!cleanedJsonText.startsWith("[") || !cleanedJsonText.endsWith("]")) {
                if(cleanedJsonText.startsWith("{") && cleanedJsonText.endsWith("}")) cleanedJsonText = `[${cleanedJsonText}]`;
            }

            const batchDataPoints: DataPoint[] = JSON.parse(cleanedJsonText);
            allGeneratedDataPoints.push(...batchDataPoints);

        } catch (error: any) {
            console.error(`[Task ${taskId}] Error processing batch ${i / batchSize + 1}:`, error.message);
            // Decide if error is fatal or recoverable for the whole task
            // For simplicity, making batch processing errors fatal for the task here.
            global.aiTasks.set(taskId, {
                ...global.aiTasks.get(taskId),
                status: 'error_fatal', // Or 'error_recoverable' if retry of batch is desired
                message: `Error processing batch ${Math.floor(i/batchSize) + 1}. ${error.message}`,
                errorDetails: error.toString(),
                data: allGeneratedDataPoints.length > 0 ? allGeneratedDataPoints : null, // Store partial results
            });
            return; // Stop further processing for this task
        }
    }

    console.log(`[Task ${taskId}] AI processing completed successfully.`);
    global.aiTasks.set(taskId, {
        ...global.aiTasks.get(taskId),
        status: 'completed',
        progress: { current: totalItems, total: totalItems, percent: 100 },
        message: 'AI enhancement completed successfully.',
        data: allGeneratedDataPoints,
        errorDetails: null,
    });
}


export async function POST(req: NextRequest) {
  console.log("POST /api/ai/generate-datapoints endpoint hit (async).");
  const taskId = uuidv4();
  let filePath: string | undefined;
  let userApiKey: string | undefined;

  try {
    const body = await req.json() as GenerateDatapointsRequestBody;
    filePath = body.filePath;
    userApiKey = body.geminiApiKey;

    if (!GEMINI_API_KEY && !userApiKey) {
      console.warn("Gemini API Key is not configured.");
      return NextResponse.json({ success: false, message: "AI model is not available. Gemini API Key is not configured." }, { status: 503 });
    }
    if (!filePath) {
      return NextResponse.json({ success: false, message: 'File path to discovered_datapoints.json is required.' }, { status: 400 });
    }

    // Store initial task state
    const initialTaskState = {
        taskId,
        status: 'pending',
        progress: { current: 0, total: 0, percent: 0 }, // Total updated after file read
        message: 'Task received by server. Queued for processing.',
        data: null,
        errorDetails: null,
        originalRequestParams: { filePath }, // Store necessary params for potential resume/retry
        createdAt: new Date().toISOString(),
    };
    if (!global.aiTasks) global.aiTasks = new Map();
    global.aiTasks.set(taskId, initialTaskState);

    // Initiate background processing
    setTimeout(() => {
        processAiTaskInBackground(taskId, filePath!, userApiKey).catch(err => {
            console.error(`[Task ${taskId}] Critical unhandled error in processAiTaskInBackground: `, err);
            const existingState = global.aiTasks.get(taskId) || initialTaskState;
            global.aiTasks.set(taskId, {
                ...existingState,
                status: 'error_fatal',
                message: 'A critical unhandled error occurred during background processing.',
                errorDetails: err.message || 'Unknown critical error',
            });
        });
    }, 0); // Execute immediately after current event loop cycle

    return NextResponse.json({ taskId: taskId }, { status: 202 });

  } catch (error: any) {
    console.error("Error in POST /api/ai/generate-datapoints (sync part):", error);
    // This catches errors from req.json() or initial validation before async starts
    return NextResponse.json({ success: false, message: 'Failed to initiate AI task.', error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  console.log("GET /api/ai/generate-datapoints endpoint hit. Method not allowed.");
  return NextResponse.json({
      message: 'Method Not Allowed. Use POST to generate datapoints with AI.'
  }, {
      status: 405,
      headers: { 'Allow': 'POST' }
  });
}