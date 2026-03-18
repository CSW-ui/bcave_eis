#!/bin/bash
# ============================================================
# FPOF Market Intelligence — State Updater
# .fpof-state.json에 리포트 아티팩트 경로 등록
# Usage: ./scripts/market-intel/update-state.sh <report-path>
# ============================================================

REPORT_PATH="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.fpof-state.json"

if [ -z "$REPORT_PATH" ]; then
  echo "[STATE ERROR] 리포트 경로가 지정되지 않았습니다."
  exit 1
fi

if [ ! -f "$STATE_FILE" ]; then
  echo "[STATE ERROR] .fpof-state.json 파일을 찾을 수 없습니다."
  exit 1
fi

python3 - <<PYEOF
import json, datetime
from pathlib import Path

state_path = Path("$STATE_FILE")
report_path = "$REPORT_PATH"
project_root = "$PROJECT_ROOT"

# 상대 경로 변환
try:
    rel = str(Path(report_path).relative_to(Path(project_root)))
except ValueError:
    rel = report_path

with open(state_path, encoding="utf-8") as f:
    state = json.load(f)

# plan phase artifacts에 추가
artifacts = state["pdca"]["phases"]["plan"].setdefault("artifacts", [])
if rel not in artifacts:
    artifacts.append(rel)

# context_notes에 기록
notes = state["work_memory"].setdefault("context_notes", [])
today = datetime.date.today().isoformat()
note = f"{today}: 마켓 인텔리전스 자동 리포트 생성 — {rel}"
notes.append(note)

with open(state_path, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)

print(f"[STATE OK] .fpof-state.json 업데이트 완료: {rel}")
PYEOF
