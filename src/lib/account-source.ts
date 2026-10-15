export type AuthSource = 'email' | 'microsoft'

interface AccountUser {
  email?: string | null
  app_metadata?: Record<string, unknown> | null
}

/** Account type is administrator-controlled; user_metadata must not decide it. */
export function getAuthSource(user: AccountUser | null | undefined): AuthSource {
  return user?.app_metadata?.auth_source === 'microsoft' ? 'microsoft' : 'email'
}

export function getAccountDisplayEmail(user: AccountUser | null | undefined): string {
  const microsoftEmail = user?.app_metadata?.microsoft_email
  return typeof microsoftEmail === 'string' && microsoftEmail.trim()
    ? microsoftEmail.trim()
    : user?.email ?? ''
}

// 서버에서만 호출한다. 이전 기본 식별자도 구성 변경 후 정리할 수 있도록 보존한다.
export function getLegacyMicrosoftProviderIds(): string[] {
  const configured = process.env.MICROSOFT_OIDC_PROVIDER_ID?.trim()
  return [...new Set(['custom:bcave-entra', ...(configured && /^custom:[a-z0-9][a-z0-9:-]{0,42}$/.test(configured) ? [configured] : [])])]
}
