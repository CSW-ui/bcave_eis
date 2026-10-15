const DEFAULT_PUBLIC_ORIGIN = 'https://portal.bcave.co.kr'
const DEFAULT_LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

type AuthUrlConfig = {
  publicBaseUrl?: string
  localOrigins?: string
}

function readConfig(): AuthUrlConfig {
  // NEXT_PUBLIC 값은 브라우저 번들에도 같은 설정으로 포함되어야 한다.
  return {
    publicBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    localOrigins: process.env.NEXT_PUBLIC_AUTH_LOCAL_ORIGINS,
  }
}

function parseOrigin(value: string): URL | null {
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url
  } catch {
    return null
  }
}

function isLoopback(url: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
}

export function getAllowedAuthOrigins(config: AuthUrlConfig = readConfig()): string[] {
  const origins = new Set([DEFAULT_PUBLIC_ORIGIN, ...DEFAULT_LOCAL_ORIGINS])
  const publicUrl = parseOrigin(config.publicBaseUrl?.trim() || DEFAULT_PUBLIC_ORIGIN)
  if (!publicUrl || (publicUrl.protocol !== 'https:' && !isLoopback(publicUrl))) {
    throw new Error('Invalid Microsoft SSO public origin configuration')
  }
  origins.add(publicUrl.origin)

  for (const value of config.localOrigins?.trim() ? config.localOrigins.split(',') : []) {
    const localUrl = parseOrigin(value.trim())
    if (!localUrl || !isLoopback(localUrl)) {
      throw new Error('Invalid Microsoft SSO local origin configuration')
    }
    origins.add(localUrl.origin)
  }
  return [...origins]
}

export function getMicrosoftCallbackUrl(browserOrigin: string, config?: AuthUrlConfig): string {
  const url = parseOrigin(browserOrigin)
  if (!url || !getAllowedAuthOrigins(config).includes(url.origin)) {
    throw new Error('Microsoft SSO is unavailable at this origin')
  }
  // OAuth 시작 주소와 반환 주소의 origin이 같아야 PKCE 쿠키가 유지된다.
  return `${url.origin}/auth/callback`
}

export function resolveAuthRequestOrigin(request: Request, config?: AuthUrlConfig): string | null {
  const allowed = getAllowedAuthOrigins(config).map(origin => new URL(origin))
  const requestUrl = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  // 헤더 목록, 임의 호스트, 비정상 프로토콜은 처리하지 않는다.
  if (forwardedProto !== null && !['http', 'https'].includes(forwardedProto)) return null
  if (host !== null) {
    const matches = allowed.filter(origin => origin.host === host.toLowerCase())
    if (matches.length === 0) return null
    // TLS 종료 프록시는 공개 Host를 유지하면서 내부 전송을 http로 표시할 수 있다.
    // 정확히 허용된 공개 forwarded host에만 설정된 HTTPS origin을 사용한다.
    // 로컬 origin·알 수 없는 host·헤더 목록은 이 보정의 대상이 아니다.
    if (forwardedHost !== null && forwardedProto === 'http') {
      const publicOrigin = matches.find(origin => origin.protocol === 'https:' && !isLoopback(origin))
      if (publicOrigin) return publicOrigin.origin
    }
    if (forwardedProto !== null) {
      return matches.find(origin => origin.protocol === `${forwardedProto}:`)?.origin || null
    }
    // 프록시 내부의 http://localhost 주소 대신 허용된 공개 호스트의 scheme을 사용한다.
    if (matches.length === 1) return matches[0].origin
    return matches.find(origin => origin.protocol === requestUrl.protocol)?.origin || null
  }

  const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol
  return allowed.find(origin => origin.host === requestUrl.host && origin.protocol === protocol)?.origin || null
}

// 거절된 요청만 진단한다. URL 쿼리·쿠키·인증 코드·환경 변수 값은 기록하지 않는다.
export function logAuthOriginRejection(request: Request): void {
  const safeHeader = (name: string) => {
    const value = request.headers.get(name)
    if (value === null) return null
    return value.length <= 200 && /^[a-z0-9.:[\], \-]+$/i.test(value) ? value : '[invalid]'
  }
  let configuration = 'valid'
  try { getAllowedAuthOrigins() } catch { configuration = 'invalid' }
  console.warn('[Microsoft SSO] origin_rejected', {
    configuration,
    host: safeHeader('host'),
    forwardedHost: safeHeader('x-forwarded-host'),
    forwardedProto: safeHeader('x-forwarded-proto'),
  })
}
