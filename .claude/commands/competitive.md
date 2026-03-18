# 경쟁 환경 분석 (Competitive Analysis)

경쟁사를 식별하고 강약점을 비교 분석하여 차별화 기회를 도출합니다.

## 사용법
`/competitive <경쟁사명 또는 시장>` — 대상을 생략하면 와키윌리 경쟁 브랜드 기준으로 분석합니다.

## 절차

### Step 1: 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — 포지셔닝, 경쟁 구도
3. `system/presets/wacky-willy/categories.json` 참조 — 카테고리별 경쟁 환경
4. 사용자에게 확인:
   - 분석 대상 (특정 경쟁사 / 카테고리 전체 / 시장 전체)
   - 분석 렌즈 (기능 비교 / 포지셔닝 / 가격 / GTM)
   - 활용 목적 (전략 수립 / 세일즈 지원 / 로드맵)

### Step 2: 경쟁사 식별 및 분석
`system/skills/pm-gtm/competitive-battlecard.md` + `system/skills/strategy/trend-research.md` (경쟁사 파트) 참조:
- 직접 경쟁사 5개 식별 (동일 카테고리, 동일 타겟)
- 간접 경쟁사 2~3개 식별 (다른 접근, 같은 JTBD)
- 각 경쟁사 분석:
  - 포지셔닝, 타겟 고객, 핵심 메시지
  - 강점, 약점, 가격, 시장 견인력
  - 최근 움직임 (신상품, 콜라보, 채널 확장)

### Step 3: 비교 분석 및 차별화 기회
- 기능/상품 비교 매트릭스
- 포지셔닝 맵 (2x2 매트릭스)
- 차별화 기회 (방어 가능하고 가치 있는 영역)
- 경쟁 위협 (주시해야 할 움직임)
- 전략 권고 (강화할 영역 / 따라잡을 영역 / 무시할 영역)

### Step 4: 산출물 저장
산출물을 `workspace/_season/plan_competitive-analysis.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "특정 경쟁사 대비 **배틀카드**를 만드시겠어요?"
- "경쟁사와 차별화되는 **포지셔닝**을 개발하시겠어요?"
- "경쟁 갭을 **로드맵에 반영**하시겠어요?"
