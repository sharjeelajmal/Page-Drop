"use client";

import { FolderKanban, LayoutGrid, Lock, Plus, RefreshCw, Rows3, Search, ShieldCheck, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ProjectCard, ProjectRow } from "@/components/projects/ProjectCard";
import { DeleteDialog, RedeployDialog, RenameDialog } from "@/components/projects/ProjectDialogs";
import { ProjectDrawer } from "@/components/projects/ProjectDrawer";
import type { ProjectHandlers } from "@/components/projects/ProjectActions";
import { StatsBar } from "@/components/projects/StatsBar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { AlertIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/IconTile";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { getErrorMessage } from "@/lib/client/api";
import { fetchProjects, setProjectLock, type ProjectsListView } from "@/lib/client/projects";
import type { ProjectDTO, ProjectSummaryDTO, ViewerRole } from "@/types/project";

type Filter = "all" | "zip" | "html";
type Sort = "newest" | "oldest" | "name" | "size";
type Layout = "grid" | "list";
type ListState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; projects: ProjectSummaryDTO[] };

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
    locked: project.locked,
    updatedAt: project.updatedAt,
  };
}

interface ProjectsViewProps {
  role: ViewerRole;
  /** First page rendered on the server (no client fetch waterfall). */
  initialProjects?: ProjectSummaryDTO[];
  initialError?: string;
}

