"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiUrl } from "@/lib/api-base";
import type { ModelInfo } from "@/lib/types";

interface ModelComboboxProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelCombobox({ value, onChange }: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/models"))
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
        } else {
          setModels(data.models ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load model list.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = models.find((m) => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className="truncate">
          {loading ? "Loading models..." : selected ? selected.name : value || "Select a model"}
        </span>
        {loading ? (
          <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
        ) : (
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search OpenRouter models..." />
          <CommandList>
            {loadError ? (
              <div className="px-3 py-4 text-sm text-destructive">{loadError}</div>
            ) : (
              <>
                <CommandEmpty>No model found.</CommandEmpty>
                <CommandGroup>
                  {models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.id} ${model.name}`}
                      onSelect={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === model.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate">{model.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{model.id}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
