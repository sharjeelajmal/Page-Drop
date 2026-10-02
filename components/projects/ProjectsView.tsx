"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ProjectCard, ProjectRow } from "@/components/projects/ProjectCard";
import { DeleteDialog, RedeployDialog, RenameDialog } from "@/components/projects/ProjectDialogs";
import { ProjectDrawer } from "@/components/projects/ProjectDrawer";
import type { ProjectHandlers } from "@/components/projects/ProjectActions";
import { StatsBar } from "@/components/projects/StatsBar";
import { Select } from "@/components/ui/Select";
import { Button, buttonClasses } from "@/components/ui/Button";
import { AlertIcon, FolderIcon, GridIcon, ListIcon, PlusIcon, RetryIcon, SearchIcon, UploadIcon } from "@/components/ui/icons";
import { getErrorMessage } from "@/lib/client/api";
import { fetchProjects } from "@/lib/client/projects";
import type { ProjectDTO, ProjectSummaryDTO } from "@/types/project";

type Filter = "all" | "zip" | "html";
type Sort = "newest" | "oldest" | "name" | "size";
type View = "grid" | "list";
type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

const SORTS: Record<Sort, (a: ProjectSummaryDTO, b: ProjectSummaryDTO) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  size: (a, b) => b.totalBytes - a.totalBytes,
};

