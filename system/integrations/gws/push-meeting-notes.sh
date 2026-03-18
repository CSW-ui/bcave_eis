#!/bin/bash
# ============================================================
# [5] 회의록 → Google Docs 동기화
#
# FPOF 회의록(MD)을 Google Docs로 생성/업데이트합니다.
# 동시에 Google Drive 지정 폴더에도 저장합니다.
#
# Usage:
#   ./integrations/gws/push-meeting-notes.sh <meeting-file.md>
#   ./integrations/gws/push-meeting-notes.sh <file> --dry-run
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"

# ── 색상 ─────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[DOCS]${NC} $1"; }
warn()  { echo -e "${YELLOW}[DOCS]${NC} $1"; }
error() { echo -e "${RED}[DOCS ✗]${NC} $1"; }

# ── 인수 파싱 ────────────────────────────────────────────────
DRY_RUN=false
FILE_PATH=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) FILE_PATH="$arg" ;;
  esac
done

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  echo "Usage: $0 <meeting-notes.md> [--dry-run]"
  exit 1
fi

# ── gws 확인 ─────────────────────────────────────────────────
if ! command -v gws &>/dev/null; then
  error "gws CLI가 설치되어 있지 않습니다."
  exit 1
fi

FILENAME=$(basename "$FILE_PATH")
CONTENT=$(cat "$FILE_PATH")

# ── config 읽기 ──────────────────────────────────────────────
FOLDER_ID=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
# Docs용 폴더 우선, 없으면 Drive meeting_notes 폴더
folder_id = cfg.get('google_docs', {}).get('folder_id', '')
if not folder_id:
    folder_id = cfg.get('google_drive', {}).get('folders', {}).get('meeting_notes', {}).get('id', '')
print(folder_id)
" 2>/dev/null)

TITLE_PREFIX=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
print(cfg.get('google_docs', {}).get('title_prefix', '[FPOF]'))
" 2>/dev/null)

# ── 제목 생성 ────────────────────────────────────────────────
# MD 파일의 첫 번째 # 헤더를 제목으로 사용
MD_TITLE=$(echo "$CONTENT" | grep -m1 "^# " | sed 's/^# //')
if [ -z "$MD_TITLE" ]; then
  MD_TITLE="$FILENAME"
fi

DOC_TITLE="$TITLE_PREFIX $MD_TITLE"

info "회의록 → Google Docs 동기화"
echo "  파일: $FILENAME"
echo "  제목: $DOC_TITLE"
echo "  폴더: ${FOLDER_ID:-미설정}"
echo ""

if [ "$DRY_RUN" = true ]; then
  warn "(dry-run) 실제 생성하지 않음"
  echo ""
  echo "  Step 1: gws docs +write --title \"$DOC_TITLE\" --body \"(본문 ${#CONTENT}자)\""
  if [ -n "$FOLDER_ID" ]; then
    echo "  Step 2: gws drive files update --parents [\"$FOLDER_ID\"]"
  fi
  exit 0
fi

# ── Step 1: Google Docs 생성 ─────────────────────────────────
info "Google Docs 생성 중..."

# Markdown → 간단한 텍스트 변환 (Docs는 plain text를 받음)
PLAIN_CONTENT=$(echo "$CONTENT" | sed 's/^### /   /; s/^## /  /; s/^# //; s/\*\*//g; s/\*//g')

# gws docs +write 헬퍼 사용
DOC_RESULT=$(gws docs +write \
  --title "$DOC_TITLE" \
  --body "$PLAIN_CONTENT" 2>&1)

DOC_EXIT=$?

if [ $DOC_EXIT -ne 0 ]; then
  # +write 헬퍼가 없으면 로우레벨 API 사용
  warn "+write 헬퍼 미지원 — API 직접 호출"

  # 빈 문서 생성
  DOC_ID=$(gws docs documents create \
    --json "{\"title\": \"$DOC_TITLE\"}" 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('documentId', ''))
" 2>/dev/null)

  if [ -z "$DOC_ID" ]; then
    error "Google Docs 생성 실패"
    exit 1
  fi

  info "문서 생성됨: $DOC_ID"

  # 본문 삽입
  INSERT_JSON=$(python3 -c "
import json, sys

content = sys.stdin.read()
requests = [{
    'insertText': {
        'location': {'index': 1},
        'text': content
    }
}]
print(json.dumps({'requests': requests}))
" <<< "$PLAIN_CONTENT" 2>/dev/null)

  gws docs documents batchUpdate \
    --params "{\"documentId\": \"$DOC_ID\"}" \
    --json "$INSERT_JSON" &>/dev/null

  info "본문 삽입 완료"
else
  # +write 성공 시 결과에서 Doc ID 추출
  DOC_ID=$(echo "$DOC_RESULT" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('documentId', data.get('id', '')))
except:
    print('')
" 2>/dev/null)
  info "문서 생성됨: ${DOC_ID:-OK}"
fi

# ── Step 2: 폴더로 이동 (설정된 경우) ─────────────────────────
if [ -n "$FOLDER_ID" ] && [ -n "$DOC_ID" ]; then
  info "지정 폴더로 이동 중..."
  gws drive files update \
    --params "{\"fileId\": \"$DOC_ID\", \"addParents\": \"$FOLDER_ID\", \"removeParents\": \"root\"}" \
    &>/dev/null && info "폴더 이동 완료 ✓" || warn "폴더 이동 실패 (문서는 생성됨)"
fi

# ── 결과 ─────────────────────────────────────────────────────
echo ""
info "동기화 완료 ✓"
if [ -n "$DOC_ID" ]; then
  echo "  Google Docs: https://docs.google.com/document/d/$DOC_ID/edit"
fi
