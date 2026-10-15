// Server-only OAuth transaction and Microsoft ID-token verification helpers.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { getMicrosoftCallbackUrl } from '@/lib/auth-urls'

export const MICROSOFT_TRANSACTION_COOKIE = 'eis-microsoft-sso'
export const MICROSOFT_TRANSACTION_TTL_SECONDS = 600

const DEFAULT_TENANT_ID = '09cefcf6-a744-4cc2-a8ec-681fe0d1a85a'
const DEFAULT_CLIENT_ID = '6bda999f-ddc2-4411-bb66-9e5ece2a7bb2'
const DEFAULT_PROVIDER_ID = 'custom:bcave-entra'
const COOKIE_CONTEXT = Buffer.from('BCAVE EIS Microsoft SSO transaction:v1')
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
let microsoftKeys: { tenantId: string; resolver: ReturnType<typeof createRemoteJWKSet> } | undefined

export type MicrosoftAuthConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  providerId: `custom:${string}`
}

export type MicrosoftAccountIdentity = {
  companyDomainVerified: boolean
  tenantId: string
  objectId: string
  // Verified email domain gates Microsoft access; account lookup uses tenantId and objectId.
  email: string
  name: string
}

type MicrosoftTransaction = {
  origin: string
  tenantId: string
  clientId: string
  providerId: string
  issuedAt: number
  state: string
  verifier: string
  nonce: string
}

export function getMicrosoftAuthConfig(): MicrosoftAuthConfig {
  const tenantId = (process.env.MICROSOFT_TENANT_ID?.trim() || DEFAULT_TENANT_ID).toLowerCase()
  const clientId = (process.env.MICROSOFT_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID).toLowerCase()
  const providerId = process.env.MICROSOFT_OIDC_PROVIDER_ID?.trim() || DEFAULT_PROVIDER_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  if (!UUID_PATTERN.test(tenantId) || !UUID_PATTERN.test(clientId)
    || !/^custom:[a-z0-9][a-z0-9:-]{0,42}$/.test(providerId)
    || !clientSecret?.trim()) {
    throw new Error('Microsoft SSO is not configured correctly')
  }
  return { tenantId, clientId, clientSecret, providerId: providerId as `custom:${string}` }
}

export function getMicrosoftAccountEmail(tenantId: string, objectId: string): string {
  const tenant = typeof tenantId === 'string' ? tenantId.toLowerCase() : ''
  const object = typeof objectId === 'string' ? objectId.toLowerCase() : ''
  if (!UUID_PATTERN.test(tenant) || !UUID_PATTERN.test(object)) {
    throw new Error('Invalid Microsoft account identity')
  }
  // .invalid cannot receive recovery mail; the alias is never the employee's email.
  const digest = createHash('sha256').update(`BCAVE EIS Microsoft account:v1\0${tenant}\0${object}`).digest('hex')
  return `${digest}@microsoft-sso.invalid`
}

function displayEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  const email = value.trim()
  return email.length <= 320 && /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(email)
    ? email.toLowerCase() : ''
}

