import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

/** Searchable combobox styled for the light storefront product selectors. */
export default function SearchableSelect({
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No results found.",
  options = [],
  disabled = false,
  testId,
  className,
  renderOption,
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  const handleSelect = (nextValue) => {
    onChange?.(nextValue === value ? value : nextValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "h-10 w-full justify-between rounded-xl border-neutral-200 bg-white px-3 text-sm font-normal text-neutral-900 shadow-none hover:bg-neutral-50 focus-visible:ring-1 focus-visible:ring-brand",
            !selected && "text-neutral-400",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <span className="truncate text-left">
            {selected
              ? (renderOption ? renderOption(selected, true) : selected.label)
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[60] w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-xl"
        align="start"
        sideOffset={4}
      >
        <Command className="rounded-xl bg-white text-neutral-900">
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-10 text-sm text-neutral-900 placeholder:text-neutral-400"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-sm text-neutral-500">{emptyLabel}</CommandEmpty>
            <CommandGroup className="p-1">
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.searchText || ""} ${opt.value}`}
                    disabled={opt.disabled}
                    data-testid={opt.testId}
                    onSelect={() => {
                      if (opt.disabled) return;
                      handleSelect(opt.value);
                    }}
                    className={cn(
                      "rounded-lg cursor-pointer text-neutral-700 aria-selected:bg-brand/15 aria-selected:text-neutral-950 data-[selected=true]:bg-brand/15 data-[selected=true]:text-neutral-950",
                      opt.disabled && "opacity-50"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0 text-brand",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 min-w-0 truncate">
                      {renderOption ? renderOption(opt, false) : opt.label}
                    </span>
                    {opt.meta != null && (
                      <span className="ml-2 shrink-0 font-mono text-xs text-brand/90">
                        {opt.meta}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
