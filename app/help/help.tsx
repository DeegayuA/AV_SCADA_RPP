// app/help/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LifeBuoy,
  Search,
  BookOpen,
  BarChart3,
  SlidersHorizontal,
  AlertTriangle,
  Settings,
  UserCircle,
  Mail,
  ChevronRight,
  Zap,
  Power,
  Database,
  FileText,
  Users,
  Globe,
  MessageSquare,
  Palette,
  Volume2,
  Bell,
  ShieldCheck,
  Lightbulb,
  Info,    
  Clock,
  KeyRound,
  Network,
  Wifi,
  Phone, // For phone numbers
  MapPin, // For address
} from 'lucide-react';
import { APP_NAME, APP_AUTHOR } from '@/config/constants'; // Assuming APP_AUTHOR is "AltaVision (Pvt) Ltd" or similar
import { useTheme } from 'next-themes';
import Link from 'next/link';

// --- Types ---
interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  keywords?: string[];
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  colorClassLight: string;
  colorClassDark: string;
  description: string;
  faqs?: FAQItem[];
}

// --- Comprehensive Data (Content updated as per your previous extensive version) ---
const helpSectionsData: HelpSection[] = [
    {
        id: 'getting-started', title: 'Getting Started', icon: BookOpen,
        colorClassLight: 'bg-blue-100 text-blue-600', colorClassDark: 'dark:bg-blue-900/50 dark:text-blue-400',
        description: `Welcome to ${APP_NAME}! Find essential information to begin navigating and utilizing our Solar SCADA portal effectively.`,
        faqs: [
            { id: 'gs-what-is', question: `What is ${APP_NAME}?`, answer: `${APP_NAME} is an advanced Supervisory Control and Data Acquisition (SCADA) system specifically designed for regenerative energy minigrid and renewable energy installations. It empowers users with real-time monitoring, remote control capabilities, comprehensive data logging, and insightful analytics to ensure optimal performance, efficiency, and reliability of their energy systems.`, keywords: ['scada', 'regenerative', 'minigrid', 'overview', 'introduction'] },
            { id: 'cp-overview', question: 'What is the Control Panel for?', answer: <p>The Control Panel provides an interface for authorized users (typically Operators and Admins) to send commands to the regenerative energy minigrid system. This can include starting/stopping equipment (e.g., inverters, generators), changing operational setpoints (e.g., battery charge/discharge limits), or acknowledging remote trip signals.</p>, keywords: ['remote control', 'commands', 'setpoints', 'equipment control', 'operations'] },
            { id: 'gs-roles', question: 'Understanding User Roles & Permissions', answer: <p>{APP_NAME} utilizes a role-based access control system. Common roles include:<ul><li><strong>Admin:</strong> Full system access, including configuration, user management, and advanced controls.</li><li><strong>Operator:</strong> Can monitor system status, acknowledge alarms, and perform defined control actions.</li><li><strong>Viewer:</strong> Read-only access to dashboards and reports for monitoring purposes.</li></ul>Your specific permissions depend on the role assigned by your administrator.</p>, keywords: ['admin', 'operator', 'viewer', 'access levels', 'permissions', 'privileges'] },
            { id: 'gs-navigation', question: 'Navigating the Interface', answer: <p>The main navigation is typically handled via the sidebar, providing access to key sections such as:<ul><li><strong>Dashboard:</strong> Overview of system performance and key metrics.</li><li><strong>Control Panel:</strong> Interface for interacting with system components (role-dependent).</li><li><strong>SLD/Circuit View:</strong> Visual representation of the power system layout.</li><li><strong>Data Logging/Reports:</strong> Access to historical data and performance reports.</li><li><strong>Settings:</strong> User preferences and system configuration (role-dependent).</li></ul>The header often displays connection statuses (PLC, WebSocket) and quick toggles like theme or sound.</p>, keywords: ['sidebar', 'menu', 'dashboard', 'control panel', 'layout', 'ui', 'user interface'] },
            { id: 'gs-first-steps', question: 'First Steps After Logging In', answer: <p>Once logged in, we recommend you: <ol><li>Familiarize yourself with the Dashboard layout and the data being presented.</li><li>Check the connection statuses (PLC & WebSocket) in the header to ensure live data flow.</li><li>Review any active alarms or notifications.</li><li>If you are an Operator or Admin, cautiously explore the Control Panel sections relevant to your responsibilities.</li></ol> For new users, a guided tour or onboarding might be available (check for prompts).</p>, keywords: ['new user', 'onboarding', 'initial setup', 'tour'] },
        ],
    },
    {
        id: 'dashboard', title: 'Dashboard & Monitoring', icon: BarChart3,
        colorClassLight: 'bg-green-100 text-green-600', colorClassDark: 'dark:bg-green-900/50 dark:text-green-400',
        description: 'Master your dashboard: interpret widgets, data trends, understand alerts, and connectivity indicators for effective system monitoring.',
        faqs: [
            { id: 'dash-widgets', question: 'How to Interpret Dashboard Widgets?', answer: <p>Dashboards use various widgets like gauges, charts (line, bar, pie), status indicators, and Single Line Diagrams (SLDs). Hover over elements for tooltips with exact values or more details. Pay attention to units (kW, kWh, V, A, Hz, °C, %) and color codings which often indicate status (e.g., green for normal, yellow for warning, red for alarm).</p>, keywords: ['gauges', 'charts', 'graphs', 'sld', 'single line diagram', 'data visualization', 'metrics', 'kpi'] },
            { id: 'dash-connection', question: 'Understanding PLC & WebSocket Status', answer: <span><Network className="mr-1 inline h-4 w-4 text-sky-500" /> <strong>PLC Status</strong> (e.g., Online, Offline, Disconnected) reflects the communication health with the physical Programmable Logic Controllers at the plant. If offline, real-time data and control are impacted. <Wifi className="ml-2 mr-1 inline h-4 w-4 text-green-500" /> <strong>WebSocket Status</strong> (e.g., Connected, Disconnected) indicates your browser&apos;s live data stream connection to the {APP_NAME} server. Both should be green/connected for optimal experience.</span>, keywords: ['connectivity', 'real-time data', 'plc', 'websocket', 'communication', 'online', 'offline'] },
            { id: 'dash-datapoints', question: 'Common Data Points and Their Meanings', answer: <p>Key metrics often include:<ul><li><strong>Power (kW, MW):</strong> Instantaneous rate of energy generation or consumption.</li><li><strong>Energy (kWh, MWh):</strong> Total amount of energy generated or consumed over a period.</li><li><strong>Voltage (V):</strong> Electrical potential.</li><li><strong>Current (A):</strong> Flow of electrical charge.</li><li><strong>Frequency (Hz):</strong> AC power stability indicator.</li><li><strong>State of Charge (SoC %):</strong> Remaining battery capacity.</li><li><strong>Irradiance (W/m²):</strong> Solar radiation intensity.</li><li><strong>Temperature (°C/°F):</strong> Component or ambient temperature.</li></ul>Refer to data point labels and units for specific interpretations.</p>, keywords: ['kw', 'kwh', 'soc', 'voltage', 'current', 'frequency', 'irradiance', 'temperature', 'units', 'metrics'] },
            { id: 'dash-alarms', question: 'Understanding Alarms and Notifications', answer: <p><Bell className="inline h-4 w-4 mr-1 text-yellow-500" />The system generates alarms for critical events (e.g., equipment faults, overloads, low battery) and notifications for informational events. These are often displayed in a dedicated panel or as toast messages. Pay immediate attention to active alarms and follow established procedures. Acknowledge alarms once addressed (if applicable).</p>, keywords: ['alerts', 'events', 'faults', 'warnings', 'critical', 'notification center'] },
            { id: 'dash-layout', question: 'Customizing Dashboard Layout (if available)', answer: <p><Settings className="inline h-4 w-4 mr-1 text-indigo-500" />Some user roles might have the ability to customize their dashboard layout, adding, removing, or rearranging widgets. Look for an "Edit Mode" or "Customize Dashboard" button, typically in the header or user menu. Save your changes once done.</p>, keywords: ['customize', 'personalize', 'widgets', 'edit mode', 'layout configuration'] },
        ],
    },
    {
        id: 'control-panel', title: 'Control Panel Operations', icon: SlidersHorizontal,
        colorClassLight: 'bg-purple-100 text-purple-600', colorClassDark: 'dark:bg-purple-900/50 dark:text-purple-400',
        description: 'Guidelines for using control functionalities safely and effectively, for authorized personnel only.',
        faqs: [
            { id: 'cp-overview', question: 'What is the Control Panel for?', answer: <p>The Control Panel provides an interface for authorized users (typically Operators and Admins) to send commands to the solar minigrid system. This can include starting/stopping equipment (e.g., inverters, generators), changing operational setpoints (e.g., battery charge/discharge limits), or acknowledging remote trip signals.</p>, keywords: ['remote control', 'commands', 'setpoints', 'equipment control', 'operations'] },
            { id: 'cp-safety', question: 'CRITICAL SAFETY WARNING for Controls', answer: <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900/30"><AlertTriangle className="mb-1 inline h-5 w-5 text-red-600 dark:text-red-400" /> <strong className="block font-semibold text-red-700 dark:text-red-300">All control actions have real-world consequences.</strong><p className="mt-1 text-red-600 dark:text-red-400">Incorrect operations can lead to equipment damage, system instability, power outages, or safety hazards. <strong>Only perform control actions if you are fully authorized, trained, and understand the direct and indirect impacts of your commands.</strong> If unsure, consult your supervisor or system documentation before proceeding.</p></div>, keywords: ['danger', 'warning', 'hazard', 'critical', 'authorized personnel', 'impact'] },
            { id: 'cp-using-controls', question: 'How do I use switches and setpoints?', answer: <p>Control elements are usually presented as buttons, switches, or input fields.<ul><li><strong>Switches/Buttons:</strong> Clearly indicate On/Off or Start/Stop states. Click to toggle the state. Confirm any pop-up dialogs.</li><li><strong>Setpoints:</strong> Input fields for numerical values (e.g., voltage, power limits). Enter the desired value and click "Apply" or "Send". Ensure values are within safe operational ranges.</li></ul>Feedback on command execution (success/failure) is typically provided via toast messages or status updates.</p>, keywords: ['toggle switch', 'button control', 'input field', 'numerical value', 'command feedback'] },
            { id: 'cp-permissions', question: 'Why can\'t I access certain controls?', answer: <p>Access to specific controls is restricted based on your user role. If a control is disabled or not visible, you likely do not have the necessary permissions. Contact your system administrator if you believe you require access for your duties.</p>, keywords: ['disabled control', 'access denied', 'authorization', 'user role'] },
        ],
    },
    {
        id: 'troubleshooting', title: 'Troubleshooting Guide', icon: AlertTriangle,
        colorClassLight: 'bg-red-100 text-red-600', colorClassDark: 'dark:bg-red-900/50 dark:text-red-400',
        description: 'Diagnose and resolve common issues with data display, connectivity, and system alerts.',
        faqs: [
            { id: 'ts-no-data', question: 'No Data Displayed / Dashboard is Blank', answer: <p>1. <strong>Check Internet:</strong> Ensure your device has a stable internet connection. <br />2. <strong>Verify System Status:</strong> Look for PLC (<Power className="inline h-3 w-3" />) and WebSocket (<Wifi className="inline h-3 w-3" />) indicators in the header. If either is red or disconnected, data flow is interrupted. <br />3. <strong>Refresh Page:</strong> A simple browser refresh (Ctrl+R or Cmd+R) can often resolve temporary glitches. <br />4. <strong>Clear Browser Cache:</strong> Outdated cached data can sometimes cause issues. Try clearing your browser's cache and cookies for this site. <br />5. <strong>Check for Errors:</strong> Open your browser's developer console (usually F12) and look for any error messages in the "Console" tab. <br />6. <strong>Contact Admin:</strong> If the problem persists, report it to your system administrator with details of any error messages or observed behavior.</p>, keywords: ['blank screen', 'empty dashboard', 'data not loading', 'connectivity issue', 'refresh', 'cache'] },
            { id: 'ts-plc-offline', question: 'PLC Status is "Offline" or "Disconnected"', answer: <p>This signifies a communication failure with the physical controllers at the plant. <br />- Real-time data updates will stop. <br />- Remote control functionality will be disabled. <br />- This usually requires investigation by on-site personnel or an administrator. It could be due to network issues at the plant, controller power loss, or hardware faults. <br />- The {APP_NAME} portal cannot resolve PLC connectivity issues remotely beyond displaying its status.</p>, keywords: ['plc down', 'no hardware connection', 'controller offline', 'site issue'] },
            { id: 'ts-websocket-disconnected', question: 'WebSocket Status is "Disconnected"', answer: <p>This means your browser lost its live data connection to the {APP_NAME} server. <br />- Try clicking the "Reconnect" button in the header, if available. <br />- Refreshing your browser page usually re-establishes the connection. <br />- If persistent, it could be a temporary server issue, a problem with your local network/firewall blocking WebSockets, or an unstable internet connection. <br />- Check if other internet services are working.</p>, keywords: ['real-time update failed', 'server connection lost', 'reconnect', 'firewall'] },
            { id: 'ts-slow-updates', question: 'Data Updates are Slow or Lagging', answer: <p><Clock className="inline h-4 w-4 mr-1 text-amber-500" />Lag can be indicated in the header (e.g., "x seconds lag"). <br />- Minor lag (a few seconds) can be normal depending on network conditions. <br />- Significant, persistent lag (&gt;30 seconds) might trigger an automatic page reload or redirect for connection reset by the system. <br />- This can be caused by poor internet connectivity (yours or at the plant), high server load, or large amounts of data being transferred. <br />- If severe, report to your administrator.</p>, keywords: ['delay', 'stale data', 'latency', 'performance', 'slow dashboard'] },
            { id: 'ts-login-issues', question: 'I Can\'t Log In', answer: <p><KeyRound className="inline h-4 w-4 mr-1 text-gray-500" />1. Double-check your email and password for typos. Passwords are case-sensitive. <br />2. Ensure Caps Lock is off. <br />3. If you've forgotten your password, use the "Forgot Password?" link (if available) or contact your administrator for a password reset. <br />4. Repeated failed attempts might temporarily lock your account for security. Wait a few minutes and try again, or contact support.</p>, keywords: ['login failed', 'incorrect password', 'forgotten password', 'account locked', 'authentication error'] },
        ],
    },
    {
        id: 'data-reporting', title: 'Data Logging & Reporting', icon: Database,
        colorClassLight: 'bg-amber-100 text-amber-600', colorClassDark: 'dark:bg-amber-900/50 dark:text-amber-400',
        description: 'Access historical data, generate performance reports, and understand data export functionalities.',
        faqs: [
            {id: 'dr-access-history', question: 'How do I access historical data?', answer: <p>The {APP_NAME} portal typically includes a section for "Data Logs," "Historical Trends," or "Reports." Here you can select data points, specify a date/time range, and view trends in graphical or tabular format.</p>, keywords:['history', 'trends', 'past data', 'logs']},
            {id: 'dr-generate-reports', question: 'Can I generate reports?', answer: <p><FileText className="inline h-4 w-4 mr-1 text-blue-500"/>Yes, report generation capabilities are usually available. You can often define report parameters (data points, time range, aggregation interval like hourly/daily) and export reports in formats like CSV, Excel, or PDF for further analysis or record-keeping.</p>, keywords:['export', 'csv', 'excel', 'pdf', 'download data', 'performance report']},
            {id: 'dr-data-retention', question: 'How long is data stored?', answer: <p>Data retention policies vary. Please consult your system administrator or refer to your service agreement for details on how long historical data is archived and accessible through the portal.</p>, keywords:['archive', 'storage', 'data history duration']},
        ],
    },
    {
        id: 'system-config', title: 'System Configuration (Admin)', icon: Settings,
        colorClassLight: 'bg-slate-200 text-slate-700', colorClassDark: 'dark:bg-slate-700 dark:text-slate-200', // Neutral colors for admin section
        description: 'Information for administrators on configuring data points, user accounts, and system settings.',
        faqs: [
            {id: 'sc-onboarding', question: 'Initial System Setup & Onboarding', answer: <p>New installations of {APP_NAME} require an initial onboarding process to define plant details, OPC UA endpoints, and configure data points that the system will monitor and control. This is typically performed by administrators or setup technicians. Refer to the dedicated onboarding guide for detailed steps. Access to onboarding might be restricted post-initial setup.</p>, keywords:['initial setup', 'new installation', 'opc ua configuration', 'data point mapping']},
            {id: 'sc-user-management', question: 'User Account Management', answer: <p><Users className="inline h-4 w-4 mr-1 text-gray-500"/>Administrators can usually manage user accounts: creating new users, assigning roles (Admin, Operator, Viewer), resetting passwords, and deactivating accounts. Access the "User Management" or "Team Settings" section (if available and your role permits) for these functions.</p>, keywords:['add user', 'remove user', 'edit user', 'roles', 'permissions', 'team']},
            {id: 'sc-system-params', question: 'Modifying System Parameters', answer: <p>Advanced system parameters, such as communication settings or alarm thresholds, may be configurable by administrators. Exercise extreme caution when modifying these settings, as incorrect values can impact system operation. Always consult documentation or technical support if unsure. Changes should be logged and tested in a controlled manner if possible.</p>, keywords:['advanced settings', 'opc ua endpoints', 'alarm thresholds', 'communication settings', 'server config']},
        ],
    },
    {
        id: 'account-prefs', title: 'Your Account & Preferences', icon: UserCircle,
        colorClassLight: 'bg-indigo-100 text-indigo-600', colorClassDark: 'dark:bg-indigo-900/50 dark:text-indigo-400',
        description: 'Personalize your experience by managing your profile, theme, and notification preferences.',
        faqs: [
          { id: 'ap-profile', question: 'How to update my profile?', answer: 'Access your profile via the user menu in the sidebar. Depending on your permissions, you may be able to update your name, avatar, or contact information. Password changes might also be available here or require admin assistance.'},
          { id: 'ap-theme', question: 'Changing Display Theme (Light/Dark)', answer: <p><Palette className="inline h-4 w-4 mr-1 text-purple-500" />A theme toggle (e.g., Sun/Moon icon) is usually located in the application header or user menu, allowing you to switch between Light and Dark visual modes for optimal viewing comfort.</p>, keywords:['dark mode', 'light mode', 'ui preferences', 'appearance'] },
          { id: 'ap-sound', question: 'Managing Sound Notifications', answer: <p><Volume2 className="inline h-4 w-4 mr-1 text-green-500" />A sound toggle is typically available to enable or disable audible alerts for system events and notifications. This is often found near the theme toggle or in application settings. Individual notification preferences might also be available for different alert types.</p>, keywords:['audio alerts', 'mute', 'sound on/off', 'notification sounds'] },
        ],
    },
    {
        id: 'security', title: 'Security Best Practices', icon: ShieldCheck,
        colorClassLight: 'bg-teal-100 text-teal-600', colorClassDark: 'dark:bg-teal-900/50 dark:text-teal-400',
        description: 'Essential tips for maintaining a secure operational environment and protecting your account.',
        faqs: [
          { id: 'sec-password', question: 'Password Management', answer: <p>Always use strong, unique passwords that are hard to guess. Combine uppercase, lowercase, numbers, and symbols. Do not reuse passwords across different services. If the system allows, enable Two-Factor Authentication (2FA) for an extra layer of security. Change your password periodically as per your organization's policy.</p>, keywords:['strong password', '2fa', 'mfa', 'password policy', 'unique password'] },
          { id: 'sec-phishing', question: 'Phishing & Social Engineering Awareness', answer: <p>Be vigilant against phishing attempts. {APP_NAME} or {APP_AUTHOR} will never ask for your password via email or unsolicited calls. Do not click on suspicious links or download attachments from unknown senders. Always verify the website URL before entering credentials. Report any suspicious communications to your IT department.</p>, keywords: ['phishing email', 'scam', 'social engineering', 'suspicious link', 'verify url'] },
          { id: 'sec-session', question: 'Secure Session Management', answer: 'Always log out of your session when you are finished using the portal, especially on shared or public computers. Avoid leaving your session unattended. Be aware of your surroundings when entering credentials. The system may have an automatic session timeout for inactivity.'},
          { id: 'sec-reporting', question: 'Reporting Suspicious Activity', answer: <p><MessageSquare className="inline h-4 w-4 mr-1 text-orange-500" />If you notice any unauthorized access, strange behavior in your account, or unusual system activity, report it to your system administrator or designated security contact immediately. Provide as much detail as possible, including timestamps and screenshots if relevant.</p>, keywords:['incident report', 'unauthorized access', 'security alert', 'compromise'] },
        ],
    },
];


const pageVariants = {
  initial: { opacity: 0, filter: "blur(5px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.6, ease: "circOut" } },
  exit: { opacity: 0, filter: "blur(5px)", transition: { duration: 0.3, ease: "circIn" } },
};

const cardVariants = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: (i:number) => ({ 
    opacity: 1, y: 0, scale: 1, 
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 1, 0.5, 1] } 
  }),
  hover: { 
    y: -6, 
    boxShadow: "var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 20px 30px -10px rgba(0,0,0,0.1), 0 8px 16px -8px rgba(0,0,0,0.08)", // Refined shadow
    transition: { type: "spring", stiffness: 300, damping: 15 }
  }
};

const faqItemVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeIn" } }
};


