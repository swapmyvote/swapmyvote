// Reads server-provided configuration out of <meta> tags rendered by the SPA
// layout (app/views/layouts/spa.html.haml). Blank content reads as absent, so
// an env var that is set but empty behaves the same as one that is unset.

export function readMeta(name: string): string | null {
  const element = document.querySelector(`meta[name="${name}"]`);
  const content = element?.getAttribute("content")?.trim();
  if (!content) {
    return null;
  }
  return content;
}
