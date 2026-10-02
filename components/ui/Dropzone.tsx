"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";

interface DropzoneProps {
  title: string;
  hint: ReactNode;
  buttonLabel: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  size?: "lg" | "sm";
  footer?: ReactNode;
  onFiles: (files: File[]) => void;
}

/** Drag-and-drop target; the whole area is clickable and keyboard accessible. */
export function Dropzone({
  title,
  hint,
  buttonLabel,
  accept,
  multiple = false,
  disabled = false,
  icon,
  size = "lg",
  footer,
  onFiles,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const large = size === "lg";

  const handleFiles = (list: FileList | null) => {
    if (disabled || !list || list.length === 0) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current++;
    setIsDragging(true);
  };
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`${title}. ${buttonLabel}`}
      onClick={openPicker}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-dashed text-center transition-all duration-200 outline-none",
        "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-soft",
        large ? "gap-4 px-6 py-14 sm:py-16" : "gap-3 px-4 py-7",
        disabled
          ? "cursor-not-allowed border-border opacity-60"
          : isDragging
            ? "scale-[1.01] border-primary bg-primary-soft"
            : "border-border-strong bg-bg-subtle hover:border-primary/60 hover:bg-primary-soft/50",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-center rounded-xl border bg-surface shadow-card transition-all duration-200",
          large ? "h-14 w-14" : "h-10 w-10",
          isDragging
            ? "-translate-y-1 border-primary/40 text-primary"
            : "border-border text-fg-muted group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:text-primary",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="space-y-1">
        <p className={`font-semibold tracking-tight text-fg ${large ? "text-lg" : "text-sm"}`}>
          {isDragging ? "Release to upload" : title}
        </p>
        <p className={`text-fg-subtle ${large ? "text-sm" : "text-xs"}`}>
          or{" "}
          <span className="font-medium text-primary underline-offset-4 group-hover:underline">
            {buttonLabel}
          </span>
        </p>
      </div>

      <div className={`text-fg-subtle ${large ? "text-xs" : "text-[11px]"}`}>{hint}</div>
      {footer}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = ""; // allow selecting the same file again
        }}
      />
    </div>
  );
}
