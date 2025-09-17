// lib/aiApiClient.ts

const DEFAULT_TIMEOUT = 15000; // 15 seconds for AI requests

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}

interface GeminiTestResponse {
    success: boolean;
    message?: string;
    error?: string;
    details?: string;
    response?: string;
}

export async function testGeminiApiKey(apiKey: string): Promise<GeminiTestResponse> {
  // We are calling our own backend, so the URL is relative.
  const url = `/api/ai/generate-datapoints?geminiApiKey=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    const data: GeminiTestResponse = await response.json();

    if (!response.ok) {
        console.error('API Test Failed:', data);
        return {
            success: false,
            message: data.message || `API request failed with status ${response.status}`,
            error: data.error,
        };
    }

    return {
        success: data.success,
        message: data.success ? `Success! Gemini responded: "${(data.response || '').substring(0, 50)}..."` : (data.message || 'Test failed for an unknown reason.'),
    };
  } catch (error: any) {
    console.error('Error during Gemini API key test:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.name === 'AbortError') {
        errorMessage = 'The request timed out.';
    } else if (error instanceof TypeError) {
        errorMessage = 'A network error occurred. Check your connection.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return {
      success: false,
      message: 'Failed to connect to the server for API test.',
      error: errorMessage,
    };
  }
}

interface GenerateDatapointsResponse {
    success: boolean;
    taskId?: string;
    message?: string;
    error?: string;
}

export async function generateDatapoints(apiKey: string, filePath: string): Promise<GenerateDatapointsResponse> {
    const url = '/api/ai/generate-datapoints';
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ geminiApiKey: apiKey, filePath }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || `API request failed with status ${response.status}`,
                error: data.error,
            };
        }

        return {
            success: true,
            taskId: data.taskId,
            message: 'Successfully initiated datapoint generation.',
        };
    } catch (error: any) {
        console.error('Error during datapoint generation:', error);
        return {
            success: false,
            message: 'Failed to connect to the server to start datapoint generation.',
            error: error.message,
        };
    }
}
