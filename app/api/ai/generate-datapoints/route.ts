// app/api/ai/generate-datapoints/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  SafetySetting,
  GenerateContentResponse, // This type is for result.response
} from '@google/genai';

// Extend global interface to include aiTasks
declare global {
  var aiTasks: Map<string, any>;
}

// Initialize or ensure global task storage
if (!global.aiTasks) {
  console.log("Initializing global.aiTasks Map in generate-datapoints route.");
  global.aiTasks = new Map();
}

// Minimal DataPoint interface (ensure alignment with shared types)
interface DataPoint {
  label: string;
  id: string; 
  name: string; 
  nodeId: string;
  dataType: 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte' | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText' | 'Unknown';
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input' | 'slider' | 'indicator';
  icon?: string;
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string;
  factor?: number;
  precision?: number;
  isWritable?: boolean;
  decimalPlaces?: number;
  enumSet?: Record<number | string, string>;
}

interface GenerateDatapointsRequestBody {
    filePath?: string;
    geminiApiKey?: string;
}
export const dynamic = 'force-dynamic'; // explicitly tell Next.js this is dynamic
// Interface for the data read from discovered_datapoints.json
interface DiscoveredDataPoint {
  name: string;
  address: string; 
  initialValue: any;
  dataType: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Updated MODEL_NAME to reflect Gemini 2.0 Flash as per user request and new SDK docs.
const MODEL_NAME = "gemini-2.0-flash-001"; 
const SAFETY_SETTINGS: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const SIMULATED_PROCESSING_DELAY_PER_BATCH_MS = 500; 

function buildPrompt(discoveredDatapoints: DiscoveredDataPoint[]): string {
  const formattedDataPoints = discoveredDatapoints.map(dp => ({
    name: dp.name,
    address: dp.address, // nodeId in DataPoint
    dataType: dp.dataType,
    initialValue: dp.initialValue // Optional: provide for context if helpful
  }));

  const dataTypeMappingGuidance = `
  Map the provided 'dataType' string from OPC UA to one of the allowed TypeScript string literals in the DataPoint interface's 'dataType' field.
  Allowed types: 'Boolean', 'Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'String', 'DateTime', 'ByteString', 'Guid', 'Byte', 'SByte', 'Int64', 'UInt64', 'StatusCode', 'LocalizedText', 'Unknown'.
  Common OPC UA data types and their typical mappings:
  - "Boolean" -> "Boolean"
  - "Float" (typically OPC UA data type i=10) -> "Float"
  - "Double" (typically OPC UA data type i=11) -> "Double"
  - "SByte" (i=2) -> "SByte"
  - "Byte" (i=3) -> "Byte"
  - "Int16" (i=4) -> "Int16"
  - "UInt16" (i=5) -> "UInt16"
  - "Int32" (i=6) -> "Int32"
  - "UInt32" (i=7) -> "UInt32"
  - "Int64" (i=8) -> "Int64"
  - "UInt64" (i=9) -> "UInt64"
  - "String" (i=12) -> "String"
  - "DateTime" (i=13) -> "DateTime"
  - "Guid" (i=14) -> "Guid"
  - "ByteString" (i=15) -> "ByteString"
  If the OPC UA type is a number like "10", map it to "Float". Use "Unknown" if unsure.
  `;

  return `
You are an expert in industrial automation, OPC UA data modeling, and SCADA/HMI interface design.
Your task is to analyze a list of raw datapoints (likely from an OPC UA server discovery) and enrich them into a structured JSON format suitable for an HMI application.
For each datapoint, infer or assign appropriate values for fields like 'label', 'uiType', 'icon', 'unit', 'min', 'max', 'description', 'category', 'factor', 'precision', 'isWritable', and 'enumSet' if applicable.
Ensure 'id' is a kebab-case version of the 'name' or 'label'.
Ensure 'dataType' correctly maps the provided OPC UA dataType to the allowed TypeScript types. Use "Unknown" if mapping is uncertain.
'label' should be a human-friendly version of the 'name'.

Input: A JSON array of raw datapoints discovered from an OPC UA server:
${JSON.stringify(formattedDataPoints, null, 2)}

Target TypeScript interface for each datapoint object in the output array:
interface DataPoint {
  label: string; // Human-friendly display name (e.g., "Pump Speed")
  id: string; // kebab-case identifier derived from name (e.g., "pump-speed")
  name: string; // Original name from OPC UA (e.g., "PLC1.Pumps.P101.Speed")
  nodeId: string; // Original address (nodeId) from OPC UA (e.g., "ns=2;s=PLC1.Pumps.P101.Speed")
  dataType: 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte' | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText' | 'Unknown';
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input' | 'slider' | 'indicator'; // Optional: suggest HMI element
  icon?: string; // Optional: Lucide icon name (e.g., 'Zap', 'Thermometer')
  unit?: string; // Optional: (e.g., "°C", "RPM", "kW")
  min?: number; // Optional: Min value for inputs/gauges
  max?: number; // Optional: Max value for inputs/gauges
  description?: string; // Optional: Brief description of the datapoint
  category?: string; // Optional: (e.g., "Sensors", "Actuators", "Status", "Alarms", "Configuration")
  factor?: number; // Optional: Scaling factor
  precision?: number; // Optional: Number of decimal places for display
  isWritable?: boolean; // Optional: Inferred if the datapoint is likely writable
  decimalPlaces?: number; // Optional: Synonym for precision
  enumSet?: Record<number | string, string>; // Optional: For integer types representing states
}

${dataTypeMappingGuidance}

Example of how to choose uiType, icon, and unit based on name and dataType:
- Name contains "Temperature", dataType is Float/Double: uiType: 'gauge', icon: 'Thermometer', unit: '°C' (or '°F' if context suggests)
- Name contains "Speed", dataType is Float/Double: uiType: 'gauge', icon: 'Gauge', unit: 'RPM' (or other speed unit)
- Name contains "Status", dataType is Int (any variant): uiType: 'display' or 'indicator', icon: 'Activity'. If known states, provide enumSet.
- Name contains "Enable" or "Switch" or "Command", dataType is Boolean: uiType: 'switch', icon: 'ToggleRight' or 'Power', isWritable: true
- Name contains "Count", dataType is Int (any variant): uiType: 'display', icon: 'Sigma'
- Name contains "Pressure", dataType is Float/Double: uiType: 'gauge', icon: 'Pocket', unit: 'bar' or 'psi' // Using Pocket as another example gauge-like icon
- Name for a general numeric value input/output: uiType: 'input' for writable, 'display' for read-only. icon: 'Hash'
- For a boolean that indicates a state (e.g. "PumpRunning"): uiType: 'indicator', icon: 'CircleDot'

IMPORTANT:
- Respond with ONLY the JSON array of enriched DataPoint objects. Do NOT include any other text, greetings, or explanations.
- Ensure the output is a valid JSON array.
- If a field is optional and cannot be inferred, omit it.
- Pay attention to 'isWritable': generally false for sensors/status, potentially true for setpoints or commands.
- For 'id', convert the 'name' (or if it's too long or complex, a humanized 'label') to kebab-case. E.g., "Motor Current A" becomes "motor-current-a".
- 'nodeId' in the output should be the 'address' from the input. 'name' in output should be 'name' from input.
- 'decimalPlaces' or 'precision': typically 1 or 2 for analog values like temperature, pressure. 0 for integers unless scaled.
- 'factor': use if raw value needs scaling (e.g., raw is 0-1000 but represents 0-100.0, factor would be 0.1). Assume 1 if not specified.
- 'enumSet' for integer types representing discrete states (e.g. {0: "Off", 1: "On", 2: "Error"}). Consider based on name clues like "Mode" or "State".

The final output must be a single JSON array.
`;
}


async function generateContentWithRetry(
  aiInstance: GoogleGenAI,
  modelName: string,
  prompt: string,
  safetySettings: SafetySetting[],
  maxRetries = 3,
  delayMs = 500
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await aiInstance.models.generateContent({
          model: modelName,
          contents: prompt, // SDK wraps this string as { role: "user", parts: [{ text: prompt }] }
      });

      const genResponse = result; // This is the GenerateContentResponse

      if (genResponse.promptFeedback?.blockReason) {
        throw new Error(`Content generation blocked due to: ${genResponse.promptFeedback.blockReason} ${genResponse.promptFeedback.blockReasonMessage || ''}`);
      }
      
      const textOutput = result.text; // Convenience getter from EnhancedGenerateContentResponse

      if (typeof textOutput !== 'string') {
        console.warn("AI response's .text accessor did not return a string. Full response object:", genResponse);
        if (!genResponse.candidates || genResponse.candidates.length === 0 ||
            !genResponse.candidates[0].content ||
            !genResponse.candidates[0].content.parts ||
            genResponse.candidates[0].content.parts.length === 0 ||
            typeof genResponse.candidates[0].content.parts[0].text !== 'string' ) {
          throw new Error("AI response did not provide usable text content in the expected structure.");
        }
        throw new Error("AI response did not directly provide text content via .text accessor.");
      }
      return textOutput;
    } catch (error: any) {
      const isOverload = error.message?.includes("503") || error.message?.includes("overloaded") || error.message?.includes("rate limit");
      const nonRetryableError = error.message?.includes("API key") || 
                                error.message?.includes("blockReason") ||
                                error.message?.includes("access") || 
                                error.message?.includes("permission") ||
                                error.message?.includes("invalid argument"); // e.g. bad model name or invalid request structure

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
    let genAIInstance: GoogleGenAI;
    const effectiveApiKey = userApiKey || GEMINI_API_KEY;

    if (!effectiveApiKey) {
        console.error(`[Task ${taskId}] API Key missing.`);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId), status: 'error_fatal', message: 'AI API Key is not configured.', errorDetails: 'Missing API Key.',
        });
        return;
    }

    try {
        genAIInstance = new GoogleGenAI({apiKey: effectiveApiKey}); // Corrected initialization
    } catch (e: any) {
        console.error(`[Task ${taskId}] Failed to initialize GoogleGenAI: ${e.message}`);
         global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId), status: 'error_fatal', message: 'Failed to initialize AI Client.', errorDetails: e.message,
        });
        return;
    }

    let discoveredDatapoints: DiscoveredDataPoint[];
    try {
        const fullPath = path.join(process.cwd(), filePath);
        console.log(`[Task ${taskId}] Reading file from: ${fullPath}`);
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        
        if (Array.isArray(jsonData)) {
            discoveredDatapoints = jsonData;
        } else if (jsonData && Array.isArray(jsonData.datapoints)) { // Handle if JSON is { "datapoints": [...] }
            discoveredDatapoints = jsonData.datapoints;
        } else {
            throw new Error("Invalid data format in JSON file. Expected an array of datapoints or an object with a 'datapoints' array property.");
        }

        if (discoveredDatapoints.length === 0) {
             throw new Error("No datapoints found in the file.");
        }
        console.log(`[Task ${taskId}] Successfully read ${discoveredDatapoints.length} datapoints.`);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId), status: 'processing', progress: { current: 0, total: discoveredDatapoints.length, percent: 0 }, message: 'Successfully loaded data points. Starting AI analysis.',
        });
    } catch (e: any) {
        console.error(`[Task ${taskId}] Error reading or parsing data file:`, e.message);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId), status: 'error_fatal', message: `Failed to read or parse data file: ${e.message}`, errorDetails: e.toString(),
        });
        return;
    }

    const batchSize = 10;
    const allGeneratedDataPoints: DataPoint[] = [];
    const totalItems = discoveredDatapoints.length;

    for (let i = 0; i < totalItems; i += batchSize) {
        const batch = discoveredDatapoints.slice(i, i + batchSize);
        // Progress message before starting the batch processing
        const itemsStarted = i;
        const percentBeforeBatch = Math.round((itemsStarted / totalItems) * 100);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'processing',
            progress: { current: itemsStarted, total: totalItems, percent: percentBeforeBatch },
            message: `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalItems / batchSize)}. (${itemsStarted}/${totalItems})`,
        });

        try {
            const prompt = buildPrompt(batch);
            await new Promise(resolve => setTimeout(resolve, SIMULATED_PROCESSING_DELAY_PER_BATCH_MS));

            const aiTextOutput = await generateContentWithRetry(genAIInstance, MODEL_NAME, prompt, SAFETY_SETTINGS);

            let cleanedJsonText = aiTextOutput.trim();
            if (cleanedJsonText.startsWith("```json")) cleanedJsonText = cleanedJsonText.substring(7);
            if (cleanedJsonText.endsWith("```")) cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
            cleanedJsonText = cleanedJsonText.trim();
            
            if (!cleanedJsonText.startsWith("[") || !cleanedJsonText.endsWith("]")) {
                if(cleanedJsonText.startsWith("{") && cleanedJsonText.endsWith("}")) {
                    console.warn(`[Task ${taskId}] AI returned a single JSON object for batch; wrapping in an array.`);
                    cleanedJsonText = `[${cleanedJsonText}]`;
                } else {
                    console.error(`[Task ${taskId}] AI returned non-JSON array format for batch: ${cleanedJsonText.substring(0,200)}...`);
                    throw new Error("AI returned content that could not be parsed into a JSON array, even after attempting to wrap a single object.");
                }
            }

            const batchDataPoints: DataPoint[] = JSON.parse(cleanedJsonText);
            allGeneratedDataPoints.push(...batchDataPoints);

            // Update progress after successful batch processing
            const itemsCompletedAfterBatch = Math.min(itemsStarted + batch.length, totalItems);
            const percentAfterBatch = Math.round((itemsCompletedAfterBatch / totalItems) * 100);
            global.aiTasks.set(taskId, {
                ...global.aiTasks.get(taskId),
                progress: { current: itemsCompletedAfterBatch, total: totalItems, percent: percentAfterBatch },
                message: `Processed batch ${Math.floor(i / batchSize) + 1}. (${itemsCompletedAfterBatch}/${totalItems})`
            });

        } catch (error: any) {
            console.error(`[Task ${taskId}] Error processing batch ${Math.floor(i / batchSize) + 1}:`, error.message, error.stack);
            global.aiTasks.set(taskId, {
                ...global.aiTasks.get(taskId),
                status: 'error_fatal',
                message: `Error processing batch ${Math.floor(i/batchSize) + 1}. ${error.message}`,
                errorDetails: error.toString(),
                data: allGeneratedDataPoints.length > 0 ? allGeneratedDataPoints : null,
            });
            return;
        }
    }

    console.log(`[Task ${taskId}] AI processing completed successfully. Total generated datapoints: ${allGeneratedDataPoints.length}`);
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

    const initialTaskState = {
        taskId,
        status: 'pending',
        progress: { current: 0, total: 0, percent: 0 },
        message: 'Task received by server. Queued for processing.',
        data: null,
        errorDetails: null,
        originalRequestParams: { filePath },
        createdAt: new Date().toISOString(),
    };
    if (!global.aiTasks) global.aiTasks = new Map();
    global.aiTasks.set(taskId, initialTaskState);

    // Initiate background processing without awaiting it
    setTimeout(() => {
        processAiTaskInBackground(taskId, filePath!, userApiKey).catch(err => {
            console.error(`[Task ${taskId}] Critical unhandled error in processAiTaskInBackground: `, err);
            const existingState = global.aiTasks.get(taskId) || initialTaskState; // Ensure we have a base state
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