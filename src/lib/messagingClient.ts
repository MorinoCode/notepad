/**
 * Call the background service worker without ever throwing.
 *
 * Messaging can fail for reasons that are entirely normal — the service worker
 * was torn down mid-request, the extension is reloading, another context crashed.
 * Callers treat `null` as "the UI could not reach the background" and keep the
 * last known state on screen rather than blanking out.
 */
export async function callBackground<T>(task: () => Promise<T>): Promise<T | null> {
  try {
    return await task();
  } catch (cause) {
    console.error('[notewisp] background request failed', cause);
    return null;
  }
}
