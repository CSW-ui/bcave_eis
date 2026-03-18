#!/bin/bash
# ============================================================
# [3] 리포트 → Gmail 이메일 발송
#
# FPOF 산출물(MD/PDF/PPTX)을 이메일로 발송합니다.
# - MD 파일: 본문에 포함 + 원본 첨부
# - PDF/PPTX/XLSX: 첨부파일로 발송
# - 수신자: config.json의 gmail.recipients에서 결정
#
# Usage:
#   ./integrations/gws/send-gmail-report.sh <file> [--type exec|weekly|meeting]
#   ./integrations/gws/send-gmail-report.sh <file> --to "a@b.com,c@d.com"
#   ./integrations/gws/send-gmail-report.sh <file> --dry-run
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"

# ── 색상 ─────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[GMAIL]${NC} $1"; }
warn()  { echo -e "${YELLOW}[GMAIL]${NC} $1"; }
error() { echo -e "${RED}[GMAIL ✗]${NC} $1"; }

# ── 인수 파싱 ────────────────────────────────────────────────
DRY_RUN=false
REPORT_TYPE=""
MANUAL_TO=""
FILE_PATH=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --type) shift; REPORT_TYPE="$1" ;;
    --to) shift; MANUAL_TO="$1" ;;
    *) FILE_PATH="$1" ;;
  esac
  shift
done

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  echo "Usage: $0 <file> [--type exec|weekly|meeting] [--to emails] [--dry-run]"
  exit 1
fi

# ── gws 확인 ─────────────────────────────────────────────────
if ! command -v gws &>/dev/null; then
  error "gws CLI가 설치되어 있지 않습니다."
  exit 1
fi

FILENAME=$(basename "$FILE_PATH")
EXT="${FILENAME##*.}"

# ── 수신자 결정 ──────────────────────────────────────────────
if [ -n "$MANUAL_TO" ]; then
  RECIPIENTS="$MANUAL_TO"
else
  # 파일명에서 타입 자동 추론
  if [ -z "$REPORT_TYPE" ]; then
    case "$FILENAME" in
      *exec*|*strategy*|*board*)   REPORT_TYPE="exec_report" ;;
      *meeting*|*imc*|*sync*)      REPORT_TYPE="meeting_notes" ;;
      *)                           REPORT_TYPE="weekly_summary" ;;
    esac
  fi

  RECIPIENTS=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
recips = cfg.get('gmail', {}).get('recipients', {}).get('$REPORT_TYPE', [])
print(','.join(recips))
" 2>/dev/null)

  if [ -z "$RECIPIENTS" ]; then
    error "수신자가 설정되어 있지 않습니다."
    echo "  config.json → gmail.recipients.$REPORT_TYPE에 이메일을 추가하세요."
    echo "  또는 --to 옵션으로 직접 지정: $0 $FILE_PATH --to user@example.com"
    exit 1
  fi
fi

# ── 제목 생성 ────────────────────────────────────────────────
SIGNATURE=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
print(cfg.get('gmail', {}).get('signature', ''))
" 2>/dev/null)

FROM_NAME=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
print(cfg.get('gmail', {}).get('from_name', 'FPOF'))
" 2>/dev/null)

# 파일 제목에서 이메일 제목 생성
SUBJECT="[FPOF] "
case "$FILENAME" in
  review_*)  SUBJECT+="주간 리뷰 — ${FILENAME%.md}" ;;
  deck_*)    SUBJECT+="프레젠테이션 — ${FILENAME%.pptx}" ;;
  meeting_*) SUBJECT+="회의록 — ${FILENAME%.md}" ;;
  board_*)   SUBJECT+="대시보드 — ${FILENAME%.html}" ;;
  plan_*)    SUBJECT+="기획 문서 — ${FILENAME%.md}" ;;
  *)         SUBJECT+="$FILENAME" ;;
esac

# ── 본문 생성 ────────────────────────────────────────────────
BODY=""
if [ "$EXT" = "md" ]; then
  # MD 파일은 본문에 내용 포함
  CONTENT=$(cat "$FILE_PATH")
  BODY="$CONTENT${SIGNATURE}"
else
  BODY="첨부 파일을 확인해 주세요.${SIGNATURE}"
fi

# ── 발송 ─────────────────────────────────────────────────────
info "발송 준비:"
echo "  제목: $SUBJECT"
echo "  수신: $RECIPIENTS"
echo "  파일: $FILENAME ($EXT)"
echo ""

if [ "$DRY_RUN" = true ]; then
  warn "(dry-run) 실제 발송하지 않음"
  echo ""
  echo "  gws gmail +send \\"
  echo "    --to \"$RECIPIENTS\" \\"
  echo "    --subject \"$SUBJECT\" \\"
  echo "    --body \"(본문 ${#BODY}자)\""
  [ "$EXT" != "md" ] && echo "    --attachment \"$FILE_PATH\""
  exit 0
fi

# gws gmail +send 사용
if [ "$EXT" = "md" ]; then
  # MD: 본문에 포함
  gws gmail +send \
    --to "$RECIPIENTS" \
    --subject "$SUBJECT" \
    --body "$BODY"
else
  # 바이너리: 첨부파일
  gws gmail +send \
    --to "$RECIPIENTS" \
    --subject "$SUBJECT" \
    --body "$BODY" \
    --attachment "$FILE_PATH"
fi

RESULT=$?

if [ $RESULT -eq 0 ]; then
  info "발송 완료 ✓ → $RECIPIENTS"
else
  error "발송 실패 (exit code: $RESULT)"
  exit 1
fi
