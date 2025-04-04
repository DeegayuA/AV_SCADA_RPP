# AV Solar Local Control Panel

Welcome to the **AV Solar Local Control Panel**! This guide will walk you through the entire process of setting up and running the app locally, and launching it as a Progressive Web App (PWA) on your desktop.

---

## 1. Prerequisites

Before starting, make sure you have the following installed:
- **Node.js** (Download from [nodejs.org](https://nodejs.org/))
- **Git** (Download from [git-scm.com](https://git-scm.com/))
- **Google Chrome** (for saving the app as a PWA)

---

## 2. Clone the Repository

To get started, clone this repository to your local machine using Git.

1. **Open a terminal/command prompt** and run:
   ```bash
   git clone https://github.com/DeegayuA/AV-Mini-Grid-Offline-Dashboard.git
   ```

2. **Navigate to the project folder**:
   ```bash
   cd av-solar-local-control-panel
   ```

---

## 3. Install Dependencies

Once you've cloned the project, you need to install all dependencies.

1. Run the following command to install required packages:
   ```bash
   npm install
   ```

---

## 4. Build and Start the Next.js App

Now, you need to build and run the Next.js app locally.

1. **Build the app** (this prepares the app for production):
   ```bash
   npm run build
   ```

2. **Start the app**:
   ```bash
   npm start
   ```

This will start the app locally on `http://localhost:3000`.

---

## 5. Save the App as a Web App (PWA)

You can open this app like a native application using Google Chrome's "Save as App" feature.

1. Open **Google Chrome** and go to `http://localhost:3000`.
2. Click on the **three dots** (menu) in the upper-right corner of Chrome.
3. Hover over **"More tools"** and select **"Create shortcut..."**.
4. In the pop-up window:
   - **Name the shortcut** (e.g., **"AV Solar Local Control Panel"**).
   - **Check the box** that says **"Open as window"**.
5. Click **Create**.

This will add a shortcut to your desktop that opens the app in a separate window with no address bar (like a native app).

---

## 6. Create a Desktop Shortcut for Quick Access

Now, let's create a `.bat` file that will start the app and open it in your web browser as a PWA.

1. **Create the `.bat` file**:
   In the root folder of your project, create a new text file named `start-next.bat`.

2. **Edit the `.bat` file**: (new version coming soon with buf fixes)
   Open `start-next.bat` in a text editor (like Notepad) and add the following code:
   
   ```bat
   @echo off
   cd /d "%~dp0"
   start cmd /k "npm start"
   timeout /t 5
   start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory=Default --app-id=abcdefg123456...
   ```
   - `%~dp0` ensures the `.bat` file runs from the folder it is located in.
   - Replace `abcdefg123456...` with the **app ID** of your saved Chrome app.
   - **To find your app ID**: Go to `chrome://apps/`, right-click on your saved app, click **Inspect**, and copy the app ID from the URL.

3. **Save and close** the file.

---

## 7. Convert `.bat` to `.exe` (Optional)

To make it more polished and clean, you can convert the `.bat` file to an `.exe` file. This step is optional, but it will help you avoid showing the terminal window.

1. **Download Bat to Exe Converter**:  
   [Bat To Exe Converter](https://bat-to-exe-converter.en.softonic.com/)  
   Install it on your computer.

2. **Convert the `.bat` file**:
   - Open the **Bat To Exe Converter**.
   - Click **File > Open** and select the `start-next.bat` file you created.
   - In the **icon** box, select your `.ico` file (for your app’s custom icon).
   - Under the **Options** tab:
     - ✅ Check **Invisible Application** if you don't want the terminal window to appear when running.
   - Click **Convert** (gear icon or `F6`).

3. This will generate an `start-next.exe` file that you can use.

---

## 8. Create Desktop Shortcut to `.exe` (for Quick Access)

Now, you can create a desktop shortcut to launch the app:

1. **Copy the `start-next.exe`** (or `start-next.bat`) to your desktop.
2. **Rename it** to something like **"AV Solar Control Panel"**.
3. **Double-click** it, and it will:
   - Start the Next.js app locally.
   - Wait 5 seconds.
   - Launch the Chrome app as a standalone window.

---

## 9. Troubleshooting

If you run into issues, try the following:
- Make sure all dependencies are installed by running `npm install`.
- Ensure your local server is running on `http://localhost:3000` before opening the app.
- If the app doesn't open in PWA mode, verify that the **app ID** in the `.bat` file is correct.

---

## 10. License and Acknowledgments

This project is licensed under the [MIT License](LICENSE).

---

## 11. Developer Setup (Windows)

For developers looking to set up the **AV Solar Local Control Panel** on Windows, we’ve provided an automated installer with installation, uninstallation, and setup scripts. Follow the steps below:

### Files Provided

1. **`setup.ps1`**: This PowerShell script handles the entire installation process. It clones the latest version of the repository, installs dependencies, builds the app, and launches it as a PWA.
   
2. **`uninstaller.ps1`**: This PowerShell script will remove all files and dependencies associated with the app when executed, effectively uninstalling the app.

3. **`install.iss`**: This Inno Setup script creates an installer for the app, allowing you to install it on a Windows machine. It ensures that all dependencies are installed and the app is correctly configured for use.

### Steps to Use the Installer

1. **Install Inno Setup**:
   - Download and install [Inno Setup](https://jrsoftware.org/isinfo.php) to compile the installer.

2. **Run the Setup Script**:
   - Open a PowerShell prompt as Administrator and navigate to the project folder.
   - Execute the `setup.ps1` script by running:
     ```powershell
     .\setup.ps1
     ```
   This will:
   - Clone the repository (if not already cloned).
   - Install dependencies.
   - Build the app and start the server.
   - Launch the app in full-screen mode as a PWA using Chrome.

3. **To Uninstall**:
   - If you want to uninstall the app, run the `uninstaller.ps1` script:
     ```powershell
     .\uninstaller.ps1
     ```

4. **Create the Installer**:
   - To generate an installer `.exe`, run the `install.iss` script through Inno Setup Compiler:
     1. Open Inno Setup Compiler.
     2. Load `install.iss`.
     3. Compile the script to create the installer (`SolarMiniGridInstaller.exe`).
     4. Run the installer on any Windows machine to install the app.

Enjoy the convenience of automated setup on Windows!

---

🎉 **You're all set!** You've successfully set up the **AV Solar Local Control Panel** on your computer and saved it as a web app. Enjoy! If you encounter any problems or have suggestions, please open an issue on GitHub.
