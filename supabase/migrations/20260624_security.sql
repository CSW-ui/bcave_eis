-- ════════════════════════════════════════════════════════════════
-- B.cave EIS 보안 강화 마이그레이션 (2026-06-24)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 1회 실행하세요.
-- ════════════════════════════════════════════════════════════════

-- ── 1. 단일 세션(동시 로그인 1개) 용 토큰 컬럼 ──────────────────
-- 로그인할 때마다 새 토큰을 발급해 저장한다.
-- 다른 기기에서 같은 계정으로 로그인하면 토큰이 바뀌어,
-- 먼저 접속해 있던 쪽은 다음 확인 시 자동 로그아웃된다. (마지막 로그인 우선)
alter table public.profiles
  add column if not exists session_token uuid;

-- ── 2. 로그인 이력 (감사 로그) ─────────────────────────────────
-- 누가 언제 어디서(IP) 로그인했는지 기록 → 계정 공유/이상 접속 탐지
create table if not exists public.login_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  email       text,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists login_events_user_idx
  on public.login_events (user_id, created_at desc);

create index if not exists login_events_time_idx
  on public.login_events (created_at desc);

-- RLS 활성화: 일반 사용자는 접근 불가, 서버(service key)만 기록/조회
alter table public.login_events enable row level security;
-- (service role 은 RLS 를 우회하므로 별도 정책 불필요.
--  혹시 익명/일반 키로의 접근을 명시적으로 차단하려면 아래 정책 유지)
drop policy if exists "no_public_access" on public.login_events;
create policy "no_public_access" on public.login_events
  for all using (false) with check (false);
