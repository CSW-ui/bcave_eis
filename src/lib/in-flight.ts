// Share only work that is still running. Results (including permissions) are
// never cached after completion; later requests always see fresh server data.
export function createInFlightLoader() {
  const pending = new Map<string, Promise<unknown>>()
  return function load<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = pending.get(key)
    if (existing) return existing as Promise<T>
    const request = Promise.resolve().then(operation).finally(() => {
      if (pending.get(key) === request) pending.delete(key)
    })
    pending.set(key, request)
    return request
  }
}
