import type { NextConfig } from "next";

/**
 * Hardening headers for the admin app (dashboard, projects, login, API).
 * Published pages set their own headers (CSP sandbox) in the route handler
 * and are intentionally not covered, so they can still be embedded.
 */
const ADMIN_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

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
  async headers() {
    return ["/", "/login", "/projects", "/projects/:path*", "/api/:path*"].map((source) => ({
      source,
      headers: ADMIN_SECURITY_HEADERS,
    }));
  },
  serverExternalPackages: ["cloudinary"],
  poweredByHeader: false,
};

export default nextConfig;
