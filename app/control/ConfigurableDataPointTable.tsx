'use client';

// This is a configurable table component that allows users to display custom data points.
import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { DataPoint } from '@/config/dataPoints';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PlusCircle, Trash2, Edit } from 'lucide-react';

interface ConfigurableDataPoint {
  id: string;
  customName: string;
  dataPointId: string;
}

interface ConfigurableDataPointTableProps {
  allPossibleDataPoints: DataPoint[];
  nodeValues: Record<string, any>;
}

const ConfigurableDataPointTable: React.FC<ConfigurableDataPointTableProps> = ({ allPossibleDataPoints, nodeValues }) => {
  const { getItem, setItem } = useLocalStorage();
  const [configuredDataPoints, setConfiguredDataPoints] = useState<ConfigurableDataPoint[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedData = getItem('configurableDataPointTable');
    if (storedData) {
      setConfiguredDataPoints(JSON.parse(storedData));
    }
  }, [getItem]);

  useEffect(() => {
    setItem('configurableDataPointTable', JSON.stringify(configuredDataPoints));
  }, [configuredDataPoints, setItem]);

  const handleAddRow = () => {
    const newRow: ConfigurableDataPoint = {
      id: `row-${Date.now()}`,
      customName: '',
      dataPointId: '',
    };
    setConfiguredDataPoints([...configuredDataPoints, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    setConfiguredDataPoints(configuredDataPoints.filter((row: ConfigurableDataPoint) => row.id !== rowId));
  };

  const handleUpdateRow = (updatedRow: ConfigurableDataPoint) => {
    setConfiguredDataPoints(configuredDataPoints.map((row: ConfigurableDataPoint) => (row.id === updatedRow.id ? updatedRow : row)));
  };

  if (configuredDataPoints.length === 0 && !isEditing) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <h3 className="text-xl font-semibold mb-2">No data points configured for the table.</h3>
        <Button onClick={() => setIsEditing(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Data Points
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Custom Data Table</h3>
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Custom Name</TableHead>
            <TableHead>Data Point</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Unit</TableHead>
            {isEditing && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {configuredDataPoints.map((row: ConfigurableDataPoint) => {
            const dataPoint = allPossibleDataPoints.find(dp => dp.id === row.dataPointId);
            const value = dataPoint ? nodeValues[dataPoint.nodeId]?.value : 'N/A';
            const unit = dataPoint ? dataPoint.unit : '';

            return (
              <TableRow key={row.id}>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={row.customName}
                      onChange={e => handleUpdateRow({ ...row, customName: e.target.value })}
                    />
                  ) : (
                    row.customName
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {dataPoint ? dataPoint.name : 'Select Data Point'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Command>
                          <CommandInput placeholder="Search data points..." />
                          <CommandEmpty>No data points found.</CommandEmpty>
                          <CommandGroup>
                            {allPossibleDataPoints.map(dp => (
                              <CommandItem
                                key={dp.id}
                                onSelect={() => handleUpdateRow({ ...row, dataPointId: dp.id })}
                              >
                                {dp.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    dataPoint?.name
                  )}
                </TableCell>
                <TableCell>{value}</TableCell>
                <TableCell>{unit}</TableCell>
                {isEditing && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {isEditing && (
        <Button onClick={handleAddRow} className="mt-4">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      )}
    </div>
  );
};

export default ConfigurableDataPointTable;