export async function verifyMicrosoftIdToken({ idToken, nonce }: {
  idToken: string
  nonce: string
}): Promise<MicrosoftAccountIdentity> {
  const config = getMicrosoftAuthConfig()
  const invalid = () => new Error('Invalid Microsoft ID token')
  if (typeof idToken !== 'string' || !idToken || idToken.length > 65_536
    || typeof nonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) throw invalid()
  try {
    if (!microsoftKeys || microsoftKeys.tenantId !== config.tenantId) {
      // Never take a key URL or issuer from an unverified token or its headers.
      microsoftKeys = {
        tenantId: config.tenantId,
        resolver: createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`), {
          timeoutDuration: 10_000,
          cooldownDuration: 30_000,
          cacheMaxAge: 600_000,
        }),
      }
    }
    const { payload } = await jwtVerify(idToken, microsoftKeys.resolver, {
      algorithms: ['RS256'],
      typ: 'JWT',
      issuer: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
      audience: config.clientId,
      requiredClaims: ['iss', 'aud', 'exp', 'nbf', 'iat', 'tid', 'oid', 'nonce', 'sub', 'ver'],
      maxTokenAge: MICROSOFT_TRANSACTION_TTL_SECONDS,
      clockTolerance: 30,
      currentDate: new Date(Date.now()),
    })
    // Microsoft NumericDate claims are integral Unix timestamps.
    if (![payload.iat, payload.nbf, payload.exp].every(value => Number.isSafeInteger(value) && (value as number) >= 0)
      || payload.iat! >= payload.exp! || payload.nbf! >= payload.exp!
      || typeof payload.tid !== 'string' || payload.tid.toLowerCase() !== config.tenantId
      || typeof payload.oid !== 'string' || !UUID_PATTERN.test(payload.oid.toLowerCase())
      || typeof payload.sub !== 'string' || !payload.sub || payload.ver !== '2.0'
      || typeof payload.nonce !== 'string' || !/^[a-f0-9]{64}$/.test(payload.nonce)
      || !timingSafeEqual(Buffer.from(payload.nonce), Buffer.from(createHash('sha256').update(nonce).digest('hex')))) {
      throw invalid()
    }
    const email = displayEmail(payload.email) || displayEmail(payload.preferred_username)
    const name = typeof payload.name === 'string'
      ? payload.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) : ''
    const verifiedEmail = displayEmail(payload.email)
    const companyDomainVerified = payload.xms_edov === true
      && verifiedEmail.split('@')[1] === 'bcave.co.kr'
    if (!companyDomainVerified) {
      const failure = new Error('Microsoft company email domain is not allowed')
      failure.name = 'MicrosoftDomainNotAllowedError'
      throw failure
    }
    return { tenantId: config.tenantId, objectId: payload.oid.toLowerCase(), email,
      name: name || email || '회사 계정', companyDomainVerified }
  } catch (error) {
    if (error instanceof Error && error.name === 'MicrosoftDomainNotAllowedError') throw error
    throw invalid()
  }
}

function transactionKey(): Buffer {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret?.trim()) throw new Error('Microsoft SSO transaction encryption is not configured')
  // Separate the OAuth cookie key from every other use of the Supabase server key.
  return Buffer.from(hkdfSync('sha256', secret, COOKIE_CONTEXT, 'oauth-state-cookie:aes-256-gcm', 32))
}

function encodeTransaction(transaction: MicrosoftTransaction): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', transactionKey(), iv)
  cipher.setAAD(COOKIE_CONTEXT)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(transaction), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.')
}

function invalidTransaction(): Error {
  return new Error('Invalid Microsoft authentication transaction')
}

function decodePart(part: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw invalidTransaction()
  const decoded = Buffer.from(part, 'base64url')
  if (decoded.toString('base64url') !== part) throw invalidTransaction()
  return decoded
}

function decodeTransaction(value: string | null | undefined): MicrosoftTransaction {
  if (typeof value !== 'string' || value.length > 4096) throw invalidTransaction()
  try {
    const parts = value.split('.')
    if (parts.length !== 4 || parts[0] !== 'v1') throw invalidTransaction()
    const iv = decodePart(parts[1])
    const encrypted = decodePart(parts[2])
    const tag = decodePart(parts[3])
    if (iv.length !== 12 || tag.length !== 16) throw invalidTransaction()
    const decipher = createDecipheriv('aes-256-gcm', transactionKey(), iv)
    decipher.setAAD(COOKIE_CONTEXT)
    decipher.setAuthTag(tag)
    const transaction: unknown = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'))
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) throw invalidTransaction()
    const payload = transaction as Partial<MicrosoftTransaction>
    if (typeof payload.origin !== 'string' || typeof payload.tenantId !== 'string'
      || typeof payload.clientId !== 'string' || typeof payload.providerId !== 'string'
      || !Number.isSafeInteger(payload.issuedAt)
      || ![payload.state, payload.verifier, payload.nonce].every(v => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v))) {
      throw invalidTransaction()
    }
    return payload as MicrosoftTransaction
  } catch {
    throw invalidTransaction()
  }
}

export function createMicrosoftAuthRequest(origin: string): {
  authorizationUrl: string
  transactionCookie: string
} {
  const config = getMicrosoftAuthConfig()
  const redirectUri = getMicrosoftCallbackUrl(origin)
  const transaction: MicrosoftTransaction = {
    origin: new URL(redirectUri).origin,
    tenantId: config.tenantId,
    clientId: config.clientId,
    providerId: config.providerId,
    issuedAt: Math.floor(Date.now() / 1000),
    state: randomBytes(32).toString('base64url'),
    verifier: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
  }
  const authorizationUrl = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`)
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: 'openid profile email',
    prompt: 'select_account',
    state: transaction.state,
    code_challenge: createHash('sha256').update(transaction.verifier).digest('base64url'),
    code_challenge_method: 'S256',
    // 서버 쿠키의 원본 nonce와 비교할 SHA-256 해시를 Entra에 전달한다.
    nonce: createHash('sha256').update(transaction.nonce).digest('hex'),
  }).toString()
  return { authorizationUrl: authorizationUrl.toString(), transactionCookie: encodeTransaction(transaction) }
}

export async function exchangeMicrosoftAuthCode({ code, state, transactionCookie, origin }: {
  code: string
  state: string
  transactionCookie: string | null | undefined
  origin: string
}): Promise<{ idToken: string; accessToken?: string; nonce: string; providerId: `custom:${string}` }> {
  const config = getMicrosoftAuthConfig()
  const redirectUri = getMicrosoftCallbackUrl(origin)
  const transaction = decodeTransaction(transactionCookie)
  const now = Math.floor(Date.now() / 1000)
  if (transaction.origin !== new URL(redirectUri).origin
    || transaction.tenantId !== config.tenantId || transaction.clientId !== config.clientId
    || transaction.providerId !== config.providerId
    || transaction.issuedAt > now || now - transaction.issuedAt >= MICROSOFT_TRANSACTION_TTL_SECONDS
    || typeof code !== 'string' || !code || code.length > 8192
    || typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state)
    || !timingSafeEqual(Buffer.from(state), Buffer.from(transaction.state))) {
    throw invalidTransaction()
  }

  let response: Response
  try {
    response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: transaction.verifier,
      }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new Error('Microsoft token exchange failed')
  }
  if (!response.ok) throw new Error('Microsoft token exchange failed')
  let tokens: { id_token?: unknown; access_token?: unknown }
  try {
    tokens = await response.json()
  } catch {
    throw new Error('Microsoft token exchange failed')
  }
  if (!tokens || typeof tokens.id_token !== 'string' || !tokens.id_token
    || (tokens.access_token !== undefined && (typeof tokens.access_token !== 'string' || !tokens.access_token))) {
    throw new Error('Microsoft token exchange failed')
  }
  return {
    idToken: tokens.id_token,
    ...(typeof tokens.access_token === 'string' ? { accessToken: tokens.access_token } : {}),
    nonce: transaction.nonce,
    providerId: config.providerId,
  }
}
