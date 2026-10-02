import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Published projects are served from /<slug>/ and rely on the trailing
  // slash so relative URLs (./style.css) resolve inside the project. The
  // route handler adds the slash itself; Next.js must not strip it.
  skipTrailingSlashRedirect: true,
  // Public links live at the site root (site-url/<slug>). "fallback" rewrites
  // only apply when no page, API route or public file matched, so /login,
  // /projects, /api and static files are never affected.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/:slug", destination: "/p/:slug" },
        { source: "/:slug/", destination: "/p/:slug/" },
        { source: "/:slug/:path*", destination: "/p/:slug/:path*" },
      ],
    };
  },
  serverExternalPackages: ["cloudinary"],
  poweredByHeader: false,
};

export default nextConfig;
