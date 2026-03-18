# 프로덕트 디스커버리 사이클 (Discovery)

아이디에이션 → 가설 식별 → 가설 우선순위 → 실험 설계까지 전체 디스커버리 프로세스를 실행합니다.

## 사용법
`/discover <탐색 대상 아이디어 또는 기회 영역>` — 대상을 생략하면 현재 시즌의 기회 영역을 탐색합니다.

## 절차

### Step 1: 디스커버리 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — 전략 방향
3. `system/presets/wacky-willy/personas.json` 참조 — 타겟 고객
4. 기존 상품인지(continuous discovery) 신규인지(initial discovery) 판별
5. 사용자에게 확인:
   - 탐색 대상 (상품 아이디어 / 기능 영역 / 기회 공간)
   - 기존 리서치나 데이터 유무
   - 이 디스커버리가 어떤 의사결정에 영향을 미치는지

### Step 2: 아이디어 브레인스토밍 (발산 단계)
`system/skills/pm-discovery/brainstorm-ideas.md` 참조:
- PM, 디자이너, 엔지니어 관점에서 아이디어 생성
- Top 10 아이디어를 간략한 근거와 함께 제시
- **체크포인트**: "10개 아이디어 중 심층 검토할 3~5개를 골라주세요."

### Step 3: 가설 식별 (비판적 사고 단계)
`system/skills/pm-discovery/identify-assumptions.md` 참조:
- 선택된 아이디어별 리스크 카테고리 가설 도출:
  - **가치**: 사용자가 원할 것인가?
  - **사용성**: 사용자가 이해할 수 있는가?
  - **실현가능성**: 만들 수 있는가?
  - **사업성**: 비즈니스 케이스가 되는가?

### Step 4: 가설 우선순위 (집중 단계)
`system/skills/pm-discovery/prioritize-assumptions.md` 참조:
- 영향력 x 불확실성 매트릭스 매핑
- "도약의 가설(Leap of Faith)" 식별
- 테스트 우선순위 랭킹
- **체크포인트**: "가장 위험한 가설들입니다. 먼저 검증할 것을 선택해 주세요."

### Step 5: 실험 설계 (검증 단계)
`system/skills/pm-discovery/brainstorm-experiments.md` 참조:
- 핵심 가설당 1~2개 실험 설계
- 기존 상품: A/B 테스트, 페이크 도어, 프로토타입, 데이터 분석
- 신규 상품: XYZ 가설, 프리토타입, 랜딩 페이지, 컨시어지 MVP
- 성공 기준, 타임라인, 노력 수준 포함
- 의존성과 노력 기준 실험 시퀀싱

### Step 6: 디스커버리 플랜 작성 및 저장
산출물을 `workspace/_season/plan_discovery.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 7: 다음 단계 제안
- "Top 아이디어에 대해 **PRD를 작성**하시겠어요?"
- "실험을 보완할 **인터뷰 스크립트**를 만드시겠어요?"
- "실험 추적을 위한 **메트릭스**를 설정하시겠어요?"
