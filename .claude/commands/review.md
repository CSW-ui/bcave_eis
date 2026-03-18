# FPOF 산출물 검수

현재 단계의 모든 산출물을 품질 검수합니다.

## 절차

### Step 1: 산출물 완전성 체크 (Design Validator)
`system/skills/quality/quality-gate.md` 참조:
- `workspace/[현재단계]/` 에 필수 산출물이 모두 존재하는지 확인
- 각 산출물의 필수 항목(해당 스킬의 체크리스트)이 빠짐없이 작성되었는지 검증
- 누락 항목이 있으면 리스트로 제시

### Step 2: 정합성 체크 (Gap Detector)
`system/skills/quality/gap-analysis.md` 참조:
- 산출물이 기획 문서(Plan 단계 산출물)와 일치하는지 비교
- 브랜드 프리셋(`system/presets/wacky-willy/`)과의 일관성 확인
- 카테고리별 Match Rate 산출

### Step 3: 결과 보고
검수 결과를 테이블로 정리:

| 항목 | 상태 | 비고 |
|------|------|------|
| 산출물 완전성 | ✅/❌ | 누락 항목 |
| 브랜드 정합성 | ✅/❌ | 불일치 항목 |
| 기획-실행 일치 | Match Rate % | 갭 항목 |

### Step 4: 판정
- **PASS** (모든 항목 ✅, Match Rate ≥ 90%) → 다음 단계 전환 추천
- **CONDITIONAL** (일부 미달) → 보완 필요 항목 제시
- **FAIL** (주요 누락) → 작업 우선순위 제안

결과를 `.fpof-state.json`의 quality_gates에 기록합니다.
