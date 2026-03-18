# FPOF — 와키윌리 패션 하우스 오케스트레이션

> AI가 와키윌리 브랜드의 시즌 기획부터 런칭까지를 함께 운영하는 시스템입니다.
> 패션 실무자가 자연어로 지시하면, AI가 브랜드 지식을 기반으로 실무 산출물을 만듭니다.

## 세션 시작 시 반드시
1. `.fpof-state.json` 읽기 — 현재 시즌, PDCA 단계, 진행 상황 파악
2. `system/presets/bcave/` 전사 가이드라인 숙지 — BTA 전략, 사업부 업무 가이드, AX 전략 (브랜드 공통 필수)
3. 현재 단계에 맞는 브랜드 프리셋 파일 참조

## 핵심 원칙
1. **계획이 먼저** — "알아서 해"는 금지. 반드시 계획 → 승인 → 실행 순서.
2. **브랜드 보이스 준수** — 고객 대면 콘텐츠는 반드시 `tone-manner.json` 참조.
3. **한 번에 하나씩** — 큰 작업은 쪼개서 진행. 완료 후 상태 업데이트.
4. **완료 전 셀프 체크** — 작업 완료 선언 전에 누락/오류 스스로 점검.
5. **상태 기록** — 의미 있는 진전이 있으면 `.fpof-state.json` 업데이트.
6. **참고자료가 진실** — 브랜드 정보를 지어내지 말 것. 프리셋 JSON 기반으로만.
7. **토큰 비용 절감** — 에이전트 팀/서브에이전트 사용 시 아래 "에이전트 팀 운영 규칙" 반드시 준수.

## 비케이브 전사 가이드라인 (system/presets/bcave/) — 브랜드 공통 필수 준수

> 아래 지침은 와키윌리를 포함한 **모든 비케이브 브랜드**에 공통 적용됩니다.
> 브랜드별 프리셋보다 상위 레벨이며, 브랜드가 바뀌어도 반드시 준수해야 합니다.

| 파일 | 내용 | 언제 참조 |
|------|------|----------|
| `bta-guideline.md` | BTA(Basic·Trend·Accent) 상품/컬러 구성전략, 부서별 액션, 컬러 운용 원칙, 룩북 촬영 원칙 | 상품 기획, MD 플래닝, 디자인 스펙, 컬러 전략, 라인시트 작업 시 **항상** |
| `business-unit-guide.md` | 사업부 업무 가이드 — 대표이사 보고 원칙, 스케줄링, 상품설계/발주설계 방향, CAD맵 체크 7대 항목, 품평 운영(3B 금지), 마케팅 기획안 B.A.M.P 검증, 광고컷 4유형, 셀럽 체크리스트, SNS 3균형, 콜라보 원칙, 매장 VM | 상품/마케팅/유통 전 영역 작업 시 **항상** |
| `bcave-ax-strategy-guide.md` | 비케이브 AX 전략 — CEO 비전("AI 기반으로 일하는 조직"), AX 3레이어 프레임워크(개인·팀·조직), P-M-D별 AX 시나리오, 브랜드 확장 순서(와키윌리→커버낫→리), FPOF 전사 확장 아키텍처, AI 사용 5대 원칙 | AI/자동화 기획, FPOF 전사 확장, AX 전략 수립 시 |

### 전사 핵심 규칙 (요약)

**상품(P):**
- 상품설계 = SPA 보편성 + 스포츠 기능성 + 일본 감성(디테일) + 트렌드 실루엣/컬러
- BTA 구성 필수: Basic(안정매출/신뢰) · Trend(매출+감도/브랜드화된 트렌드) · Accent(실험/아이캐칭)
- 3B 착장 금지 (베이직 아이템 + 베이직 컬러 + 베이직 로고 조합 절대 지양)
- 로고 형태 변형 금지 (위치/크기/기법 변형만 허용)
- 발주: 베이직 초두 축소 + 리오더 설계, IMC 상품은 전 가치사슬 합의 수량

**마케팅(M):**
- 기획안은 B.A.M.P(Branding·Awareness·Management·Product) 기준 검증
- IMC는 상품 중심, 빅IMC → 스몰IMC (선택과 집중)
- 셀럽: 이미지-브랜드 연결, 빅IMC 전략적 연동, 파워셀럽 4대 체크리스트 통과 필수
- SNS 3균형: 뉴스(상품) / 스타일링 / 로고-아이덴티티
- 콜라보: 연 2회 원칙 (4시즌, 2콜라보, 2캡슐)

**유통(D):**
- VM 핵심: 소비자 관점 (보기 좋게 / 집기 좋게 / 사기 좋게)
- 아이캐칭은 메인/VP 집중, 매장 내부는 동선/쇼핑 시간 절약 중심

