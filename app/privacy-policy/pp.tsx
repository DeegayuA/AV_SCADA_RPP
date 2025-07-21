// app/pp/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ShieldCheck, User, Database, Cookie, Server, Share2, AlertTriangle, 
  Users, Edit3, Home, Info, Clock, UserCheck, FileText, Globe, CheckCircle, MessageCircleQuestion,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';
import { APP_NAME, APP_AUTHOR } from '@/config/constants';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1], staggerChildren: 0.1 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.4, ease: "easeIn" } },
};

const sectionHeaderVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const sectionContentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1, ease: "easeOut" } },
};

interface LegalSectionProps {
  title: string;
  icon: React.ElementType;
  iconColorClasses: string; // e.g., "text-teal-500 dark:text-teal-400"
  children: React.ReactNode;
  id: string;
}

const LegalSection: React.FC<LegalSectionProps> = ({ title, icon: Icon, iconColorClasses, children, id }) => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  // Animate based on scroll position for a subtle parallax/fade
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [50, 0, 0, -50]);

  return (
    <motion.section
      ref={ref}
      id={id}
      style={{ opacity, y }}
      className="mb-12 md:mb-16 scroll-mt-24 md:scroll-mt-28 py-6 px-0 md:px-4 rounded-lg transition-all duration-300 ease-out
                 hover:bg-white/30 dark:hover:bg-slate-800/30" // Subtle hover bg for section
    >
      <motion.div 
        variants={sectionHeaderVariants} 
        initial="initial" 
        whileInView="animate" // Animate when section comes into view
        viewport={{ once: true, amount: 0.3 }}
        className="flex items-start md:items-center mb-5 md:mb-6"
      >
        <motion.div 
            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mr-4 shadow-md"
            whileHover={{scale:1.1, rotate: -5}}
            transition={{type: "spring", stiffness:300}}
        >
          <Icon className={cn("h-7 w-7 md:h-8 md:w-8 flex-shrink-0", iconColorClasses)} />
        </motion.div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 pt-1 md:pt-0">{title}</h2>
      </motion.div>
      <motion.div 
        variants={sectionContentVariants}
        initial="initial" 
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="prose prose-base lg:prose-lg prose-slate dark:prose-invert max-w-none 
                        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-700 dark:prose-headings:text-slate-200
                        prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300
                        prose-a:font-medium prose-a:transition-colors hover:prose-a:text-opacity-80
                        prose-strong:font-semibold prose-strong:text-slate-700 dark:prose-strong:text-slate-200
                        prose-ul:list-disc prose-ul:pl-5 prose-li:my-1.5
                        prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1.5"
      >
        {children}
      </motion.div>
    </motion.section>
  );
};

