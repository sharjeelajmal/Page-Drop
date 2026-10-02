import { ArchiveIcon, FileCodeIcon } from "@/components/ui/icons";
import type { ProjectType } from "@/types/project";

interface ProjectThumbProps {
  name: string;
  type: ProjectType;
  thumbnailUrl?: string;
  className?: string;
}

/** Cover for a project: its first image, or a generated gradient tile. */
export function ProjectThumb({ name, type, thumbnailUrl, className = "" }: ProjectThumbProps) {
  if (thumbnailUrl) {
    return (
      <div className={`bg-checker relative overflow-hidden ${className}`}>
        {/* Cloudinary-hosted thumbnail; remote domain is not configured for next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
      </div>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "P";
  const Icon = type === "zip" ? ArchiveIcon : FileCodeIcon;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-transparent ${className}`}
    >
      <div className="bg-grid absolute inset-0 opacity-70 [mask-image:none]" aria-hidden="true" />
      <span className="relative text-4xl font-semibold tracking-tight text-primary/80">{initial}</span>
      <Icon className="absolute right-3 bottom-3 h-5 w-5 text-primary/50" aria-hidden="true" />
    </div>
  );
}