**BTA 컬러 운용:**
- 악센트 컬러는 베이직 상품에 적용 (예외 시 시즌맵 밸런스 점검)
- 악센트 상품은 베이직/트렌드 컬러로 밸런스
- 룩북: Basic→악센트 컬러 중심, Trend→컬러 무관, Accent→필수 노출

---

## 브랜드: 와키윌리 (Wacky Willy)
- **컨셉**: Kitsch Street & IP Universe
- **코어 타겟**: 18~25세 자유로운 트렌드리더
- **비전**: K-컬처 기반 글로벌 문화 브랜드 (2029 NO.1 K-Lifestyle Brand)
- **뮤즈**: 지젤

## 브랜드 지식 베이스 (system/presets/wacky-willy/)
| 파일 | 내용 | 언제 참조 |
|------|------|----------|
| `brand.config.json` | DNA, 비전, 포지셔닝, 5대 경영목표, 로드맵 | 전략/기획 작업 시 |
| `personas.json` | UNI/WOMAN 페르소나, 고객 데이터 인사이트 | 타겟 관련 의사결정 시 |
| `tone-manner.json` | 톤앤매너, 채널별 톤, 브랜드 어휘 | 카피/콘텐츠 작성 시 |
| `visual-identity.json` | 컬러, 타이포, 그래픽 스타일 | 비주얼 작업 시 |
| `categories.json` | 유니/우먼스/용품 카테고리, 상품 전략 | 상품 기획 시 |
| `channels.json` | 6개 채널 매출/목표/성장률 | 유통/마케팅 전략 시 |
| `ip-bible.json` | 키키+11 캐릭터, 그룹(A/B/C), 관계도 | IP/캐릭터 활용 시 |

## 패션 하우스 에이전시 (system/agents/)
실무자의 자연어 요청을 해석하여 적합한 에이전시와 담당자가 작업합니다.

| 에이전시 | 팀원 (역할 → 스킬) |
|----------|-------------------|
| **전략기획실** | 시장 리서처 → `trend-research` · 브랜드 전략가 → `brand-strategy` · 수석 MD → `md-planning` · 컬렉션 플래너 → `line-sheet` · 전략 컨설턴트 → `pestle-analysis` · `porters-five-forces` · `ansoff-matrix` · `business-model-canvas` · `lean-canvas` · `value-proposition` · `product-strategy-canvas` · `product-vision` · 경쟁 분석가 → `competitive-battlecard` · GTM 전략가 → `beachhead-segment` · 디스커버리 리드 → `opportunity-solution-tree` · `brainstorm-ideas-*` · `brainstorm-experiments-*` · `identify-assumptions-*` · `prioritize-*` · `analyze-feature-requests` · PM → `create-prd` · `user-stories` · `job-stories` · OKR 코치 → `brainstorm-okrs` · 이해관계자 매니저 → `stakeholder-map` · 로드맵 설계자 → `outcome-roadmap` · 법무 어시스턴트 → `draft-nda` · `privacy-policy` |
| **크리에이티브 스튜디오** | 크리에이티브 디렉터 → `moodboard` · 패션 디자이너 → `design-spec` · 아트 디렉터 → `visual-generation` |
| **프로덕트 랩** | 프로덕션 매니저 → `techpack` · `costing-ve` · `qr-process` |
| **마케팅 쇼룸** | 마케팅 디렉터 → `imc-strategy` · 콘텐츠 디렉터 → `visual-content` · 패션 에디터 → `copywriting` · 소셜 전략 디렉터 → `social-viral` · CX 디자이너 → `customer-journey-map` · 브랜드 네이밍 전문가 → `product-name` · 릴리즈 매니저 → `release-notes` |
| **데이터 인텔리전스** | 트렌드 애널리스트 → `sales-analysis` · 인사이트 아키텍트 → `insight-archiving` · 데이터 애널리스트 → `ab-test-analysis` · `cohort-analysis` · `sql-queries` · 리서치 애널리스트 → `user-personas` · `user-segmentation` · `market-segments` · 고객 분석가 → `ideal-customer-profile` · 데이터 엔지니어 → `dummy-dataset` |
| **QC 본부** | 품질 검증관 → `quality-gate` · 갭 디텍터 → `gap-analysis` · 리포트 제너레이터 → `completion-report` · PDCA 이터레이터 → `pdca-iteration` · 회고 퍼실리테이터 → `retro` · QA 리드 → `test-scenarios` · 에디터 → `grammar-check` |

## 자연어 → 스킬 라우팅

실무자가 자연어로 요청하면, **의도**를 파악하여 적합한 에이전시·역할·스킬을 자동 매칭합니다.
전문 용어를 몰라도 됩니다. 일상적인 말로 요청하세요.

