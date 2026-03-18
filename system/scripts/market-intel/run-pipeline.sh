#!/bin/bash
# ============================================================
# FPOF Market Intelligence Pipeline Orchestrator
# fetch → generate → notify → state-update
# Usage: ./scripts/market-intel/run-pipeline.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/data/market-intel"
LOG_FILE="$LOG_DIR/pipeline.log"

mkdir -p "$LOG_DIR"

# .env 로드
[ -f "$PROJECT_ROOT/.env" ] && source "$PROJECT_ROOT/.env"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "=== Market Intel Pipeline START ==="

# Step 1: 데이터 수집
log "[1/4] 네이버 데이터랩 + Google Trends 수집 중..."
python3 "$SCRIPT_DIR/fetch-data.py" 2>&1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  log "[ERROR] 데이터 수집 실패. 파이프라인 중단."
  exit 1
fi

# Step 2: 리포트 생성
log "[2/4] 마크다운 리포트 생성 중..."
REPORT_PATH=$(python3 "$SCRIPT_DIR/generate-report.py" 2>&1 | tee -a "$LOG_FILE" | tail -1)
if [ -z "$REPORT_PATH" ] || [ ! -f "$REPORT_PATH" ]; then
  log "[ERROR] 리포트 생성 실패. 파이프라인 중단."
  exit 1
fi
log "리포트 저장 완료: $REPORT_PATH"

# Step 3: Teams 알림
log "[3/4] Teams 알림 전송 중..."
TEAMS_SCRIPT="$PROJECT_ROOT/scripts/send-teams-market-intel.sh"
if [ -f "$TEAMS_SCRIPT" ]; then
  bash "$TEAMS_SCRIPT" "$REPORT_PATH" 2>&1 | tee -a "$LOG_FILE"
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "[WARNING] Teams 알림 전송 실패. 리포트는 정상 생성됨."
  fi
else
  log "[WARNING] Teams 스크립트 없음: $TEAMS_SCRIPT. 알림 건너뜀."
fi

# Step 4: 상태 업데이트
log "[4/4] .fpof-state.json 업데이트 중..."
bash "$SCRIPT_DIR/update-state.sh" "$REPORT_PATH" 2>&1 | tee -a "$LOG_FILE"

log "=== Market Intel Pipeline COMPLETE: $REPORT_PATH ==="