export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);

  const toggleAccordionItem = (value: string) => {
    setActiveAccordionItems(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const filteredSections = React.useMemo(() => {
    if (!searchTerm.trim()) return helpSectionsData;
    const lower = searchTerm.toLowerCase();
    return helpSectionsData
      .map(s => ({ 
        ...s, 
        faqs: s.faqs?.filter(f => 
            f.question.toLowerCase().includes(lower) || 
            (typeof f.answer === 'string' && f.answer.toLowerCase().includes(lower)) ||
            f.keywords?.some(k => k.toLowerCase().includes(lower))
        ) 
      }))
      .filter(s => 
        s.title.toLowerCase().includes(lower) || 
        s.description.toLowerCase().includes(lower) || 
        (s.faqs && s.faqs.length > 0)
      );
  }, [searchTerm]);

  return (
    <div 
        className={`min-h-screen rounded-lg transition-colors duration-500 ${theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950' 
        : 'bg-gradient-to-br from-sky-50 via-slate-50 to-blue-100'
      }`}
    >
      <motion.div
        variants={pageVariants} initial="initial" animate="animate" exit="exit"
        className="container mx-auto max-w-5xl px-4 py-10 md:py-16"
      >
        <motion.header 
          initial={{opacity:0, y: -30}} animate={{opacity:1, y:0, transition: {delay: 0.1, duration:0.5, ease:"circOut"}}}
          className="mb-12 text-center"
        >
          <motion.div whileHover={{scale:1.1, rotate:10}} className="inline-block p-1">
            <LifeBuoy className={`mx-auto h-20 w-20 mb-5 
              text-sky-500 dark:text-sky-400 
              filter ${theme === 'dark' ? 'drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'drop-shadow-[0_0_10px_rgba(14,165,233,0.4)]'}`} 
            />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
            Help & Support Center
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your guide to {APP_NAME}. Find answers, tips, and troubleshooting steps.
          </p>
        </motion.header>

        <motion.div 
          initial={{opacity:0, y: -20}} animate={{opacity:1, y:0, transition: {delay: 0.3, duration:0.5, ease:"circOut"}}}
          className="mb-12 relative max-w-2xl mx-auto group"
        >
          <Input
            type="search" placeholder="Ask us anything..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-14 pl-14 pr-6 text-base rounded-full shadow-lg 
            bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm
            border-slate-300/70 dark:border-slate-700/50 
            focus:ring-4 focus:ring-sky-500/40 dark:focus:ring-sky-500/30 
            focus:border-sky-500 dark:focus:border-sky-500
            placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 ease-in-out
            group-focus-within:shadow-sky-500/30 dark:group-focus-within:shadow-sky-500/20"
          />
          <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400 dark:text-slate-500 
                           group-focus-within:text-sky-500 dark:group-focus-within:text-sky-500 transition-colors" />
        </motion.div>

        <AnimatePresence mode="wait">
          {filteredSections.length > 0 ? (
              <motion.div 
                key="sections-grid"
                initial="initial" animate="animate" exit={{opacity:0}} variants={{animate: {transition: {staggerChildren:0.05}}}}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8"
              >
                  {filteredSections.map((section, index) => (
                  <motion.div key={section.id} custom={index} variants={cardVariants} initial="initial" animate="animate" whileHover="hover">
                      <Card className={`h-full overflow-hidden rounded-2xl
                                        border transition-all duration-300 ease-out group
                                        bg-white/60 dark:bg-slate-800/60 backdrop-blur-md 
                                        border-slate-200/80 dark:border-slate-700/60 
                                        hover:border-sky-400/50 dark:hover:border-sky-600/50
                                        shadow-md hover:shadow-xl dark:shadow-slate-900/30 dark:hover:shadow-sky-950/40`}>
                        <CardHeader className="pb-3 group-hover:pb-4 transition-all">
                            <motion.div whileHover={{scale:1.05}} className="flex items-center gap-3.5 mb-2.5">
                                <div className={`p-3 rounded-xl shadow-inner group-hover:shadow-md transition-all
                                                ${section.colorClassLight} ${section.colorClassDark}`}>
                                    <section.icon className="h-7 w-7 transform group-hover:rotate-[-5deg] group-hover:scale-110 transition-transform duration-200" />
                                </div>
                                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{section.title}</CardTitle>
                            </motion.div>
                            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{section.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {section.faqs && section.faqs.length > 0 && (
                            <Accordion type="multiple" value={activeAccordionItems} onValueChange={setActiveAccordionItems} className="w-full">
                                {section.faqs.map((faq) => {
                                    const isOpen = activeAccordionItems.includes(faq.id);
                                    return(
                                    <AccordionItem value={faq.id} key={faq.id} className="border-slate-200/70 dark:border-slate-700/50 last:border-b-0">
                                        <AccordionTrigger 
                                          // onClick={() => toggleAccordionItem(faq.id)} // Not needed as onValueChange handles it
                                          className="text-left text-[15px] font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 py-3.5 px-1 hover:no-underline group/accordion data-[state=open]:text-sky-600 dark:data-[state=open]:text-sky-400"
                                        >
                                          <span className="group-hover/accordion:translate-x-1 transition-transform duration-150">{faq.question}</span>
                                          {/* Shadcn AccordionTrigger handles its own chevron */}
                                        </AccordionTrigger>
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.section variants={faqItemVariants} initial="initial" animate="animate" exit="exit">
                                                    <AccordionContent className="pt-1 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:font-semibold prose-h4:mt-3 prose-h4:mb-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-sky-600 dark:prose-a:text-sky-400 hover:prose-a:underline">
                                                            {faq.answer}
                                                        </div>
                                                    </AccordionContent>
                                                </motion.section>
                                            )}
                                        </AnimatePresence>
                                    </AccordionItem>
                                )})}
                            </Accordion>
                            )}
                        </CardContent>
                      </Card>
                  </motion.div>
                  ))}
              </motion.div>
          ) : (
              <motion.div 
                  key="no-results"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y:0 }} exit={{opacity:0, y: -10}}
                  className="text-center py-16 col-span-full"
              >
                  <Lightbulb className="mx-auto h-16 w-16 text-yellow-400 dark:text-yellow-300 mb-6 animate-pulse" />
                  <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">No Information Found!</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">We couldn't find anything matching "{searchTerm}".</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Please try different keywords or check your spelling.</p>
                  <Button variant="ghost" onClick={() => setSearchTerm('')} className="mt-6 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10">Clear Search & Browse All Topics</Button>
              </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{opacity:0, y:30}} animate={{opacity:1, y:0, transition: {delay: 0.2 + (filteredSections.length > 0 ? filteredSections.length * 0.05 : 0) + 0.2, duration:0.6, ease:"circOut"}}}
          className="mt-20 py-12 border-t border-slate-300/70 dark:border-slate-700/50 text-center"
        >
          <motion.div whileHover={{scale:1.05}} className="inline-block p-1">
             <Mail className={`mx-auto h-12 w-12 mb-4 text-sky-500 dark:text-sky-400 filter ${theme === 'dark' ? 'drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]' : 'drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]'}`} />
          </motion.div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">Need Further Assistance?</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-3 max-w-xl mx-auto">
            Our dedicated support team at AltaVision is ready to help you with any specific issues or questions you might have regarding {APP_NAME}.
          </p>
            <div className="space-y-2 text-slate-600 dark:text-slate-400 mb-6">
                <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4 text-sky-500"/>
                    <span>298A, Borella Road, Habarakada, Homagama.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4 text-sky-500"/>
                    <a href="tel:+94717666555" className="hover:text-sky-600 dark:hover:text-sky-400 hover:underline">0717 666 555</a>
                </div>
                 <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4 text-sky-500"/>
                    <a href="tel:+94777701556" className="hover:text-sky-600 dark:hover:text-sky-400 hover:underline">0777 701 556</a> (After Sales Inquiries)
                </div>
                <div className="flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4 text-sky-500"/>
                    <a href="mailto:info@altavision.lk" className="hover:text-sky-600 dark:hover:text-sky-400 hover:underline">info@altavision.lk</a>
                </div>
            </div>

          <Button 
              asChild // Use asChild to make the entire button a link (optional if mailto is preferred)
              size="lg" 
              className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 dark:from-sky-600 dark:to-cyan-600 dark:hover:from-sky-700 dark:hover:to-cyan-700 text-white group font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <a href="mailto:info@altavision.lk">
              Email Our Experts <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
            </a>
          </Button> 
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
            For urgent system-critical issues, please use the emergency contact procedures provided by your administrator.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}