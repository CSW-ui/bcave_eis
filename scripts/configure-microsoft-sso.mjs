import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })

const apply = process.argv.includes('--apply')
const tenantId = (process.env.MICROSOFT_TENANT_ID || '09cefcf6-a744-4cc2-a8ec-681fe0d1a85a').trim().toLowerCase()
const clientId = (process.env.MICROSOFT_CLIENT_ID || '6bda999f-ddc2-4411-bb66-9e5ece2a7bb2').trim().toLowerCase()
const identifier = (process.env.MICROSOFT_OIDC_PROVIDER_ID || 'custom:bcave-entra').trim()
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

async function main() {
  if (!uuid.test(tenantId) || !uuid.test(clientId) || !/^custom:[a-z0-9][a-z0-9:-]{0,42}$/.test(identifier)) {
    throw new Error('MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_OIDC_PROVIDER_ID 설정을 확인해주세요.')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) throw new Error('기존 Supabase URL과 서버 키가 필요합니다.')
  if (apply && !process.env.MICROSOFT_CLIENT_SECRET?.trim()) {
    throw new Error('MICROSOFT_CLIENT_SECRET의 Value를 .env.local 또는 서버 환경 변수에 먼저 입력해주세요.')
  }
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.admin.customProviders.listProviders()
  if (error) throw new Error(`SSO 공급자 조회 실패 (${error.status || 'network'}). 서버 키와 Custom OIDC API 접근을 확인해주세요.`)
  const existing = data.providers.find(provider => provider.identifier === identifier)
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`
  if (existing && (existing.provider_type !== 'oidc' || existing.client_id !== clientId || existing.issuer !== issuer)) {
    throw new Error('동일 이름의 공급자가 다른 앱 또는 테넌트에 연결돼 있습니다. 해당 공급자는 변경하지 않았습니다.')
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'check', project: new URL(url).hostname,
    provider: identifier, tenantId, clientId, issuer,
    accountMode: 'separate',
    legacyAutoLinkingDisabled: !existing || existing.enabled === false,
    clientSecretPresent: Boolean(process.env.MICROSOFT_CLIENT_SECRET?.trim()),
    callback: 'https://portal.bcave.co.kr/auth/callback',
    localCallback: 'http://localhost:3000/auth/callback',
  }, null, 2))
  if (!apply) return

  if (!existing) {
    console.log('기존 계정에 자동 연결하는 공급자가 없습니다. Microsoft 독립 계정 흐름을 사용합니다.')
    return
  }
  const result = await admin.auth.admin.customProviders.updateProvider(identifier, { enabled: false })
  if (result.error) {
    throw new Error(`기존 자동 연결 공급자 비활성화 실패 (${result.error.status || 'network'}, ${result.error.code || 'unknown'}).`)
  }
  const { data: verified, error: verifyError } = await admin.auth.admin.customProviders.getProvider(identifier)
  if (verifyError || verified?.enabled !== false) {
    throw new Error('기존 공급자의 비활성화를 확인하지 못했습니다. Microsoft 로그인 활성화를 보류해주세요.')
  }
  console.log('기존 계정 자동 연결 공급자를 비활성화했습니다. Microsoft 계정은 별도 UUID와 권한으로 관리합니다.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'SSO 설정을 완료하지 못했습니다.')
  process.exitCode = 1
})
