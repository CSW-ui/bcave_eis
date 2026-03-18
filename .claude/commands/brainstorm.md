# 멀티 관점 브레인스토밍 (Brainstorm)

PM, 디자이너, 엔지니어 관점에서 아이디어 또는 실험을 브레인스토밍합니다.

## 사용법
`/brainstorm [ideas|experiments] [existing|new] <주제>` — 모드를 생략하면 대화형으로 확인합니다.

## 절차

### Step 1: 모드 결정
두 가지 차원을 파악:
1. **무엇을**: `ideas` (기능 아이디어) 또는 `experiments` (검증 실험)
2. **상품 단계**: `existing` (기존 상품 연속 디스커버리) 또는 `new` (신규 상품 초기 디스커버리)

### Step 2: 컨텍스트 수집
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — 전략 방향
3. `system/presets/wacky-willy/personas.json` 참조 — 타겟 고객
4. 사용자에게 확인:
   - 기존 상품: 현재 상품, 고객, 탐색 영역, 기존 시도, 제약 조건
   - 신규 상품: 컨셉, 타겟, 현재 대안, 가장 위험한 가설

### Step 3: 아이디어 또는 실험 생성

**아이디어 모드** — `system/skills/pm-discovery/brainstorm-ideas.md` 참조:
- PM 관점 (사용자 가치, 비즈니스 임팩트)
- 디자이너 관점 (UX, 즐거움, 접근성)
- 엔지니어 관점 (기술 혁신, 확장성)
- 각 아이디어: 이름, 설명, 임팩트, 실현가능성
- Top 5 아이디어 랭킹 (퀵윈 vs 전략적 베팅)

**실험 모드** — `system/skills/pm-discovery/brainstorm-experiments.md` 참조:
- 기존 상품: A/B 테스트, 프로토타입, 페이크 도어, 위자드 오브 오즈
- 신규 상품: XYZ+S 가설, 프리토타입, 랜딩 페이지, 컨시어지 MVP
- 각 실험: 가설, 방법, 성공 기준, 노력 추정, 타임라인
- 학습/노력 비율 기준 랭킹

### Step 4: 산출물 저장
산출물을 `workspace/_season/plan_brainstorm.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "이 아이디어들의 **가설을 식별**하시겠어요?"
- "Top 아이디어를 **실험으로 설계**하시겠어요?"
- "백로그 대비 **우선순위**를 매기시겠어요?"
- "특정 아이디어를 **상세 스펙**으로 발전시키시겠어요?"
