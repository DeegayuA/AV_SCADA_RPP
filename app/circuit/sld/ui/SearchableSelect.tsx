// components/ui/SearchableSelect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useCommandState } from "cmdk"; // For search term access

import { cn } from "@/lib/utils";
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

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundText?: string;
  disabled?: boolean;
  className?: string;
  popoverContentClassName?: string;
}

// Helper component to highlight search matches
const HighlightMatch = React.memo(({ text, query }: { text: string; query: string }) => {
  if (!query || !text) {
    return <>{text}</>;
  }
  // Escape regex special characters in query to safely use it in new RegExp
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        // Matched parts are at odd indices due to the capturing group in split
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-neutral-900 dark:text-neutral-100 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
});
HighlightMatch.displayName = 'HighlightMatch'; // For better debugging

// Component to render each option, allowing use of useCommandState for search query
const OptionItem = ({
  option,
  isSelected,
  onSelectCallback,
}: {
  option: ComboboxOption;
  isSelected: boolean;
  onSelectCallback: () => void;
}) => {
  // Access the current search query from CommandInput
  // This hook ensures OptionItem re-renders when the search query changes
  const search = useCommandState((state) => state.search);

  return (
    <CommandItem
      key={option.value} // React key
      // Do NOT pass `value` prop here.
      // This makes `cmdk` use the item's `textContent` for filtering,
      // allowing search on label and description.
      onSelect={onSelectCallback}
      aria-selected={isSelected}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
      <span className="truncate">
        <HighlightMatch text={option.label} query={search} />
      </span>
      {option.description && (
        <span className="ml-2 text-xs text-muted-foreground truncate">
          <HighlightMatch text={option.description} query={search} />
        </span>
      )}
    </CommandItem>
  );
};

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
          aria-label={placeholder} // Screen readers will announce this plus the button text
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate" title={displayedLabel !== placeholder ? displayedLabel : undefined}>
            {displayedLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0",
          popoverContentClassName
        )}
      >
        <Command
        // The `filter` prop on `Command` could be used for advanced fuzzy search,
        // but for now, relying on `cmdk`'s default textContent filtering (substring match)
        // is a good improvement and sufficient for many cases.
        >
          <CommandInput
            placeholder={searchPlaceholder}
          />
          <CommandList> {/* Handles virtualization and scrolling */}
            <CommandEmpty>{notFoundText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <OptionItem
                  key={option.value}
                  option={option}
                  isSelected={value === option.value}
                  onSelectCallback={() => {
                    // If current option is already selected, deselect it by passing an empty string
                    // Otherwise, select the new option's value
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}