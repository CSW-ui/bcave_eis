#!/bin/bash
# ============================================================
# FPOF 회의록 → Teams Webhook 전송 스크립트
# Usage: ./scripts/send-teams-meeting.sh <meeting-notes-file>
# ============================================================

WEBHOOK_URL="https://barrelsco.webhook.office.com/webhookb2/d8954247-b422-4200-a42f-1633a72bea8f@09cefcf6-a744-4cc2-a8ec-681fe0d1a85a/IncomingWebhook/a841af53650f41768a2ba5743c51f81b/340d1d22-3feb-4861-8fa7-0817ccb36e31/V2eQcdNKq4VtO3MEbbM7j58jOkRpTdCdO9zxFHTcEGpZA1"

FILE_PATH="$1"

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  echo "[TEAMS] 파일을 찾을 수 없습니다: $FILE_PATH"
  exit 1
fi

FILENAME=$(basename "$FILE_PATH")
CONTENT=$(cat "$FILE_PATH")

# ── Markdown → Teams Adaptive Card 변환 ─────────────────────

# 제목 추출 (첫 번째 # 헤더)
TITLE=$(echo "$CONTENT" | grep -m1 "^# " | sed 's/^# //')
if [ -z "$TITLE" ]; then
  TITLE="회의록: $FILENAME"
fi

# 섹션 추출 함수 (macOS 호환)
extract_section() {
  local section="$1"
  echo "$CONTENT" | sed -n "/^## ${section}/,/^## /p" | tail -n +2 | sed '$d' | sed 's/^[[:space:]]*//'
}

# 요약 추출
SUMMARY=$(extract_section "요약")

# 결정 사항 추출
DECISIONS=$(extract_section "결정 사항")

# 액션 아이템 추출
ACTIONS=$(extract_section "액션 아이템")

# 미해결 사항 추출
UNRESOLVED=$(extract_section "미해결 사항")

# ── JSON 이스케이프 ──────────────────────────────────────────
escape_json() {
  local str="$1"
  str=$(echo "$str" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)
  # python3 json.dumps adds quotes, remove them
  str="${str#\"}"
  str="${str%\"}"
  echo "$str"
}

TITLE_ESC=$(escape_json "$TITLE")
SUMMARY_ESC=$(escape_json "$SUMMARY")
DECISIONS_ESC=$(escape_json "$DECISIONS")
ACTIONS_ESC=$(escape_json "$ACTIONS")
UNRESOLVED_ESC=$(escape_json "$UNRESOLVED")

# ── Adaptive Card 페이로드 ───────────────────────────────────
PAYLOAD=$(cat <<JSONEOF
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "contentUrl": null,
      "content": {
        "\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
          {
            "type": "TextBlock",
            "text": "📋 ${TITLE_ESC}",
            "weight": "Bolder",
            "size": "Large",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "FPOF 회의록 자동 생성 · $(date '+%Y-%m-%d %H:%M')",
            "isSubtle": true,
            "spacing": "None",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "**📌 요약**",
            "weight": "Bolder",
            "spacing": "Large",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "${SUMMARY_ESC}",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "**✅ 결정 사항**",
            "weight": "Bolder",
            "spacing": "Large",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "${DECISIONS_ESC}",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "**🎯 액션 아이템**",
            "weight": "Bolder",
            "spacing": "Large",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "${ACTIONS_ESC}",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "**❓ 미해결 사항**",
            "weight": "Bolder",
            "spacing": "Large",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "${UNRESOLVED_ESC}",
            "wrap": true
          },
          {
            "type": "ActionSet",
            "actions": [
              {
                "type": "Action.OpenUrl",
                "title": "원본 파일 보기",
                "url": "https://github.com"
              }
            ]
          }
        ]
      }
    }
  ]
}
JSONEOF
)

# ── 전송 ─────────────────────────────────────────────────────
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "202" ]; then
  echo "[TEAMS ✅] 회의록이 Teams에 전송되었습니다: $FILENAME"
else
  echo "[TEAMS ❌] 전송 실패 (HTTP $RESPONSE): $FILENAME"
  exit 1
fi
