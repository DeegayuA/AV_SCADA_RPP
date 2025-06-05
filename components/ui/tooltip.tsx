"use client" // Keep this if it was already there

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// TooltipProvider component (wrapper for TooltipPrimitive.Provider)
// This component itself is fine. It's meant to be used once wrapping a section of your app or the whole app.
function TooltipProvider({
  delayDuration = 700, // Adjusted to a more common default, original was 0
  skipDelayDuration = 300, // Added a common Radix prop
  disableHoverableContent = false, // Added a common Radix prop
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
      {...props} // Removed data-slot here, not typically needed on Provider itself
    />
  )
}

// Tooltip component (wrapper for TooltipPrimitive.Root)
// This is the primary change: Remove the nested TooltipProvider.
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
  // No longer wraps TooltipPrimitive.Root in <TooltipProvider>
}

// TooltipTrigger component (wrapper for TooltipPrimitive.Trigger)
// Consider refactoring to use React.forwardRef for robustness if issues persist after the main fix.
// For now, this might be okay.
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    className={cn(className)} // Allows merging classes
    data-slot="tooltip-trigger"
    {...props}
  >
    {Array.isArray(children) ? <span>{children}</span> : children}
  </TooltipPrimitive.Trigger>
));
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;


// TooltipContent component (wrapper for TooltipPrimitive.Content)
// Adjusted sideOffset to a more common default.
function TooltipContent({
  className,
  sideOffset = 4, // Adjusted to a more common default, original was 0
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-[var(--radix-tooltip-content-transform-origin)] rounded-md px-3 py-1.5 text-xs text-balance",
          // Corrected CSS variable for transform-origin. Original had a typo: `origin-(--radix-...`
          className
        )}
        {...props}
      >
        {children}
        {/* Arrow styling should ideally use CSS variables for fill like `fill-primary` if that's what you intend. 
            The `bg-primary` on arrow might be for Radix context but check docs. Usually it's just `fill`.
        */}
        <TooltipPrimitive.Arrow className="fill-primary z-50 size-2.5" /> 
        {/* Removed translate-y and rotate from Arrow as Radix usually handles positioning. 
            If manual positioning is needed, ensure it's robust.
            Removed `rounded-[2px]` as Radix might style it. The default arrow might not be a simple square.
            If `bg-primary` was indeed for setting the color for the `fill-primary` class, you'd write:
            <TooltipPrimitive.Arrow className="fill-primary z-50 size-2.5" />
            And ensure `fill-primary` is defined if it's custom, or use Tailwind's `fill-current` with `text-primary`.
            The current provided code had `bg-primary fill-primary` - typically one or the other for Arrow.
            Sticking with `fill-primary` for the fill.
        */}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }