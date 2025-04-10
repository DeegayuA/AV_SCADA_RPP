'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sun } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEffect } from 'react';
import router from 'next/router';

export default function Home() {

   useEffect(() => {
      const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
  
      if (hasVisitedBefore) {
        router.push('/dashboard'); // Change to your actual dashboard route
      } else {
        localStorage.setItem('hasVisitedBefore', 'true');
        setIsLoading(true);
      }
    }, []);


    
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Sun className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-foreground">AV Mini-Grid Control Panel & Monitor</h1>
          </div>

          <p className="text-muted-foreground text-lg">
            Welcome to the Solar Mini-Grid Monitoring System. This dashboard enables both offline and online real-time monitoring and intelligent control of your AI-powered solar installation. Designed for ultra-low-latency data fetching (max 1000ms delay), it integrates seamlessly with PLCs like the Siemens S7-1214 via OPC UA, ensuring smart grid management and automation—regardless of connectivity.
          </p>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Key Features:</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Real-time data fetching: typically &lt;2s latency, occasional &gt;2s.</li>
              <li>Not only offline first and also online dual-mode support for robust reliability</li>
              <li>Intelligent control queue with auto-retry and failover mechanisms</li>
              <li>All time connectivity indicators for both PLC and WebSocket</li>
              <li><s>AI-powered energy optimization and load balancing</s></li>
              <li>Easy integration with new systems by just editing one file (DataPoints.ts)</li>
              <li>Direct Data fetching from PLC via NodeS7 & OPC UA</li>
              <li>Modular architecture for future extensibility</li>
              <li>Dark and light mode support for better user accessibility</li>
            </ul>
          </div>

          <Link href="/dashboard" className="block">
            <Button className="w-full group" size="lg">
              Go to Dashboard
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </Card>
      </motion.div>
    </div>
  );
}
function setIsLoading(arg0: boolean) {
  throw new Error('Function not implemented.');
}

