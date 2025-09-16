// app/api/onboarding/setup-template/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // 1. Get the file list for the selected plant
    const response = await fetch(`https://api.github.com/repos/DeegayuA/AV_SCADA_Configs/contents/${templateId}`);
    if (!response.ok) {
      throw new Error(`Failed to list files for plant: ${response.statusText}`);
    }
    const files = await response.json();

    const constantsFile = files.find((f: any) => f.name === 'constants.ts');
    const dataPointsFile = files.find((f: any) => f.name === 'dataPoints.ts');

    if (!constantsFile || !dataPointsFile) {
      throw new Error("Required configuration files (constants.ts, dataPoints.ts) not found in the repository for this plant.");
    }

    // 2. Fetch the content of the files
    const [constantsResponse, dataPointsResponse] = await Promise.all([
      fetch(constantsFile.download_url),
      fetch(dataPointsFile.download_url)
    ]);

    if (!constantsResponse.ok) throw new Error('Failed to download constants.ts');
    if (!dataPointsResponse.ok) throw new Error('Failed to download dataPoints.ts');

    const constantsContent = await constantsResponse.text();
    const dataPointsContent = await dataPointsResponse.text();

    // 3. Save the files to the config directory
    const configDir = path.join(process.cwd(), 'config');
    const appConfigPath = path.join(configDir, 'appConfig.ts');
    const dataPointsPath = path.join(configDir, 'dataPoints.ts');

    // The constants file from the repo should be saved as appConfig.ts
    await fs.writeFile(appConfigPath, constantsContent);
    await fs.writeFile(dataPointsPath, dataPointsContent);

    return NextResponse.json({ message: 'Configuration set up successfully!' });
  } catch (error) {
    console.error('Error setting up template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
