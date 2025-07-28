// app/tos/page.tsx
'use client';

import React from 'react';
// FIX: Import the 'Variants' type
import { motion, Variants } from 'framer-motion';
import { ShieldCheck, FileText, AlertTriangle, UserCheck, ExternalLink, Users, Server, Settings, RotateCcw, XCircle, Scale, CheckCircle, Zap, Info, Mail, Home } from 'lucide-react';
import { APP_NAME, APP_AUTHOR } from '@/config/constants';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// FIX: Add explicit 'Variants' types
const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "circOut" } },
};

const sectionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1 + 0.3, duration: 0.5, ease: "easeOut" }
  }),
};

interface LegalSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  customDelayIndex: number;
  id: string;
}

const LegalSection: React.FC<LegalSectionProps> = ({ title, icon: Icon, children, customDelayIndex, id }) => {
  return (
    <motion.section
      id={id}
      custom={customDelayIndex}
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      className="mb-10 scroll-mt-20"
    >
      <div className="flex items-center mb-4">
        <Icon className="h-7 w-7 mr-3 text-sky-600 dark:text-sky-500 flex-shrink-0" />
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none 
                      prose-headings:font-semibold prose-headings:text-slate-700 dark:prose-headings:text-slate-200
                      prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300
                      prose-a:text-sky-600 dark:prose-a:text-sky-500 hover:prose-a:underline
                      prose-strong:text-slate-700 dark:prose-strong:text-slate-200
                      prose-ul:list-disc prose-ul:pl-6 prose-li:my-1
                      prose-ol:list-decimal prose-ol:pl-6">
        {children}
      </div>
    </motion.section>
  );
};

