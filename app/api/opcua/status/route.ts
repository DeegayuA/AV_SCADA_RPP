// /api/opcua/status/route.ts
import { NextResponse } from 'next/server';
import { getOpcuaStatus } from '@/lib/opcua-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const status = getOpcuaStatus();
    return NextResponse.json({ connectionStatus: status });
}