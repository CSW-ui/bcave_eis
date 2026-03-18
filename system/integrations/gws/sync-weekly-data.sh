#!/bin/bash
# ============================================================
# [1] Google Sheets → weekly/data/ 자동 동기화
#
# config.json의 google_sheets.spreadsheets에 등록된 시트를
# FPOF weekly/data/ 폴더로 CSV 다운로드합니다.
#
# Usage:
#   ./integrations/gws/sync-weekly-data.sh              # 현재 주차
#   ./integrations/gws/sync-weekly-data.sh w10           # 특정 주차
#   ./integrations/gws/sync-weekly-data.sh --dry-run     # 미리보기
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"

# ── 색상 ─────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[SYNC]${NC} $1"; }
warn()  { echo -e "${YELLOW}[SYNC]${NC} $1"; }
error() { echo -e "${RED}[SYNC ✗]${NC} $1"; }

# ── 인수 파싱 ────────────────────────────────────────────────
DRY_RUN=false
WEEK=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    w[0-9]*) WEEK="$arg" ;;
    *) warn "알 수 없는 인수: $arg" ;;
  esac
done

# 주차 자동 계산 (ISO week)
if [ -z "$WEEK" ]; then
  WEEK_NUM=$(date +%V)
  WEEK="w${WEEK_NUM}"
fi

info "주차: $WEEK"

# ── gws 확인 ─────────────────────────────────────────────────
if ! command -v gws &>/dev/null; then
  error "gws CLI가 설치되어 있지 않습니다. ./integrations/gws/setup.sh를 먼저 실행하세요."
  exit 1
fi

# ── config 읽기 ──────────────────────────────────────────────
if [ ! -f "$CONFIG" ]; then
  error "config.json이 없습니다: $CONFIG"
  exit 1
fi

SEASON=$(python3 -c "import json; print(json.load(open('$CONFIG'))['defaults']['season'])" 2>/dev/null || echo "26SS")
OUTPUT_DIR="$PROJECT_ROOT/output/${SEASON}/weekly/data"
mkdir -p "$OUTPUT_DIR"

# ── 시트별 동기화 ────────────────────────────────────────────
# config.json에서 시트 목록 추출
SHEETS_JSON=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
sheets = cfg.get('google_sheets', {}).get('spreadsheets', {})
for key, val in sheets.items():
    sid = val.get('id', '')
    sname = val.get('sheet_name', '')
    out = val.get('output', '').replace('{WEEK}', '$WEEK')
    desc = val.get('description', key)
    if sid:
        print(f'{key}|{sid}|{sname}|{out}|{desc}')
    else:
        print(f'{key}||{sname}|{out}|{desc}')
" 2>/dev/null)

if [ -z "$SHEETS_JSON" ]; then
  warn "config.json에 동기화할 시트가 없습니다. google_sheets.spreadsheets를 설정하세요."
  exit 0
fi

SYNCED=0
SKIPPED=0

while IFS='|' read -r KEY SHEET_ID SHEET_NAME OUTPUT_FILE DESC; do
  if [ -z "$SHEET_ID" ]; then
    warn "[$KEY] Sheet ID가 비어있습니다 — 건너뜀 ($DESC)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  OUTPUT_PATH="$PROJECT_ROOT/output/${SEASON}/$OUTPUT_FILE"
  OUTPUT_DIRNAME=$(dirname "$OUTPUT_PATH")
  mkdir -p "$OUTPUT_DIRNAME"

  info "[$KEY] $DESC → $OUTPUT_FILE"

  if [ "$DRY_RUN" = true ]; then
    echo "  (dry-run) gws sheets spreadsheets.values get"
    echo "    --params '{\"spreadsheetId\": \"$SHEET_ID\", \"range\": \"$SHEET_NAME\"}'"
    echo "    → $OUTPUT_PATH"
    SYNCED=$((SYNCED + 1))
    continue
  fi

  # gws로 시트 데이터 읽기 (CSV 형태로)
  TEMP_FILE=$(mktemp /tmp/gws-sync-XXXXXX.json)

  if gws sheets spreadsheets.values get \
    --params "{\"spreadsheetId\": \"$SHEET_ID\", \"range\": \"$SHEET_NAME\"}" \
    > "$TEMP_FILE" 2>/dev/null; then

    # JSON → CSV 변환
    CSV_PATH="${OUTPUT_PATH%.xlsx}.csv"
    python3 -c "
import json, csv, sys

with open('$TEMP_FILE') as f:
    data = json.load(f)

values = data.get('values', [])
if not values:
    print('빈 데이터', file=sys.stderr)
    sys.exit(1)

with open('$CSV_PATH', 'w', newline='', encoding='utf-8') as out:
    writer = csv.writer(out)
    for row in values:
        writer.writerow(row)

print(f'  {len(values)} 행 저장 → {\"$CSV_PATH\".split(\"/\")[-1]}')
" 2>/dev/null && SYNCED=$((SYNCED + 1)) || {
      warn "[$KEY] 데이터 변환 실패"
      SKIPPED=$((SKIPPED + 1))
    }

    rm -f "$TEMP_FILE"
  else
    error "[$KEY] 시트 읽기 실패 — Sheet ID와 권한을 확인하세요."
    rm -f "$TEMP_FILE"
    SKIPPED=$((SKIPPED + 1))
  fi

done <<< "$SHEETS_JSON"

# ── 결과 ─────────────────────────────────────────────────────
echo ""
info "동기화 완료: ${SYNCED}개 성공, ${SKIPPED}개 건너뜀"
if [ "$DRY_RUN" = true ]; then
  warn "(dry-run 모드 — 실제 다운로드 없음)"
fi
