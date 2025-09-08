// app/api/snap7/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get status from main snap7 route
    const response = await fetch(`${request.nextUrl.origin}/api/snap7?action=status`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