export default function TermsOfServicePage() {
  const { theme } = useTheme();

  const sections = [
    { id: "introduction", title: "Introduction & Acceptance", icon: FileText },
    { id: "services", title: `Use of ${APP_NAME} Services`, icon: Zap },
    { id: "accounts", title: "User Accounts & Responsibilities", icon: UserCheck },
    { id: "conduct", title: "Prohibited Conduct", icon: XCircle },
    { id: "intellectual-property", title: "Intellectual Property Rights", icon: Scale },
    { id: "data-privacy", title: "Data & Privacy", icon: ShieldCheck },
    { id: "termination", title: "Termination of Services", icon: AlertTriangle },
    { id: "disclaimers", title: "Disclaimers & Limitation of Liability", icon: Info },
    { id: "modifications", title: "Modifications to Terms", icon: RotateCcw },
    { id: "governing-law", title: "Governing Law & Dispute Resolution", icon: Server },
    { id: "contact", title: "Contact Information", icon: Mail },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark'
      ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800'
      : 'bg-gradient-to-b from-slate-50 via-gray-100 to-slate-200'
    }`}>
      <motion.div
        variants={pageVariants} initial="initial" animate="animate"
        className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 md:py-20"
      >
        <motion.header
          initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.5, ease: "circOut" } }}
          className="mb-12 text-center"
        >
          <ShieldCheck className={`mx-auto h-20 w-20 mb-5 text-sky-600 dark:text-sky-400 filter ${theme === 'dark' ? 'drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'drop-shadow-[0_0_10px_rgba(14,165,233,0.25)]'}`} />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-50">
            Terms of Service
          </h1>
          <p className="mt-3 text-md text-slate-500 dark:text-slate-400">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.header>

        <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.4, duration: 0.5 } }}
            className="sticky top-20 hidden lg:block float-left -ml-52 w-48 pr-4 text-sm"
        >
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">On this page:</h3>
            <nav>
                <ul className="space-y-1.5">
                    {sections.map(section => (
                        <li key={section.id}>
                            <a
                                href={`#${section.id}`}
                                className="block text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-500 hover:translate-x-1 transition-all duration-150"
                            >
                                {section.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </motion.aside>

        <div className="lg:pl-4">
            <LegalSection id="introduction" title="1. Introduction & Acceptance of Terms" icon={FileText} customDelayIndex={0}>
              <p>Welcome to {APP_NAME}! These Terms of Service ("Terms") govern your access to and use of the {APP_NAME} platform, including any content, functionality, and services offered on or through {APP_NAME} (the "Service"), provided by {APP_AUTHOR} ("we," "us," or "our").</p>
              <p>Please read these Terms carefully before you start to use the Service. <strong>By using the Service, you accept and agree to be bound and abide by these Terms and our <Link href="/pp" className="text-sky-600 dark:text-sky-500 hover:underline">Privacy Policy</Link>, incorporated herein by reference.</strong> If you do not want to agree to these Terms or the Privacy Policy, you must not access or use the Service.</p>
              <p>This Service is offered and available to users who are 18 years of age or older and are authorized personnel of entities subscribing to our services. By using this Service, you represent and warrant that you meet all of the foregoing eligibility requirements.</p>
            </LegalSection>

            <LegalSection id="services" title={`2. Use of ${APP_NAME} Services`} icon={Zap} customDelayIndex={1}>
                <p>Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable license to access and use the Service for your internal business operations related to regenerative energy management as permitted by your subscription agreement and assigned user role.</p>
                <p>You acknowledge that the Service provides tools for monitoring and potentially controlling sensitive industrial equipment. You are responsible for ensuring that any actions taken through the Service are performed by authorized and qualified personnel in accordance with all applicable safety procedures and regulations.</p>
            </LegalSection>
            
            <LegalSection id="accounts" title="3. User Accounts & Responsibilities" icon={UserCheck} customDelayIndex={2}>
                <p>To access most features of the Service, you must register for an account ("Account") and provide certain information about yourself as prompted by the account registration form. You represent and warrant that: (a) all required registration information you submit is truthful and accurate; (b) you will maintain the accuracy of such information.</p>
                <p>You are responsible for maintaining the confidentiality of your Account login information and are fully responsible for all activities that occur under your Account. You agree to immediately notify us of any unauthorized use, or suspected unauthorized use of your Account or any other breach of security. We cannot and will not be liable for any loss or damage arising from your failure to comply with the above requirements.</p>
            </LegalSection>

            <LegalSection id="conduct" title="4. Prohibited Conduct" icon={XCircle} customDelayIndex={3}>
              <p>You agree not to use the Service to:
                <ul>
                  <li>Violate any local, state, national, or international law or regulation.</li>
                  <li>Transmit any material that is abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</li>
                  <li>Attempt to gain unauthorized access to any Kalloortion of the Service, other accounts, computer systems, or networks connected to the Service.</li>
                  <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
                  <li>Engage in any activity that could damage, disable, overburden, or impair the functioning of the Service or related equipment.</li>
                </ul>
                We reserve the right to terminate your access for violating these prohibitions.
              </p>
            </LegalSection>

            <LegalSection id="intellectual-property" title="5. Intellectual Property Rights" icon={Scale} customDelayIndex={4}>
              <p>The Service and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by {APP_AUTHOR}, its licensors, or other providers of such material and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
              <p>These Terms permit you to use the Service for your internal business use only. You must not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Service, except as incidentally necessary to use the service.</p>
            </LegalSection>
            
            <LegalSection id="data-privacy" title="6. Data & Privacy" icon={ShieldCheck} customDelayIndex={5}>
              <p>Your use of the Service is also governed by our <Link href="/pp" className="text-sky-600 dark:text-sky-500 hover:underline">Privacy Policy</Link>. By using the Service, you consent to all actions taken by us with respect to your information in compliance with the Privacy Policy. You are responsible for any data you input into the system and must ensure you have the necessary rights and consents for such data.</p>
            </LegalSection>
            
            <LegalSection id="termination" title="7. Termination" icon={AlertTriangle} customDelayIndex={6}>
              <p>We may terminate or suspend your access to all or part of the Service for any or no reason, including without limitation, any violation of these Terms, or as stipulated in your organization's service agreement with us. Upon termination, your right to use the Service will immediately cease.</p>
            </LegalSection>
            
            <LegalSection id="disclaimers" title="8. Disclaimers and Limitation of Liability" icon={Info} customDelayIndex={7}>
              <p>THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. NEITHER {APP_AUTHOR} NOR ANY PERSON ASSOCIATED WITH {APP_AUTHOR} MAKES ANY WARRANTY OR REPRESENTATION WITH RESPECT TO THE COMPLETENESS, SECURITY, RELIABILITY, QUALITY, ACCURACY, OR AVAILABILITY OF THE SERVICE.</p>
              <p>TO THE FULLEST EXTENT PROVIDED BY LAW, IN NO EVENT WILL {APP_AUTHOR}, ITS AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE, OR INABILITY TO USE, THE SERVICE.</p>
              <p className="mt-2 text-sm"><AlertTriangle className="inline h-4 w-4 mr-1 text-amber-500" /><strong>Important:</strong> The SCADA system provides data and control interfaces. It is your responsibility to ensure all operational decisions are made safely and by qualified personnel. {APP_AUTHOR} is not liable for operational outcomes resulting from system use or misuse.</p>
            </LegalSection>
            
            <LegalSection id="modifications" title="9. Modifications to Terms" icon={RotateCcw} customDelayIndex={8}>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
            </LegalSection>

            <LegalSection id="governing-law" title="10. Governing Law & Dispute Resolution" icon={Server} customDelayIndex={9}>
                <p>[PLACEHOLDER: This section must be filled by legal counsel. It will specify the jurisdiction whose laws govern these terms (e.g., "State of California, USA") and how disputes will be resolved (e.g., arbitration, court proceedings in a specific location).]</p>
            </LegalSection>

            <LegalSection id="contact" title="11. Contact Information" icon={Mail} customDelayIndex={10}>
                <p>If you have any questions about these Terms, please contact us at:
                <br />
                {APP_AUTHOR}
                <br />
                [Your Company Address]
                <br />
                Email: <a href="mailto:legal@example.com" className="text-sky-600 dark:text-sky-500 hover:underline">legal@example.com</a> {/* Replace with actual email */}
                <br />
                Phone: [Your Company Phone Number]
                </p>
            </LegalSection>

            <motion.div 
                custom={sections.length} variants={sectionVariants} initial="initial" animate="animate"
                className="mt-16 text-center"
            >
                <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white group shadow-md hover:shadow-lg">
                    <Link href="/">
                        <Home className="mr-2 h-5 w-5" /> Back to Home
                    </Link>
                </Button>
            </motion.div>
        </div>
      </motion.div>
    </div>
  );
}