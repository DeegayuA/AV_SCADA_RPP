'use client';

import React, { useEffect, useState } from "react";
import { OPCUAClient } from "@/lib/opcua-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
const opcuaClient = new OPCUAClient();

interface OPCUAData {
  nodeId: string;
  timestamp: string;
  value: any;
  status?: string;
}

const OPCUADataViewer: React.FC = () => {
  const [latestValues, setLatestValues] = useState<OPCUAData | null>(null);
  const [historicalData, setHistoricalData] = useState<OPCUAData[]>([]);

  useEffect(() => {
    opcuaClient.connect();

    opcuaClient.on("data", (data: any) => {
      console.log("Received Data:", data); // Debug log to inspect incoming data

      const newEntry: OPCUAData = {
        nodeId: data.nodeId || "Node ID Not Received",
        timestamp: new Date().toLocaleString(),
        value: data.value !== undefined ? data.value : "Value Not Received",
        status: data.status || "Unknown",
      };

      setLatestValues(newEntry);
      setHistoricalData((prev) => [newEntry, ...prev.slice(0, 9)]);
    });

    return () => {
      opcuaClient.disconnect();
    };
  }, []);

  const renderValue = (value: any) => {
    return typeof value === "object" ? JSON.stringify(value, null, 2) : value;
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>📡 OPC UA Data Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          {latestValues ? (
            <div className="space-y-2">
              <p><strong>Node ID:</strong> {latestValues.nodeId}</p>
              <p><strong>Timestamp:</strong> {latestValues.timestamp}</p>
              <p><strong>Value:</strong> {renderValue(latestValues.value)}</p>
              <p>
                <strong>Status:</strong> <Badge>{latestValues.status}</Badge>
              </p>
            </div>
          ) : (
            <p>Waiting for data...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📜 Historical Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Node ID</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historicalData.map((entry, index) => (
                <TableRow key={index} className={entry.status === "Good" ? "bg-green-100" : "bg-red-100"}>
                  <TableCell>{entry.timestamp}</TableCell>
                  <TableCell>{entry.nodeId}</TableCell>
                  <TableCell>{renderValue(entry.value)}</TableCell>
                  <TableCell><Badge>{entry.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OPCUADataViewer;