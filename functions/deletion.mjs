// Server-only orchestration. Dependencies are injected so tests never touch real accounts.
export function deletionIdentity(auth, now = Date.now()) {
  if (!auth?.uid) throw new Error('unauthenticated');
  const age = now / 1000 - Number(auth.token?.auth_time);
  if (!Number.isFinite(age) || age < -60 || age > 300) throw new Error('recent-login-required');
  if (auth.token?.firebase?.sign_in_provider !== 'google.com') throw new Error('google-required');
  return auth.uid; // Never accept a UID supplied in the request body.
}

export async function processDeletion(uid, driver) {
  const job = await driver.readJob(uid);
  if (!job || job.state === 'completed') return;
  await driver.processing(uid);
  try {
    // The durable job is also a rules barrier against all client writes, including other devices.
    // Keep Auth until data deletion completes so a temporary failure does not orphan the account.
    await driver.disableAccount(uid);
    await driver.deleteFinancialTree(uid);
    await driver.deleteAuthAccount(uid);
    await driver.completed(uid);
  } catch (error) {
    await driver.retryPending(uid);
    throw error; // Eventarc retries; repeated delivery and partial completion are safe.
  }
}
