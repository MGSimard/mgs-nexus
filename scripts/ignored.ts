import oxfmtConfig from "../oxfmt.config.ts";

const IGNORED_ROOTS = oxfmtConfig.ignorePatterns ?? [];

export const isIgnored = (repoPath: string): boolean =>
  IGNORED_ROOTS.some((root) => repoPath === root || repoPath.startsWith(`${root}/`));
