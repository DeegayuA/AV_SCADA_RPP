// app/api/db-status/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = "http://192.168.1.9:8003/db-status";

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // Remove mode: 'cors' since we're server-side
    });

    if (!response.ok) {
      throw new Error(`Database status check failed: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Database status proxy error:", error);

    return NextResponse.json(
      {
        status: "disconnected",
        error: "Failed to fetch database status",
      },
      { status: 500 }
    );
  }
}

// Optional: Add other HTTP methods if needed
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
