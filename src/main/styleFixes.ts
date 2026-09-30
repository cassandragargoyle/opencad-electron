/**
 * CSS fixes for the OpenCAD web app, injected into its pages.
 *
 * Used for layout problems of the upstream app that we fix without touching
 * submodule/opencad. Each rule should name the upstream file it corrects, so
 * it can be dropped once OpenCAD fixes the problem itself.
 */

export const STYLE_FIXES = `
/*
 * Tool shelf in expanded mode (toggled by double-click): the tool buttons grow
 * to 140px with labels, but the container keeps its fixed 40px width, so the
 * icons are pushed out and the labels are cut off.
 * Upstream: packages/app/src/styles/app.css (.app-toolshelf-container, .toolshelf--expanded)
 */
.app-toolshelf-container:not(.panel-collapsed):has(> .toolshelf--expanded) {
  width: 148px;
  min-width: 148px;
}
`;
