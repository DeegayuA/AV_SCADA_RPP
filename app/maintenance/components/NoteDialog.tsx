"use client";
import React, { useState, useEffect } from "react";
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

const TAG_OPTIONS: Record<string, string[]> = {
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

export default function NoteDialog({
  onNoteAdded,
}: {
  onNoteAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep selected issues valid when tags change
  useEffect(() => {
    // Create a set of all valid issues from currently selected tags
    const validIssues = new Set(
      selectedTags.flatMap((tag) => TAG_OPTIONS[tag] || [])
    );

    // Remove any selected issues that are no longer valid
    setSelectedIssues((prev) => prev.filter((issue) => validIssues.has(issue)));
  }, [selectedTags]);

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTag = e.target.value;
    if (selectedTag && !selectedTags.includes(selectedTag)) {
      setSelectedTags((prev) => [...prev, selectedTag]);
    }
    // Reset the select value
    e.target.value = "";
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const toggleIssue = (issue: string) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    if (selectedTags.length === 0 || selectedIssues.length === 0) {
      toast.error("Please select at least one tag and one issue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("tags", JSON.stringify(selectedTags));
      formData.append("issues", JSON.stringify(selectedIssues));
      formData.append("description", description);
      if (image) formData.append("image", image);

      const res = await fetch("/api/maintenance/notes", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Note added successfully!");
        setOpen(false);
        setSelectedTags([]);
        setSelectedIssues([]);
        setDescription("");
        setImage(null);
        if (onNoteAdded) onNoteAdded();
      } else {
        toast.error("Failed to add note.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while adding the note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all available tags (excluding already selected ones)
  const availableTags = Object.keys(TAG_OPTIONS).filter(
    (tag) => !selectedTags.includes(tag)
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>➕ Add Note</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-black border-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Add Maintenance Note
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Tags Dropdown */}
            <div>
              <Label className="text-base font-semibold text-white">
                Select Maintenance Categories
              </Label>
              <div className="mt-2">
                <select
                  onChange={handleTagSelect}
                  className="w-full p-2 border border-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-black text-white"
                  defaultValue=""
                >
                  <option value="" className="bg-black text-white">
                    Choose a category...
                  </option>
                  {availableTags.map((tag) => (
                    <option
                      key={tag}
                      value={tag}
                      className="bg-black text-white"
                    >
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Tags Display */}
              {selectedTags.length > 0 && (
                <div className="mt-3">
                  <Label className="text-sm font-medium text-white">
                    Selected Categories:
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 bg-black text-white px-3 py-1 rounded-full text-sm border border-white"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-white hover:text-white ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Issues Section - Show only when tags are selected */}
            {selectedTags.length > 0 && (
              <div className="border-t border-white pt-4">
                <Label className="text-base font-semibold text-white">
                  Select Issues
                </Label>
                <div className="space-y-4 mt-3">
                  {selectedTags.map((tag) => {
                    const issues = TAG_OPTIONS[tag] || [];
                    if (issues.length === 0) return null;

                    return (
                      <div
                        key={tag}
                        className="border border-white rounded-lg p-4 bg-black"
                      >
                        <h4 className="font-medium text-sm text-white mb-3">
                          {tag} Issues:
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {issues.map((issue) => (
                            <label
                              key={`${tag}-${issue}`}
                              className="flex items-center space-x-2 p-2 rounded cursor-pointer text-white"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIssues.includes(issue)}
                                onChange={() => toggleIssue(issue)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm">{issue}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <Label className="text-base font-semibold text-white">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description of the maintenance issues..."
                className="mt-2 min-h-[100px] bg-black text-white border-white"
              />
            </div>

            {/* Image */}
            <div>
              <Label className="text-base font-semibold text-white">
                Attach Image
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="mt-2 bg-black text-white border-white"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-2 text-base bg-white text-black hover:bg-gray-200"
            >
              {isSubmitting ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
