import Image from "next/image";

/** PageDrop app icon from /public/icon-512.png. */
export function BrandLogo({ size = 32, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/icon-512.png"
      alt="PageDrop"
      width={size}
      height={size}
      priority={priority}
      className="rounded-[22%] shadow-[0_6px_18px_-6px_var(--primary)]"
    />
  );
}
