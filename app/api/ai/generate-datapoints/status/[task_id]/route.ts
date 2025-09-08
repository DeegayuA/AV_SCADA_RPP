import { NextResponse } from 'next/server';

// Initialize or ensure global task storage
if (!global.aiTasks) {
  console.log("Initializing global.aiTasks Map for AI task statuses.");
  global.aiTasks = new Map();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const resolvedParams = await params;
  const taskId = resolvedParams.task_id;

  if (!global.aiTasks) {
    // This should ideally not happen if initialized correctly above, but as a safeguard.
    console.error("global.aiTasks not initialized!");
    return NextResponse.json({ message: "Task status store not available." }, { status: 500 });
  }

  const task = global.aiTasks.get(taskId);

  if (!task) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  // Remove sensitive data like API key before sending status to client
  const { originalRequest, ...taskStatusToSend } = task;
  if (originalRequest && originalRequest.geminiApiKey) {
    // We don't want to send the API key back to the client
    // Create a new object for originalRequest without the key if needed for client display
    // For now, just ensure taskStatusToSend doesn't have it directly
  }


  return NextResponse.json(taskStatusToSend);
}
