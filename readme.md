# AV Solar Local Control Panel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- Add other relevant badges here, e.g., Build Status, Version -->

**Version:** 1.0

Welcome to the **AV Solar Local Control Panel**! This dashboard provides a local web interface to monitor and potentially control parameters of an AV Solar Mini-Grid system (or similar systems) communicating via OPC UA. It's designed to run offline on a local machine and can be installed as a Progressive Web App (PWA) for a native-like experience.

A key feature of this project is its **dynamically generated UI**. The dashboard components (displays, gauges, switches, buttons) are not hardcoded but are created based on the configuration defined in the `src/config/dataPoints.ts` file. This makes the dashboard adaptable to different system configurations or entirely new projects with minimal code changes.

---

## Table of Contents

1.  [Technical Documentation](#technical-documentation)
2.  [Key Features](#2-key-features)
3.  [Architecture Overview](#3-architecture-overview)
4.  [Prerequisites](#4-prerequisites)
5.  [Getting Started (User Setup)](#5-getting-started-user-setup)
6.  [Running as a Desktop App (PWA)](#6-running-as-a-desktop-app-pwa)
7.  [Adapting for a New Project (Dynamic UI Configuration)](#7-adapting-for-a-new-project-dynamic-ui-configuration)
8.  [Advanced Setup & Automation (Windows)](#8-advanced-setup--automation-windows)
    *   [Creating a Start Script (`.bat`)](#creating-a-start-script-bat)
    *   [Converting `.bat` to `.exe` (Optional)](#converting-bat-to-exe-optional)
    *   [Using the Windows Installer Scripts](#using-the-windows-installer-scripts)
9.  [Troubleshooting](#9-troubleshooting)
10. [Contributing](#10-contributing)
11. [License](#11-license)
12. [Acknowledgments](#12-acknowledgments)

---

## Technical Documentation

For detailed technical documentation of the codebase, including modules, components, and functions, please see the [TypeDoc generated documentation](./docs/typedoc/README.md).

---

## 2. Key Features
## 2. Key Features

*   **Local Control & Monitoring:** Access your solar system data directly on your local network.
*   **Offline Capability:** Designed to run without constant internet access after initial setup.
*   **OPC UA Integration:** Communicates with compatible devices using the OPC UA protocol.
*   **Dynamic UI Generation:** Interface components are generated based on a central configuration file (`dataPoints.ts`), allowing easy adaptation for different devices or projects.
*   **PWA Support:** Installable as a desktop application using Chrome's "Install App" feature.
*   **Categorized Data Display:** Organizes data points into logical categories (Battery, Grid, Inverter, PV, etc.).
*   **Multiple UI Component Types:** Supports various visualizations like simple displays, gauges, switches, and buttons.
*   **Windows Automation:** Includes optional scripts for automated installation, startup, and uninstallation on Windows.

---

## 3. Architecture Overview

This application is built using:

*   **Next.js:** A React framework for server-rendered or statically exported web applications.
*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** Adds static typing to JavaScript for better code quality and maintainability.
*   **OPC UA Client Library:** A library to handle communication with the OPC UA server on the target device.
*   **`src/config/dataPoints.ts`:** The central configuration file defining all data points, their OPC UA Node IDs, data types, display properties (UI type, icon, unit, category), and scaling factors. This file dictates what the UI displays and how it interacts with the backend.
*   **Dynamic Rendering:** React components read the `dataPoints` configuration and dynamically render the appropriate UI elements (displays, gauges, etc.) for each data point.

---

## 4. Prerequisites

Before starting, make sure you have the following installed:

*   **Node.js:** LTS version recommended (Download from [nodejs.org](https://nodejs.org/))
*   **Git:** (Download from [git-scm.com](https://git-scm.com/))
*   **Google Chrome:** Or another Chromium-based browser that supports PWA installation.

---

## 5. Getting Started (User Setup)

Follow these steps to set up and run the application locally:

1.  **Clone the Repository:**
    Open a terminal or command prompt and run:
    ```bash
    git clone https://github.com/DeegayuA/AV-Mini-Grid-Offline-Dashboard.git
    cd AV-Mini-Grid-Offline-Dashboard
    ```
    *(Note: If the project folder name is different, use that name in the `cd` command)*

2.  **Install Dependencies:**
    Install the required Node.js packages:
    ```bash
    npm install
    ```

3.  **Build the Application:**
    This optimizes the application for production:
    ```bash
    npm run build
    ```

4.  **Start the Application:**
    Run the built application:
    ```bash
    npm start
    ```
    This will typically start the server on `http://localhost:3000`.

5.  **Access the Dashboard:**
    Open your web browser (e.g., Google Chrome) and navigate to `http://localhost:3000`. You should see the AV Solar Local Control Panel interface.

---

## 6. Running as a Desktop App (PWA)

For a more integrated desktop experience, you can install the running web application as a PWA:

1.  Ensure the application is running locally (`npm start`).
2.  Open **Google Chrome** and navigate to `http://localhost:3000`.
3.  Look for an **Install icon** in the address bar (often looks like a computer screen with a downward arrow) or go to the Chrome **three dots menu** (...) -> **Install [App Name]...**.
4.  Follow the prompts to install the application.
5.  A shortcut will be added to your desktop or applications folder, allowing you to launch the control panel in its own window, separate from the main browser.

---

## 7. Adapting for a New Project (Dynamic UI Configuration)

This dashboard is designed to be adaptable. The user interface elements are generated dynamically based on the configuration defined in the `src/config/dataPoints.ts` file. To adapt this dashboard for a different solar system, generator, or any device exposing data via OPC UA, follow these steps:

1.  **Identify Device Data Points:**
    *   Determine the specific **OPC UA Node IDs** for the parameters you want to monitor or control on your target device.
    *   Understand the **Data Type** (e.g., `Int16`, `Float`, `Boolean`), **physical unit** (e.g., `V`, `A`, `W`, `Hz`, `%`, `°C`), and any **scaling factor** needed for each Node ID (e.g., raw value 5163 represents 51.63V, so the factor is 0.01).

2.  **Modify `src/config/dataPoints.ts`:**
    *   Open the `src/config/dataPoints.ts` file in your code editor.
    *   This file contains an array of `DataPoint` objects. Each object defines one parameter displayed or controlled in the UI.
    *   **Add, remove, or modify** entries in the `dataPoints` array to match your device.
    *   For each `DataPoint`, ensure the following fields are accurately configured:
        *   `id`: A unique kebab-case string identifier (used internally). Generate using `createId()`.
        *   `name`: Human-readable name displayed in the UI.
        *   `nodeId`: The exact OPC UA Node ID (e.g., `'ns=4;i=114'`). **Crucial for communication.**
        *   `dataType`: The OPC UA data type (e.g., `'Int16'`, `'Float'`, `'Boolean'`). **Must match the server.**
        *   `uiType`: How it should be rendered (`'display'`, `'gauge'`, `'switch'`, `'button'`).
        *   `icon`: Choose an appropriate icon from `lucide-react`.
        *   `unit`: The physical unit to display (e.g., `'V'`, `'A'`, `'%'`).
        *   `factor`: (Optional) A multiplier applied to the raw value before display (e.g., `0.1`, `0.01`). Defaults to `1` if omitted.
        *   `category`: Grouping for UI organization (e.g., `'battery'`, `'grid'`, `'pv'`). Add new categories if needed.
        *   `min`, `max`: (Optional) Used for `gauge` limits.
        *   `description`: (Optional) Tooltip text.
        *   *Other fields:* `phase`, `isSinglePhase`, `threePhaseGroup`, `notes` provide additional context for rendering or documentation.
    *   Refer to the `DataPoint` interface definition at the top of the file for details on all available fields.

3.  **Rebuild and Restart:**
    After saving your changes to `dataPoints.ts`:
    ```bash
    npm run build
    npm start
    ```

4.  **Verify:**
    Access the dashboard at `http://localhost:3000` and confirm that the UI now reflects the new data points, categories, and UI types you defined. Check that values are displayed correctly (considering units and factors).

**Key Considerations for Adaptation:**

*   **Correct `nodeId` and `dataType` are essential** for successful communication with the OPC UA server.
*   **Accurate `factor` values** are needed to display meaningful physical units.
*   The backend logic responsible for OPC UA communication must be running and correctly configured to connect to your specific device's OPC UA server endpoint. (This README focuses on the frontend adaptation).

---

## 8. Advanced Setup & Automation (Windows)

These steps provide ways to automate the startup process, primarily for Windows environments.

### Creating a Start Script (`.bat`)

You can create a batch file to automate starting the Next.js server and launching the PWA.

1.  **Create `start-next.bat`:** In the project's root directory, create a file named `start-next.bat`.
2.  **Edit the Script:** Add commands similar to the example below (adjust paths and app ID as needed). *Note: The original script mentioned potential bug fixes; refer to the latest version in the repository if available.*
    ```bat
    @echo off
    echo Starting AV Solar Local Control Panel...
    cd /d "%~dp0"

    REM Start the Next.js server in a new window
    start "AV Solar Server" cmd /k "npm start"

    echo Waiting for server to start...
    timeout /t 5 /nobreak > nul

    echo Launching PWA...
    REM Replace YOUR_CHROME_APP_ID with the actual ID of your installed PWA
    REM Find ID via chrome://apps -> Right-click app -> App Info
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory=Default --app-id=YOUR_CHROME_APP_ID

    echo Done. The server window can be minimized.
    exit
    ```
    *   `%~dp0`: Ensures the script runs relative to its location.
    *   `timeout /t 5`: Waits 5 seconds for the server to potentially start. Adjust if needed.
    *   `YOUR_CHROME_APP_ID`: Replace this with the actual ID of the PWA you installed in Chrome (find it via `chrome://apps`).

### Converting `.bat` to `.exe` (Optional)

To create a cleaner executable without a visible command prompt for the launcher script (the server window will still appear unless hidden in the Node.js app itself):

1.  **Use a Converter:** Download and use a tool like "Bat To Exe Converter".
2.  **Convert:**
    *   Open the converter and select your `start-next.bat`.
    *   Optionally, assign a custom `.ico` file.
    *   In options, you might choose "Invisible Application" (though this might hide errors).
    *   Convert to generate `start-next.exe`.
3.  **Create Shortcut:** Create a desktop shortcut pointing to this `.exe` file for easy launching.

### Using the Windows Installer Scripts

For developers or administrators deploying on Windows, the repository may include helper scripts:

*   **`setup.ps1`**: (Potentially) A PowerShell script to automate cloning, dependency installation, building, and launching. Run as Administrator: `.\setup.ps1`.
*   **`uninstaller.ps1`**: (Potentially) A PowerShell script to remove application files and dependencies. Run as Administrator: `.\uninstaller.ps1`.
*   **`install.iss`**: (Potentially) An Inno Setup script file. Compile this using the [Inno Setup Compiler](https://jrsoftware.org/isinfo.php) to create a user-friendly Windows installer (`.exe`).

*Check the repository for the existence and specifics of these files.*

---

## 9. Troubleshooting

If you encounter issues:

*   **Dependencies:** Ensure all dependencies are installed correctly (`npm install`). Delete `node_modules` and `package-lock.json` and run `npm install` again if needed.
*   **Server Not Running:** Make sure the local server is running (`npm start`) before trying to access `http://localhost:3000`. Check the terminal window where you ran `npm start` for errors.
*   **OPC UA Connection:** Verify that the target device is powered on, connected to the network, and its OPC UA server is running and accessible from the machine running this dashboard. Check firewall settings if necessary. Confirm the OPC UA endpoint configuration used by the backend service.
*   **Incorrect Data:** If data appears wrong (e.g., nonsensical values), double-check the `nodeId`, `dataType`, and especially the `factor` for that data point in `src/config/dataPoints.ts`.
*   **PWA Issues:** If the PWA shortcut doesn't work or the `.bat` file fails to launch it, verify the Chrome App ID used in the script is correct (`chrome://apps`). Ensure Chrome is installed in the expected location.

---

## 10. Contributing

Contributions are welcome! If you have suggestions, bug reports, or want to contribute code:

1.  **Issues:** Please open an issue on the GitHub repository to discuss the change or report a bug.
2.  **Pull Requests:** Fork the repository, create a new branch for your feature or fix, make your changes, and submit a pull request following standard guidelines.

---

## 11. License

This project is licensed under the [MIT License](LICENSE). See the `LICENSE` file for details.

---

## 12. Acknowledgments

This project leverages the power of open-source software. We extend our gratitude to the developers and communities behind these key libraries and frameworks:

*   **Core Framework & UI:**
    *   [Next.js](https://nextjs.org/) - The React Framework for Production.
    *   [React](https://reactjs.org/) - The library for web and native user interfaces.
    *   [TypeScript](https://www.typescriptlang.org/) - For static typing and improved developer experience.
*   **Styling & UI Components:**
    *   [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework.
    *   [Radix UI](https://www.radix-ui.com/) - For unstyled, accessible UI primitives.
    *   [shadcn/ui](https://ui.shadcn.com/) - The component structure strongly suggests its use, combining Radix UI and Tailwind CSS.
    *   [Lucide Icons](https://lucide.dev/) - Beautifully simple, pixel-perfect icons.
    *   [Framer Motion](https://www.framer.com/motion/) / [Motion Plus](https://motion-plus.dev/) - For UI animations.
    *   [Tailwind Merge](https://github.com/dcastil/tailwind-merge) & [clsx](https://github.com/lukeed/clsx) - For managing Tailwind classes.
    *   [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate) - Animation utilities for Tailwind.
*   **OPC UA Communication:**
    *   [node-opcua](https://node-opcua.github.io/) - The core library enabling communication with OPC UA servers.
*   **Data Visualization & Interaction:**
    *   [Recharts](https://recharts.org/) - A composable charting library.
    *   [React Flow](https://reactflow.dev/) - For creating node-based editors and diagrams.
    *   [React Hook Form](https://react-hook-form.com/) - Performant, flexible and extensible forms with easy-to-use validation.
    *   [Zod](https://zod.dev/) - TypeScript-first schema declaration and validation.
*   **Utilities & Features:**
    *   [NextThemes](https://github.com/pacocoursey/next-themes) - For easy theme (dark/light mode) management.
    *   [Sonner](https://sonner.emilkowal.ski/) - An opinionated toast component for React.
    *   [idb](https://github.com/jakearchibald/idb) - A promise-based wrapper for IndexedDB, (for future versions)
    *   [date-fns](https://date-fns.org/) - Modern JavaScript date utility library.

Special thanks to the entire open-source community for providing the tools that make projects like this possible.

---

🎉 **You're all set!** Enjoy using the AV Solar Local Control Panel.
