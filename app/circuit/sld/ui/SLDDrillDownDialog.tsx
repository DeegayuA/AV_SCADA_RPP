// components/sld/ui/SLDDrillDownDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SLDWidget from '../SLDWidget'; // Import the main widget component

interface SLDDrillDownDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  layoutId: string | null; // The sub-layout ID to display
  parentLabel?: string; // Optional: label of the element clicked
}

const SLDDrillDownDialog: React.FC<SLDDrillDownDialogProps> = ({
  isOpen,
  onOpenChange,
  layoutId,
  parentLabel,
}) => {
  if (!layoutId) return null; // Don't render if no layout ID is provided

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Increase size for diagram view, prevent content padding */}
      <DialogContent className="max-w-4xl xl:max-w-6xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          {/* Provide a meaningful title */}
          <DialogTitle>
            Sub-Diagram: {parentLabel ? `${parentLabel} (${layoutId})` : layoutId}
          </DialogTitle>
          {/* Optional: Add Description */}
        </DialogHeader>

        {/* Embed the SLDWidget here, ensure it fills the space */}
        <div className="flex-grow overflow-hidden">
          {/* Pass the sub-layout ID and potentially force read-only */}
          {/* NOTE: You might need to add a 'readOnly' or similar prop to SLDWidget */}
          {/* if you don't want the sub-diagram to inherit the global edit mode */}
          <SLDWidget layoutId={layoutId} /* readOnly={true} */ />
        </div>

        <DialogFooter className="p-4 border-t shrink-0">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SLDDrillDownDialog;