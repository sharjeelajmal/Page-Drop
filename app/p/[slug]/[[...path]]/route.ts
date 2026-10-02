import type { NextRequest } from "next/server";

import { servePublishedPath } from "@/lib/publish/serve";

export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: RouteContext<"/p/[slug]/[[...path]]">) {
  const { slug, path } = await ctx.params;
  try {
    return await servePublishedPath(request, slug, path ?? []);
  } catch (error) {
    console.error("[pages] Failed to serve page:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

export async function HEAD(request: NextRequest, ctx: RouteContext<"/p/[slug]/[[...path]]">) {
  const response = await GET(request, ctx);
  await response.body?.cancel();
  return new Response(null, { status: response.status, headers: response.headers });
}
