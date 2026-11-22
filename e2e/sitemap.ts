import type { APIRequestContext } from "@playwright/test";

const LOC = /<loc>([^<]+)<\/loc>/g;

const locs = async (request: APIRequestContext, path: string): Promise<string[]> => {
  const xml = await (await request.get(path)).text();
  return [...xml.matchAll(LOC)].map(([, loc = ""]) => loc);
};

export const sitemapURLs = async (request: APIRequestContext): Promise<string[]> => {
  const sitemaps = await locs(request, "/sitemap-index.xml");
  const pages = await Promise.all(sitemaps.map((sitemap) => locs(request, new URL(sitemap).pathname)));
  return pages.flat();
};
