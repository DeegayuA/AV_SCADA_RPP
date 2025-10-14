"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { MaintenanceItem } from '@/types/maintenance';
import { MaintenanceNote } from '@/types/maintenance-note';
import { useAppStore } from '@/stores/appStore';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';

interface MaintenanceNoteFormProps {
  items: MaintenanceItem[];
  onNoteSubmitted: (note: MaintenanceNote) => void;
}

export const MaintenanceNoteForm: React.FC<MaintenanceNoteFormProps> = ({ items, onNoteSubmitted }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [itemNumber, setItemNumber] = useState<number>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/maintenance/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data);
        }
      } catch (error) {
        toast.error("Failed to fetch tags.");
      }
    };
    fetchTags();
  }, []);

  const handleAddTag = async (tag: string) => {
    if (tag && !availableTags.includes(tag)) {
      try {
        const response = await fetch('/api/maintenance/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag }),
        });
        if (response.ok) {
          setAvailableTags([...availableTags, tag]);
          setTags([...tags, tag]);
          toast.success(`Tag "${tag}" added.`);
        }
      } catch (error) {
        toast.error("Failed to add new tag.");
      }
    } else if (availableTags.includes(tag) && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || tags.length === 0) {
      toast.error("Please select a device and at least one tag.");
      return;
    }
    setIsSubmitting(true);

    const note: Omit<MaintenanceNote, 'id' | 'timestamp'> = {
      deviceId,
      itemNumber,
      tags,
      text,
      author: currentUser?.name || 'Unknown',
    };

    try {
      const response = await fetch('/api/maintenance/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
      if (response.ok) {
        const submittedNote = await response.json();
        onNoteSubmitted(submittedNote.note);
        setDeviceId('');
        setTags([]);
        setText('');
        toast.success("Maintenance note submitted successfully.");
      } else {
        toast.error("Failed to submit maintenance note.");
      }
    } catch (error) {
      toast.error("An error occurred while submitting the note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="device">Device</Label>
          <Combobox
            options={items.map(item => ({ label: item.name, value: item.id }))}
            value={deviceId}
            onChange={setDeviceId}
            placeholder="Select a device"
            emptyMessage="No devices found."
          />
        </div>
        {deviceId && (
          <div>
            <Label htmlFor="itemNumber">#</Label>
            <Input
              id="itemNumber"
              type="number"
              value={itemNumber}
              onChange={(e) => setItemNumber(parseInt(e.target.value, 10))}
              min="1"
              max={items.find(item => item.id === deviceId)?.quantity}
              className="w-24"
            />
          </div>
        )}
      </div>
      <div>
        <Label>Tags</Label>
        <Combobox
          options={availableTags.map(tag => ({ label: tag, value: tag }))}
          onChange={(value) => {
            if (value && !tags.includes(value)) {
              setTags([...tags, value]);
            }
          }}
          placeholder="Select or create a tag"
          emptyMessage="No tags found."
          canCreate
          onCreate={async (value) => {
            await handleAddTag(value);
          }}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map(tag => (
            <div key={tag} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-1 text-sm">
              {tag}
              <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Note'}
      </Button>
    </form>
  );
};