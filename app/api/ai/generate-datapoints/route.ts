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
} from '@google/genai';

// ... (all your existing interface definitions, global.aiTasks, constants, buildPrompt, etc. remain UNCHANGED from the previous good version) ...

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

interface DiscoveredDataPoint {
  name: string;
  address: string; 
  initialValue: any;
  dataType: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL_NAME = "gemini-2.5-flash-preview-05-20"; // Or your preferred model for testing, "gemini-pro" is also good for text

const SAFETY_SETTINGS: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const SIMULATED_PROCESSING_DELAY_PER_BATCH_MS = 500; // Not used in GET test


function buildPrompt(discoveredDatapoints: DiscoveredDataPoint[]): string {
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
  - "Float" -> "Float"
  - "Double" -> "Double"
  - "SByte" -> "SByte"
  - "Byte" -> "Byte"
  - "Int16" -> "Int16"
  - "UInt16" -> "UInt16"
  - "Int32" -> "Int32"
  - "UInt32" -> "UInt32"
  - "Int64" -> "Int64"
  - "UInt64" -> "UInt64"
  - "String" -> "String"
  - "DateTime" -> "DateTime"
  - "Guid" -> "Guid"
  - "ByteString" -> "ByteString"
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

${dataTypeMappingGuidance}

Example of how to choose uiType, icon, and unit based on name and dataType:
- Name contains "Temperature", dataType is Float/Double: uiType: 'gauge', icon: 'Thermometer', unit: '°C' (or '°F' if context suggests)
- Name contains "Speed", dataType is Float/Double: uiType: 'gauge', icon: 'Gauge', unit: 'RPM' (or other speed unit)
- Name contains "Status", dataType is Int (any variant): uiType: 'display' or 'indicator', icon: 'Activity'. If known states, provide enumSet.
- Name contains "Enable" or "Switch" or "Command", dataType is Boolean: uiType: 'switch', icon: 'ToggleRight' or 'Power', isWritable: true
- Name contains "Count", dataType is Int (any variant): uiType: 'display', icon: 'Sigma'
- Name contains "Pressure", dataType is Float/Double: uiType: 'gauge', icon: 'Pocket', unit: 'bar' or 'psi'
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
  apiKey: string,
  modelName: string,
  prompt: string,
  passedSafetySettings: SafetySetting[], 
  maxRetries = 3,
  delayMs = 500
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const genAI = new GoogleGenAI({ apiKey }); 

      const request = {
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        safetySettings: passedSafetySettings, 
      };
      const result = await genAI.models.generateContent(request);

      let blocked = false;
      let blockMessage = "";

      if (result.promptFeedback?.blockReason) {
        blocked = true;
        blockMessage = `Content generation blocked by promptFeedback: ${result.promptFeedback.blockReason}`;
        if (result.promptFeedback.blockReasonMessage) {
          blockMessage += ` - ${result.promptFeedback.blockReasonMessage}`;
        }
      } else {
        const candidate = result.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          blocked = true;
          blockMessage = `Content generation stopped due to candidate safety (finishReason: SAFETY).`;
          if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
              blockMessage += ` Details: ${candidate.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ')}`;
          }
        }
      }

      if (blocked) {
        console.error(`[AI Content Gen] Blocked: ${blockMessage}. Full response feedback:`, JSON.stringify(result.promptFeedback || {}, null, 2));
        if(result.candidates && result.candidates.length > 0) {
            console.error(`[AI Content Gen] Candidate details:`, JSON.stringify(result.candidates[0], null, 2));
        }
        throw new Error(blockMessage);
      }
      
      const textOutput = result.text; 

      if (typeof textOutput !== 'string') {
        console.warn("AI response's .text property did not return a string. Full response object:", JSON.stringify(result, null, 2));
        const firstCandidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof firstCandidateText === 'string') {
            console.warn("Found text in first candidate, using that as fallback.");
            return firstCandidateText;
        }
        throw new Error("AI response did not provide usable text content via `result.text` or candidate content.");
      }
      return textOutput;
    } catch (error: any) {
      let errorMessage = error.message;
      let errorStatus = error.status; 

      if (error.name === 'GoogleGenerativeAIError' || error.constructor?.name === 'GoogleGenerativeAIError') {
      }
      if (error.cause instanceof Error) { 
        errorMessage = `${errorMessage} (Caused by: ${error.cause.message})`;
        if (!errorStatus && (error.cause as any).status) { 
            errorStatus = (error.cause as any).status;
        }
      }

      const isOverload = errorMessage?.includes("503") || 
                        errorMessage?.includes("overloaded") || 
                        errorMessage?.includes("rate limit") ||
                        errorMessage?.includes("fetch failed") || 
                        errorMessage?.includes("ECONNREFUSED") || 
                        errorMessage?.includes("ENOTFOUND") ||   
                        errorStatus === 429 || 
                        errorStatus === 500 || 
                        errorStatus === 503;   
      
      const nonRetryableError = errorMessage?.includes("API key") || 
                                errorMessage?.includes("access") || 
                                errorMessage?.includes("permission") ||
                                (errorStatus === 400 && errorMessage?.includes("model")) || 
                                (errorStatus === 400 && !isOverload) || 
                                errorStatus === 401 || 
                                errorStatus === 403;   

      console.warn(`[AI Content Gen] Attempt ${attempt} failed: Status: ${errorStatus || 'N/A'}, Message: ${errorMessage}`);
      
      if (nonRetryableError && !( (errorMessage?.includes("fetch failed") || errorMessage?.includes("ECONNREFUSED") || errorMessage?.includes("ENOTFOUND")) && attempt < maxRetries) ) {
          console.error(`[AI Content Gen] Non-retryable error or max retries reached for such. Error: ${errorMessage}`);
          throw error;
      }
      
      if (attempt === maxRetries) {
          console.error(`[AI Content Gen] Max retries (${maxRetries}) reached. Error: ${errorMessage}`);
          throw error;
      }

      if (isOverload || errorMessage?.includes("fetch failed") || errorMessage?.includes("ECONNREFUSED") || errorMessage?.includes("ENOTFOUND")) {
        const retryDelay = delayMs * Math.pow(2, attempt - 1);
        console.log(`[AI Content Gen] Overload or transient network issue. Retrying in ${retryDelay}ms...`);
        await new Promise(res => setTimeout(res, retryDelay));
      } else {
        console.error(`[AI Content Gen] Unexpected error type during retry logic, but will retry. Error: ${errorMessage}`);
        const retryDelay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, retryDelay));
      }
    }
  }
  throw new Error(`All retries failed for Gemini generateContent after ${maxRetries} attempts.`);
}

