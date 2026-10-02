"use client";

import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

interface CopyButtonProps {
  value: string;
  label?: string;
  /** "button" renders a labelled button; "icon" a compact icon-only button. */
  variant?: "primary" | "secondary" | "icon";
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  // Fallback for non-secure contexts (plain http on a LAN address).
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CopyButton({ value, label = "Copy", variant = "icon" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const onClick = async () => {
    try {
      await copyText(value);
      setCopied(true);
    } catch {
      // Clipboard access denied; nothing sensible to do.
    }
  };

  const icon = copied ? (
    <CheckIcon className={`h-4 w-4 ${variant === "icon" ? "text-success" : ""}`} />
  ) : (
    <CopyIcon className="h-4 w-4" />
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={buttonClasses("ghost", "icon")}
        aria-label={label}
        title={copied ? "Copied" : label}
      >
        {icon}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={buttonClasses(variant, "md", "min-w-[116px]")}>
      {icon}
      <span aria-live="polite">{copied ? "Copied!" : label}</span>
    </button>
  );
}
