"use client";

import { Eye, History, MapPin, MessageSquareShare, RefreshCw, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DEVICE_NAMES, DeviceIcon, cityLabel, countryLabel, placeLabel } from "@/components/analytics/visit-format";
import { Button } from "@/components/ui/Button";
import { AlertIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/IconTile";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatDateTime, formatRelative } from "@/lib/client/format";
import type { BreakdownItem, ProjectAnalyticsDTO } from "@/types/project";

const RANGES = [7, 30, 90] as const;

/** Visitor analytics for one project: KPIs, views per day, breakdowns, recent visits. */
export function AnalyticsPanel({ projectId }: { projectId: string }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { state, reload } = useAnalytics(projectId, days);
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Date range" className="flex gap-0.5 rounded-lg border border-border bg-bg-subtle p-0.5">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              role="radio"
              aria-checked={days === range}
              onClick={() => setDays(range)}
              className={`h-7 rounded-md px-2.5 text-xs font-medium transition-all ${
                days === range ? "depth-1 bg-surface text-fg ring-1 ring-border" : "text-fg-subtle hover:text-fg"
              }`}
            >
              {range} days
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {state.status === "loading" && (
        <div className="space-y-3" aria-busy="true">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[86px] rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-44 rounded-2xl" />
        </div>
      )}
      {state.status === "error" && (
        <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertIcon className="h-4 w-4" />
          {state.message}
        </p>
      )}
      {state.status === "ready" && <AnalyticsBody data={state.data} now={now} />}
    </div>
  );
}

function AnalyticsBody({ data, now }: { data: ProjectAnalyticsDTO; now: number }) {
  const { totals } = data;
  const empty = totals.views === 0 && data.visitors.length === 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={<Eye />} tone="brand" label="Views" value={totals.views.toLocaleString()} hint={`${totals.allTimeViews.toLocaleString()} all time`} />
        <Kpi icon={<Users />} tone="violet" label="People" value={totals.uniqueVisitors.toLocaleString()} hint="Unique visitors (browser + device)" />
        <Kpi
          icon={<History />}
          tone="emerald"
          label="Last visit"
          value={totals.lastVisitAt ? formatRelative(totals.lastVisitAt, now) : "Never"}
          hint={totals.lastVisitAt ? formatDateTime(totals.lastVisitAt) : "No one has opened it yet"}
        />
        <Kpi
          icon={<MessageSquareShare />}
          tone="sky"
          label="Link previews"
          value={totals.linkPreviews.toLocaleString()}
          hint="WhatsApp, Slack… fetched the link"
        />
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-border-strong px-5 py-10 text-center">
          <p className="text-sm font-semibold text-fg">No visits in this period</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-fg-subtle">
            Share the link (or a named client link) — visits show up here within seconds. Your own visits while
            signed in are not counted.
          </p>
        </div>
      ) : (
        <>
          <DailyChart daily={data.daily} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Breakdown title="Devices" items={data.devices} />
            <Breakdown title="Browsers" items={data.browsers} />
            <Breakdown title="Operating systems" items={data.os} />
            <Breakdown title="Sources" items={data.referrers} />
            {data.cities.length > 0 && (
              <Breakdown title="Cities" items={data.cities.map((c) => ({ ...c, label: cityLabel(c.label) }))} />
            )}
            {data.countries.length > 0 && (
              <Breakdown title="Countries" items={data.countries.map((c) => ({ ...c, label: countryLabel(c.label) ?? c.label }))} />
            )}
            {data.bots.length > 0 && <Breakdown title="Link previews (not counted)" items={data.bots} muted />}
          </div>

          <Visitors data={data} now={now} />
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  tone: "brand" | "violet" | "emerald" | "sky";
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="depth-1 rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-subtle">{label}</p>
        <IconTile tone={tone} size="sm">
          {icon}
        </IconTile>
      </div>
      <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-fg tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-fg-subtle" title={hint}>
        {hint}
      </p>
    </div>
  );
}

