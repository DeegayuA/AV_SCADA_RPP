"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { MaintenanceItem } from '@/types/maintenance';
import { MaintenanceNote } from '@/types/maintenance-note';
import { useAppStore } from '@/stores/appStore';
import { Input } from '@/components/ui/input';

interface MaintenanceNoteFormProps {
  items: MaintenanceItem[];
  onNoteSubmitted: (note: MaintenanceNote) => void;
}

export const MaintenanceNoteForm: React.FC<MaintenanceNoteFormProps> = ({ items, onNoteSubmitted }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
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

  const handleAddTag = async () => {
    if (newTag && !availableTags.includes(newTag)) {
      try {
        const response = await fetch('/api/maintenance/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: newTag }),
        });
        if (response.ok) {
          setAvailableTags([...availableTags, newTag]);
          setTags([...tags, newTag]);
          setNewTag('');
          toast.success(`Tag "${newTag}" added.`);
        }
      } catch (error) {
        toast.error("Failed to add new tag.");
      }
    } else if (availableTags.includes(newTag) && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
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
      <div>
        <Label htmlFor="device">Device</Label>
        <Select onValueChange={setDeviceId} value={deviceId}>
          <SelectTrigger id="device">
            <SelectValue placeholder="Select a device" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tags</Label>
        <div className="flex items-center gap-2">
          <Select onValueChange={(value) => setTags([...tags, value])}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tag" />
            </SelectTrigger>
            <SelectContent>
              {availableTags.filter(t => !tags.includes(t)).map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Or add a new tag"
          />
          <Button type="button" onClick={handleAddTag}>Add Tag</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map(tag => (
            <div key={tag} className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm">
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