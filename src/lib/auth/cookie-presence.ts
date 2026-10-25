/** Optimization only: cookie presence never authorizes a request. */
export function hasAuthCookie(names: string[], projectUrl: string | undefined): boolean {
  if (!projectUrl) return false;
  let project: string;
  try { project = new URL(projectUrl).hostname.split('.')[0]; } catch { return false; }
  const base = `sb-${project}-auth-token`;
  return names.some(name => name === base || (name.startsWith(`${base}.`) && /^\d+$/.test(name.slice(base.length + 1))));
}
