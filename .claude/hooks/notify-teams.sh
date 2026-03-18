#!/bin/bash
# ============================================================
# FPOF PostToolUse Hook — 회의록 생성 감지 → Teams 자동 전송
# 트리거: Write 도구로 meeting 관련 파일이 workspace/에 생성될 때
# ============================================================

TOOL_INPUT="$1"

# workspace/ 경로에서 파일명 추출
FILE_PATH=$(echo "$TOOL_INPUT" | grep -oE 'workspace/[^ "]+' | head -1)

# workspace/ 경로가 아니면 종료
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

FILENAME=$(basename "$FILE_PATH")

# 프로젝트 루트 경로 계산
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FULL_PATH="${SCRIPT_DIR}/${FILE_PATH}"

# 회의록 파일인지 판별
if echo "$FILENAME" | grep -qiE "meeting|minutes|회의록|미팅"; then
  if [ -f "$FULL_PATH" ]; then
    "${SCRIPT_DIR}/system/scripts/send-teams-meeting.sh" "$FULL_PATH" &
    echo "[FPOF] 회의록 감지 → Teams 자동 전송 중: $FILENAME"
  fi

# 마켓 인텔리전스 리포트인지 판별
elif echo "$FILENAME" | grep -qiE "market-intel|market_intel"; then
  if [ -f "$FULL_PATH" ]; then
    "${SCRIPT_DIR}/system/scripts/send-teams-market-intel.sh" "$FULL_PATH" &
    echo "[FPOF] 마켓인텔 리포트 감지 → Teams 자동 전송 중: $FILENAME"
  fi
fi

exit 0
