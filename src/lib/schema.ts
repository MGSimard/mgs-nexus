import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { Variants } from "@/lib/variants";

export type Entry = {
  slug: string;
  name: string;
  table: Variants;
  Component: AstroComponentFactory;
  Demo: AstroComponentFactory | undefined;
};

const tables = import.meta.glob<Variants>(["/src/components/ui/*/*.ts", "!**/*.test.ts"], {
  eager: true,
  import: "default",
});
const components = import.meta.glob<AstroComponentFactory>("/src/components/ui/*/*.astro", {
  eager: true,
  import: "default",
});

const folder = (path: string) => path.split("/").at(-2)!;
const file = (path: string) => path.split("/").at(-1)!;

export const entries: Entry[] = Object.entries(tables)
  .map(([path, table]) => {
    const slug = folder(path);
    const files = Object.entries(components).filter(([candidate]) => folder(candidate) === slug);
    const main = files.find(([candidate]) => !file(candidate).endsWith(".demo.astro"));
    const demo = files.find(([candidate]) => file(candidate).endsWith(".demo.astro"));
    if (!main) throw new Error(`Schema: ${path} has no component beside it`);
    return {
      slug,
      name: file(main[0]).replace(/\.astro$/, ""),
      table,
      Component: main[1],
      Demo: demo?.[1],
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
