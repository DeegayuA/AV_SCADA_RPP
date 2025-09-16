// app/api/onboarding/check-config/route.ts
import { NextResponse } from 'next/server';
import { PLANT_NAME } from '@/config/appConfig';

export async function GET() {
  try {
    // Check if the plant name is the default placeholder value
    const isDefaultConfig = PLANT_NAME === 'Default Plant';

    // If it's the default config, it means the app is not configured yet
    const configExists = !isDefaultConfig;

    return NextResponse.json({ configExists });
  } catch (error) {
    console.error('Error checking configuration:', error);
    // Return a generic error response to the client
    return NextResponse.json(
      { error: 'An error occurred while checking the configuration.' },
      { status: 500 }
    );
  }
}