async function processAiTaskInBackground(taskId: string, filePath: string, userApiKey?: string) {
    console.log(`[Task ${taskId}] Starting background AI processing for filePath: ${filePath}`);
    const effectiveApiKey = userApiKey || GEMINI_API_KEY;

    if (!effectiveApiKey) {
        console.error(`[Task ${taskId}] API Key missing.`);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId), status: 'error_fatal', message: 'AI API Key is not configured.', errorDetails: 'Missing API Key.',
        });
        return;
    }

    try {
        let discoveredDatapoints: DiscoveredDataPoint[];
        try {
            const fullPath = path.resolve(filePath);
            console.log(`[Task ${taskId}] Reading file from: ${fullPath}`);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            const jsonData = JSON.parse(fileContent);
            
            if (Array.isArray(jsonData)) {
                discoveredDatapoints = jsonData;
            } else if (jsonData && Array.isArray(jsonData.datapoints)) {
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

                const aiTextOutput = await generateContentWithRetry(effectiveApiKey, MODEL_NAME, prompt, SAFETY_SETTINGS);

                let cleanedJsonText = aiTextOutput.trim();
                if (cleanedJsonText.startsWith("```json")) cleanedJsonText = cleanedJsonText.substring(7);
                if (cleanedJsonText.endsWith("```")) cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
                cleanedJsonText = cleanedJsonText.trim();
                
                if (!cleanedJsonText.startsWith("[") || !cleanedJsonText.endsWith("]")) {
                    if(cleanedJsonText.startsWith("{") && cleanedJsonText.endsWith("}")) {
                        console.warn(`[Task ${taskId}] AI returned a single JSON object, wrapping in an array.`);
                        cleanedJsonText = `[${cleanedJsonText}]`;
                    } else {
                        console.error(`[Task ${taskId}] AI returned non-JSON array format for batch: ${cleanedJsonText.substring(0,200)}...`);
                        throw new Error("AI returned content that could not be parsed into a JSON array, even after attempting to wrap a single object.");
                    }
                }

                const batchDataPoints: DataPoint[] = JSON.parse(cleanedJsonText);
                allGeneratedDataPoints.push(...batchDataPoints);

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

    } catch (error: any) {
        console.error(`[Task ${taskId}] Unexpected error in processAiTaskInBackground:`, error);
        global.aiTasks.set(taskId, {
            ...global.aiTasks.get(taskId),
            status: 'error_fatal',
            message: `An unexpected error occurred: ${error.message}`,
            errorDetails: error.toString(),
        });
    }
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
      console.warn("Gemini API Key is not configured on the server and no user key provided.");
      return NextResponse.json({ success: false, message: "AI model is not available. Gemini API Key is not configured and no user-provided key was found." }, { status: 503 });
    }
    if (!filePath) {
      // For POST, filePath is required. We'll leave this check here.
      // The GET test does not require a filePath.
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

    setTimeout(() => {
        processAiTaskInBackground(taskId, filePath!, userApiKey).catch(err => {
            console.error(`[Task ${taskId}] Critical unhandled error escaped processAiTaskInBackground: `, err);
            const existingState = global.aiTasks.get(taskId) || initialTaskState;
            global.aiTasks.set(taskId, {
                ...existingState,
                status: 'error_fatal',
                message: 'A critical unhandled error occurred during background processing.',
                errorDetails: err.message || 'Unknown critical error during background processing.',
            });
        });
    }, 0); 

    return NextResponse.json({ taskId: taskId }, { status: 202 });

  } catch (error: any) {
    console.error("Error in POST /api/ai/generate-datapoints (synchronous part):", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return NextResponse.json({ success: false, message: 'Invalid JSON in request body.', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to initiate AI task.', error: error.message }, { status: 500 });
  }
}

// MODIFIED GET Handler for simple API Test
export async function GET(req: NextRequest) {
  console.log("GET /api/ai/generate-datapoints endpoint hit - performing API test.");

  const apiKey = GEMINI_API_KEY || req.nextUrl.searchParams.get("geminiApiKey"); // Allow passing API key via query for quick tests

  if (!apiKey) {
    console.warn("API Key for test is missing (checked ENV and query param 'geminiApiKey').");
    return NextResponse.json(
      { success: false, message: "API Key is not configured (checked GEMINI_API_KEY env var and 'geminiApiKey' query parameter)." },
      { status: 503 }
    );
  }

  try {
    console.log(`Attempting to connect to Gemini with model: ${MODEL_NAME}`);
    const genAI = new GoogleGenAI({ apiKey });

    // Simple prompt for testing
    const testPrompt = "Hi, how are you today?";
    const request = {
      model: MODEL_NAME, // Using the same model as your main functionality
      contents: [{ role: "user", parts: [{ text: testPrompt }] }],
      // Using the same safety settings for consistency, though for "Hi" it's less critical
      safetySettings: SAFETY_SETTINGS, 
      generationConfig: {
        maxOutputTokens: 50, // Keep response short for a test
      }
    };
    
    const result = await genAI.models.generateContent(request);
    
    // Check for blocked content (same logic as in generateContentWithRetry)
    let blocked = false;
    let blockMessage = "";
    if (result.promptFeedback?.blockReason) {
      blocked = true;
      blockMessage = `Content generation blocked by promptFeedback: ${result.promptFeedback.blockReason}`;
      if (result.promptFeedback.blockReasonMessage) {
        blockMessage += ` - ${result.promptFeedback.blockReasonMessage}`;
      }
    } else {
      const candidate = result.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        blocked = true;
        blockMessage = `Content generation stopped due to candidate safety (finishReason: SAFETY).`;
        if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
            blockMessage += ` Details: ${candidate.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ')}`;
        }
      }
    }

    if (blocked) {
      console.error(`[API Test] Blocked: ${blockMessage}`);
      return NextResponse.json({ success: false, message: "AI content generation was blocked.", details: blockMessage, promptFeedback: result.promptFeedback, candidates: result.candidates }, { status: 400 });
    }

    const aiResponseText = result.text;

    if (typeof aiResponseText !== 'string') {
        console.warn("[API Test] AI response's .text property did not return a string. Full response:", JSON.stringify(result, null, 2));
        const firstCandidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
         if (typeof firstCandidateText === 'string') {
            console.warn("[API Test] Found text in first candidate, using that as fallback for test response.");
            return NextResponse.json({ success: true, prompt: testPrompt, response: firstCandidateText, fullResponse: result });
        }
        return NextResponse.json({ success: false, message: "AI response did not provide usable text.", fullResponse: result }, { status: 500 });
    }

    console.log(`[API Test] Success! Prompt: "${testPrompt}", AI Response: "${aiResponseText.substring(0, 100)}..."`);
    return NextResponse.json({ success: true, prompt: testPrompt, response: aiResponseText, fullResponse: result });

  } catch (error: any) {
    let errorMessage = error.message;
    if (error.cause instanceof Error) {
        errorMessage = `${errorMessage} (Caused by: ${error.cause.message})`;
    }
    console.error("[API Test] Error during API test:", errorMessage, error.stack);
    console.error("[API Test] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    // Try to determine a more specific status code based on common error patterns
    let status = 500;
    if (errorMessage.includes("API key not valid")) status = 401;
    else if (errorMessage.includes("Permission denied") || errorMessage.includes("access")) status = 403;
    else if (errorMessage.includes("model") && (errorMessage.includes("not found") || errorMessage.includes("format"))) status = 400;


    return NextResponse.json({ success: false, message: 'API test failed.', error: errorMessage, errorDetails: error }, { status });
  }
}