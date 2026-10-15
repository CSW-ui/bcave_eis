import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'
import { decodeJwt } from 'jose/jwt/decode'
import type { User, Session } from '@supabase/supabase-js'
import { getAuthSource } from '@/lib/account-source'

export const MICROSOFT_SESSION_COOKIE = 'eis-microsoft-session'
// Browser persistence limit, renewed during use; not an authentication deadline.
export const MICROSOFT_SESSION_COOKIE_MAX_AGE = 400 * 24 * 60 * 60
const COOKIE_RENEW_AFTER_SECONDS = 24 * 60 * 60
const ISSUER = 'bcave-eis:microsoft-session'
const AUDIENCE = 'bcave-eis:microsoft-account'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function proofKey() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret?.trim()) throw new Error('Microsoft session protection is not configured')
  return new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(`BCAVE EIS Microsoft session proof:v1:${secret}`)))
}

// accessToken은 호출자가 getUser 또는 verifyOtp로 검증한 동일 Supabase 세션이어야 한다.
export function getSessionId(accessToken: string): string {
  const claims = decodeJwt(accessToken)
  if (typeof claims.session_id !== 'string' || !UUID.test(claims.session_id)) {
    throw new Error('Invalid Supabase session')
  }
  return claims.session_id
}

export function requiresAccountSessionCheck(user: User): boolean {
  // Identity를 해제해도 이전 OAuth 세션은 살아 있을 수 있으므로 모든 세션을 검사한다.
  return Boolean(user)
}

export function isPasswordAccountSession(user: User, session: Pick<Session, 'access_token'> | null): boolean {
  try {
    if (getAuthSource(user) !== 'email' || !session?.access_token) return false
    const claims = decodeJwt(session.access_token)
    return claims.sub === user.id && Array.isArray(claims.amr)
      && claims.amr.some(item => item && typeof item === 'object' && item.method === 'password')
      && !claims.amr.some(item => item && typeof item === 'object' && item.method === 'oauth')
  } catch { return false }
}

export async function createMicrosoftSessionProof(input: {
  userId: string; sessionId: string; tenantId: string; objectId: string; companyDomainVerified?: boolean
}): Promise<string> {
  if (![input.userId, input.sessionId, input.tenantId, input.objectId].every(value => UUID.test(value))) {
    throw new Error('Invalid Microsoft account session')
  }
  return new SignJWT({ session_id: input.sessionId, tid: input.tenantId, oid: input.objectId,
    company_domain_verified: input.companyDomainVerified === true, session_lifetime: 'supabase_session' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(input.userId)
    .setIssuedAt()
    .sign(await proofKey())
}

export async function canSkipMicrosoftOtp(user: User, session: Pick<Session, 'access_token'> | null, proof?: string): Promise<boolean> {
  if (getAuthSource(user) !== 'microsoft' || !await isAccountSessionAllowed(user, session, proof)) return false
  try {
    const { payload } = await jwtVerify(proof!, await proofKey(), {
      algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, subject: user.id,
    })
    return payload.company_domain_verified === true
  } catch { return false }
}

export async function isAccountSessionAllowed(
  user: User, session: Pick<Session, 'access_token'> | null, proof?: string,
): Promise<boolean> {
  if (!requiresAccountSessionCheck(user)) return true
  try {
    if (!session?.access_token) return false
    const claims = decodeJwt(session.access_token)
    if (claims.sub !== user.id) return false
    if (getAuthSource(user) !== 'microsoft') {
      // 이전 자동 연결 테스트의 OAuth 세션으로 기존 EIS 권한을 사용하지 않는다.
      return Array.isArray(claims.amr)
        && !claims.amr.some(item => item && typeof item === 'object' && item.method === 'oauth')
    }
    if (user.app_metadata.microsoft_access_approved !== true) return false
    if (!proof || proof.length > 4096) return false
    const { payload } = await jwtVerify(proof, await proofKey(), {
      algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, subject: user.id,
      requiredClaims: ['iat', 'session_id', 'tid', 'oid'],
    })
    // Legacy proofs must retain their expiry. Only the explicitly signed new
    // session-bound format may omit exp; it cannot authenticate without Supabase.
    if (payload.session_lifetime !== 'supabase_session' &&
        (payload.session_lifetime !== undefined || typeof payload.exp !== 'number')) return false
    return payload.session_id === getSessionId(session.access_token)
      && payload.tid === user.app_metadata.microsoft_tenant_id
      && payload.oid === user.app_metadata.microsoft_object_id
  } catch {
    return false
  }
}

// Upgrade valid old proofs and renew cookie persistence at most once per day.
// Missing, expired, forged or differently bound proofs can never be renewed.
export async function renewMicrosoftSessionProof(
  user: User, session: Pick<Session, 'access_token'> | null, proof?: string,
): Promise<string | null> {
  if (getAuthSource(user) !== 'microsoft' || !await isAccountSessionAllowed(user, session, proof)) return null
  const payload = decodeJwt(proof!)
  if (payload.session_lifetime === 'supabase_session' && typeof payload.iat === 'number'
    && Math.floor(Date.now() / 1000) - payload.iat < COOKIE_RENEW_AFTER_SECONDS) return null
  return createMicrosoftSessionProof({
    userId: user.id, sessionId: getSessionId(session!.access_token),
    tenantId: user.app_metadata.microsoft_tenant_id, objectId: user.app_metadata.microsoft_object_id,
    companyDomainVerified: payload.company_domain_verified === true,
  })
}
