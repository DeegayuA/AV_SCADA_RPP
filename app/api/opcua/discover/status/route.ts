// app/api/opcua/discover/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryProgress, ensureServerInitialized } from '@/lib/opcua-server';

export async function GET(req: NextRequest) {
  ensureServerInitialized();
  const progress = getDiscoveryProgress();
  return NextResponse.json(progress, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
