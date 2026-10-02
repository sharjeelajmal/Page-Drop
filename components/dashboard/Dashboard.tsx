"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { AssetsPanel } from "@/components/dashboard/AssetsPanel";
import { DeploymentPanel } from "@/components/dashboard/DeploymentPanel";
import { PipelineSteps, type PipelineStep } from "@/components/dashboard/PipelineSteps";
import { SourcePanel } from "@/components/dashboard/SourcePanel";
import { useProjectUpload, type ProjectUploadState } from "@/hooks/useProjectUpload";
import { AssetUploadManager, type AssetItem } from "@/lib/client/asset-uploads";
import { finalizeSlug } from "@/lib/slug";

const EMPTY_ASSETS: AssetItem[] = [];
const getServerAssets = () => EMPTY_ASSETS;

/** Keeps ?project=<id> in the address bar so a refresh restores the project. */
function setProjectParam(projectId: string | null) {
  const url = new URL(window.location.href);
  if (projectId) url.searchParams.set("project", projectId);
  else url.searchParams.delete("project");
  window.history.replaceState(null, "", url);
}

function pipelineSteps(state: ProjectUploadState, uploadedAssets: number): PipelineStep[] {
  const { phase } = state;
  const ready = phase === "ready";
  return [
    {
      label: "Upload",
      state: phase === "error" ? "error" : phase === "idle" || phase === "uploading" ? "active" : "done",
    },
    { label: "Build", state: phase === "processing" ? "active" : ready ? "done" : "pending" },
    { label: "Assets", state: ready ? (uploadedAssets > 0 ? "done" : "active") : "pending" },
    { label: "Live", state: ready ? "done" : "pending" },
  ];
}

export function Dashboard() {
  const { state, upload, restore, reset } = useProjectUpload();
  const [slug, setSlug] = useState("");
  const [assets] = useState(() => new AssetUploadManager());
  const assetItems = useSyncExternalStore(assets.subscribe, assets.getSnapshot, getServerAssets);

  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get("project");
    if (!projectId) return;
    restore(projectId).then((project) => {
      if (project) assets.setProject(project.projectId, project.assets);
      else setProjectParam(null);
    });
  }, [restore, assets]);

  const handleProjectFile = async (file: File) => {
    const project = await upload(file, finalizeSlug(slug) || undefined);
    if (!project) return;
    setSlug("");
    setProjectParam(project.projectId);
    assets.setProject(project.projectId, project.assets);
  };

  const startOver = () => {
    reset();
    assets.reset();
    setProjectParam(null);
  };

  const project = state.phase === "ready" ? state.project : null;
  const uploadedAssets = assetItems.filter((item) => item.status === "uploaded").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {project ? "Deployment ready" : "New deployment"}
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-fg sm:text-4xl">
            {project ? "Your site is live" : "Deploy a static site"}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-fg-muted">
            Drop an HTML file or a ZIP, attach images, and share a public URL in seconds.
          </p>
        </div>
        <div className="w-fit rounded-full border border-border bg-surface/80 px-4 py-2.5 shadow-card backdrop-blur">
          <PipelineSteps steps={pipelineSteps(state, uploadedAssets)} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {project ? (
          <DeploymentPanel project={project} onNewDeployment={startOver} />
        ) : (
          <SourcePanel
            state={state as Exclude<ProjectUploadState, { phase: "ready" }>}
            onFile={handleProjectFile}
            slug={slug}
            onSlugChange={setSlug}
          />
        )}

        <div className="lg:sticky lg:top-20">
          <AssetsPanel
            items={assetItems}
            hasProject={project !== null}
            onFiles={(files) => assets.addFiles(files)}
            onRemove={(localId) => void assets.remove(localId)}
            onRetry={(localId) => assets.retry(localId)}
          />
        </div>
      </div>
    </div>
  );
}