export default function PrivacyPolicyPage() {
  const { theme } = useTheme();
  const [activeToc, setActiveToc] = useState<string | null>(null);

  const sections = React.useMemo(() => [ // useMemo for sections to prevent re-creation on re-render
    { id: "introduction", title: "Our Commitment to Your Privacy", icon: Info, iconColor: "text-sky-500 dark:text-sky-400" },
    { id: "information-collected", title: "What Information We Gather", icon: Database, iconColor: "text-green-500 dark:text-green-400" },
    { id: "how-we-use", title: "How We Use Your Information", icon: User, iconColor: "text-purple-500 dark:text-purple-400" },
    { id: "data-sharing", title: "Sharing and Disclosure Practices", icon: Share2, iconColor: "text-orange-500 dark:text-orange-400" },
    { id: "data-security", title: "Protecting Your Information", icon: ShieldCheck, iconColor: "text-teal-500 dark:text-teal-400" },
    { id: "data-retention", title: "How Long We Keep Your Data", icon: Clock, iconColor: "text-amber-500 dark:text-amber-400" },
    { id: "cookies", title: "Cookies & Digital Fingerprints", icon: Cookie, iconColor: "text-rose-500 dark:text-rose-400" },
    { id: "your-rights", title: "Your Data Protection Rights", icon: UserCheck, iconColor: "text-indigo-500 dark:text-indigo-400" },
    { id: "childrens-privacy", title: `A Note on Children's Privacy`, icon: Users, iconColor: "text-pink-500 dark:text-pink-400" },
    { id: "policy-changes", title: "Updates to This Policy", icon: Edit3, iconColor: "text-slate-500 dark:text-slate-400" },
    { id: "contact-pp", title: "Get in Touch With Us", icon: Mail, iconColor: "text-cyan-500 dark:text-cyan-400" },
  ], []);

  // Effect for sticky ToC highlighting based on scroll
  useEffect(() => {
    const observerOptions = {
      rootMargin: "-20% 0px -60% 0px", // Adjust to trigger when section is in middle of viewport
      threshold: 0.5, // Trigger when 50% of the section is visible
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveToc(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sectionElements = sections.map(s => document.getElementById(s.id)).filter(el => el);
    sectionElements.forEach(el => observer.observe(el!));

    return () => sectionElements.forEach(el => observer.unobserve(el!));
  }, [sections]);


  // Background animation based on theme
  const backgroundAnimation = theme === 'dark'
    ? 'animate-gradient-pulse-dark' // Define in tailwind.config.js
    : 'animate-gradient-pulse-light'; // Define in tailwind.config.js

  return (
    <div className={`min-h-screen ${backgroundAnimation} transition-all duration-1000`}>
      <motion.div
        variants={pageVariants} initial="initial" animate="animate" exit="exit"
        className="container mx-auto max-w-4xl px-4 sm:px-6 py-16 md:py-24 relative" // Increased padding
      >
        {/* Subtle decorative shapes - Surprise */}
        <AnimatePresence>
            <motion.div 
                key="shape1" 
                initial={{opacity:0, scale:0, x: -100, y: 100}}
                animate={{opacity:1, scale:1, transition: {duration:1, delay: 0.5, type: "spring", stiffness:50}}}
                className="absolute top-10 -left-20 w-48 h-48 bg-sky-300/20 dark:bg-sky-700/20 rounded-full filter blur-3xl -z-10" 
            />
            <motion.div 
                key="shape2"
                initial={{opacity:0, scale:0, x: 100, y: -100}}
                animate={{opacity:1, scale:1, transition: {duration:1, delay: 0.7, type: "spring", stiffness:50}}}
                className="absolute bottom-10 -right-20 w-56 h-56 bg-teal-300/20 dark:bg-teal-700/20 rounded-3xl filter blur-3xl -z-10 transform rotate-45"
            />
        </AnimatePresence>

        <motion.header 
          initial={{ opacity: 0, y: -50, filter: "blur(10px)" }} 
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: 0.1, duration: 0.7, ease: [0.6, -0.05, 0.01, 0.99] } }}
          className="mb-16 text-center"
        >
          <motion.div 
            whileHover={{scale:1.05, y:-5, transition: {type: "spring", stiffness:200}}}
            className="inline-block p-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl mb-6"
          >
            <ShieldCheck className={`mx-auto h-16 w-16 md:h-20 md:w-20 text-teal-500 dark:text-teal-300 filter ${theme === 'dark' ? 'drop-shadow-[0_0_20px_rgba(45,212,191,0.5)]' : 'drop-shadow-[0_0_15px_rgba(20,184,166,0.4)]'}`} />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-slate-50 bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 dark:from-teal-400 dark:via-cyan-400 dark:to-sky-400">
            Privacy & Your Data
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Last Updated: <span className="font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </motion.header>

        {/* Sticky Table of Contents - Surprise Element */}
        <motion.aside 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0, transition: { delay: 0.5, duration: 0.6, ease: "easeOut" } }}
            className="sticky top-24 hidden lg:block float-left -ml-60 w-52 pr-6 text-[13px] leading-tight z-20"
            style={{maxHeight: "calc(100vh - 8rem)"}} // Prevent ToC from being too long
        >
            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">Policy Navigator</h3>
            <nav className="border-l-2 border-slate-200 dark:border-slate-700">
                <ul className="space-y-0">
                    {sections.map(section => (
                        <li key={section.id}>
                            <a 
                                href={`#${section.id}`} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start'});
                                    setActiveToc(section.id); // Also set active on click for immediate feedback
                                }}
                                className={cn(
                                    "block py-2 pl-4 -ml-px border-l-2 transition-all duration-200 ease-out",
                                    activeToc === section.id 
                                        ? `font-semibold border-teal-500 dark:border-teal-400 ${section.iconColor} ` 
                                        : "text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200"
                                )}
                            >
                                <motion.span whileHover={{x:3}} className="inline-block">{section.title}</motion.span>
                                {activeToc === section.id && <motion.div layoutId="toc-active-dot" className="inline-block ml-2 w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400" />}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </motion.aside>
        
        <main className="lg:pl-4"> {/* Adjusted for main content, ensure no overlap with ToC */}
            <LegalSection id="introduction" title="1. Introduction: Our Commitment" icon={Info} iconColorClasses="text-sky-500 dark:text-sky-400">
                <p>{APP_AUTHOR} (referred to as "we", "us", or "our") operates the {APP_NAME} platform ("Service"). We are deeply committed to safeguarding your privacy and handling your data with transparency and responsibility. This Privacy Policy outlines how we collect, use, share, and protect your personal and operational information when you interact with our Service.</p>
                <p>By accessing or using {APP_NAME}, you acknowledge that you have read, understood, and agree to the terms of this Privacy Policy and our accompanying <Link href="/tos">Terms of Service</Link>. If you do not agree with these terms, please refrain from using the Service.</p>
                <p>This policy applies to all users of {APP_NAME}, including administrators, operators, and viewers. Our data practices are designed to comply with applicable data protection laws and regulations.</p>
            </LegalSection>

            <LegalSection id="information-collected" title="2. Information We Gather" icon={Database} iconColorClasses="text-green-500 dark:text-green-400">
                <p>To provide and enhance our Service, we collect various types of information:</p>
                <h4>A. Personal Identification Information (PII)</h4>
                  <p>This is information that can be used to identify you directly or indirectly. We collect PII when you:</p>
                  <ul>
                    <li>Register for an account: Name, email address, phone number, job title, company affiliation, and user credentials (username, hashed password).</li>
                    <li>Update your profile: Any additional information you choose to provide.</li>
                    <li>Contact support: Communication records, technical details provided.</li>
                    <li>Participate in surveys or feedback sessions (optional).</li>
                  </ul>
                <h4>B. Operational & SCADA System Data</h4>
                  <p>This data is generated by or relates to the operation of your regenerative energy system and is processed through {APP_NAME}:</p>
                  <ul>
                    <li><strong>Real-time Sensor Readings:</strong> Energy generation (PV, grid, generator), consumption (loads), equipment status (inverters, batteries, switchgear), power quality metrics (voltage, frequency, current), irradiance, temperature, and other sensor data points configured for your system.</li>
                    <li><strong>Control Commands & Actions:</strong> Logs of commands sent to the system (e.g., start/stop equipment, setpoint adjustments), including the user who initiated the command and timestamps. This is critical for auditing and operational integrity.</li>
                    <li><strong>System Configuration Data:</strong> Details about your plant setup, OPC UA endpoint configurations, data point mappings, and alarm thresholds.</li>
                    <li><strong>Alarm and Event Logs:</strong> Records of system alarms (e.g., faults, warnings, critical events) and significant operational events, including timestamps, severity, and acknowledgment status.</li>
                  </ul>
                  <p>While operational data primarily concerns system performance, it may be linked to user actions (e.g., logs of who changed a setpoint). We strive to anonymize or aggregate operational data for broader analytics where individual identification is not necessary.</p>
                <h4>C. Usage Data & Analytics</h4>
                  <p>We automatically collect information about your interaction with the Service:</p>
                  <ul>
                    <li><strong>Log Data:</strong> IP address, browser type and version, operating system, device type, pages visited within {APP_NAME}, time spent on pages, features utilized, access timestamps, and referring URLs.</li>
                    <li><strong>Cookies & Similar Technologies:</strong> See section 7 for details on how we use cookies for session management, preferences, and analytics.</li>
                    <li><strong>Error Logs:</strong> Anonymized error reports and diagnostic information if the application encounters issues during your use.</li>
                  </ul>
            </LegalSection>

            <LegalSection id="how-we-use" title="3. Purpose of Using Your Information" icon={User} iconColorClasses="text-purple-500 dark:text-purple-400">
                <p>We use the collected information for the following legitimate purposes:</p>
                <ul>
                    <li><strong>Service Provision & Operation:</strong> To create and manage your account, authenticate users, enable core SCADA functionalities (monitoring, control, data logging), and ensure the Service operates as intended.</li>
                    <li><strong>System Monitoring & Maintenance:</strong> To monitor the health and performance of {APP_NAME} and your connected energy systems, diagnose technical issues, and perform necessary maintenance or upgrades.</li>
                    <li><strong>Improvement & Development:</strong> To analyze usage patterns, gather feedback, and understand user needs to improve existing features, develop new functionalities, and enhance the overall user experience. Operational data is crucial for optimizing control algorithms and predictive maintenance insights.</li>
                    <li><strong>Personalization (Limited):</strong> To tailor certain aspects of the Service to your role or preferences, such as default dashboard views or notification settings.</li>
                    <li><strong>Communication:</strong> To send you important service-related announcements, security alerts, updates to our terms or policies, and respond to your support inquiries or feedback.</li>
                    <li><strong>Security & Fraud Prevention:</strong> To protect the security and integrity of the Service, our systems, and user data, including detecting and preventing unauthorized access or malicious activities.</li>
                    <li><strong>Compliance & Legal Obligations:</strong> To comply with applicable laws, regulations, legal processes, or governmental requests, and to enforce our Terms of Service.</li>
                    <li><strong>Reporting & Analytics (Aggregated/Anonymized):</strong> To generate aggregated and anonymized reports on system performance, energy trends, and Service usage for internal analysis, industry benchmarking (if applicable and agreed upon), or to provide insights to your organization.</li>
                </ul>
            </LegalSection>
            
            {/* Placeholder for actual legal text sections */}
            <LegalSection id="data-sharing" title="4. Sharing Your Information" icon={Share2} iconColorClasses="text-orange-500 dark:text-orange-400">
                <p>[PLACEHOLDER: Confirm details with legal. E.g., We do not sell your personal information. We may share information under specific circumstances: (a) With your Organization: If your account is managed by your employer, they may have access to your account and usage data. (b) Service Providers: With third-party vendors (hosting, database, analytics, support tools) who help us operate the Service, under strict confidentiality agreements. (c) Legal Requirements: If required by law, subpoena, or other legal process. (d) To Protect Rights: To protect our rights, property, safety, or that of our users or the public. (e) Business Transfers: In connection with a merger, acquisition, or sale of assets. (f) With Your Explicit Consent.]</p>
            </LegalSection>

            <LegalSection id="data-security" title="5. Our Security Measures" icon={ShieldCheck} iconColorClasses="text-teal-500 dark:text-teal-400">
                <p>[PLACEHOLDER: E.g., We implement industry-standard technical and organizational security measures like encryption (data in transit with HTTPS/TLS, at rest where appropriate), access controls, multi-factor authentication (if offered), regular security audits, secure software development practices, and data minimization. However, no system is 100% impenetrable. You are responsible for securing your login credentials and reporting any suspected breaches.]</p>
            </LegalSection>

            <LegalSection id="data-retention" title="6. Data Storage & Retention" icon={Clock} iconColorClasses="text-amber-500 dark:text-amber-400">
                <p>[PLACEHOLDER: E.g., Personal data is retained as long as your account is active or as needed to provide the Service. Operational data retention periods depend on system configuration, storage capacity, and contractual agreements with your organization (e.g., 1 year, 5 years, or longer for compliance). We will delete or anonymize information when no longer needed or upon a valid request, subject to legal or regulatory obligations.]</p>
            </LegalSection>
            
            <LegalSection id="cookies" title="7. Cookies & Digital Fingerprints" icon={Cookie} iconColorClasses="text-rose-500 dark:text-rose-400">
                <p>[PLACEHOLDER: E.g., We use essential cookies for session management, authentication, and security. We may also use analytics cookies (e.g., from a self-hosted Matomo or privacy-focused Plausible) to understand service usage – these do not track you across other sites. We do NOT use third-party advertising cookies. You can manage cookie preferences through your browser settings, but disabling essential cookies may impact Service functionality. Detail any other tracking technologies like localStorage (used for login state).]</p>
            </LegalSection>

            <LegalSection id="your-rights" title="8. Your Rights & Choices" icon={UserCheck} iconColorClasses="text-indigo-500 dark:text-indigo-400">
                <p>[PLACEHOLDER: E.g., Depending on your jurisdiction, you may have rights to: access, rectify, erase, restrict processing of, or object to the processing of your personal data, and data portability. Explain how users or their organization's administrator can exercise these rights (e.g., through account settings or by contacting your DPO/privacy contact). Mention any limitations.]</p>
            </LegalSection>
            
            <LegalSection id="childrens-privacy" title="9. Regarding Children's Privacy" icon={Users} iconColorClasses="text-pink-500 dark:text-pink-400">
                <p>Our Service is not directed to individuals under the age of 18 (or the relevant age of majority in your jurisdiction). We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information without parental consent, we will take steps to delete such information.</p>
            </LegalSection>
            
            <LegalSection id="policy-changes" title="10. Policy Updates" icon={Edit3} iconColorClasses="text-slate-500 dark:text-slate-400">
                <p>We may revise this Privacy Policy periodically. The "Last Updated" date at the top of this policy will indicate the latest revision. We will notify you of material changes through the Service or other means (e.g., email to account administrators). Your continued use of the Service after such changes constitutes your acceptance of the new Privacy Policy.</p>
            </LegalSection>

            <LegalSection id="contact-pp" title="11. Contact Our Data Protection Team" icon={Mail} iconColorClasses="text-cyan-500 dark:text-cyan-400">
                 <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer at:</p>
                <address className="not-italic mt-4 space-y-1 text-slate-600 dark:text-slate-300">
                    <strong>{APP_AUTHOR}</strong> (Data Protection Officer)<br />
                    <MapPin className="inline h-4 w-4 mr-1.5 text-slate-500" />298A, Borella Road, Habarakada, Homagama.<br />
                    <Mail className="inline h-4 w-4 mr-1.5 text-slate-500" />Email: <a href="mailto:info@altavision.lk" className="text-cyan-600 dark:text-cyan-500 hover:underline">info@altavision.lk</a><br />
                    <Phone className="inline h-4 w-4 mr-1.5 text-slate-500" />General: <a href="tel:+94717666555" className="text-cyan-600 dark:text-cyan-500 hover:underline">0717 666 555</a><br />
                    <Phone className="inline h-4 w-4 mr-1.5 text-slate-500" />After Sales: <a href="tel:+94777701556" className="text-cyan-600 dark:text-cyan-500 hover:underline">0777 701 556</a>
                </address>
            </LegalSection>


            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.5 + sections.length * 0.1, duration: 0.5 } }}
                className="mt-20 text-center"
            >
                 <Button asChild size="lg" 
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white group font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                 >
                    <Link href="/">
                        <Home className="mr-2.5 h-5 w-5 group-hover:scale-110 transition-transform" /> Back to Home
                    </Link>
                </Button>
            </motion.div>
        </main>
      </motion.div>
    </div>
  );
}