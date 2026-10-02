"use client";

import { useSyncExternalStore, type MouseEvent } from "react";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import {
  getServerThemePreference,
  getThemePreference,
  setThemePreference,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/client/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

/**
 * Segmented Light / Dark / System switch. The sliding indicator and active
 * colors are driven by CSS from <html data-theme-pref>, which the theme
 * script sets before paint, so the control is correct on first render.
 */
export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, getServerThemePreference);

  const select = (value: ThemePreference) => (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setThemePreference(value, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="theme-toggle relative flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5"
    >
      <span aria-hidden="true" className="theme-toggle-indicator" />
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          data-theme-option={value}
          onClick={select(value)}
          className="theme-toggle-option relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
