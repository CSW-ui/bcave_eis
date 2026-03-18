# FPOF 다음 단계 전환

현재 PDCA 단계를 완료하고 다음 단계로 전환합니다.

## 절차

1. `.fpof-state.json`에서 현재 단계(`pdca.current_phase`) 확인
2. 해당 단계의 Quality Gate 스킬(`system/skills/quality/quality-gate.md`) 실행:
   - 필수 산출물 존재 여부 확인 (`workspace/`)
   - 각 산출물의 필수 항목 완전성 검증
3. QG 결과 보고:
   - **PASS** → 다음 단계로 전환, `.fpof-state.json` 업데이트
   - **CONDITIONAL** → 부족한 항목 리스트 제시, 사용자 선택 대기
   - **FAIL** → 누락 산출물 리스트 + 자동 보완 제안

## Quality Gate 매핑
- Plan → Design: QG1 (시즌 컨셉 완전성, SKU 계획 유효성)
- Design → Do: QG2 (디자인-기획 정합성, 원가 타겟)
- Do → Check: QG3 (테크팩/마케팅 자료 완비)
- Check → Act/Next: QG4 (KPI 달성률, Match Rate ≥ 90%)

사용자의 명시적 승인 없이 단계를 전환하지 마세요.
