/** Resolve public assets and page links beneath Astro's configured deployment path. */
export function sitePath(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}
