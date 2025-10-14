"use client";

import React, { useState, useEffect } from 'react';
import { MaintenanceNote } from '@/types/maintenance-note';
import { MaintenanceItem } from '@/types/maintenance';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

interface MaintenanceNotesLogProps {
  items: MaintenanceItem[];
  initialNotes: MaintenanceNote[];
}

export const MaintenanceNotesLog: React.FC<MaintenanceNotesLogProps> = ({ items, initialNotes }) => {
  const [notes, setNotes] = useState<MaintenanceNote[]>(initialNotes);
  const [filteredNotes, setFilteredNotes] = useState<MaintenanceNote[]>(initialNotes);
  const [deviceFilter, setDeviceFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  useEffect(() => {
    setNotes(initialNotes);
    setFilteredNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    let newFilteredNotes = notes;
    if (deviceFilter) {
      newFilteredNotes = newFilteredNotes.filter(note => note.deviceId === deviceFilter);
    }
    if (tagFilter) {
      newFilteredNotes = newFilteredNotes.filter(note => note.tags.includes(tagFilter));
    }
    setFilteredNotes(newFilteredNotes);
  }, [deviceFilter, tagFilter, notes]);

  const getDeviceName = (deviceId: string) => {
    const item = items.find(item => item.id === deviceId);
    return item ? item.name : 'Unknown Device';
  };

  const exportToCSV = () => {
    const csvRows = [
      ['Timestamp', 'Device', 'Item #', 'Tags', 'Note', 'Author', 'Image Filename'],
      ...filteredNotes.map(note => [
        format(new Date(note.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        getDeviceName(note.deviceId),
        note.itemNumber.toString(),
        note.tags.join(', '),
        note.text || '',
        note.author,
        note.imageFilename || '',
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    ];

    const csvContent = csvRows.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'maintenance_notes.csv');
  };

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Select onValueChange={setDeviceFilter} value={deviceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by device" />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deviceFilter && <Button variant="ghost" onClick={() => setDeviceFilter('')}>Clear</Button>}
        </div>
        <div className="flex items-center gap-2">
          <Select onValueChange={setTagFilter} value={tagFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tagFilter && <Button variant="ghost" onClick={() => setTagFilter('')}>Clear</Button>}
        </div>
        <Button onClick={exportToCSV}>Export to CSV</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Author</TableHead>
              <TableHead>Image</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredNotes.map(note => (
            <TableRow key={note.id}>
              <TableCell>{format(new Date(note.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
              <TableCell>{getDeviceName(note.deviceId)} #{note.itemNumber}</TableCell>
              <TableCell>{note.tags.join(', ')}</TableCell>
              <TableCell>{note.text}</TableCell>
              <TableCell>{note.author}</TableCell>
                <TableCell>
                  {note.imageFilename && (
                    <img
                      src={`/api/maintenance/image/${format(new Date(note.timestamp), 'yyyy-MM-dd')}/${encodeURIComponent(note.imageFilename)}`}
                      alt="thumbnail"
                      className="w-16 h-16 object-cover cursor-pointer rounded-md border"
                      onClick={() => window.open(`/api/maintenance/image/${format(new Date(note.timestamp), 'yyyy-MM-dd')}/${encodeURIComponent(note.imageFilename)}`, '_blank')}
                    />
                  )}
                </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};