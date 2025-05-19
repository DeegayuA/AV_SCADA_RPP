'use client';
import React from 'react';
import { Button } from '@/components/ui/button'; // Assuming Shadcn UI
import { USER } from '@/config/constants';
import SLDWidget from './sld/SLDWidget';
import { useAppStore } from '@/stores/appStore';

export default function PlantViewPage({ params }: { params: { layoutId: string } }) {
  // const layoutId = params.layoutId;
  const layoutId = 'main_plant'; // Use a hardcoded layoutId for now
  const { isEditMode, toggleEditMode, currentUser } = useAppStore();

  // Only allow Admins to toggle edit mode
  const canToggleEdit = currentUser?.role === USER;

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b flex justify-between items-center bg-card">
        <h1 className="text-xl font-bold">Plant Layout: {layoutId}</h1>
        {canToggleEdit && (
             <Button onClick={toggleEditMode} variant="outline">
                 {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
             </Button>
         )}
      </header>
      <main className="flex-grow relative">
        {/* The SLD Widget takes up the available space */}
        <SLDWidget layoutId={layoutId} />
      </main>
    </div>
  );
}