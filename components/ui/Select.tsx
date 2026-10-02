"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { usePresence } from "@/hooks/usePresence";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  /** Text shown before the value inside the button, e.g. "Sort". */
  prefix?: string;
  align?: "left" | "right";
}

/**
 * Accessible custom dropdown (listbox pattern): animated menu, check mark
 * on the selected item, keyboard support (↑ ↓ Home End Enter Esc) and
 * click-outside to close.
 */
export function Select<T extends string>({ value, options, onChange, label, prefix, align = "right" }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { mounted, closing } = usePresence(open, 160);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const openMenu = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${selected?.label}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex h-9 items-center gap-2 rounded-lg border bg-surface pr-2 pl-3 text-[13px] text-fg transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-primary-ring ${
          open ? "border-primary ring-4 ring-primary-soft" : "border-border"
        }`}
      >
        {prefix && <span className="text-fg-subtle">{prefix}</span>}
        <span className="flex items-center gap-1.5 font-medium">
          {selected?.icon}
          {selected?.label}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-fg-subtle transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {mounted && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          className={`absolute top-[calc(100%+6px)] z-30 min-w-[190px] origin-top overflow-hidden rounded-xl border border-border bg-surface/95 p-1.5 shadow-elevated backdrop-blur-xl ${
            align === "right" ? "right-0" : "left-0"
          } ${closing ? "animate-select-out" : "animate-select-in"}`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === active;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150 animate-select-item ${
                  isActive ? "bg-primary-soft text-fg" : "text-fg-muted"
                } ${isSelected ? "font-medium text-fg" : ""}`}
                style={{ animationDelay: `${index * 25}ms` }}
              >
                {option.icon && <span className={isSelected ? "text-primary" : "text-fg-subtle"}>{option.icon}</span>}
                <span className="flex-1">{option.label}</span>
                <CheckIcon
                  className={`h-4 w-4 text-primary transition-all duration-200 ${
                    isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                  strokeWidth={2.5}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
