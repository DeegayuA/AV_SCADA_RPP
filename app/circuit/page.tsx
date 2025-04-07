"use client";

import CircuitDiagram from "@/components/circuitDiagram";
import { useState } from "react";


const categorizedComponents = {
  Inverters: ["DEYE INVERTER", "GOODWE 10kW", "GOODWE 5kW"],
  Panels: ["PANEL STRINGS"],
  Devices: ["BATTERY 1-10", "Energy Meter", "Generator", "wind turbine"],
  Switches: ["Breaker", "ISOLATOR", "Ats with timer"],
  Controls: ["CONTACTOR", "12V Relay", "PLC", "bus bar", "ats contactors"],
  Monitoring: ["CEB", "GM1000", "BACKUP LOAD"],
  Other: ["output1", "output2", "coil supply"]
};

export default function Home() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  const onDragStart = (event: React.DragEvent<HTMLLIElement>, label: string) => {
    event.dataTransfer.setData("application/reactflow", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`${
          isSidebarVisible ? "w-60" : "w-0"
        } bg-gray-50 border-r transition-all duration-300 ease-in-out overflow-y-auto relative`}
      >
        <button
          onClick={toggleSidebar}
          className="absolute top-2 right-2 p-1 bg-indigo-500 text-white text-sm rounded z-10"
        >
          {isSidebarVisible ? "◀" : "▶"}
        </button>

        {isSidebarVisible && (
          <div className="p-4">
            <h2 className="font-bold text-center mb-2 text-indigo-700">Components</h2>
            {Object.entries(categorizedComponents).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h3 className="font-semibold text-sm text-gray-700">{category}</h3>
                <ul className="space-y-1 mt-1">
                  {items.map((label, idx) => (
                    <li
                      key={idx}
                      draggable
                      onDragStart={(e) => onDragStart(e, label)}
                      className="cursor-pointer p-2 bg-white shadow rounded hover:bg-indigo-100 text-xs text-center border border-gray-200"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="flex-1 bg-white">
        <div className="p-4 border-b bg-gray-50">
          <h1 className="text-2xl font-bold text-center text-indigo-700">
            Electric Circuit Diagram Builder
          </h1>
        </div>
        <div className="h-full">
          <CircuitDiagram />
        </div>
      </main>
    </div>
  );
}