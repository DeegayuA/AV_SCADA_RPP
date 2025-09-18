// app/api/onboarding/reset-config/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const defaultConfigContent = {
  appConfig: `
export const APP_NAME = 'AV Mini-Grid';
export const PLANT_NAME = 'Default Plant';
export const PLANT_LOCATION = 'Default Location';
export const PLANT_TYPE = 'Default Type';
export const PLANT_CAPACITY = '0 kW';
export const OPC_UA_ENDPOINT_OFFLINE = 'opc.tcp://127.0.0.1:4840';
export const OPC_UA_ENDPOINT_ONLINE = '';
export const VERSION = '1.6.0';
export const APP_AUTHOR = 'Default Author';
export const APP_LOGO = '/av_logo.svg';
export const WEBSOCKET_CUSTOM_URL_KEY = 'websocket_custom_url';
export const GRAPH_SERIES_CONFIG_KEY = 'graph_series_config';
`,
  dataPoints: `
import { DataPointConfig } from '@/types';

export const dataPoints: DataPointConfig[] = [];
`,
};

export async function POST() {
  try {
    const configDir = path.join(process.cwd(), 'config');
    const appConfigPath = path.join(configDir, 'appConfig.ts');
    const dataPointsPath = path.join(configDir, 'dataPoints.ts');

    await fs.writeFile(appConfigPath, defaultConfigContent.appConfig.trim());
    await fs.writeFile(dataPointsPath, defaultConfigContent.dataPoints.trim());

    return NextResponse.json({ message: 'Configuration reset successfully.' });
  } catch (error) {
    console.error('Error resetting configuration files:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting the configuration.' },
      { status: 500 }
    );
  }
}
