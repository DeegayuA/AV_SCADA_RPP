# Manual Capacitor Setup Guide for Solar Dashboard Mobile

## Introduction

This guide provides manual steps to set up Capacitor for the Solar Dashboard mobile application. Automatic setup via scripts was partially blocked due to:
1.  The development environment having a Node.js version (v18.x) lower than required by the Capacitor CLI (v20.x).
2.  The `next export` command failing due to an API route (`app/api/ai/generate-datapoints/route.ts`) being incompatible with static site generation.

These steps will help you configure the project for Capacitor development.

## Prerequisites

*   **Node.js:** Version 20.0.0 or higher.
*   **Android Development:** Android Studio installed.
*   **iOS Development:** Xcode installed (requires a macOS machine).
*   **Project Dependencies:** Ensure you've run `npm install` to get all project dependencies.

## Setup Steps

### Step 1: Fix `next export` Incompatibility

The API route at `app/api/ai/generate-datapoints/route.ts` uses features not compatible with `next export`. You need to modify this file to allow the static export process to complete.

1.  **Open the file:** `app/api/ai/generate-datapoints/route.ts`
2.  **Modify its content:** Replace the current content with a placeholder that is compatible with static export. This means the AI-based data point generation will not work from the statically exported app; the mobile app should rely on a configurable live backend for this feature.

    Example placeholder content:
    ```typescript
    // app/api/ai/generate-datapoints/route.ts
    // This file has been modified to be compatible with 'next export'.
    // The original dynamic functionality will not be available if invoked from a static export.
    import { NextResponse } from 'next/server';

    export async function GET() {
      return NextResponse.json({
        message: 'This AI endpoint is a placeholder for static export. Configure a live backend in the mobile app settings.'
      });
    }

    export async function POST() {
      return NextResponse.json({
        message: 'This AI endpoint is a placeholder for static export. Configure a live backend in the mobile app settings.'
      });
    }

    // If other HTTP methods (PUT, DELETE, etc.) were present, add similar placeholders.
    ```

### Step 2: Ensure `next.config.js` Enables Static Export

Verify that your `next.config.js` file in the project root is configured for static export. It should include `output: 'export'`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Other configurations like eslint ignore and images unoptimized might be present
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
```

### Step 3: Generate Static Web Assets

Run the following command to build the Next.js application and generate the static assets in the `out/` directory:

```bash
npm run export
```
(The `export` script is defined in `package.json` as `next build && next export`).

### Step 4: Initialize Capacitor (or Confirm Configuration)

A `capacitor.config.ts` file should already be present in the project root with the correct basic configuration. Ensure its content matches the following:

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.solardashboard.mobile', // Replace with your desired App ID
  appName: 'Solar Dashboard Mobile',        // Replace with your desired App Name
  webDir: 'out',                            // Should match Next.js export directory
  server: {
    hostname: 'localhost' // Useful for live reload with --external, not for production
  }
};

export default config;
```

If this file is missing, or if you need to change the `appId` or `appName`, you can run the Capacitor initialization command (ensure Node.js v20+ is active):
```bash
npx cap init "[Your App Name]" "[your.app.id]" --web-dir "out"
```

### Step 5: Add Mobile Platforms

This step creates the native Android and iOS project folders. Ensure Node.js v20+ is active.

```bash
npx cap add android
npx cap add ios
```

### Step 6: Sync Web Assets

Copy the static web assets from your `out/` directory into the native mobile projects:

```bash
npx cap sync
```
Or, use the combined script from `package.json` (after ensuring `npm run export` from Step 3 was successful):
```bash
npm run cap:sync
```

### Step 7: Open Native Projects

Open the generated native projects in their respective IDEs:

*   **For Android:**
    ```bash
    npx cap open android
    ```
    This will open the project in Android Studio.

*   **For iOS:**
    ```bash
    npx cap open ios
    ```
    This will open the project in Xcode (on macOS).

### Step 8: Build and Run the App

Use Android Studio or Xcode to build, install, and run your application on simulators/emulators or physical devices.

### Step 9: Configure Backend URL for Mobile App

The mobile application is designed to communicate with a backend Next.js server (which could be the Electron app's server or a separate deployment).

*   **Navigate to Settings:** Inside the mobile app, find the settings page (likely accessible via a "Settings" link or icon, routed to `/settings`).
*   **Enter Backend URL:** Input the full URL of your running Next.js backend.
    *   For local development, if your Next.js/Electron app is running on `http://localhost:3000`, and your mobile device/emulator can access your computer's localhost (e.g., via `http://10.0.2.2:3000` for Android Emulator accessing host machine's localhost, or your local network IP `http://<your-local-ip>:3000`), enter that URL.
    *   For a deployed backend, use its public URL.
*   **Save the URL:** The app will use `@capacitor/preferences` to store this URL and use it for API calls.

The UI code for this is located in `app/settings/page.tsx`, and the logic to retrieve the URL is in `app/utils/getBackendUrl.ts`. The `capacitor-env.d.ts` file provides necessary TypeScript definitions for Capacitor plugins.

This completes the manual setup for Capacitor. Remember that due to the static nature of the exported app, features relying on Next.js server-side rendering or dynamic API routes (like the original AI datapoint generation) must be handled by the configured backend URL.
