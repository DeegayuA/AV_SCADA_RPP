"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { MaintenanceItem } from '@/types/maintenance';
import { useAppStore } from '@/stores/appStore';
import { Combobox } from '@/components/ui/combobox';

interface UploadNoteDialogProps {
  item: MaintenanceItem;
  itemNumber: number;
  onUploadSuccess: () => void;
}

export const UploadNoteDialog: React.FC<UploadNoteDialogProps> = ({ item, itemNumber, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
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
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemName', item.name);
    formData.append('itemNumber', itemNumber.toString());
    formData.append('username', currentUser?.name || 'unknown');
    formData.append('deviceId', item.id);
    formData.append('tags', tags.join(','));
    formData.append('noteText', text);

    try {
      const response = await fetch('/api/maintenance/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        toast.success("File uploaded successfully.");
        onUploadSuccess();
      } else {
        toast.error("Failed to upload file.");
      }
    } catch (error) {
      toast.error("An error occurred while uploading the file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">Upload Picture</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Picture and Add Note for {item.name} #{itemNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">Image</Label>
            <Input id="file" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};