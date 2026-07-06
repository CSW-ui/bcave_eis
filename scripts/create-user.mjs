// 일회성 계정 생성 스크립트 — service key로 Supabase Auth + profiles 생성
// 사용: node scripts/create-user.mjs <email> <password> <name> <role>
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

// .env 로드 (dotenv 없이 직접 파싱)
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const [, , email, password, name, role = 'admin'] = process.argv
if (!email || !password || !name) {
  console.error('사용: node scripts/create-user.mjs <email> <password> <name> [role]')
  process.exit(1)
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
)

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})
if (error) { console.error('Auth 생성 실패:', error.message); process.exit(1) }

const { error: pErr } = await admin.from('profiles').upsert({
  id: data.user.id,
  email,
  name,
  role,
  brands: [],
})
if (pErr) { console.error('profiles 생성 실패:', pErr.message); process.exit(1) }

console.log(`✅ 생성 완료: ${email} (role=${role}, id=${data.user.id})`)
