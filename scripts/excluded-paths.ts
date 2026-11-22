const EXCLUDED_ROOTS = [".agents", ".astro", ".claude", "dist", "node_modules"];

export const isExcluded = (repoPath: string): boolean =>
  EXCLUDED_ROOTS.some((root) => repoPath === root || repoPath.startsWith(`${root}/`));