/** Keeps a list row in sync after an action returned the full project. */
function toSummary(project: ProjectDTO, previous: ProjectSummaryDTO): ProjectSummaryDTO {
  return {
    ...previous,
    name: project.name,
    type: project.type,
    status: project.status,
    originalFileName: project.originalFileName,
    publicUrl: project.publicUrl,
    fileCount: project.fileCount,
    imageCount: project.imageCount,
    assetCount: project.assets.length,
    totalBytes: project.totalBytes,
    updatedAt: project.updatedAt,
  };
}

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectSummaryDTO[]>([]);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<View>("grid");
  const [now] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);

  const [viewing, setViewing] = useState<ProjectSummaryDTO | null>(null);
  const [viewVersion, setViewVersion] = useState(0);
  const [renaming, setRenaming] = useState<ProjectSummaryDTO | null>(null);
  const [redeploying, setRedeploying] = useState<ProjectSummaryDTO | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummaryDTO | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchProjects();
      setProjects(list);
      setLoad({ status: "ready" });
    } catch (error) {
      setLoad({ status: "error", message: getErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        setLoad({ status: "ready" });
      })
      .catch((error) => !cancelled && setLoad({ status: "error", message: getErrorMessage(error) }));
    return () => {
      cancelled = true;
    };
  }, []);

  // "/" focuses search, like most developer tools.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(target.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(
    () => ({
      all: projects.length,
      zip: projects.filter((p) => p.type === "zip").length,
      html: projects.filter((p) => p.type === "html").length,
    }),
    [projects],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => filter === "all" || p.type === filter)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.slug.includes(q) ||
          p.originalFileName.toLowerCase().includes(q),
      )
      .sort(SORTS[sort]);
  }, [projects, query, filter, sort]);

  const replace = (updated: ProjectDTO) => {
    setProjects((list) => list.map((p) => (p.projectId === updated.projectId ? toSummary(updated, p) : p)));
    setViewing((current) => (current?.projectId === updated.projectId ? toSummary(updated, current) : current));
    setViewVersion((v) => v + 1);
  };

  const handlers: ProjectHandlers = {
    onView: setViewing,
    onRename: setRenaming,
    onRedeploy: setRedeploying,
    onDelete: setDeleting,
  };
  const closeViewing = useCallback(() => setViewing(null), []);
  const closeRenaming = useCallback(() => setRenaming(null), []);
  const closeRedeploying = useCallback(() => setRedeploying(null), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-in">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-fg sm:text-4xl">Projects</h1>
          <p className="mt-2 max-w-xl text-[15px] text-fg-muted">
            Every page you have published. View, rename, redeploy with new files or delete them.
          </p>
        </div>
        <Link href="/" className={buttonClasses("primary", "md", "self-start md:self-auto")}>
          <PlusIcon className="h-4 w-4" />
          New deployment
        </Link>
      </div>

      {load.status === "ready" && projects.length > 0 && <StatsBar projects={projects} />}

      {load.status === "ready" && projects.length > 0 && (
        <div className="relative z-20 flex flex-col gap-3 rounded-2xl border border-border bg-surface/80 p-2.5 shadow-card backdrop-blur lg:flex-row lg:items-center">
          <label className="relative flex min-w-0 flex-1 items-center">
            <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-fg-subtle" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, slug or file…"
              aria-label="Search projects"
              className="h-10 w-full rounded-xl border border-transparent bg-bg-subtle pr-10 pl-9 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
            <kbd className="pointer-events-none absolute right-3 rounded-md border border-border bg-surface px-1.5 font-mono text-[11px] text-fg-subtle">
              /
            </kbd>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Filter by type"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All ${counts.all}` },
                { value: "zip", label: `ZIP ${counts.zip}` },
                { value: "html", label: `HTML ${counts.html}` },
              ]}
            />
            <Select
              label="Sort projects"
              prefix="Sort"
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "name", label: "Name A–Z" },
                { value: "size", label: "Largest first" },
              ]}
            />
            <Segmented
              label="Layout"
              value={view}
              onChange={setView}
              options={[
                { value: "grid", label: <GridIcon className="h-4 w-4" />, title: "Grid view" },
                { value: "list", label: <ListIcon className="h-4 w-4" />, title: "List view" },
              ]}
            />
            <Button variant="ghost" size="icon" onClick={() => void refresh()} aria-label="Refresh" title="Refresh">
              <RetryIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {load.status === "loading" && <LoadingSkeleton />}

      {load.status === "error" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-6 py-12 text-center animate-fade-in">
          <AlertIcon className="h-6 w-6 text-danger" />
          <p className="text-sm text-fg">{load.message}</p>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      )}

      {load.status === "ready" && projects.length === 0 && <EmptyState />}

      {load.status === "ready" && projects.length > 0 && visible.length === 0 && (
        <p className="py-16 text-center text-sm text-fg-subtle animate-fade-in">No projects match your search.</p>
      )}

      {load.status === "ready" && visible.length > 0 && (
        // Re-keyed so the stagger animation replays when the layout or filters change.
        <div key={`${view}-${filter}-${sort}`}>
          {view === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((project, index) => (
                <ProjectCard key={project.projectId} project={project} index={index} now={now} handlers={handlers} />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((project, index) => (
                <ProjectRow key={project.projectId} project={project} index={index} now={now} handlers={handlers} />
              ))}
            </ul>
          )}
        </div>
      )}

      <ProjectDrawer project={viewing} version={viewVersion} onClose={closeViewing} handlers={handlers} />
      <RenameDialog project={renaming} onClose={closeRenaming} onRenamed={replace} />
      <RedeployDialog project={redeploying} onClose={closeRedeploying} onRedeployed={replace} />
      <DeleteDialog
        project={deleting}
        onClose={closeDeleting}
        onDeleted={(projectId) => {
          setProjects((list) => list.filter((p) => p.projectId !== projectId));
          setViewing((current) => (current?.projectId === projectId ? null : current));
        }}
      />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-subtle p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            aria-label={option.title}
            onClick={() => onChange(option.value)}
            className={`flex h-8 items-center justify-center rounded-md px-2.5 text-[13px] font-medium tabular-nums transition-all duration-200 ${
              active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-subtle hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading projects">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="skeleton aspect-[16/9]" />
            <div className="space-y-2 p-4">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 py-20 text-center animate-scale-in">
      <div className="bg-glow absolute inset-0" aria-hidden="true" />
      <div className="relative animate-float">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface text-primary shadow-elevated">
          <FolderIcon className="h-7 w-7" />
        </span>
      </div>
      <h2 className="relative mt-6 text-lg font-semibold tracking-tight text-fg">No projects yet</h2>
      <p className="relative mt-1.5 max-w-sm text-sm text-fg-muted">
        Deploy your first HTML file or ZIP and it will show up here, ready to manage.
      </p>
      <Link href="/" className={buttonClasses("primary", "md", "relative mt-6")}>
        <UploadIcon className="h-4 w-4" />
        Deploy a site
      </Link>
    </div>
  );
}
