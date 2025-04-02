'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sun } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
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
            <h1 className="text-3xl font-bold text-foreground">Solar Mini-Grid Monitor</h1>
          </div>
          
          <p className="text-muted-foreground text-lg">
            Welcome to the Solar Mini-Grid Monitoring System. This dashboard provides real-time monitoring 
            and control of your solar installation, with full offline support.
          </p>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Key Features:</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Real-time monitoring of battery, grid, and inverter metrics</li>
              <li>Offline-first architecture for reliable operation</li>
              <li>Intelligent control queueing system</li>
              <li>Dark and light mode support</li>
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
