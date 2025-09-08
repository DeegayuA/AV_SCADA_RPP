// app/api/opcua/discover/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { discoveryProgressCache } from '../../route'; // Adjust path as necessary

export async function GET(req: NextRequest) {
  return NextResponse.json(discoveryProgressCache, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
