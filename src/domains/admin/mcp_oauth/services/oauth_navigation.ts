/** Full-page navigation to the client's callback (a thin seam for tests). */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
