import type { ReactNode } from "react";
import { Label, ListBox, Select } from "@heroui/react";

const ALL = "__all";

export type SelectOption = { value: string; label: string; count?: number; icon?: ReactNode };

/** HeroUI Select with a leading "all" choice; `undefined` means no filter. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  isDisabled,
  className,
  showCounts = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: SelectOption[];
  allLabel: string;
  isDisabled?: boolean;
  className?: string;
  showCounts?: boolean;
}) {
  return (
    <Select
      {...(className ? { className } : {})}
      value={value ?? ALL}
      isDisabled={isDisabled ?? false}
      onChange={(key) => onChange(key === ALL || key === null ? undefined : String(key))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={ALL} textValue={allLabel}>
            {allLabel}
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {option.icon}
                <span className="truncate">{option.label}</span>
                {showCounts && option.count !== undefined && (
                  <span className="tabular ml-auto text-xs text-muted">{option.count}</span>
                )}
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

/** Same look, several choices ("Kia, MG"); an empty list means no filter. */
export function MultiFilterSelect({
  label,
  values,
  onChange,
  options,
  allLabel,
  className,
  showCounts = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  allLabel: string;
  className?: string;
  showCounts?: boolean;
}) {
  return (
    <Select
      {...(className ? { className } : {})}
      selectionMode="multiple"
      placeholder={allLabel}
      value={values}
      onChange={(keys) => onChange((keys as (string | number)[]).map(String))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value className="min-w-0 truncate" />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode="multiple">
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {option.icon}
                <span className="truncate">{option.label}</span>
                {showCounts && option.count !== undefined && (
                  <span className="tabular ml-auto text-xs text-muted">{option.count}</span>
                )}
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
