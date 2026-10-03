import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "sheen bg-brand text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_10px_24px_-10px_rgb(59_91_255/0.8)] hover:-translate-y-px hover:shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_14px_30px_-10px_rgb(59_91_255/0.9)] hover:brightness-110",
  secondary: "depth-1 border border-border bg-surface text-fg hover:-translate-y-px hover:border-border-strong hover:bg-surface-2",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "text-fg-muted hover:bg-danger-soft hover:text-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  icon: "h-8 w-8",
};

export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClasses(variant, size, className)} {...props} />;
}
