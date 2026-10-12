import { Bot, Monitor, Smartphone, Tablet } from "lucide-react";

import type { VisitDeviceType } from "@/types/project";

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

/** "PK" → "🇵🇰 Pakistan" */
export function countryLabel(code?: string): string | undefined {
  if (!code || !/^[A-Z]{2}$/.test(code)) return undefined;
  const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return `${flag} ${regionNames?.of(code) ?? code}`;
}

const countryName = (code?: string) => (code && /^[A-Z]{2}$/.test(code) ? (regionNames?.of(code) ?? code) : undefined);

/** "Lahore|PK" → "Lahore, Pakistan" */
export function cityLabel(raw: string): string {
  const [city, code] = raw.split("|");
  return [city, countryName(code)].filter(Boolean).join(", ");
}

/** "Lahore, Punjab · 🇵🇰 Pakistan" (region skipped when it is just a short code). */
export function placeLabel(place: { city?: string; region?: string; country?: string }): string | undefined {
  const local = [place.city, place.region && place.region.length > 3 && place.region !== place.city ? place.region : undefined]
    .filter(Boolean)
    .join(", ");
  return [local, countryLabel(place.country)].filter(Boolean).join(" · ") || undefined;
}

export function DeviceIcon({ type, className = "h-4 w-4" }: { type: VisitDeviceType; className?: string }) {
  const Icon = type === "mobile" ? Smartphone : type === "tablet" ? Tablet : type === "bot" ? Bot : Monitor;
  return <Icon className={className} aria-hidden="true" />;
}

export const DEVICE_NAMES: Record<VisitDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  bot: "Bot",
};
