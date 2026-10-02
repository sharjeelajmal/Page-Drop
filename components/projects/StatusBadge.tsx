import { Badge } from "@/components/ui/Badge";
import type { ProjectStatus } from "@/types/project";

const TONES = { ready: "success", processing: "primary", failed: "danger" } as const;
const LABELS: Record<ProjectStatus, string> = { ready: "Live", processing: "Processing", failed: "Failed" };

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={TONES[status]} dot>
      {LABELS[status]}
    </Badge>
  );
}
