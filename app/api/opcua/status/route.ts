import { NextResponse } from 'next/server';
import { OPCUAClient } from 'node-opcua';

export const dynamic = "force-dynamic"; 

const endpointUrl = "opc.tcp://localhost:4840";

export async function GET() {
  const client = OPCUAClient.create({ endpointMustExist: false });

  try {
    await client.connect(endpointUrl);
    await client.disconnect();

    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("OPC UA Connection Error:", error);
    return NextResponse.json({ connected: false });
  }
}