/** Single-series column chart (one hue), per-column hover tooltip. */
function DailyChart({ daily }: { daily: ProjectAnalyticsDTO["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  const label = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  const ticks = [daily[0], daily[Math.floor(daily.length / 2)], daily[daily.length - 1]];

  return (
    <figure className="depth-1 rounded-2xl border border-border bg-surface p-4">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-fg">Views per day</span>
        <span className="text-[11px] text-fg-subtle tabular-nums">max {max.toLocaleString()}</span>
      </figcaption>
      <div className="relative mt-3 h-36">
        {/* Recessive gridlines */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 border-t border-border-strong" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {daily.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`${label(d.date)}: ${d.views} views`}>
              <div
                className="w-full max-w-[24px] rounded-t-[4px] bg-primary transition-[opacity,filter] duration-150 group-hover:brightness-110 group-focus:brightness-110"
                style={{ height: d.views ? `${Math.max(3, (d.views / max) * 100)}%` : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1.5 hidden rounded-lg border border-border bg-surface px-2 py-1 text-[11px] whitespace-nowrap text-fg shadow-elevated group-hover:block group-focus:block">
                <span className="text-fg-subtle">{label(d.date)}</span> · <span className="font-semibold tabular-nums">{d.views}</span>{" "}
                {d.views === 1 ? "view" : "views"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-fg-subtle tabular-nums" aria-hidden="true">
        {ticks.map((t, i) => (
          <span key={`${t.date}-${i}`}>{label(t.date)}</span>
        ))}
      </div>
    </figure>
  );
}

/** Ranked list with a one-hue magnitude bar per row; text stays in ink colors. */
function Breakdown({ title, items, muted = false }: { title: string; items: BreakdownItem[]; muted?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((sum, i) => sum + i.count, 0);
  return (
    <section className="depth-1 rounded-2xl border border-border bg-surface p-4">
      <h4 className="text-[13px] font-semibold text-fg">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-fg-subtle">No data</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item.label} title={`${item.label}: ${item.count} (${Math.round((item.count / total) * 100)}%)`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-fg-muted">{item.label}</span>
                <span className="shrink-0 font-medium text-fg tabular-nums">
                  {item.count.toLocaleString()}
                  <span className="ml-1 font-normal text-fg-subtle">{Math.round((item.count / total) * 100)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-3">
                <div
                  className={`h-full rounded-full ${muted ? "bg-fg-subtle/60" : "bg-primary"}`}
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Visitors({ data, now }: { data: ProjectAnalyticsDTO; now: number }) {
  if (data.visitors.length === 0) return null;
  const located = data.visitors.some((v) => v.country || v.city);
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h4 className="text-[13px] font-semibold text-fg">Visitors</h4>
        <span className="text-[11px] text-fg-subtle tabular-nums">
          {data.totals.uniqueVisitors.toLocaleString()} in the last {data.days} days
        </span>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {data.visitors.map((visitor) => {
          const place = placeLabel(visitor);
          return (
            <li key={`${visitor.lastAt}-${visitor.firstAt}-${visitor.browser}`} className="flex items-start gap-3 px-3.5 py-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <DeviceIcon type={visitor.deviceType} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`flex items-center gap-1 truncate text-[13px] font-medium ${place ? "text-fg" : "text-fg-subtle"}`}>
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                  <span className="truncate">{place ?? "Unknown location"}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-fg-subtle">
                  <span className="text-fg-muted">
                    {DEVICE_NAMES[visitor.deviceType]} · {visitor.os} · {visitor.browser}
                  </span>
                  <span>· {visitor.referrer ? `from ${visitor.referrer}` : "direct / app"}</span>
                  {visitor.views > 1 && (
                    <span title={formatDateTime(visitor.firstAt)}>· first seen {formatRelative(visitor.firstAt, now)}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[12px] font-semibold text-fg tabular-nums">
                  {visitor.views} {visitor.views === 1 ? "view" : "views"}
                </p>
                <time className="text-[11px] text-fg-subtle tabular-nums" dateTime={visitor.lastAt} title={formatDateTime(visitor.lastAt)}>
                  {formatRelative(visitor.lastAt, now)}
                </time>
              </div>
            </li>
          );
        })}
      </ul>
      {!located && (
        <p className="mt-2 text-[11px] text-fg-subtle">
          City and country appear automatically when the site is hosted on Vercel or behind Cloudflare.
        </p>
      )}
    </section>
  );
}
