// Only transport failures and temporary gateway failures are recoverable.
// Authentication denials, expired tokens and rate limits must never be retried.
export function isTransientAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const value = error as { status?: number; name?: string; cause?: { code?: string }; code?: string }
  return value.status === 0 || [502, 503, 504].includes(value.status ?? -1)
    || value.name === 'AuthRetryableFetchError' || value.name === 'TimeoutError'
    || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT']
      .includes(value.cause?.code ?? value.code ?? '')
}

export async function waitForAuthRecovery(attempt: number) {
  await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt + Math.floor(Math.random() * 100)))
}

// Mutations (including OTP, refresh tokens and authorization codes) are sent once.
// Their caller must reconcile state or obtain a fresh grant after an ambiguous result.
export async function authServerFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const retries = method === 'GET' || method === 'HEAD' ? 2 : 0
  for (let attempt = 0; ; attempt++) {
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const timeout = AbortSignal.timeout(8_000)
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout
    try {
      const response = await fetch(input, { ...init, signal })
      if (attempt >= retries || ![502, 503, 504].includes(response.status) || callerSignal?.aborted) return response
      await response.body?.cancel()
    } catch (error) {
      if (attempt >= retries || callerSignal?.aborted || !isTransientAuthFailure(error)) throw error
    }
    await waitForAuthRecovery(attempt)
  }
}
