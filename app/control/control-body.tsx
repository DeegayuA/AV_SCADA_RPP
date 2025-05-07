'use client';
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { USER } from "@/config/constants";
import SLDWidget from "../circuit/sld/SLDWidget";

// Removed animation variants

export default function ControlBody() {
  const layoutId = 'main_plant'; // Use a hardcoded layoutId for now
  const { isEditMode, toggleEditMode, currentUser } = useAppStore();
  const canToggleEdit = currentUser?.role === USER;
  const sampleTableData = [
    { id: 1, colA: "Row 1A Data", colB: "Row 1B Data" },
    { id: 2, colA: "Row 2A Data", colB: "Row 2B Data" },
    { id: 3, colA: "Row 3A Data", colB: "Row 3B Data" },
  ];

  // Basic check for essential components to provide more direct feedback if they are missing
  if (typeof Card === 'undefined' || typeof CardContent === 'undefined') {
    return <div className="p-4 text-red-500 font-bold">Error: Card or CardContent component is missing. Check installation and import.</div>;
  }
  if (typeof Table === 'undefined') {
    return <div className="p-4 text-red-500 font-bold">Error: Table component is missing. Check installation and import.</div>;
  }

  return (
      <div 
        className="bg-background text-foreground px-3 sm:px-4 md:px-6 lg:px-8 transition-colors duration-300 space-y-6"
       
      >

        {/* Main Section with Table View */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
         
        >
          <div // Replaced motion.div with div
            className="lg:col-span-2 bg-card border rounded-xl min-h-[400px] p-4 shadow-lg"
            // Removed animation props: variants
          >
            <h3 className="text-xl font-semibold mb-3 text-card-foreground">Plant Layout View : {layoutId}</h3>
        {canToggleEdit && (
          <Button onClick={toggleEditMode} variant="outline">
            {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </Button>
        )}
            <div className="h-[calc(400px-2rem-1.5rem)] overflow-hidden rounded-md border">
            <SLDWidget layoutId={layoutId} />
            </div>
          </div >

          <div // Replaced motion.div with div
            className="bg-card border rounded-xl p-4 min-h-[400px] shadow-lg"
            // Removed animation props: variants
          >
            <h3 className="text-xl font-semibold mb-3 text-card-foreground">Table View</h3>
            <div className="overflow-x-auto">
              <Table>
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">ID</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Column A</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Column B</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleTableData.map((row) => (
                    <tr // Replaced motion.tr with tr
                      key={row.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors duration-150"
                      // Removed animation props: initial, animate, transition
                    >
                      <td className="p-3 text-sm text-foreground">{row.id}</td>
                      <td className="p-3 text-sm text-foreground">{row.colA}</td>
                      <td className="p-3 text-sm text-foreground">{row.colB}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div >
        </div >

        {/* Timeline Graphs */}
        <div // Replaced motion.div with div
          className="bg-card border rounded-xl p-4 min-h-[100px] shadow-lg"
          // Removed animation props: variants
        >
          <h3 className="text-xl font-semibold mb-3 text-card-foreground">Timeline Graphs</h3>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Graph content will appear here.</p>
          </div>
        </div >
      </div >
  );
}