#!/bin/bash
# ============================================================
# [2] 산출물 → Google Drive 업로드
#
# FPOF 산출물 파일을 Google Drive의 지정된 폴더에 업로드합니다.
# 파일 유형에 따라 자동으로 적절한 폴더에 배치합니다.
#
# Usage:
#   ./integrations/gws/upload-artifacts.sh <file>                    # 자동 폴더 매칭
#   ./integrations/gws/upload-artifacts.sh <file> --folder weekly    # 폴더 지정
#   ./integrations/gws/upload-artifacts.sh output/26SS/weekly/w10/   # 폴더 전체
#   ./integrations/gws/upload-artifacts.sh --dry-run <file>          # 미리보기
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"

# ── 색상 ─────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[DRIVE]${NC} $1"; }
warn()  { echo -e "${YELLOW}[DRIVE]${NC} $1"; }
error() { echo -e "${RED}[DRIVE ✗]${NC} $1"; }

# ── 인수 파싱 ────────────────────────────────────────────────
DRY_RUN=false
FOLDER_KEY=""
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --folder) shift; FOLDER_KEY="$1" 2>/dev/null || true ;;
    *) TARGET="$arg" ;;
  esac
done

if [ -z "$TARGET" ]; then
  echo "Usage: $0 <file-or-directory> [--folder <key>] [--dry-run]"
  echo ""
  echo "폴더 키: season_root, weekly_reports, presentations, meeting_notes"
  exit 1
fi

# ── gws 확인 ─────────────────────────────────────────────────
if ! command -v gws &>/dev/null; then
  error "gws CLI가 설치되어 있지 않습니다."
  exit 1
fi

# ── 폴더 ID 결정 ─────────────────────────────────────────────
get_folder_id() {
  local key="$1"
  python3 -c "
import json
cfg = json.load(open('$CONFIG'))
folders = cfg.get('google_drive', {}).get('folders', {})
f = folders.get('$key', {})
print(f.get('id', ''))
" 2>/dev/null
}

# 파일 유형에서 폴더 자동 추론
auto_detect_folder() {
  local filepath="$1"
  local basename=$(basename "$filepath")
  local ext="${basename##*.}"

  # 경로 기반 매칭
  if echo "$filepath" | grep -q "weekly/"; then
    echo "weekly_reports"
  elif echo "$filepath" | grep -q "meeting"; then
    echo "meeting_notes"
  elif echo "$ext" | grep -qE "^(pptx|pdf)$"; then
    echo "presentations"
  else
    echo "season_root"
  fi
}

# ── 단일 파일 업로드 ─────────────────────────────────────────
upload_file() {
  local filepath="$1"
  local folder_key="$2"
  local filename=$(basename "$filepath")

  # MIME 타입 추론
  local ext="${filename##*.}"
  local mime_type="application/octet-stream"
  case "$ext" in
    md)   mime_type="text/markdown" ;;
    pdf)  mime_type="application/pdf" ;;
    pptx) mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation" ;;
    xlsx) mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ;;
    docx) mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document" ;;
    html) mime_type="text/html" ;;
    json) mime_type="application/json" ;;
    csv)  mime_type="text/csv" ;;
    png)  mime_type="image/png" ;;
    jpg|jpeg) mime_type="image/jpeg" ;;
  esac

  local folder_id
  folder_id=$(get_folder_id "$folder_key")

  if [ -z "$folder_id" ]; then
    warn "[$filename] 폴더 ID 미설정 ($folder_key) — config.json을 확인하세요."
    return 1
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "  (dry-run) $filename → Drive:$folder_key ($folder_id)"
    return 0
  fi

  info "업로드: $filename → $folder_key"

  if gws drive files create \
    --json "{\"name\": \"$filename\", \"parents\": [\"$folder_id\"], \"mimeType\": \"$mime_type\"}" \
    --upload "$filepath" 2>/dev/null; then
    info "  완료 ✓ $filename"
    return 0
  else
    error "  실패 ✗ $filename"
    return 1
  fi
}

# ── 실행 ─────────────────────────────────────────────────────
UPLOADED=0
FAILED=0

if [ -d "$TARGET" ]; then
  # 디렉토리: 파일 전체 업로드
  info "디렉토리 업로드: $TARGET"
  while IFS= read -r -d '' file; do
    fkey="${FOLDER_KEY:-$(auto_detect_folder "$file")}"
    if upload_file "$file" "$fkey"; then
      UPLOADED=$((UPLOADED + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  done < <(find "$TARGET" -type f -not -name '.*' -print0)
elif [ -f "$TARGET" ]; then
  # 단일 파일
  fkey="${FOLDER_KEY:-$(auto_detect_folder "$TARGET")}"
  if upload_file "$TARGET" "$fkey"; then
    UPLOADED=$((UPLOADED + 1))
  else
    FAILED=$((FAILED + 1))
  fi
else
  error "파일 또는 디렉토리를 찾을 수 없습니다: $TARGET"
  exit 1
fi

# ── 결과 ─────────────────────────────────────────────────────
echo ""
info "업로드 결과: ${UPLOADED}개 성공, ${FAILED}개 실패"
if [ "$DRY_RUN" = true ]; then
  warn "(dry-run 모드 — 실제 업로드 없음)"
fi
