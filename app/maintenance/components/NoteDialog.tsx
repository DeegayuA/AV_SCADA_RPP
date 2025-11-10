"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const TAG_OPTIONS = {
  "Inverter Maintenance": [
    "Fan Issues",
    "DC isolation failure",
    "AC isolation Failure",
    "MPPT errors",
    "Error code",
    "Relay check failure",
    "Cable damage",
    "MC4 damage",
    "other",
  ],
  "Panal cleaning": [
    "Panal damages",
    "Strings are not working",
    "Cable damages AC",
    "Cable damages DC",
    "Structure damage",
    "Structure corrosion",
    "Other",
  ],
  "Cable inspection": ["Cable damages AC", "Cable damages DC", "other"],
  "Transformer Check": [
    "Lower oil level",
    "high temperature",
    "Filter",
    "other",
  ],
  "Switchyard maintenance": ["DDLO fuse", "HRC", "other"],
  "Battery system check": ["cell unbalances", "physical damages", "other"],
  "Monitoring system": [
    "Data not working",
    "Hardware errors",
    "storage full",
    "Software bugs",
    "other",
  ],
  "SCADA system": [
    "Data not working",
    "Hardware errors",
    "storage full",
    "Software bugs",
    "other",
  ],
  "weather station": [
    "sensor not working",
    "cable errors",
    "structure damage",
    "other",
  ],
  "Security system": ["not working", "storage full", "vandalism", "other"],
  "Vegetation management": ["need cleaning", "other"],
  "Site inspection": ["wild life", "natural disaster", "other"],
  "safety drill": [],
  Tests: [
    "shut down",
    "checking",
    "face unbalance",
    "earth fault",
    "insulation test",
    "other",
  ],
};

export default function NoteDialog() {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (value: string) => {
    setSelectedChecks((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!tag || selectedChecks.length === 0) {
      toast.error("Please select a tag and at least one issue.");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("tag", tag);
      formData.append("issues", JSON.stringify(selectedChecks));
      formData.append("description", description);
      if (image) formData.append("image", image);

      const res = await fetch("/api/maintenance/notes", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Note added successfully!");
        setOpen(false);
        setTag("");
        setSelectedChecks([]);
        setDescription("");
        setImage(null);
      } else {
        toast.error("Failed to add note.");
      }
    } catch {
      toast.error("An error occurred while adding the note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>➕ Add Note</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tag</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select maintenance tag" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(TAG_OPTIONS).map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tag && (
              <div>
                <Label>Issues</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                 {(TAG_OPTIONS[tag as keyof typeof TAG_OPTIONS] || []).map((opt) => (
                    <label key={opt} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedChecks.includes(opt)}
                        onChange={() => handleCheckboxChange(opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
              />
            </div>

            <div>
              <Label>Attach Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
