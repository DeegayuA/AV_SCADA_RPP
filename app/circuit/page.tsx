"use client";

import { useState } from "react";
import CircuitDiagram from "@/components/circuitDiagram";

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
        } bg-gray-50 dark:bg-gray-800 border-r transition-all duration-300 ease-in-out overflow-y-auto relative`}
      >
        {isSidebarVisible && (
          <div className="p-4 text-sm">
            <h2 className="font-bold text-center mb-2 text-indigo-700 dark:text-indigo-300">Components</h2>
            {Object.entries(categorizedComponents).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h3 className="font-semibold text-xs text-gray-700 dark:text-gray-200">{category}</h3>
                <ul className="space-y-1 mt-1">
                  {items.map((label, idx) => (
                    <li
                      key={idx}
                      draggable
                      onDragStart={(e) => onDragStart(e, label)}
                      className="cursor-pointer p-2 bg-white dark:bg-gray-700 shadow rounded hover:bg-indigo-100 text-center text-xs border border-gray-200 dark:border-gray-600"
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

      <main className="flex-1 bg-white dark:bg-gray-900 relative">
        <div className="absolute top-4 left-4 z-10 space-x-2">
          <button
            onClick={toggleSidebar}
            className="bg-indigo-100 hover:bg-indigo-700 text-white px-2 py-1.5 rounded shadow"
          >
            {isSidebarVisible ? "◀" : "▶"}
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-center text-indigo-700 dark:text-indigo-300">
            Electric Circuit Diagram
          </h1>
        </div>

        <div className="h-full">
          <CircuitDiagram />
        </div>
      </main>
    </div>
  );
}