### 라우팅 원칙
1. **의도 우선** — 키워드가 아닌 "무엇을 하려는가"를 기준으로 판단
2. **맥락 참조** — 현재 PDCA 단계(`.fpof-state.json`)에 따라 같은 요청도 다른 스킬 매칭 가능
3. **모호할 땐 질문** — 2개 이상 스킬이 겹치면 사용자에게 확인
4. **복합 요청 분리** — "트렌드 분석하고 SKU도 짜줘"는 trend-research → md-planning 순서로 실행

### 시즌 기획 & 전략 (전략기획실)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "요즘 뭐가 유행이야?", "경쟁사 뭐 하고 있어?", "트렌드 좀 봐줘" | `trend-research` |
| "시즌 테마 뭘로 하지?", "브랜드 방향 잡아줘", "우리 포지셔닝 괜찮아?" | `brand-strategy` |
| "SKU 어떻게 짜?", "카테고리 믹스 해줘", "히트상품 뭘로 밀지?" | `md-planning` |
| "라인시트 만들어줘", "물량 얼마나 잡아?", "사이즈 비율은?" | `line-sheet` |
| "세상이 어떻게 변하고 있어?", "외부 환경 좀 봐줘" | `pestle-analysis` |
| "업계 경쟁 상황이 어때?", "진입 장벽 있어?" | `porters-five-forces` |
| "어디로 성장해야 해?", "해외 가야 해? 신규 카테고리?" | `ansoff-matrix` |
| "우리 사업 모델 정리해줘", "돈 버는 구조가 뭐야?" | `business-model-canvas` |
| "빠르게 가설 잡아줘", "MVP 모델 그려줘" | `lean-canvas` |
| "수익 내는 방법 뭐가 있어?", "매출 모델 다양화" | `monetization-strategy` |
| "고객한테 어떤 가치를 주는 거야?", "왜 우리 옷을 사야 해?" | `value-proposition` |
| "전략 한 장으로 정리해줘", "9칸 전략 캔버스" | `product-strategy-canvas` |
| "브랜드 비전 한 문장으로", "어디로 가고 있는 거야?" | `product-vision` |

### 경쟁 & GTM (전략기획실)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "경쟁사 비교표 만들어줘", "바이어한테 보여줄 비교 자료" | `competitive-battlecard` |
| "글로벌 첫 시장은 어디?", "런칭 타겟 좁혀줘" | `beachhead-segment` |
| "우리 핵심 고객이 정확히 누구야?", "ICP 정의해줘" | `ideal-customer-profile` |

### 아이디어 & 검증 (전략기획실 → 디스커버리)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "고객 기회를 정리해보자", "뭘 만들어야 하는지 구조화" | `opportunity-solution-tree` |
| "아이디어 좀 내봐", "새로운 거 뭐 없을까?" | `brainstorm-ideas-*` |
| "이거 진짜 되는지 어떻게 테스트해?", "실험 설계해줘" | `brainstorm-experiments-*` |
| "우리가 잘못 가정하고 있는 거 없어?", "리스크 뭐가 있지?" | `identify-assumptions-*` |
| "어떤 가정부터 검증해야 해?", "위험한 거 순서 매겨줘" | `prioritize-assumptions` |
| "뭐부터 해야 해?", "상품 우선순위 정해줘" | `prioritize-features` |
| "고객들이 뭘 원하는 거야?", "리뷰에서 패턴 뽑아줘" | `analyze-feature-requests` |
| "고객 인터뷰 어떻게 해?", "질문지 만들어줘" | `interview-script` |
| "인터뷰한 거 정리해줘", "핵심만 뽑아줘" | `summarize-interview` |

### 디자인 & 비주얼 (크리에이티브 스튜디오)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "무드보드 만들어줘", "이번 시즌 비주얼 톤은?" | `moodboard` |
| "디자인 구체적으로 잡아줘", "이 아이템 스펙 정리" | `design-spec` |
| "이미지 만들어줘", "비주얼 에셋 뽑아줘" | `visual-generation` |

### 생산 & 원가 (프로덕트 랩)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "원가 맞아?", "마진 계산해줘", "VE 해줘", "가격 어떻게 잡지?" | `costing-ve` |
| "테크팩 만들어줘", "봉제 사양 정리해줘" | `techpack` |
| "추가 생산 가능해?", "리오더 진행해줘" | `qr-process` |

