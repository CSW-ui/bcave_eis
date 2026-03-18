#!/bin/bash
# ============================================================
# FPOF × Google Workspace CLI — 설치 및 인증 설정
# Usage: ./integrations/gws/setup.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── 색상 ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[GWS]${NC} $1"; }
warn()  { echo -e "${YELLOW}[GWS]${NC} $1"; }
error() { echo -e "${RED}[GWS ✗]${NC} $1"; }

# ── 1. gws CLI 설치 확인 ─────────────────────────────────────
info "Google Workspace CLI 설치 확인 중..."

if command -v gws &>/dev/null; then
  GWS_VERSION=$(gws --version 2>/dev/null || echo "unknown")
  info "gws 이미 설치됨: $GWS_VERSION"
else
  info "gws 설치 중 (npm global)..."
  if command -v npm &>/dev/null; then
    npm install -g @googleworkspace/cli
    info "gws 설치 완료"
  else
    error "npm이 설치되어 있지 않습니다. Node.js를 먼저 설치하세요."
    echo "  brew install node  또는  https://nodejs.org"
    exit 1
  fi
fi

# ── 2. 인증 설정 ─────────────────────────────────────────────
echo ""
info "인증 설정을 시작합니다."
echo ""

# gcloud가 있으면 빠른 설정, 없으면 수동
if command -v gcloud &>/dev/null; then
  info "gcloud 감지됨 — 빠른 인증 설정 사용"
  echo ""
  echo "  다음 명령어가 실행됩니다:"
  echo "    gws auth setup"
  echo ""
  read -p "  진행할까요? (y/N): " CONFIRM
  if [[ "$CONFIRM" =~ ^[yY]$ ]]; then
    gws auth setup
    info "인증 설정 완료 (gcloud 기반)"
  else
    warn "인증 설정을 건너뛰었습니다. 나중에 'gws auth setup'으로 설정하세요."
  fi
else
  info "gcloud 미설치 — 브라우저 로그인 방식 사용"
  echo ""
  echo "  다음 명령어가 실행됩니다:"
  echo "    gws auth login"
  echo "  브라우저에서 Google 계정으로 로그인하세요."
  echo ""
  read -p "  진행할까요? (y/N): " CONFIRM
  if [[ "$CONFIRM" =~ ^[yY]$ ]]; then
    gws auth login
    info "인증 설정 완료 (브라우저 로그인)"
  else
    warn "인증 설정을 건너뛰었습니다. 나중에 'gws auth login'으로 설정하세요."
  fi
fi

# ── 3. 연결 테스트 ───────────────────────────────────────────
echo ""
info "연결 테스트 중..."

if gws gmail users getProfile --params '{"userId": "me"}' --dry-run &>/dev/null; then
  info "Gmail API 연결 확인 ✓"
else
  warn "Gmail API 연결 실패 — 인증을 다시 확인하세요."
fi

# ── 4. config.json 안내 ──────────────────────────────────────
echo ""
info "설치 완료! 다음 단계:"
echo ""
echo "  1. config.json 설정 (Google Sheet ID, Drive 폴더 ID 등):"
echo "     $SCRIPT_DIR/config.json"
echo ""
echo "  2. 스크립트별 사용법:"
echo "     ./integrations/gws/sync-weekly-data.sh        # Sheets → weekly/data/"
echo "     ./integrations/gws/upload-artifacts.sh <file>  # 파일 → Drive"
echo "     ./integrations/gws/send-gmail-report.sh <file> # 리포트 → Gmail"
echo "     ./integrations/gws/sync-calendar.sh            # PDCA → Calendar"
echo "     ./integrations/gws/push-meeting-notes.sh <file># 회의록 → Docs"
echo ""
echo "  3. 설정 가이드:"
echo "     $SCRIPT_DIR/README.md"
echo ""
info "기존 FPOF 시스템에는 아무 영향이 없습니다."
