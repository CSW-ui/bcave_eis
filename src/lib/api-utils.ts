import { NextResponse } from 'next/server'

/** API Route 공통 에러 응답 */
export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

/** API Route try-catch 래퍼 */
export function withErrorHandler(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (err) {
      console.error('[API Error]', err)
      return apiError(err instanceof Error ? err.message : String(err))
    }
  }
}
