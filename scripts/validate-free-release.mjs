// CI FLOW RULE (S00): the legacy Free validator reads and accepts a complete
// tier archive (and previously a tier-wide `.bin`). It is retired. The Free
// workflow stays hard-disabled until candidate-set pages and individually
// bounded packages have a dedicated verifier.
throw new Error("legacy full-library Free publisher is retired; candidate-set package verification is required");
