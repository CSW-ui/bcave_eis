#!/bin/bash
# ============================================================
# FPOF 위클리 트렌드 인텔리전스 → Teams Webhook 전송
# generate-report.py가 생성한 Adaptive Card JSON을 전송
# Usage: ./scripts/send-teams-market-intel.sh <report-file>
# ============================================================

WEBHOOK_URL="https://barrelsco.webhook.office.com/webhookb2/d8954247-b422-4200-a42f-1633a72bea8f@09cefcf6-a744-4cc2-a8ec-681fe0d1a85a/IncomingWebhook/a841af53650f41768a2ba5743c51f81b/340d1d22-3feb-4861-8fa7-0817ccb36e31/V2eQcdNKq4VtO3MEbbM7j58jOkRpTdCdO9zxFHTcEGpZA1"

FILE_PATH="$1"

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  echo "[TEAMS] 파일을 찾을 수 없습니다: $FILE_PATH"
  exit 1
fi

FILENAME=$(basename "$FILE_PATH")
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Teams Card JSON 찾기 ────────────────────────────────────
# generate-report.py가 data/market-intel/teams-card-YYYY-MM-DD.json 생성
DATE_PART=$(echo "$FILENAME" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
CARD_JSON="$PROJECT_ROOT/data/market-intel/teams-card-${DATE_PART}.json"

if [ ! -f "$CARD_JSON" ]; then
  echo "[TEAMS ❌] Teams Card JSON을 찾을 수 없습니다: $CARD_JSON"
  echo "[TEAMS] generate-report.py를 먼저 실행하세요."
  exit 1
fi

# ── 전송 ─────────────────────────────────────────────────
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d @"$CARD_JSON" \
  "$WEBHOOK_URL")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "202" ]; then
  echo "[TEAMS ✅] 위클리 트렌드 리포트가 Teams에 전송되었습니다: $FILENAME"
else
  echo "[TEAMS ❌] 전송 실패 (HTTP $RESPONSE): $FILENAME"
  exit 1
fi
