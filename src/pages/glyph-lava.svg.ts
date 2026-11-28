import type { APIRoute } from "astro";
import { renderStill } from "@/lib/glyph-lava/still";

export const GET: APIRoute = () =>
  new Response(renderStill(), { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
