export type AppRole = 'admin' | 'manager' | 'staff' | 'vendor'

export function isApprovedRole(role: unknown): role is AppRole {
  return role === 'admin' || role === 'manager' || role === 'staff' || role === 'vendor'
}

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  sso_domain_not_allowed: 'Microsoft가 검증한 @bcave.co.kr 회사 계정만 로그인할 수 있습니다.',
  sso_not_approved: 'MS SSO 계정이 등록되었습니다. 관리자 승인과 접근 브랜드 권한 부여 후 이용할 수 있습니다.',
  sso_session_required: 'MS SSO 계정은 Microsoft 로그인으로 다시 인증해주세요.',
  sso_disabled: 'Microsoft 로그인이 아직 활성화되지 않았습니다. 기존 계정으로 로그인해주세요.',
  sso_cancelled: 'Microsoft 로그인이 취소되었습니다. 다시 시도해주세요.',
  sso_failed: 'Microsoft 로그인에 실패했습니다. 다시 시도하거나 관리자에게 문의해주세요.',
  not_approved: '등록된 사용자만 이용할 수 있습니다. 관리자에게 계정 등록을 요청해주세요.',
  auth_unavailable: '로그인 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
}