### 마케팅 & 콘텐츠 (마케팅 쇼룸)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "마케팅 전략 짜줘", "캠페인 어떻게 갈까?", "GTM 계획" | `imc-strategy` |
| "화보 기획해줘", "촬영 콘셉트 잡아줘", "숏폼 기획" | `visual-content` |
| "상품 설명 써줘", "인스타 캡션 써줘", "카피 만들어줘" | `copywriting` |
| "인플루언서 찾아줘", "바이럴 전략 세워줘", "런칭 시퀀스" | `social-viral` |
| "고객이 어떤 경험을 하는 거야?", "구매 여정 그려줘" | `customer-journey-map` |
| "이름 뭐로 하지?", "상품명 후보 좀 뽑아줘" | `product-name` |
| "이번 런칭 안내문 써줘", "업데이트 내역 정리" | `release-notes` |

### 데이터 & 분석 (데이터 인텔리전스)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "매출 분석해줘", "실적 어때?", "채널별 비교" | `sales-analysis` |
| "왜 이게 잘 팔렸어?", "실패 원인이 뭐야?", "인사이트 뽑아줘" | `insight-archiving` |
| "A/B 테스트 결과 어때?", "어떤 버전이 나아?", "실험 결과" | `ab-test-analysis` |
| "재구매율 어때?", "코호트별로 봐줘", "고객 이탈 패턴" | `cohort-analysis` |
| "우리 고객이 정확히 누구야?", "페르소나 다시 잡아줘" | `user-personas` |
| "고객 그룹 나눠줘", "세그먼트 분석해줘" | `user-segmentation` / `market-segments` |
| "데이터 뽑을 쿼리 짜줘", "SQL 만들어줘" | `sql-queries` |
| "테스트 데이터 좀 만들어줘" | `dummy-dataset` |

### 품질 & 검수 (QC 본부)

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "검수해줘", "다음 단계 갈 수 있어?", "QG 돌려줘" | `quality-gate` |
| "기획대로 됐어?", "갭 분석해줘" | `gap-analysis` |
| "시즌 끝! 리포트 만들어줘" | `completion-report` |
| "런칭 전에 뭐가 위험할까?", "리스크 점검해줘" | `quality-gate` (Pre-Mortem) |
| "시즌 회고 해보자", "잘한 거 / 못한 거 정리" | `retro` |
| "문법 틀린 데 없어?", "글 좀 다듬어줘" | `grammar-check` |
| "테스트 시나리오 만들어줘" | `test-scenarios` |

### 실행 관리 & 유틸리티

| 이렇게 말하면 | 이 스킬이 작동 |
|-------------|-------------|
| "분기 목표 짜줘", "OKR 잡아줘" | `brainstorm-okrs` |
| "요구사항 문서 만들어줘", "PRD 작성" | `create-prd` |
| "로드맵 성과 중심으로 바꿔줘" | `outcome-roadmap` |
| "누구한테 뭘 보고해야 해?", "이해관계자 정리" | `stakeholder-map` |
| "이번 주 할 일 계획 짜줘" | `sprint-plan` |
| "회의 내용 정리해줘", "미팅 노트 만들어줘" | `summarize-meeting` |
| "NDA 만들어줘", "비밀유지계약서 필요해" | `draft-nda` |
| "개인정보처리방침 만들어줘" | `privacy-policy` |
| "이력서 봐줘", "지원자 서류 검토" | `review-resume` |

## 시즌 사이클 (PDCA) vs 일상 운영

### 이중 트래킹 구조
`.fpof-state.json`은 **PDCA**(시즌 전략 마일스톤)와 **operational**(일상 운영)을 분리 관리합니다.

| 구분 | 추적 위치 | 파일 접두사 | 설명 |
|------|----------|-----------|------|
| **시즌 PDCA** | `pdca.phases` | `plan_` `design_` `do_` `check_` `act_` | 시즌 전략 마일스톤 (trend-brief → brand-strategy → … → completion-report) |
| **프로젝트 PDCA** | `projects.[name]` | `plan_` `design_` `do_` `check_` `act_` | 개별 아이템/캠페인/리테일 프로젝트 — 자체 PDCA 단계 보유 |
| **일상 운영** | `operational.weekly` | `review_` `meeting_` `deck_` `board_` `sheet_` `report_` `data_` | 주간 리뷰, 회의록, 대시보드 — PDCA 단계와 무관하게 진행 |
| **대시보드** | `operational.dashboard` | `data_` `board_` | `weekly/data/` 기반 시각화 — 매주 갱신 |

### 시즌 PDCA 단계
현재 시즌의 단계를 `.fpof-state.json` → `pdca.current_phase`에서 확인.

