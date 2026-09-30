/**
 * Menu items that press buttons of the OpenCAD web app.
 *
 * The web app does not listen to the native menu (useMenuBar is never
 * mounted), so these items click the matching button in the page instead.
 * Buttons are found by their lucide icon class, because their titles are
 * translated. Hidden buttons are skipped: e.g. the 3D pane stays mounted
 * with visibility: hidden while the floor plan is shown.
 */

export type ZoomAction = 'in' | 'out' | 'fit';

const ZOOM_ICON_CLASS: Record<ZoomAction, string> = {
  in: 'lucide-zoom-in',
  out: 'lucide-zoom-out',
  fit: 'lucide-maximize',
};

/**
 * Script run in the web app's page: clicks the first visible button matching
 * the selector; true when a button was found.
 */
export function clickButtonScript(selector: string): string {
  return `(() => {
  const button = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
    .find((b) => b.checkVisibility({ visibilityProperty: true, opacityProperty: true }));
  if (!button) return false;
  button.click();
  return true;
})()`;
}

/**
 * View → Zoom In / Zoom Out / Zoom to Fit: the zoom buttons of the 3D pane.
 * The 2D floor plan (SplitViewport) has no zoom buttons, so there it does nothing.
 * Upstream: packages/app/src/components/SplitViewport.tsx (.viewport-control-btn)
 */
export function zoomScript(action: ZoomAction): string {
  return clickButtonScript(`button.viewport-control-btn:has(> svg.${ZOOM_ICON_CLASS[action]})`);
}

/**
 * File → Close: the "Back to projects" (home) button of the project toolbar,
 * which returns to the project dashboard. Documents are persisted on every
 * change, so nothing is lost.
 * Upstream: packages/app/src/AppLayout.tsx (navigate('/'))
 */
export function closeProjectScript(): string {
  return clickButtonScript('button.toolbar-btn:has(svg.lucide-house)');
}
