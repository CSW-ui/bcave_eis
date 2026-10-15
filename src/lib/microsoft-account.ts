import { isTransientAuthFailure, waitForAuthRecovery } from '@/lib/auth-network'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'
import { getMicrosoftAccountEmail } from '@/lib/microsoft-auth'

type MicrosoftIdentity = { tenantId: string; objectId: string; email: string; name: string }

function matchesMicrosoftAccount(user: User, identity: MicrosoftIdentity, internalEmail: string) {
  return user.email === internalEmail && user.app_metadata.auth_source === 'microsoft'
    && user.app_metadata.microsoft_tenant_id === identity.tenantId
    && user.app_metadata.microsoft_object_id === identity.objectId
}

export async function ensureMicrosoftAccount(identity: MicrosoftIdentity): Promise<User> {
  const internalEmail = getMicrosoftAccountEmail(identity.tenantId, identity.objectId)
  const metadata = {
    auth_source: 'microsoft', microsoft_tenant_id: identity.tenantId,
    microsoft_object_id: identity.objectId, microsoft_email: identity.email,
  }
  // Resolve only the immutable internal alias; a profile ID is a locator, never
  // authority. Always reload Auth metadata and validate tid/oid/email below.
  const located = await supabaseAdmin.from('profiles').select('id').eq('email', internalEmail).maybeSingle()
  if (located.error) throw new Error('Microsoft account lookup failed')
  let user: User | null = null
  if (located.data) {
    const existing = await supabaseAdmin.auth.admin.getUserById(located.data.id)
    if (existing.error || !existing.data.user) throw new Error('Microsoft account lookup failed')
    user = existing.data.user
  }
  if (!user) {
    const createAccount = () => supabaseAdmin.auth.admin.createUser({
      email: internalEmail, email_confirm: true,
      app_metadata: { ...metadata, microsoft_access_approved: false },
      user_metadata: { name: identity.name },
    })
    let created = await createAccount()
    // The immutable internal email is unique. If creation succeeded but its response
    // was lost, the next attempt returns email_exists and resolves the same UUID.
    for (let attempt = 0; created.error && isTransientAuthFailure(created.error) && attempt < 2; attempt++) {
      await waitForAuthRecovery(attempt)
      created = await createAccount()
    }
    user = created.data.user
    if (created.error) {
      if (created.error.code !== 'email_exists') throw new Error('Microsoft account registration failed')
      // 실제 이메일이나 기존 EIS 프로필을 조회하지 않고 불변 tid+oid 주소만 찾는다.
      for (let page = 1; page <= 100; page++) {
        const listed = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
        if (listed.error) throw new Error('Microsoft account lookup failed')
        user = listed.data.users.find(candidate => candidate.email === internalEmail) || null
        if (user || listed.data.users.length < 200) break
      }
    }
  }
  if (!user || !matchesMicrosoftAccount(user, identity, internalEmail)) {
    throw new Error('Microsoft account identity mismatch')
  }
  if (user.app_metadata.microsoft_email !== identity.email) {
    const updated = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, ...metadata },
    })
    if (updated.error || !updated.data.user) throw new Error('Microsoft account metadata update failed')
    user = updated.data.user
  }
  // 권한은 이 함수에서 생성하지 않는다. 관리자가 이 UUID의 프로필을 별도로 승인한다.
  return user
}