| 단계 | 에이전시 | 스킬 |
|------|---------|------|
| **Plan** | 전략기획실 | `trend-research` → `brand-strategy` → `md-planning` → `line-sheet` |
| **Design** | 크리에이티브 스튜디오 + 프로덕트 랩 | `moodboard` → `design-spec` → `visual-generation` + `costing-ve` |
| **Do** | 프로덕트 랩 + 마케팅 쇼룸 | `techpack` · `qr-process` + `imc-strategy` → `visual-content` → `copywriting` → `social-viral` |
| **Check** | 데이터 인텔리전스 + QC 본부 | `sales-analysis` → `insight-archiving` + `gap-analysis` → `completion-report` |
| **Act** | QC 본부 | `pdca-iteration` (Match Rate < 90% 시 자동 루프) |

### 일상 운영 (PDCA와 독립)
아래 작업은 시즌 PDCA 단계와 무관하게 **항상** 실행 가능합니다.

| 작업 | 저장 위치 | 갱신 주기 |
|------|----------|----------|
| 주간 리뷰/회의록 | `weekly/wNN/` | 매주 |
| 대시보드 데이터 | `dashboard/` | 매주 (`weekly/data/` 기반) |
| 마켓 인텔리전스 | `season-strategy/` | 수시 |
| 개별 프로젝트 작업 | `[project]/` | 프로젝트 자체 PDCA |

## 슬래시 명령어 (.claude/commands/)
패션 하우스 전용 단축 명령어입니다. `/명령어`로 실행합니다.

