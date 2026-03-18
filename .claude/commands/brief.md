# FPOF 산출물 작성

시즌 산출물을 브랜드 프리셋 기반으로 작성합니다.

## 사용법
`/brief [산출물 유형]` — 유형을 생략하면 현재 PDCA 단계에서 다음으로 필요한 산출물을 자동 판단합니다.

## 절차

1. `.fpof-state.json`에서 현재 시즌과 PDCA 단계 확인
2. 해당 산출물의 스킬 파일(`system/skills/` 하위)을 읽어 작성 절차와 필수 항목 파악
3. 관련 프리셋 JSON 파일(`system/presets/wacky-willy/`)을 참조하여 브랜드 일관성 확보
4. `workspace/[프로젝트]/` 에 산출물 파일 생성
   - 파일명 규칙: `[PDCA단계]_[내용].확장자` (예: `plan_trend-brief.md`, `design_moodboard.md`)
   - 시즌 전체 문서는 `_season/` 폴더에, 아이템별 문서는 아이템명 폴더에 저장
5. `.fpof-state.json`의 artifacts 배열에 파일 경로 추가

## 산출물 유형 → 스킬 매핑
### Plan
- `trend-brief` → system/skills/strategy/trend-research.md
- `brand-strategy` → system/skills/strategy/brand-strategy.md
- `md-plan` → system/skills/strategy/md-planning.md
- `line-sheet` → system/skills/strategy/line-sheet.md

### Design
- `moodboard` → system/skills/creative/moodboard.md
- `design-spec` → system/skills/creative/design-spec.md
- `visual` → system/skills/creative/visual-generation.md

### Do
- `techpack` → system/skills/product/techpack.md
- `costing` → system/skills/product/costing-ve.md
- `imc` → system/skills/marketing/imc-strategy.md
- `content` → system/skills/marketing/visual-content.md
- `copy` → system/skills/marketing/copywriting.md
- `viral` → system/skills/marketing/social-viral.md

### Check
- `sales` → system/skills/data/sales-analysis.md
- `insight` → system/skills/data/insight-archiving.md
- `report` → system/skills/quality/completion-report.md

## 작성 원칙
- 반드시 해당 스킬 파일의 절차와 체크리스트를 따를 것
- 브랜드 정보는 프리셋 JSON에서만 가져올 것 (지어내기 금지)
- 산출물 작성 후 `.fpof-state.json` 업데이트
- 사용자에게 완료 보고 후 다음 산출물 추천
