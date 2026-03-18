#!/bin/bash
# ============================================================
# FPOF 에이전트 팀 — 태스크 완료 품질 게이트
# TaskCompleted 훅: 팀원이 개별 태스크 완료 시 자동 발동
# 산출물이 FPOF 기준을 충족하는지 검증 → 미달 시 재작업 지시
# ============================================================

TASK_DESCRIPTION="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.fpof-state.json"

# 현재 PDCA 단계 읽기
CURRENT_PHASE="unknown"
if [ -f "$STATE_FILE" ]; then
  CURRENT_PHASE=$(grep -o '"current_phase"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" | head -1 | sed 's/.*"current_phase"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
fi

cat <<EOF
[FPOF 태스크 완료 검증] 자동 품질 체크

현재 PDCA 단계: $CURRENT_PHASE

아래 항목을 반드시 확인한 후, 미달 시 재작업하세요:

## 필수 검증 (모든 태스크)
- [ ] 산출물 파일명이 [단계]_[내용].확장자 규칙을 따르는가?
- [ ] 브랜드 프리셋(system/presets/wacky-willy/)을 참조하여 작성했는가?
- [ ] 톤앤매너가 tone-manner.json과 일치하는가? (고객 대면 콘텐츠인 경우)
- [ ] .fpof-state.json의 artifacts에 산출물 경로를 추가했는가?

## 단계별 추가 검증
### Plan 단계
- [ ] 트렌드/시장 데이터의 출처가 명시되었는가?
- [ ] brand.config.json의 5대 경영목표와 연결되는가?

### Design 단계
- [ ] visual-identity.json의 컬러/스타일과 일치하는가?
- [ ] 원가 타겟이 costing 기준 이내인가?

### Do 단계
- [ ] 테크팩/BOM이 완전한가?
- [ ] 마케팅 콘텐츠가 캠페인 전략과 정합하는가?

### Check 단계
- [ ] 실제 데이터 기반 분석인가? (가상 데이터 아닌지 확인)
- [ ] KPI 달성률이 수치로 표현되었는가?

위 체크리스트에서 미달 항목이 있으면:
1. 해당 항목을 보완한다
2. 보완 완료 후 다시 태스크 완료를 선언한다

모두 충족하면 태스크 완료를 진행한다.
EOF
