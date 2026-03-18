#!/bin/bash
# ============================================================
# [4] PDCA 마일스톤 → Google Calendar 등록
#
# .fpof-state.json의 PDCA 단계, 프로젝트, 주간 일정을
# Google Calendar에 이벤트로 등록합니다.
#
# Usage:
#   ./integrations/gws/sync-calendar.sh              # 전체 동기화
#   ./integrations/gws/sync-calendar.sh --phase plan  # 특정 단계만
#   ./integrations/gws/sync-calendar.sh --dry-run     # 미리보기
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"
STATE="$PROJECT_ROOT/.fpof-state.json"

# ── 색상 ─────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[CAL]${NC} $1"; }
warn()  { echo -e "${YELLOW}[CAL]${NC} $1"; }
error() { echo -e "${RED}[CAL ✗]${NC} $1"; }

# ── 인수 파싱 ────────────────────────────────────────────────
DRY_RUN=false
TARGET_PHASE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --phase) shift; TARGET_PHASE="$1" 2>/dev/null || true ;;
  esac
done

# ── gws 확인 ─────────────────────────────────────────────────
if ! command -v gws &>/dev/null; then
  error "gws CLI가 설치되어 있지 않습니다."
  exit 1
fi

# ── config 읽기 ──────────────────────────────────────────────
CALENDAR_ID=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
print(cfg.get('google_calendar', {}).get('calendar_id', ''))
" 2>/dev/null)

if [ -z "$CALENDAR_ID" ]; then
  error "Calendar ID가 설정되어 있지 않습니다."
  echo "  config.json → google_calendar.calendar_id를 설정하세요."
  echo "  기본 캘린더: 'primary'"
  exit 1
fi

PREFIX=$(python3 -c "
import json
cfg = json.load(open('$CONFIG'))
print(cfg.get('google_calendar', {}).get('season_prefix', '[FPOF]'))
" 2>/dev/null)

# ── PDCA 이벤트 생성 ─────────────────────────────────────────
info "PDCA 마일스톤을 캘린더에 동기화합니다."

# .fpof-state.json에서 이벤트 목록 생성
EVENTS=$(python3 << 'PYEOF'
import json, sys
from datetime import datetime, timedelta

with open(sys.argv[1]) as f:
    state = json.load(f)
with open(sys.argv[2]) as f:
    config = json.load(f)

prefix = config.get("google_calendar", {}).get("season_prefix", "[FPOF]")
color_map = config.get("google_calendar", {}).get("color_map", {})
season = state.get("current_season", "26SS")
target_phase = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else ""

# PDCA 단계별 예상 일정 (시즌 기반 산정)
# 26SS = 2026 Spring/Summer → 기획 시작 2025-09, 런칭 2026-02
phase_schedule = {
    "plan":   {"start": "2025-09-01", "end": "2025-10-31", "label": "Plan — 시즌 기획"},
    "design": {"start": "2025-11-01", "end": "2025-12-31", "label": "Design — 디자인/소싱"},
    "do":     {"start": "2026-01-01", "end": "2026-02-28", "label": "Do — 생산/마케팅"},
    "check":  {"start": "2026-03-01", "end": "2026-04-30", "label": "Check — 판매분석"},
    "act":    {"start": "2026-05-01", "end": "2026-05-31", "label": "Act — 개선/차시즌"},
}

events = []

# 1) PDCA 마일스톤
phases = state.get("pdca", {}).get("phases", {})
for phase_name, phase_data in phases.items():
    if target_phase and phase_name != target_phase:
        continue

    sched = phase_schedule.get(phase_name, {})
    status = phase_data.get("status", "not_started")
    color = color_map.get(phase_name, "7")

    events.append({
        "summary": f"{prefix} {sched.get('label', phase_name)}",
        "start": sched.get("start", "2026-01-01"),
        "end": sched.get("end", "2026-01-31"),
        "color": color,
        "description": f"상태: {status}\n완성도: {phase_data.get('completion_pct', 0)}%\n산출물: {len(phase_data.get('artifacts', []))}건",
    })

# 2) 프로젝트 마일스톤
projects = state.get("projects", {})
for proj_name, proj_data in projects.items():
    proj_phase = proj_data.get("pdca_phase", "plan")
    events.append({
        "summary": f"{prefix} 프로젝트: {proj_name} ({proj_phase})",
        "start": datetime.now().strftime("%Y-%m-%d"),
        "end": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
        "color": color_map.get(proj_phase, "7"),
        "description": f"유형: {proj_data.get('type', '')}\n단계: {proj_phase}\n산출물: {len(proj_data.get('artifacts', []))}건",
    })

for e in events:
    print(f"{e['summary']}|{e['start']}|{e['end']}|{e['color']}|{e['description']}")

PYEOF
"$STATE" "$CONFIG" "$TARGET_PHASE" 2>/dev/null)

if [ -z "$EVENTS" ]; then
  warn "등록할 이벤트가 없습니다."
  exit 0
fi

CREATED=0
FAILED=0

while IFS='|' read -r SUMMARY START END COLOR DESC; do
  info "이벤트: $SUMMARY ($START ~ $END)"

  if [ "$DRY_RUN" = true ]; then
    echo "  (dry-run) gws calendar events insert"
    echo "    summary: $SUMMARY"
    echo "    start: $START / end: $END"
    CREATED=$((CREATED + 1))
    continue
  fi

  EVENT_JSON=$(python3 -c "
import json
event = {
    'summary': '''$SUMMARY''',
    'description': '''$DESC''',
    'start': {'date': '$START'},
    'end': {'date': '$END'},
    'colorId': '$COLOR'
}
print(json.dumps(event))
" 2>/dev/null)

  if gws calendar events insert \
    --params "{\"calendarId\": \"$CALENDAR_ID\"}" \
    --json "$EVENT_JSON" &>/dev/null; then
    info "  등록 완료 ✓"
    CREATED=$((CREATED + 1))
  else
    error "  등록 실패 ✗"
    FAILED=$((FAILED + 1))
  fi

done <<< "$EVENTS"

# ── 결과 ─────────────────────────────────────────────────────
echo ""
info "캘린더 동기화: ${CREATED}개 등록, ${FAILED}개 실패"
if [ "$DRY_RUN" = true ]; then
  warn "(dry-run 모드 — 실제 등록 없음)"
fi