| 명령어 | 기능 | 사용 예 |
|--------|------|---------|
| `/status` | 현재 시즌·PDCA 단계·산출물 현황 확인 | "지금 어디까지 진행됐어?" |
| `/brief [유형]` | 산출물 템플릿 기반 문서 작성 | `/brief trend-brief`, `/brief moodboard` |
| `/review` | 현재 단계 Quality Gate 검수 실행 | "검수해줘" |
| `/next` | 다음 PDCA 단계 전환 (QG 포함) | "다음 단계로 넘어가자" |
| `/team` | 6개 에이전시 20명 팀 현황 조회 | "누가 뭘 담당해?" |
| `/export [detail]` | 시즌 산출물 목록 정리·요약 | "지금까지 만든 거 정리해줘" |
| `/deck [유형]` | 프레젠테이션(PPTX) 생성 | `/deck trend`, `/deck lookbook` |
| `/pdf [유형]` | PDF 보고서 생성 | `/pdf season-book`, `/pdf techpack` |
| `/sheet [유형]` | 엑셀(XLSX) 시트 생성 | `/sheet line-sheet`, `/sheet otb` |
| `/doc [유형]` | 워드(DOCX) 문서 생성 | `/doc campaign-plan`, `/doc press-release` |
| `/market-scan` | 거시환경 종합 분석 (SWOT+PESTLE+Porter's+Ansoff) | "외부 환경 스캔해줘" |
| `/pricing` | 가격 전략 설계 | "가격 포지셔닝 잡아줘" |
| `/business-model` | 비즈니스 모델 캔버스 탐색 | "비즈니스 모델 짜줘" |
| `/strategy-canvas` | 9섹션 프로덕트 전략 캔버스 | "전략 캔버스 만들어줘" |
| `/value-prop` | JTBD 밸류 프로포지션 설계 | "밸류 프로포지션 정의해줘" |
| `/research-users` | 사용자 리서치 종합 (페르소나+세그먼트+여정) | "고객 조사 종합해줘" |
| `/analyze-feedback` | 고객 피드백 감성 분석 | "리뷰 분석해줘" |
| `/competitive` | 경쟁 환경 분석 | "경쟁사 분석 깊게 해줘" |
| `/battlecard` | 경쟁 배틀카드 작성 | "경쟁 비교표 만들어줘" |
| `/growth` | 그로스 루프 + GTM 모션 전략 | "성장 전략 세워줘" |
| `/launch` | GTM 런칭 전략 (비치헤드+ICP+메시징) | "런칭 전략 짜줘" |
| `/discover` | 프로덕트 디스커버리 사이클 | "아이디어→가설→실험 전체 돌려줘" |
| `/brainstorm` | 멀티 관점 브레인스토밍 | "아이디어 브레인스토밍" |
| `/interview` | 고객 인터뷰 준비/요약 | "인터뷰 스크립트 만들어줘" |
| `/triage` | 피처 요청 트리아지 | "고객 요청 정리해줘" |
| `/metrics` | 메트릭스 대시보드 설계 | "KPI 대시보드 짜줘" |
| `/okrs` | OKR 수립 | "분기 OKR 짜줘" |
| `/prd` | PRD 작성 | "요구사항 정의서 만들어줘" |
| `/pre-mortem` | 프리모텀 리스크 분석 | "런칭 전 리스크 점검" |
| `/sprint` | 스프린트 계획/회고/릴리즈 | "스프린트 계획 짜줘" |
| `/meeting` | 회의록 정리 | "미팅 노트 정리해줘" |
| `/stakeholders` | 이해관계자 맵 | "이해관계자 매핑해줘" |
| `/roadmap` | 아웃컴 로드맵 변환 | "로드맵 아웃컴 중심으로 바꿔줘" |
| `/ab-test` | A/B 테스트 분석 | "실험 결과 분석해줘" |
| `/cohorts` | 코호트 분석 | "리텐션 분석해줘" |
| `/marketing` | 마케팅 크리에이티브 툴킷 | "마케팅 아이디어 짜줘" |
| `/north-star` | North Star Metric 정의 | "핵심 지표 정의해줘" |
| `/proofread` | 문법/흐름 체크 | "교정해줘" |

## 에이전트 팀 운영 규칙 (토큰 비용 50% 절감)

에이전트 팀(Agent Team) 사용 시 아래 규칙을 **반드시** 따른다.
팀원도 이 CLAUDE.md를 읽으므로, 팀원 역시 이 규칙을 자동으로 준수한다.

### 1. 계획 승인 모드 (Plan Approval)
- 에이전트 팀 생성 시 **반드시** 다음 지시를 포함한다:
  > "각 팀원은 구현 전에 반드시 계획을 작성하여 리드의 승인을 받을 것"
- 팀원은 **Plan Mode(읽기 전용)**로 시작하여 분석·계획만 수행한다.
- 리드가 계획을 검토·승인한 후에만 구현(코드 수정/파일 생성)을 시작한다.
- 리드가 거절하면 피드백을 반영하여 계획을 수정하고 재제출한다.
- **자동 판단 기준 (리드가 적용)**:
  - 전사 가이드라인(`system/presets/bcave/`)을 준수하지 않는 계획 → 거절 (BTA 구성, 3B 금지, B.A.M.P 등)
  - 브랜드 프리셋(`system/presets/wacky-willy/`)을 참조하지 않는 계획 → 거절
  - 현재 PDCA 단계와 무관한 작업이 포함된 계획 → 거절
  - `.fpof-state.json` 업데이트 계획이 누락된 경우 → 보완 요청

### 2. 모델 믹싱 (Model Mixing)
- 에이전트 팀 생성 시 **반드시** 다음 지시를 포함한다:
  > "팀원 모두 Sonnet을 사용해"
- **리드** = 현재 세션 모델(Opus) — 작업 분해, 계획 검토, 품질 판단
- **팀원** = Sonnet — 실제 코드/문서 생성, 파일 편집
- 이것만으로 팀원 토큰 비용이 **4~5배 절감**된다.

### 3. 비용 최적화 규칙
- **팀 vs 서브에이전트 판단**: 팀원 간 소통이 필요 없는 독립 작업이면 **서브에이전트**를 사용한다. 조율 오버헤드가 없어 토큰이 절약된다.
- **최소 인원 원칙**: 팀원은 **3~5명**으로 제한한다. 10명 이상은 조율 비용만 늘어난다.
- **즉시 종료**: 작업 완료된 팀원은 리드가 **즉시 종료**한다. 유휴 세션은 토큰을 계속 소모한다.
- **브로드캐스트 최소화**: 전체 공지는 팀원 수만큼 토큰을 소모하므로, 개별 팀원에게 필요한 지시만 전달한다.
- **작업 완료 후 정리**: 모든 작업이 끝나면 리드에게 "팀 정리해줘"로 전체 세션을 종료한다.

### 4. FPOF 에이전시별 팀 구성 가이드

| 작업 유형 | 추천 방식 | 팀원 수 | 이유 |
|----------|----------|---------|------|
| 시즌 전체 Plan 수립 | 에이전트 팀 | 3~4명 | 리서처·전략가·MD·플래너 간 의존성 있음 |
| 개별 아이템 디자인 | 서브에이전트 | 각 1명 | 아이템별 독립 작업, 소통 불필요 |
| 병렬 마케팅 콘텐츠 | 서브에이전트 | 각 1명 | 카피·화보·소셜 독립 생성 가능 |
| PDCA 단계 전환 검수 | 에이전트 팀 | 2~3명 | 검증관·갭디텍터·리포터 간 순차 의존 |
| 시즌 전체 보고서 | 에이전트 팀 | 3명 | 분석·인사이트·리포트 간 연결 필요 |

### 5. 에이전트 팀 프롬프트 템플릿

에이전트 팀 생성 시 아래 템플릿을 기반으로 프롬프트를 구성한다:

```
[팀 목적]: {작업 설명}
[모델 지시]: 팀원 모두 Sonnet을 사용해
[계획 승인]: 각 팀원은 구현 전에 반드시 계획을 작성하여 리드의 승인을 받을 것
[자동 판단 기준]:
  - 브랜드 프리셋을 참조하지 않는 계획은 거절
  - PDCA 단계에 맞지 않는 작업은 거절
[팀원 역할]:
  - 팀원 1: {역할} — {담당 스킬}
  - 팀원 2: {역할} — {담당 스킬}
  - 팀원 3: {역할} — {담당 스킬}
[완료 조건]: {구체적 완료 기준}
[정리]: 모든 작업 완료 후 팀 정리
```

## Codex 호환 실행 (scripts/)
Claude 전용 훅/슬래시 명령은 유지하되, Codex에서는 아래 스크립트로 동일 흐름을 수동 실행합니다.

- `make status` → 현재 시즌/단계/산출물 상태 요약
- `make sync-state` → `workspace/` 기준으로 `.fpof-state.json` 동기화
- `make route-skill PROMPT="요청문"` → 키워드 라우팅 결과 확인
- `make check-output INPUT="workspace/26SS/season-strategy/plan_trend-brief.md"` → 산출물 체크리스트 확인

## 온디맨드 태스크 에이전트 (PDCA 분리)
아래 에이전트는 시즌 PDCA/브랜드 라우팅과 분리된 유틸리티 도구입니다.

- `format-converter` (문서 포맷 변환)
  - skill: `system/skills/task/format-conversion.md`
  - entrypoint: `system/scripts/task-agent.sh format-converter`
  - manual-only: 자동 라우팅 훅(`route-skill.sh`)에 연결하지 않음
  - 예시:
    - `make convert IN=input.docx OUT=output.pdf`
    - `./system/scripts/task-agent.sh format-converter --in input.pptx --out output.pdf`

## 산출물 저장 규칙
> 상세 규칙: `docs/reference/file-naming-convention.md`

### 폴더 구조 — 프로젝트 중심
모든 산출물은 `workspace/[프로젝트]/` 아래 저장. 한 프로젝트의 모든 파일은 한 폴더에.

| 프로젝트 유형 | 폴더명 패턴 | 예시 |
|-------------|-----------|------|
| 시즌 전략 | `season-strategy/` | 트렌드·브랜드·MD·라인시트 |
| 아이템 | `[item-name]/` | `camp-kitsch/`, `oversized-hoodie/` |
| 캠페인 | `campaign-[name]/` | `campaign-ss-launch/` |
| 리테일 | `retail-[name]/` | `retail-seongsu-flagship/` |
| 콜라보 | `collab-[partner]/` | `collab-sanrio/` |
| 주간 데이터 | `weekly/data/` | 매주 업로드하는 원본 엑셀 (→ dashboard 갱신) |
| 주간 산출물 | `weekly/wNN/` | `weekly/w09/` (리뷰·회의·대시보드) |
| 대시보드 | `dashboard/` | `weekly/data/` 기반 시각화·JSON (매주 갱신) |

### 파일명 규칙
```
PDCA 산출물 (시즌 전략 + 프로젝트):  [pdca]_[description][_YYYY-MM-DD][_vN].[ext]
운영 산출물 (주간/대시보드):          [type]_[description][_YYYY-MM-DD][_vN].[ext]
```
- 세그먼트 구분: `_` (언더스코어) / 단어 구분: `-` (하이픈)
- 날짜: `YYYY-MM-DD` / 주차: `wNN` (제로패딩)
- 파일명 영문만, 소문자 (시즌코드 `26SS` 예외)
- PDCA 접두사: `plan` | `design` | `do` | `check` | `act` — 시즌 전략/프로젝트에만 사용
- 운영 접두사: `review` | `meeting` | `deck` | `board` | `sheet` | `report` | `data` — 주간/대시보드에만 사용
- **주의**: 주간 운영 산출물에 PDCA 접두사를 붙이지 말 것 (예: ~~plan_weekly-review.md~~ → `review_exec-summary_2026-03-04.md`)

### 구조 예시
```
workspace/26SS/
├── season-strategy/                 ← 시즌 전략
│   ├── plan_trend-brief.md
│   ├── plan_brand-strategy.md
│   ├── plan_strategy-summary.pptx
│   ├── plan_market-intel-weekly_2026-03-10.md
│   └── check_completion-report.md
├── camp-kitsch/                     ← 아이템 프로젝트
│   ├── plan_category-brief.md
│   ├── design_moodboard.md
│   ├── design_design-spec.md
│   ├── do_techpack.md
│   └── do_pdp-copy.md
├── retail-seongsu-flagship/         ← 리테일 프로젝트
│   ├── do_souvenir-zone-annual-plan.md
│   └── check_opening-analysis.md
├── weekly/                          ← 주간 운영
│   ├── data/                        ← 원본 데이터 (매주 업로드)
│   │   ├── sheet_product-master_w09.xlsx
│   │   └── sheet_sales-review_w09.xlsx
│   └── w09/                         ← 산출물만
│       ├── review_exec-summary_2026-03-04.md
│       ├── deck_exec-report_2026-03-04.pptx
│       └── meeting_imc-sync_2026-03-05.md
└── dashboard/                       ← data/ 기반 대시보드
    ├── data_sales.json              ← weekly/data/ 가공 결과
    └── board_sales.html
```

## 문서 (docs/)
- `user-manual.md` — FPOF 사용 매뉴얼 (종합 레퍼런스)
- `quickstart-guide.md` — 퀵스타트 가이드 (5분 온보딩)
- `codex-compat-guide.md` — Codex 호환 실행 가이드
- `task-agents/format-converter/README.md` — 온디맨드 문서 변환 에이전트
- `reference/file-naming-convention.md` — 파일 네이밍 & 폴더링 컨벤션
- `reference/fpof-architecture.md` — 전체 시스템 아키텍처
- `reference/brand-strategy.md` — 브랜드 전략 원문
- `reference/ip-bible.md` — IP 캐릭터 세계관 원문
- `reference/core-target.md` — 코어 타겟 정의 원문
- `reference/business-goals.md` — 5대 경영목표 원문
- `generated/` — 빌드 스크립트로 생성된 문서 (PDF, PPTX, HTML 등)
- `external/` — 외부 참고 자료 (AI 방법론 등)

## PM-Skills 통합 (pm-skills by Paweł Huryn, MIT License)
65개 PM 프레임워크가 FPOF에 통합되었습니다. 기존 스킬은 보강, 신규 스킬은 와키윌리 컨텍스트로 커스터마이징.

### 기존 스킬 보강 (중복 합체)
| FPOF 스킬 | + 통합된 프레임워크 |
|-----------|-------------------|
| trend-research | 5대 경쟁사 프로파일링, TAM/SAM/SOM 시장 규모 추정 |
| brand-strategy | SWOT 크로스 분석(S×O/W×T), 포지셔닝 아이디어 |
| md-planning | RICE/ICE/Kano/Opportunity Score 우선순위 프레임워크 |
| imc-strategy | GTM 전략, 7가지 GTM 모션, 마케팅 아이디어 |
| copywriting | 밸류 프로포지션 스테이트먼트 (마케팅/세일즈/온보딩) |
| social-viral | 5가지 그로스 루프 (Viral/Usage/Collaboration/UGC/Referral) |
| costing-ve | 가격 포지셔닝 전략, 경쟁 벤치마크, 가격 실험 |
| sales-analysis | North Star Metric + Input/Health/Counter Metrics 대시보드 |
| insight-archiving | 감성 분석 (세그먼트별 감성 스코어, 테마 클러스터링) |
| quality-gate | Pre-Mortem (Tigers/Paper Tigers/Elephants, Go/No-Go) |

### 신규 스킬 카테고리
| 폴더 | 스킬 수 | 대표 스킬 |
|------|---------|----------|
| system/skills/pm-strategy/ | 10 | PESTLE, Porter's 5 Forces, Ansoff, BMC, Lean Canvas, Value Proposition |
| system/skills/pm-research/ | 4 | Customer Journey Map, Market Segments, User Personas, Segmentation |
| system/skills/pm-gtm/ | 3 | Beachhead Segment, Competitive Battlecard, ICP |
| system/skills/pm-discovery/ | 12 | OST, Brainstorm Ideas/Experiments, Assumptions, Interview, Prioritize |
| system/skills/pm-execution/ | 13 | OKRs, PRD, Roadmap, Stakeholder Map, Sprint, Retro, User Stories |
| system/skills/pm-analytics/ | 3 | A/B Test, Cohort Analysis, SQL Queries |
| system/skills/pm-marketing/ | 1 | Product Name |
| system/skills/pm-toolkit/ | 4 | Grammar Check, NDA, Privacy Policy, Resume Review |

## 5대 경영목표 (2026)
1. 브랜드 아이덴티티 정립 — 코어타겟 매출 비중, 인지도/선호도
2. 히트상품 + IMC 강화 — 상위 20% 매출 기여 ≥50%, 캠페인 ROAS
3. QR 비중 확대 — QR 매출 비중, 인시즌 리드타임
4. 용품 라인업 경쟁력 — 용품 매출 비중, 우먼스 용품 비중
5. 글로벌 대응 강화 — 글로벌 매출 달성률, 해외 재구매 비중
