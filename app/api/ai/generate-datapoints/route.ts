// app/api/ai/generate-datapoints/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
  enumSet?: Record<number | string, string>; // For status codes or multi-state variables
}

// Interface for the data read from discovered_datapoints.json
interface DiscoveredDataPoint {
  name: string;
  address: string; // This is the nodeId
  initialValue: any;
  dataType: string; // Original dataType string from OPC UA (e.g., "Float", "Int32", "i=10", "ns=0;i=6")
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will not be available.");
  // Depending on policy, you might throw an error here or allow the server to run with AI disabled.
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest", // Or "gemini-pro" - flash is faster and cheaper for simpler tasks
    safetySettings: [ // Adjust safety settings as needed
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
}) : null;

function buildPrompt(discoveredDatapoints: DiscoveredDataPoint[]): string {
  const formattedDataPoints = discoveredDatapoints.map(dp => ({
    name: dp.name,
    address: dp.address,
    dataType: dp.dataType, // Keep original dataType for AI to interpret
    // initialValue: dp.initialValue // initialValue might be too verbose for the prompt, focus on structure
  }));

  // Instruction to map OPC UA data types to simplified DataPoint types
  const dataTypeMappingGuidance = `
  Map the provided 'dataType' string from OPC UA to one of the allowed TypeScript string literals in the DataPoint interface's 'dataType' field.
  Allowed types: 'Boolean', 'Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'String', 'DateTime', 'ByteString', 'Guid', 'Byte', 'SByte', 'Int64', 'UInt64', 'StatusCode', 'LocalizedText', 'Unknown'.
  Common OPC UA data types and their typical mappings:
  - "Boolean" -> "Boolean"
  - "Float" (typically i=10) -> "Float"
  - "Double" (typically i=11) -> "Double"
  - "Int16" (typically i=4) -> "Int16"
  - "Int32" (typically i=6) -> "Int32"
  - "UInt16" (typically i=5) -> "UInt16"
  - "UInt32" (typically i=7) -> "UInt32"
  - "String" (typically i=12) -> "String"
  - "DateTime" (typically i=13) -> "DateTime"
  - Numeric NodeIds (e.g., "i=6") often refer to standard OPC UA types. If unsure, use the most common mapping or "Unknown".
  - For more complex types or if unclear, use "Unknown". The name of the datapoint (e.g., "ServerStatus") might hint at the type.
  `;

  return `
You are an expert in industrial automation, OPC UA data modeling, and SCADA/HMI interface design.
Your task is to transform a list of raw datapoints, discovered from an OPC UA server, into a structured JSON format suitable for a web application.
You need to infer sensible values for UI presentation and interaction based on the provided information.

Input: A JSON array of raw datapoints:
${JSON.stringify(formattedDataPoints, null, 2)}

Target TypeScript interface for each datapoint:
interface DataPoint {
  label: string; // User-friendly label. Often similar to 'name', but can be more descriptive or humanized (e.g., "Tank Level" from "TankLevel_Sensor").
  id: string; // A unique kebab-case identifier (e.g., "tank-level-sensor"). Derive this from 'name' by lowercasing, replacing spaces/underscores with hyphens, and removing special characters. Ensure uniqueness if names are very similar.
  name: string; // Original 'name' from OPC UA.
  nodeId: string; // Original 'address' (NodeId) from OPC UA.
  dataType: 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte' | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText' | 'Unknown'; // Mapped data type.
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input' | 'slider' | 'indicator'; // Infer based on name, dataType. E.g., Booleans often 'switch' or 'indicator'. Numbers can be 'display', 'gauge', 'input', or 'slider'. Strings are 'display' or 'input'.
  icon?: string; // Suggest a relevant icon name string from the Lucide icon library (e.g., 'Zap' for power, 'Thermometer' for temperature, 'Settings' for configuration, 'ToggleLeft' for boolean off, 'ToggleRight' for boolean on, 'Gauge' for measurements, 'Info' for status, 'AlertTriangle' for alarms).
  unit?: string; // Infer units from name (e.g., 'Temperature' -> '°C', 'Voltage' -> 'V', 'Pressure' -> 'bar' or 'psi', 'Speed' -> 'rpm' or 'm/s', 'Level' -> '%'). If not obvious, omit.
  min?: number; // Sensible minimum for numeric types, especially for 'gauge' or 'slider' uiType. E.g., 0 for levels, -20 for some temperatures.
  max?: number; // Sensible maximum for numeric types, especially for 'gauge' or 'slider' uiType. E.g., 100 for levels, 120 for some temperatures.
  description?: string; // A brief, auto-generated description of what the datapoint might represent.
  category?: string; // Categorize the datapoint (e.g., 'Process Values', 'Machine Status', 'Alarms', 'Operator Controls', 'System Settings', 'Energy Monitoring'). Infer from name.
  factor?: number; // Default to 1. Only suggest other values if the name implies scaling (e.g., "kValue" might imply 1000, but usually stick to 1).
  precision?: number; // Default to 2 for 'Float'/'Double' types if they represent sensor readings. 0 for integers.
  isWritable?: boolean; // Infer if the datapoint seems like a setting or command (true) versus a sensor reading or status (false). Look for terms like "SetPoint", "Command", "Control".
  decimalPlaces?: number; // Synonym for precision. Use 'precision'.
  enumSet?: Record<number | string, string>; // If the name or description implies a set of states (e.g., a status code like "MachineStatus" with values 0: 'Off', 1: 'Running', 2: 'Error'), suggest a possible enum mapping. Otherwise, omit. For example, if a name is "PumpState" and it's an Int, you might infer {0: "Stopped", 1: "Running", 2: "Fault"}.
}

${dataTypeMappingGuidance}

Based on the input array of discovered datapoints and the target interface:
1.  Transform EACH discovered datapoint into a fully populated DataPoint object.
2.  Pay close attention to inferring `label`, `id` (kebab-case from name), `uiType`, `icon`, `unit`, `category`, and `isWritable`.
3.  The `dataType` in the output DataPoint object MUST be one of the allowed string literals. Use the original `dataType` from the input to make this conversion.
4.  Provide the output STRICTLY as a JSON array of DataPoint objects. Do not include any explanations, comments, or surrounding text like \`\`\`json ... \`\`\`. Only the JSON array itself.
5.  If a field is optional (e.g. `unit`, `min`, `max`, `enumSet`) and cannot be reasonably inferred, omit it from the object.
6.  Ensure `id` is unique for each generated datapoint. If names are very similar, add a numeric suffix to the id.
7.  For `icon`, provide only the name of the Lucide icon, e.g., "Thermometer", not the full import or component.

Example for `id` generation: "Motor Speed" becomes "motor-speed". "Sensor_1_Temp" becomes "sensor-1-temp".
Example for `label` generation: "Motor_Speed_RPM" becomes "Motor Speed (RPM)". "TempSensorMain" becomes "Main Temperature Sensor".

Process all discovered datapoints provided in the input array.
The final output must be a single JSON array.
`;
}

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY || !model) {
    return NextResponse.json({ success: false, message: "AI model is not available. GEMINI_API_KEY might be missing." }, { status: 503 });
  }

  console.log("POST /api/ai/generate-datapoints endpoint hit.");
  let filePath: string;

  try {
    const body = await req.json();
    filePath = body.filePath;

    if (!filePath) {
      return NextResponse.json({ success: false, message: 'File path to discovered_datapoints.json is required.' }, { status: 400 });
    }
    console.log(`Received request for filePath: ${filePath}`);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const discoveredDatapoints: DiscoveredDataPoint[] = JSON.parse(fileContent);
    console.log(`Successfully read and parsed ${discoveredDatapoints.length} discovered datapoints.`);

    if (!discoveredDatapoints || discoveredDatapoints.length === 0) {
      return NextResponse.json({ success: false, message: 'No discovered datapoints found in the file to process.' }, { status: 400 });
    }

    const prompt = buildPrompt(discoveredDatapoints);
    console.log("Generated prompt for Gemini AI. Length:", prompt.length);
    // console.log("Prompt content (first 500 chars):", prompt.substring(0,500)); // For debugging

    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiTextOutput = response.text();
    console.log("Received response from Gemini AI.");
    // console.log("AI Text Output (first 500 chars):", aiTextOutput.substring(0,500)); // For debugging

    // Attempt to clean the AI response (remove markdown, ensure it's valid JSON)
    let cleanedJsonText = aiTextOutput.trim();
    if (cleanedJsonText.startsWith("```json")) {
      cleanedJsonText = cleanedJsonText.substring(7);
    }
    if (cleanedJsonText.endsWith("```")) {
      cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
    }
    cleanedJsonText = cleanedJsonText.trim(); // Trim again after removing markdown

    try {
      const generatedDataPoints: DataPoint[] = JSON.parse(cleanedJsonText);
      console.log(`Successfully parsed AI response into ${generatedDataPoints.length} DataPoint objects.`);
      // TODO: Add validation here to ensure generatedDataPoints match the DataPoint interface more strictly.
      return NextResponse.json({ success: true, data: generatedDataPoints, count: generatedDataPoints.length }, { status: 200 });
    } catch (parseError: any) {
      console.error("Failed to parse AI response as JSON:", parseError.message);
      console.error("Problematic AI Output (raw):", aiTextOutput); // Log the raw output for debugging
      return NextResponse.json({
        success: false,
        message: 'Failed to parse AI response. The output was not valid JSON.',
        error: parseError.message,
        rawAiOutput: aiTextOutput // Send raw output for client-side debugging if needed
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error in AI datapoint generation:", error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ success: false, message: `File not found at path: ${filePath!}` }, { status: 400 });
    }
    // Check if it's a Gemini API error (e.g., related to API key, quota, safety settings)
    if (error.message && (error.message.includes("API key") || error.message.includes("quota") || error.message.includes("safety settings") || error.message.includes("GoogleGenerativeAI"))) {
        return NextResponse.json({ success: false, message: `AI service error: ${error.message}` }, { status: 503 });
    }
    return NextResponse.json({ success: false, message: 'An unexpected error occurred during AI datapoint generation.', error: error.message }, { status: 500 });
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
