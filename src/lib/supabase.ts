import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// 브라우저 / 클라이언트 컴포넌트용 (publishable key)
export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// 서버 전용 (secret key) — API Route, Server Component에서만 사용
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)
