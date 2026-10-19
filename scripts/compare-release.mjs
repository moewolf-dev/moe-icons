// CI FLOW RULE (S00): comparing/reusing tier-wide Release asset sets would
// keep the large archives as an implicit fallback. Reuse must be keyed by the
// candidate-set and independently verified content-addressed package digest.
export function compareReleaseAssets() {
  throw new Error("legacy full-library release comparison is retired; candidate-set package reuse is required");
}
