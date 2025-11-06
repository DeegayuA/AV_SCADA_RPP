"use client";

import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { MaintenanceItem } from "@/types/maintenance";
import { useAppStore } from "@/stores/appStore";
import { Combobox } from "@/components/ui/combobox";
import { MaintenanceNote } from "@/types/maintenance-note";

interface NoteDialogProps {
  item?: MaintenanceItem;
  itemNumber?: number;
  isScheduledCheck: boolean;
  onNoteSubmitted: (newNote: MaintenanceNote) => void;
  trigger?: React.ReactNode;
}

const TAG_CHECKBOXES: Record<string, string[]> = {
  "Inverter Maintenance": [
    "Fan Issues",
    "DC isolation failure",
    "AC isolation Failure",
    "MPPT errors",
    "Error code",
    "Relay check failure",
    "Cable damage",
    "MC4 damage",
    "Other",
  ],
  "Panel Cleaning": [
    "Panel damages",
    "Strings are not working",
    "Cable damages AC",
    "Cable damages DC",
    "Structure damage",
    "Structure corrosion",
    "Other",
  ],
  "Cable Inspection": ["Cable damages AC", "Cable damages DC", "Other"],
  "Transformer Check": [
    "Lower oil level",
    "High temperature",
    "Filter",
    "Other",
  ],
  "Switchyard Maintenance": ["DDLO fuse", "HRC", "Other"],
  "Battery System Check": ["Cell unbalances", "Physical damages", "Other"],
  "Monitoring System": [
    "Data not working",
    "Hardware errors",
    "Storage full",
    "Software bugs",
    "Other",
  ],
  "SCADA System": [
    "Data not working",
    "Hardware errors",
    "Storage full",
    "Software bugs",
    "Other",
  ],
  "Weather Station": [
    "Sensor not working",
    "Cable errors",
    "Structure damage",
    "Other",
  ],
  "Security System": ["Not working", "Storage full", "Vandalism", "Other"],
  "Vegetation Management": ["Need cleaning", "Other"],
  "Site Inspection": ["Wild life", "Natural disaster", "Other"],
  "Safety Drill": [],
  Tests: [
    "Shutdown",
    "Checking",
    "Face unbalance",
    "Earth fault",
    "Insulation test",
    "Other",
  ],
};

export const NoteDialog: React.FC<NoteDialogProps> = ({
  item,
  itemNumber,
  isScheduledCheck,
  onNoteSubmitted,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/maintenance/tags");
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
        const response = await fetch("/api/maintenance/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  const handleCheckboxToggle = (checkbox: string) => {
    setSelectedCheckboxes((prev) =>
      prev.includes(checkbox)
        ? prev.filter((c) => c !== checkbox)
        : [...prev, checkbox]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tags.length === 0) {
      toast.error("Please select at least one tag.");
      return;
    }

    if (isScheduledCheck && !file) {
      toast.error("An image is required for scheduled checks.");
      return;
    }

    setIsSubmitting(true);

    const allSelected = [...tags, ...selectedCheckboxes].join(", ");
    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("itemName", item?.name || "Ad-hoc Note");
    formData.append("itemNumber", (itemNumber || 0).toString());
    formData.append("username", currentUser?.name || "unknown");
    formData.append("deviceId", item?.id || "adhoc");
    formData.append("tags", allSelected);
    formData.append("text", text);
    formData.append("isScheduledCheck", isScheduledCheck.toString());

    try {
      const response = await fetch("/api/maintenance/notes", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const newNote = await response.json();
        toast.success("Note submitted successfully.");
        onNoteSubmitted(newNote);
        setOpen(false);
        setTags([]);
        setSelectedCheckboxes([]);
        setText("");
      } else {
        toast.error("Failed to submit note.");
      }
    } catch (error) {
      toast.error("An error occurred while submitting the note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={isScheduledCheck ? "w-full" : ""}>
            {isScheduledCheck ? "Upload Picture" : "Add Maintenance Note"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isScheduledCheck
              ? `Upload for ${item?.name} #${itemNumber}`
              : "Add a New Maintenance Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">Image</Label>
            <Input
              id="file"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <Label>Tags (required)</Label>
            <Combobox
              options={availableTags.map((tag) => ({ label: tag, value: tag }))}
              onChange={(value) => {
                if (value && !tags.includes(value)) setTags([...tags, value]);
              }}
              placeholder="Select or create a tag"
              emptyMessage="No tags found."
              canCreate
              onCreate={async (value) => await handleAddTag(value)}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-1 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      setTags(tags.filter((t) => t !== tag));
                      setSelectedCheckboxes([]);
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic checkboxes */}
          {tags.map(
            (tag) =>
              TAG_CHECKBOXES[tag] && (
                <div key={tag} className="mt-3 border-t pt-3">
                  <Label>{tag} related issues:</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {TAG_CHECKBOXES[tag].map((cb) => (
                      <label
                        key={cb}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCheckboxes.includes(cb)}
                          onChange={() => handleCheckboxToggle(cb)}
                        />
                        <span>{cb}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
          )}

          {/* Other Notes */}
          <div>
            <Label htmlFor="note">Additional Notes (optional)</Label>
            <Textarea
              id="note"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
