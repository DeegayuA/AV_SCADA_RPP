// components/ui/SearchableSelect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils"; // Your Shadcn utility function
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Represents an option in the SearchableSelect component.
 */
export interface ComboboxOption {
  value: string;
  label: string;
  description?: string; // Optional description for display or accessibility
}

/**
 * Props for the SearchableSelect component.
 */
interface SearchableSelectProps {
  /** Array of options to display in the select. */
  options: ComboboxOption[];
  /** The currently selected value. */
  value?: string;
  /** Callback function triggered when the selected value changes. */
  onChange: (value: string) => void;
  /** Placeholder text for the trigger button when no value is selected. */
  placeholder?: string;
  /** Placeholder text for the search input within the popover. */
  searchPlaceholder?: string;
  /** Text to display when the search yields no results. */
  notFoundText?: string;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Additional CSS class names for the trigger button. */
  className?: string;
  /** Optional CSS class names for the PopoverContent. */
  popoverContentClassName?: string;
}

/**
 * A searchable select (combobox) component built with Shadcn UI primitives.
 * It allows users to select an option from a list, with the ability to search.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search options...",
  notFoundText = "No option found.",
  disabled = false,
  className,
  popoverContentClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Memoize the displayed label to prevent re-calculating on every render
  // if `options` or `value` haven't changed.
  const displayedLabel = React.useMemo(() => {
    if (!value) return placeholder;
    const selectedOption = options.find((option) => option.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  }, [options, value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder} // Provides a consistent label for accessibility
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">{displayedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0",
          popoverContentClassName
        )}
        // Using Radix CSS variables ensures the popover dynamically matches trigger width and available screen height.
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            // The `CommandInput` automatically focuses when the popover opens.
          />
          <CommandList>
            {/* `CommandList` handles virtualization and scrolling for long lists. */}
            <CommandEmpty>{notFoundText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // This `value` is used by Command for searching and selection state.
                  onSelect={() => {
                    // The `onSelect` callback provides the `value` prop of the `CommandItem`.
                    // This logic allows deselecting by choosing the same item again.
                    // If deselection is not desired, use `onChange(option.value)`.
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                  aria-selected={value === option.value}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true" // The checkmark is decorative; selection is conveyed by aria-selected.
                  />
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {option.description}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}