export function ProjectsView({ role, initialProjects, initialError }: ProjectsViewProps) {
  const toast = useToast();
  const isPrivate = role === "private";

  const [lists, setLists] = useState<Partial<Record<ProjectsListView, ListState>>>(() => ({
    active: initialProjects
      ? { status: "ready", projects: initialProjects }
      : initialError
        ? { status: "error", message: initialError }
        : { status: "loading" },
  }));
  const [listView, setListView] = useState<ProjectsListView>("active");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<Layout>("grid");
  const [now] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);

  const [viewing, setViewing] = useState<ProjectSummaryDTO | null>(null);
  const [viewVersion, setViewVersion] = useState(0);
  const [renaming, setRenaming] = useState<ProjectSummaryDTO | null>(null);
  const [redeploying, setRedeploying] = useState<ProjectSummaryDTO | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummaryDTO | null>(null);

  const current: ListState = lists[listView] ?? { status: "loading" };
  const projects = useMemo(() => {
    const state = lists[listView];
    return state?.status === "ready" ? state.projects : [];
  }, [lists, listView]);

  const load = useCallback(async (view: ProjectsListView) => {
    try {
      const list = await fetchProjects(view);
      setLists((all) => ({ ...all, [view]: { status: "ready", projects: list } }));
    } catch (error) {
      setLists((all) => ({ ...all, [view]: { status: "error", message: getErrorMessage(error) } }));
    }
  }, []);

  // Fallback when the server could not render the first page.
  useEffect(() => {
    if (initialProjects || initialError) return;
    let cancelled = false;
    fetchProjects("active")
      .then((list) => !cancelled && setLists((all) => ({ ...all, active: { status: "ready", projects: list } })))
      .catch(
        (error) =>
          !cancelled && setLists((all) => ({ ...all, active: { status: "error", message: getErrorMessage(error) } })),
      );
    return () => {
      cancelled = true;
    };
  }, [initialProjects, initialError]);

  const switchView = (view: ProjectsListView) => {
    setListView(view);
    if (!lists[view]) {
      setLists((all) => ({ ...all, [view]: { status: "loading" } }));
      void load(view);
    }
  };

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
          !q || p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.originalFileName.toLowerCase().includes(q),
      )
      .sort(SORTS[sort]);
  }, [projects, query, filter, sort]);

  const updateList = (view: ProjectsListView, fn: (list: ProjectSummaryDTO[]) => ProjectSummaryDTO[]) =>
    setLists((all) => {
      const state = all[view];
      return state?.status === "ready" ? { ...all, [view]: { status: "ready", projects: fn(state.projects) } } : all;
    });

  const replace = (updated: ProjectDTO) => {
    updateList(listView, (list) => list.map((p) => (p.projectId === updated.projectId ? toSummary(updated, p) : p)));
    setViewing((open) => (open?.projectId === updated.projectId ? toSummary(updated, open) : open));
    setViewVersion((v) => v + 1);
  };

  const toggleLock = async (project: ProjectSummaryDTO) => {
    const locked = !project.locked;
    try {
      const updated = await setProjectLock(project.projectId, locked);
      const from: ProjectsListView = project.locked ? "locked" : "active";
      const to: ProjectsListView = locked ? "locked" : "active";
      updateList(from, (list) => list.filter((p) => p.projectId !== project.projectId));
      updateList(to, (list) => [toSummary(updated, project), ...list]);
      setViewing((open) => (open?.projectId === project.projectId ? null : open));
      toast.success(locked ? `“${project.name}” moved to Locked` : `“${project.name}” unlocked`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlers: ProjectHandlers = {
    onView: setViewing,
    onRename: setRenaming,
    onRedeploy: setRedeploying,
    onDelete: setDeleting,
    onToggleLock: isPrivate ? toggleLock : undefined,
  };
  const closeViewing = useCallback(() => setViewing(null), []);
  const closeRenaming = useCallback(() => setRenaming(null), []);
  const closeRedeploying = useCallback(() => setRedeploying(null), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);

  const inVault = listView === "locked";
  const lockedCount = lists.locked?.status === "ready" ? lists.locked.projects.length : undefined;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4 animate-slide-up">
          <IconTile tone={inVault ? "violet" : "brand"} size="lg" className="hidden sm:inline-flex">
            {inVault ? <Lock /> : <FolderKanban />}
          </IconTile>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              {inVault ? "Private vault" : "Workspace"}
            </p>
            <h1 className="mt-1.5 text-4xl font-bold tracking-[-0.035em] text-fg sm:text-5xl">
              {inVault ? (
                <>
                  Locked <span className="text-brand">projects</span>
                </>
              ) : (
                <>
                  Your <span className="text-brand">projects</span>
                </>
              )}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-fg-muted">
              {inVault
                ? "Only visible to your private login. The admin account never sees these."
                : "Every page you have published. Preview, rename, redeploy with new files or delete."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 animate-fade-in">
          {isPrivate && (
            <button
              type="button"
              onClick={() => switchView(inVault ? "active" : "locked")}
              aria-pressed={inVault}
              className={`sheen depth-1 inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-px ${
                inVault
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                  : "border-border bg-surface text-fg hover:border-violet-400/50"
              }`}
            >
              <Lock className="h-4 w-4" />
              {inVault ? "Back to projects" : "Locked"}
              {!inVault && lockedCount !== undefined && (
                <span className="rounded-full bg-violet-500/15 px-1.5 text-xs text-violet-700 tabular-nums dark:text-violet-200">
                  {lockedCount}
                </span>
              )}
            </button>
          )}
          <Link href="/" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" />
            New deployment
          </Link>
        </div>
      </div>

      {current.status === "ready" && projects.length > 0 && <StatsBar key={listView} projects={projects} />}

      {current.status === "ready" && projects.length > 0 && (
        <div className="edge glass depth-1 relative z-20 flex flex-col gap-3 rounded-2xl border border-border/60 p-2.5 lg:flex-row lg:items-center">
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-fg-subtle" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, link or file…"
              aria-label="Search projects"
              className="h-10 w-full rounded-xl border border-transparent bg-bg-subtle/80 pr-10 pl-9 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft"
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
              value={layout}
              onChange={setLayout}
              options={[
                { value: "grid", label: <LayoutGrid className="h-4 w-4" />, title: "Grid view" },
                { value: "list", label: <Rows3 className="h-4 w-4" />, title: "List view" },
              ]}
            />
            <Button variant="ghost" size="icon" onClick={() => void load(listView)} aria-label="Refresh" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {current.status === "loading" && <ProjectsSkeleton embedded />}

      {current.status === "error" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-6 py-12 text-center animate-fade-in">
          <AlertIcon className="h-6 w-6 text-danger" />
          <p className="text-sm text-fg">{current.message}</p>
          <Button variant="secondary" size="sm" onClick={() => void load(listView)}>
            Try again
          </Button>
        </div>
      )}

      {current.status === "ready" && projects.length === 0 && <EmptyState vault={inVault} />}

      {current.status === "ready" && projects.length > 0 && visible.length === 0 && (
        <p className="py-16 text-center text-sm text-fg-subtle animate-fade-in">No projects match your search.</p>
      )}

      {current.status === "ready" && visible.length > 0 && (
        // Re-keyed so the stagger animation replays when the layout, filters or list change.
        <div key={`${listView}-${layout}-${filter}-${sort}`}>
          {layout === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((project, index) => (
                <ProjectCard key={project.projectId} project={project} index={index} now={now} handlers={handlers} />
              ))}
            </div>
          ) : (
            <ul className="space-y-2.5">
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
          updateList(listView, (list) => list.filter((p) => p.projectId !== projectId));
          setViewing((open) => (open?.projectId === projectId ? null : open));
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
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-subtle/80 p-0.5">
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
              active ? "depth-1 bg-surface text-fg ring-1 ring-border" : "text-fg-subtle hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Placeholder while the list loads (also the Suspense fallback of the page). */
export function ProjectsSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-10" aria-label="Loading projects" aria-busy="true">
      {!embedded && (
        <div className="space-y-3">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-12 w-72 rounded-xl" />
          <div className="skeleton h-4 w-96 max-w-full rounded" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[118px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[22px] border border-border bg-surface">
            <div className="skeleton aspect-[16/10]" />
            <div className="space-y-2 p-5">
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

function EmptyState({ vault }: { vault: boolean }) {
  return (
    <div className="edge glass depth-2 relative flex flex-col items-center overflow-hidden rounded-[28px] border border-border/60 px-6 py-20 text-center animate-scale-in">
      <div className="bg-glow absolute inset-0" aria-hidden="true" />
      <div className="relative animate-float">
        <IconTile tone={vault ? "violet" : "brand"} size="lg">
          {vault ? <ShieldCheck /> : <UploadCloud />}
        </IconTile>
      </div>
      <h2 className="relative mt-6 text-xl font-semibold tracking-tight text-fg">
        {vault ? "No locked projects" : "No projects yet"}
      </h2>
      <p className="relative mt-2 max-w-sm text-sm text-fg-muted">
        {vault
          ? "Projects you deploy with “Lock this project” on, or lock from the list, appear here."
          : "Deploy your first HTML file or ZIP and it will show up here, ready to manage."}
      </p>
      <Link href="/" className={buttonClasses("primary", "md", "relative mt-7")}>
        <UploadCloud className="h-4 w-4" />
        Deploy a site
      </Link>
    </div>
  );
}
