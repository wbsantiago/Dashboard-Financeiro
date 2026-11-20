// Enable only after deploying the worker + callable + rules and validating on a disposable account.
// Keeping the gate off prevents the app from claiming a request was sent to an absent service.
// Current release uses the support flow on Firebase Spark; no paid service is deployed.
export const ACCOUNT_SERVICES = { mode: 'support', enabled: false, region: 'southamerica-east1' };
