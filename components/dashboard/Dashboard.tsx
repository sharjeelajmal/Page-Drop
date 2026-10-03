"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { AssetsPanel } from "@/components/dashboard/AssetsPanel";
import { DeploymentPanel } from "@/components/dashboard/DeploymentPanel";
import { DeployHero } from "@/components/dashboard/DeployHero";
import type { PipelineStep } from "@/components/dashboard/PipelineSteps";
import { SourcePanel } from "@/components/dashboard/SourcePanel";
import { useProjectUpload, type ProjectUploadState } from "@/hooks/useProjectUpload";
import { AssetUploadManager, type AssetItem } from "@/lib/client/asset-uploads";
import { finalizeSlug } from "@/lib/slug";
import type { ViewerRole } from "@/types/project";

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

export function Dashboard({ role }: { role: ViewerRole }) {
  const { state, upload, restore, reset } = useProjectUpload();
  const [slug, setSlug] = useState("");
  // Private account: new projects go into the locked vault unless switched off.
  const [lockNew, setLockNew] = useState(true);
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
    const project = await upload(file, {
      slug: finalizeSlug(slug) || undefined,
      locked: role === "private" ? lockNew : undefined,
    });
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
    <div className="space-y-12">
      <DeployHero ready={project !== null} steps={pipelineSteps(state, uploadedAssets)} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {project ? (
          <DeploymentPanel project={project} onNewDeployment={startOver} />
        ) : (
          <SourcePanel
            state={state as Exclude<ProjectUploadState, { phase: "ready" }>}
            onFile={handleProjectFile}
            slug={slug}
            onSlugChange={setSlug}
            lock={role === "private" ? { value: lockNew, onChange: setLockNew } : undefined}
          />
        )}

        <div className="lg:sticky lg:top-24">
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
