# FPOF 사용 매뉴얼

> 와키윌리 패션 하우스 AI 오케스트레이션 시스템 종합 레퍼런스

---

## 1. 시스템 개요

FPOF(Fashion PDCA Orchestration Framework)는 패션 브랜드 **와키윌리(Wacky Willy)**의 시즌 운영을 AI와 함께 수행하는 시스템입니다.

**핵심 컨셉:**
- 패션 실무자가 **자연어로 지시**하면, AI가 적합한 전문가를 배정하여 산출물을 생성
- 브랜드의 DNA, 톤앤매너, 타겟, 채널 전략 등 **모든 지식이 사전 세팅**되어 있어 일관된 결과물 보장
- **PDCA 사이클**(Plan→Design→Do→Check→Act)로 시즌 전체를 체계적으로 관리

**이 시스템으로 할 수 있는 일:**
- 시즌 트렌드 분석 및 컨셉 수립
- 카테고리 믹스, 라인시트, 가격 전략 기획
- 무드보드, 디자인 스펙, AI 이미지 생성
- 테크팩, 원가 계산, QR 프로세스
- IMC 전략, 화보/영상 기획, 카피라이팅, 바이럴 전략
- 매출 분석, KPI 대시보드, 인사이트 아카이빙
- 품질 검증 및 자동 개선

---

## 2. 폴더 구조

```
conductor-playground/
├── .claude/                     ← Claude Code 설정
│   ├── hooks.json               훅 설정 (자동 라우팅 + 체크)
│   ├── hooks/
│   │   ├── route-skill.sh       시작 전 알림 장치 (키워드→스킬 라우팅)
│   │   └── check-output.sh      완료 후 체크 장치 (산출물 체크리스트)
│   └── commands/                슬래시 명령어 (6개)
│       ├── status.md            /status — 상태 확인
│       ├── brief.md             /brief — 산출물 작성
│       ├── review.md            /review — 품질 검수
│       ├── next.md              /next — 다음 단계 전환
│       ├── team.md              /team — 팀 현황 조회
│       └── export.md            /export — 산출물 정리
│
├── CLAUDE.md                    ← AI가 세션마다 읽는 마스터 매뉴얼
├── .fpof-state.json             ← 현재 시즌/단계 상태 추적
├── .gitignore
│
├── presets/wacky-willy/         ← 브랜드 지식 베이스 (7개 JSON)
│   ├── brand.config.json        DNA, 비전, 경영목표
│   ├── personas.json            타겟 페르소나
│   ├── tone-manner.json         톤앤매너, 브랜드 어휘
│   ├── visual-identity.json     컬러, 그래픽 스타일
│   ├── categories.json          카테고리 트리, 상품 전략
│   ├── channels.json            6개 채널 매출/목표
│   └── ip-bible.json            키키+11 캐릭터 세계관
│
├── agents/                      ← 6개 에이전시 (팀 정의)
│   ├── strategy-planning/       전략기획실
│   ├── creative-studio/         크리에이티브 스튜디오
│   ├── product-lab/             프로덕트 랩
│   ├── marketing-showroom/      마케팅 쇼룸
│   ├── data-intelligence/       데이터 인텔리전스
│   └── quality-control/         QC 본부
│
├── skills/                      ← 20개 전문 스킬 (업무 매뉴얼)
│   ├── strategy/                (4개) trend-research, brand-strategy, md-planning, line-sheet
│   ├── creative/                (3개) moodboard, design-spec, visual-generation
│   ├── product/                 (3개) techpack, costing-ve, qr-process
│   ├── marketing/               (4개) imc-strategy, visual-content, copywriting, social-viral
│   ├── data/                    (2개) sales-analysis, insight-archiving
│   ├── quality/                 (4개) quality-gate, gap-analysis, completion-report, pdca-iteration
│   └── task/                    (1개) format-conversion (온디맨드 유틸리티)
│
├── task-agents/                 ← PDCA와 분리된 수동 호출형 도구 에이전트
│   └── format-converter/        문서 포맷 변환기 (pptx/pdf/xlsx/docx)
│
├── output/26SS/                 ← 시즌별 산출물 (프로젝트별 정리)
│   ├── _season/                 시즌 전체 문서 (plan_trend-brief.md 등)
│   ├── graphic-tee/             아이템 프로젝트 (design_moodboard.md 등)
│   └── oversized-hoodie/        아이템 프로젝트
│
├── knowledge/                   ← 시즌을 거듭하며 쌓이는 지식 자산
│   └── index.md                 전체 색인
│
└── docs/                        ← 문서
    ├── user-manual.md           사용 매뉴얼
    ├── quickstart-guide.md      퀵스타트 가이드
    ├── codex-compat-guide.md    Codex 호환 실행 가이드
    ├── reference/               참고자료 (브랜드 전략, IP 바이블 등)
    └── external/                외부 참고 자료
```

---

## 3. 브랜드 지식 베이스 (프리셋)

AI는 브랜드 정보를 **절대 지어내지 않습니다.** 모든 브랜드 관련 판단은 아래 7개 프리셋 JSON을 근거로 합니다.

| 프리셋 | 담고 있는 것 | 이럴 때 활용됨 |
|--------|-------------|---------------|
| **brand.config.json** | 브랜드 DNA, 비전, SWOT, 5대 경영목표, 로드맵 | 전략 수립, 목표 정합성 검증 |
| **personas.json** | UNI/WOMAN 페르소나, 라이프스타일, 미디어 습관 | 타겟 관련 모든 의사결정 |
| **tone-manner.json** | 브랜드 보이스, 채널별 톤, 금지 표현, 브랜드 어휘 | 카피, 콘텐츠, 고객 대면 텍스트 |
| **visual-identity.json** | 컬러 팔레트, 타이포, 그래픽 스타일, 포토 디렉션 | 디자인, 이미지 생성, 비주얼 작업 |
| **categories.json** | 유니섹스/우먼스/용품 카테고리, 아이템별 전략 | 상품 기획, MD 전략, 테크팩 |
| **channels.json** | 6개 유통 채널, 매출 목표, 성장률, 전략 | 채널 믹스, 마케팅 예산 배분 |
| **ip-bible.json** | 키키+11 캐릭터, 성격, 그룹, 관계도, 활용 가이드 | IP 활용 디자인, 스토리텔링 |

### 프리셋 수정이 필요할 때
프리셋은 시스템의 "진실의 원천"입니다. 브랜드 전략이 변경되면 해당 프리셋 JSON을 업데이트해야 이후 모든 작업에 반영됩니다.

---

## 4. 에이전시 & 전문가 조직도

### 전략기획실 — "시즌의 방향을 잡는 두뇌 집단"
| 전문가 | 하는 일 | 이렇게 부르세요 |
|--------|---------|---------------|
| 시장 리서처 | 글로벌 트렌드, SNS 마이크로 트렌드, 경쟁사 동향 | "요즘 트렌드 뭐야?", "경쟁사 분석해줘" |
| 브랜드 전략가 | 시즌 테마, 포지셔닝, 경영목표 연결 | "시즌 테마 제안해줘", "브랜드 방향 잡아줘" |
| 수석 MD | 카테고리 믹스, 가격 전략, 챔피언 상품 | "SKU 짜줘", "카테고리 믹스 제안해줘" |
| 컬렉션 플래너 | 라인시트, OTB, 사이즈/컬러 브레이크다운 | "라인시트 만들어줘", "물량 배분해줘" |

### 크리에이티브 스튜디오 — "브랜드의 감성을 시각화하는 아티스트 집단"
| 전문가 | 하는 일 | 이렇게 부르세요 |
|--------|---------|---------------|
| 크리에이티브 디렉터 | 무드보드, 비주얼 톤, 캠페인 테마 | "무드보드 만들어줘", "비주얼 톤은?" |
| 패션 디자이너 | 디자인 스펙, 실루엣, 소재, 그래픽/프린트 | "디자인 그려줘", "프린트 개발해줘" |
| 아트 디렉터 | AI 이미지 생성, 룩북/플랫/캠페인 비주얼 | "룩북 이미지 만들어줘", "비주얼 생성해줘" |

### 프로덕트 랩 — "디자인을 실제 상품으로 만드는 기술 집단"
| 전문가 | 하는 일 | 이렇게 부르세요 |
|--------|---------|---------------|
| 프로덕션 매니저 | 테크팩 8대 섹션, BOM, 사이즈 스펙, 봉제 공정, QC | "테크팩 만들어줘", "사이즈 스펙 잡아줘" |
| 프로덕션 매니저 | 원가 계산, VE(Value Engineering) 제안 | "원가 계산해줘", "원가 오버야 VE 제안해줘" |
| 프로덕션 매니저 | QR 프로세스, 리오더/SPOT 판단 | "리오더 해야 할까?", "SPOT 상품 기획해줘" |

### 마케팅 쇼룸 — "브랜드 스토리를 세상에 전달하는 커뮤니케이션 집단"
| 전문가 | 하는 일 | 이렇게 부르세요 |
|--------|---------|---------------|
| 마케팅 디렉터 | IMC 전략, 채널 믹스, GTM, 캠페인 로드맵 | "마케팅 전략 짜줘", "GTM 계획 세워줘" |
| 콘텐츠 디렉터 | 화보/영상 기획, 촬영 콘셉트, 채널별 에셋 | "화보 기획해줘", "영상 시나리오 써줘" |
| 패션 에디터 | PDP 카피, SNS 캡션, 해시태그, 스토리텔링 | "상품 설명 써줘", "인스타 캡션 써줘" |
| 소셜 전략 디렉터 | 인플루언서 매핑, 바이럴, 시딩, 런칭 시퀀스 | "인플루언서 매핑해줘", "런칭 시퀀스 설계해줘" |

### 데이터 인텔리전스 — "숫자로 말하고, 경험에서 배우는 분석 집단"
| 전문가 | 하는 일 | 이렇게 부르세요 |
|--------|---------|---------------|
| 트렌드 애널리스트 | 매출 분석, KPI 대시보드, 채널/카테고리별 성과 | "매출 분석해줘", "KPI 어때?" |
| 인사이트 아키텍트 | 성공/실패 사례 분석, 인사이트 카드, 플레이북 | "왜 잘 팔렸어?", "플레이북 만들어줘" |

### QC 본부 — "모든 산출물의 품질을 보장하는 검수 집단"
| 전문가 | 하는 일 | 이렇게 부르세요 |
|--------|---------|---------------|
| 품질 검증관 | QG1~QG4 체크리스트, PASS/FAIL 판정 | "검수해줘", "다음 단계 가도 돼?" |
| 갭 디텍터 | 기획 vs 실행 비교, Match Rate 산출 | "갭 분석해줘", "기획대로 됐어?" |
| 리포트 제너레이터 | PDCA 완료 보고서, 경영진 요약 | "완료 보고서 만들어줘", "시즌 정리해줘" |
| PDCA 이터레이터 | Match Rate < 90% 시 자동 개선 반복 | "자동 개선해줘", "Match Rate 올려줘" |

---

## 5. PDCA 사이클 상세

### Plan 단계 — 시즌 기획
**담당:** 전략기획실 (4명)

```
시장 리서처 → 트렌드 브리프
       ↓
브랜드 전략가 → 브랜드 전략 브리프
       ↓
수석 MD → 시즌 컨셉 & MD 전략
       ↓
컬렉션 플래너 → 라인시트
       ↓
[사용자 승인] → QG1 → Design 단계로
```

**산출물:**
- `output/[시즌]/plan/trend-brief.md`
- `output/[시즌]/plan/brand-strategy.md`
- `output/[시즌]/plan/season-concept.md`
- `output/[시즌]/plan/line-sheet.md`

### Design 단계 — 크리에이티브 개발
**담당:** 크리에이티브 스튜디오 (3명) + 프로덕트 랩 (원가 검증)

```
크리에이티브 디렉터 → 무드보드
       ↓
패션 디자이너 → 디자인 스펙
       ↓
아트 디렉터 → AI 비주얼 생성
       ↓
프로덕션 매니저 → 원가 검증 (Over시 VE 제안)
       ↓
[사용자 승인] → QG2 → Do 단계로
```

**산출물:**
- `output/[시즌]/design/[아이템]-moodboard.md`
- `output/[시즌]/design/[아이템]-design-spec.md`
- `output/[시즌]/design/[아이템]-visual/`
- `output/[시즌]/design/[아이템]-costing.md`

### Do 단계 — 상품화 & 마케팅
**담당:** 프로덕트 랩 (테크팩) + 마케팅 쇼룸 (4명)

```
[프로덕트 랩]                    [마케팅 쇼룸]
프로덕션 매니저 → 테크팩         마케팅 디렉터 → IMC 전략
프로덕션 매니저 → QR 대응        콘텐츠 디렉터 → 화보/영상 기획
                                패션 에디터 → 카피 데크
                                소셜 전략 디렉터 → 바이럴/런칭
       ↓
[사용자 승인] → QG3 → Check 단계로
```

**산출물:**
- `output/[시즌]/do/[상품]-techpack.md`
- `output/[시즌]/do/[상품]-campaign-brief.md`
- `output/[시즌]/do/[상품]-content-plan.md`
- `output/[시즌]/do/[상품]-copy-deck.md`
- `output/[시즌]/do/social-strategy.md`

### Check 단계 — 성과 분석
**담당:** 데이터 인텔리전스 (2명) + QC 본부

```
트렌드 애널리스트 → 매출 분석 & KPI 대시보드
       ↓
인사이트 아키텍트 → 성공/실패 사례 분석 → knowledge/ 아카이빙
       ↓
갭 디텍터 → 기획 vs 실적 비교 → Match Rate 산출
       ↓
리포트 제너레이터 → 완료 보고서
       ↓
QG4 판정: Match Rate ≥ 90% → 시즌 완료 / < 90% → Act 단계
```

### Act 단계 — 자동 개선
**담당:** QC 본부 → PDCA 이터레이터

```
갭 리포트에서 Critical/Warning 갭 추출
       ↓
원인별 액션 매핑 → 해당 에이전시에 개선 요청
       ↓
재검증 (Match Rate 재산출)
       ↓
≥ 90% → 완료 / < 90% → 재반복 (최대 5회)
```

---

## 6. Quality Gate (QG1~QG4)

각 PDCA 단계 전환 시 자동으로 품질 검증이 실행됩니다.

### QG1: Plan → Design
| 항목 | 기준 |
|------|------|
| 트렌드 브리프 | Macro/Micro 트렌드 포함 |
| 브랜드 전략 브리프 | 시즌 테마 + 경영목표 연결 |
| 시즌 컨셉 & MD 전략 | 카테고리 믹스 + 챔피언 상품 |
| 라인시트 | SKU 리스트 + OTB |
| 경영목표 정합성 | 5대 목표 중 2개 이상 연결 |
| 사용자 승인 | 검토 완료 |

### QG2: Design → Do
| 항목 | 기준 |
|------|------|
| 무드보드 | 비주얼 방향 정의 |
| 디자인 스펙 | 핵심 아이템 1건 이상 |
| 원가 검증 | 타겟 원가율 이내 (또는 VE) |
| 디자인-기획 정합성 | 라인시트와 매칭 |
| 비주얼 에셋 | 최소 플랫 이미지 |
| 사용자 승인 | 검토 완료 |

### QG3: Do → Check
| 항목 | 기준 |
|------|------|
| 테크팩 | 런칭 아이템 전체 |
| 캠페인 브리프 | IMC 전략 수립 완료 |
| 콘텐츠 기획서 | 화보/영상 기획 완료 |
| 카피 데크 | PDP + SNS 카피 |
| 런칭 시퀀스 | 타임라인 + 담당자 |
| 사용자 승인 | 런칭 준비 완료 |

### QG4: Check → 다음 사이클
| 항목 | 기준 |
|------|------|
| 매출 분석 | 채널별/카테고리별 완료 |
| KPI 리뷰 | 5대 경영목표 달성률 |
| 갭 분석 | Match Rate 산출 |
| 인사이트 아카이빙 | 1건 이상 인사이트 카드 |

### 판정 기준
- **PASS** (모든 항목 충족): 다음 단계 진입
- **CONDITIONAL** (일부 미충족): 보완 후 재검증 또는 강제 통과 가능
- **FAIL** (다수 미충족): 보완 필수
- **QG4 특수**: Match Rate ≥ 90% → COMPLETE / < 90% → Act 단계 진입

---

## 7. 자연어 라우팅 레퍼런스

당신이 하는 말에 따라 적합한 전문가가 자동 배정됩니다.

| 이렇게 말하면 | 이 전문가가 반응 |
|--------------|----------------|
| 트렌드, 요즘 뜨는, 경쟁사, TikTok 트렌드 | 시장 리서처 |
| 브랜드 방향, 포지셔닝, SWOT, 시즌 테마 | 브랜드 전략가 |
| SKU, 카테고리 믹스, 가격대, 챔피언 상품, 히트상품 | 수석 MD |
| 라인시트, OTB, 물량, 사이즈 비율, 컬러 구성 | 컬렉션 플래너 |
| 무드보드, 비주얼 톤, 캠페인 테마, 레퍼런스 | 크리에이티브 디렉터 |
| 디자인, 도식화, 프린트, 소재, 컬러 조합 | 패션 디자이너 |
| 이미지 생성, 룩북, 플랫 이미지, 캠페인 비주얼 | 아트 디렉터 |
| 테크팩, BOM, 사이즈 스펙, 봉제, QC | 프로덕션 매니저 (테크팩) |
| 원가, 원가율, VE, 대체 소재 | 프로덕션 매니저 (원가) |
| 리오더, SPOT, QR, 긴급 생산 | 프로덕션 매니저 (QR) |
| 마케팅 전략, GTM, 채널 믹스, 캠페인 | 마케팅 디렉터 |
| 화보, 영상, 촬영, 룩북, 숏폼 | 콘텐츠 디렉터 |
| 카피, 상품 설명, 캡션, 해시태그, 스토리 | 패션 에디터 |
| 인플루언서, 바이럴, 시딩, 런칭 시퀀스 | 소셜 전략 디렉터 |
| 매출, KPI, 실적, 채널별 분석, 데이터 | 트렌드 애널리스트 |
| 왜 잘 팔렸어?, 실패 원인, 인사이트, 플레이북 | 인사이트 아키텍트 |
| 검수, 품질 체크, 다음 단계 | 품질 검증관 |
| 갭 분석, Match Rate, 기획대로 됐어? | 갭 디텍터 |
| 완료 보고서, 시즌 정리, PDCA 요약 | 리포트 제너레이터 |
| 자동 개선, 갭 줄여줘, Match Rate 올려줘 | PDCA 이터레이터 |

---

## 8. 산출물 관리

### 저장 규칙
- **위치**: `output/[시즌코드]/[프로젝트명]/`
- **파일명**: `[PDCA단계]_[내용].확장자` — 단계가 파일명에 명시됨
- **시즌코드**: 연도 2자리 + 시즌 (예: `26SS`, `26FW`, `27SS`)
- **`_season/`**: 특정 아이템에 종속되지 않는 시즌 전체 문서
- **아이템 폴더**: 개별 상품/프로젝트 단위로 자유롭게 생성

```
output/26SS/
├── _season/                         ← 시즌 전체 문서
│   ├── plan_trend-brief.md
│   ├── plan_brand-strategy.md
│   ├── plan_line-sheet.xlsx
│   ├── do_imc-strategy.md
│   └── check_completion-report.md
├── graphic-tee/                     ← 아이템 프로젝트
│   ├── plan_category-brief.md
│   ├── design_moodboard.md
│   ├── design_spec.md
│   ├── do_techpack.md
│   └── do_pdp-copy.md
└── oversized-hoodie/
    ├── design_moodboard.md
    └── do_techpack.md
```

### 산출물 전체 목록 (시즌 1회 기준)

| 파일명 | 저장 위치 | 담당 |
|--------|----------|------|
| `plan_trend-brief.md` | _season/ | 시장 리서처 |
| `plan_brand-strategy.md` | _season/ | 브랜드 전략가 |
| `plan_md-plan.md` | _season/ | 수석 MD |
| `plan_line-sheet.xlsx` | _season/ | 컬렉션 플래너 |
| `design_moodboard.md` | [아이템]/ | 크리에이티브 디렉터 |
| `design_spec.md` | [아이템]/ | 패션 디자이너 |
| `design_visual.md` | [아이템]/ | 아트 디렉터 |
| `design_costing.md` | [아이템]/ | 프로덕션 매니저 |
| `do_techpack.md` | [아이템]/ | 프로덕션 매니저 |
| `do_imc-strategy.md` | _season/ | 마케팅 디렉터 |
| `do_content-plan.md` | _season/ | 콘텐츠 디렉터 |
| `do_pdp-copy.md` | [아이템]/ | 패션 에디터 |
| `do_social-strategy.md` | _season/ | 소셜 전략 디렉터 |
| `check_sales-analysis.md` | _season/ | 트렌드 애널리스트 |
| `check_kpi-dashboard.md` | _season/ | 트렌드 애널리스트 |
| `check_gap-report.md` | _season/ | 갭 디텍터 |
| `check_completion-report.md` | _season/ | 리포트 제너레이터 |

---

## 9. knowledge/ 아카이브

시즌이 반복될수록 쌓이는 **조직의 학습 자산**입니다.

| 폴더 | 내용 | 예시 |
|------|------|------|
| `insights/` | 시즌별 핵심 인사이트 요약 | `26SS-learnings.md` |
| `case-studies/` | 개별 성공/실패 사례 분석 | `26SS-graphic-tee-hit.md` |
| `playbooks/` | 재현 가능한 실행 가이드 | `hit-product-formula.md` |
| `index.md` | 전체 지식 색인 (검색용) | — |

**활용법:**
- "이전 시즌에서 배울 점 있어?" → 인사이트 아키텍트가 knowledge/ 검색
- "히트상품 공식 알려줘" → playbooks/ 참조
- 새 시즌 Plan 수립 시 자동으로 이전 인사이트 반영

---

## 10. 상태 관리 (.fpof-state.json)

시스템의 "현재 위치"를 추적하는 파일입니다. AI가 세션을 시작할 때마다 자동으로 읽습니다.

**주요 필드:**
- `current_season`: 현재 진행 중인 시즌 (예: "26SS")
- `pdca.current_phase`: 현재 PDCA 단계 (plan/design/do/check/act)
- `pdca.completed_phases`: 완료된 단계 목록
- `work_memory`: 최근 작업 이력 (무엇을 했고 다음에 할 일)

**자동 업데이트:**
- 의미 있는 작업 완료 시 AI가 자동으로 상태를 갱신합니다
- Quality Gate 통과 시 다음 단계로 전환됩니다

---

## 11. 5대 경영목표 (2026)

모든 기획과 분석은 아래 경영목표와의 연결성을 검증합니다.

| # | 경영목표 | 핵심 KPI |
|---|---------|---------|
| 1 | 브랜드 아이덴티티 정립 | 코어타겟 매출 비중, 인지도/선호도 |
| 2 | 히트상품 + IMC 강화 | 상위 20% 매출 기여 ≥50%, 캠페인 ROAS |
| 3 | QR 비중 확대 | QR 매출 비중, 인시즌 리드타임 |
| 4 | 용품 라인업 경쟁력 | 용품 매출 비중, 우먼스 용품 비중 |
| 5 | 글로벌 대응 강화 | 글로벌 매출 달성률, 해외 재구매 비중 |

---

## 12. 슬래시 명령어

`.claude/commands/`에 정의된 패션 하우스 전용 단축 명령어입니다.

| 명령어 | 기능 | 설명 |
|--------|------|------|
| `/status` | 상태 확인 | 현재 시즌, PDCA 단계, 산출물 현황, QG 상태를 한눈에 확인 |
| `/brief [유형]` | 산출물 작성 | 스킬 파일 + 프리셋 기반으로 산출물 문서 자동 생성. 유형 생략 시 다음 필요 산출물 자동 판단 |
| `/review` | 품질 검수 | 현재 단계의 산출물 완전성 + 브랜드 정합성 + 기획-실행 일치도 검증 |
| `/next` | 단계 전환 | Quality Gate 실행 후 통과 시 다음 PDCA 단계로 전환 |
| `/team` | 팀 현황 | 6개 에이전시 20명 전문가의 역할, 스킬, 참조 프리셋 조회 |
| `/export [detail]` | 산출물 정리 | 시즌 전체 산출물 목록 + 진행률. `detail` 옵션으로 내용 요약 포함 |
| `/deck [유형]` | 프레젠테이션 | PPTX 생성. 유형: `trend`, `season`, `moodboard`, `lookbook`, `buyer`, `campaign`, `report` |
| `/pdf [유형]` | PDF 보고서 | PDF 생성. 유형: `trend-report`, `season-book`, `line-sheet`, `techpack`, `press-kit` 등 |
| `/sheet [유형]` | 엑셀 시트 | XLSX 생성. 유형: `line-sheet`, `otb`, `bom`, `cost-estimate`, `sales-data`, `kpi-tracker` 등 |
| `/doc [유형]` | 워드 문서 | DOCX 생성. 유형: `trend-brief`, `season-plan`, `campaign-plan`, `press-release`, `pdp-copy` 등 |

### 사용 예시
```
# 시스템 관리
/status              → "26SS, Plan 단계, 2/4 산출물 완료"
/brief trend-brief   → 트렌드 분석 보고서 자동 작성
/review              → "QG1: 라인시트 누락, CONDITIONAL"
/next                → QG1 실행 → PASS → Design 단계 전환
/team                → 활성 에이전시 하이라이트 포함 조직도
/export detail       → 전체 산출물 + 핵심 내용 요약

# 문서 생성 (document-skills 플러그인 필요)
/deck trend          → 트렌드 리서치 프레젠테이션 (PPTX)
/pdf techpack        → 테크팩 PDF (도식화, BOM, 사이즈스펙)
/sheet line-sheet    → 라인시트 엑셀 (SKU, 사이즈, 가격, OTB)
/doc campaign-plan   → 캠페인 기획서 (DOCX)
```

---

## 13. 자동화 훅

`.claude/hooks/`에 정의된 두 가지 자동 장치입니다. 강제로 막지 않고, 리마인더로 상기시켜 줍니다.

### 시작 전 알림 장치 (route-skill.sh)
사용자의 요청을 분석하여 적합한 에이전시·역할·스킬·프리셋을 AI에게 자동 전달합니다.

```
사용자: "무드보드 만들어줘"
  → [FPOF] 크리에이티브 스튜디오 > 크리에이티브 디렉터
    skill: skills/creative/moodboard.md
    presets: visual-identity.json, brand.config.json, ip-bible.json
    phase: design
```

### 완료 후 체크 장치 (check-output.sh)
`output/` 디렉토리에 산출물 파일이 생성되면, 해당 유형에 맞는 품질 체크리스트를 자동 표시합니다.

```
산출물 생성: output/26SS/design/hoodie-moodboard.md
  → [FPOF CHECK] hoodie-moodboard.md
    - 시즌 컨셉과 무드보드의 연결성이 명확한가?
    - 컬러 팔레트가 visual-identity.json과 일치하는가?
    - .fpof-state.json artifacts 업데이트가 필요한가?
```

---

## 14. 추천 플러그인

Claude Code 공식 마켓플레이스(`/plugin` → Discover)에서 설치할 수 있는 유용한 플러그인입니다.

### 필수 플러그인 (문서 생성)
| 플러그인 | 설치 명령 | 패션 하우스 활용 |
|----------|----------|----------------|
| **document-skills** | `/plugin install document-skills@anthropic-agent-skills` | PPTX/PDF/XLSX/DOCX 생성 — `/deck`, `/pdf`, `/sheet`, `/doc` 명령어의 핵심 엔진 |

마켓플레이스 추가가 필요한 경우:
```
/plugin marketplace add anthropics/skills
```

### 추천 플러그인
| 플러그인 | 설치 명령 | 패션 하우스 활용 |
|----------|----------|----------------|
| **commit-commands** | `/plugin install commit-commands@claude-plugins-official` | 산출물 커밋·PR 자동화 |
| **frontend-design** | `/plugin install frontend-design@anthropics-claude-code` | 룩북/브랜드 페이지 디자인 |
| **explanatory-output-style** | `/plugin install explanatory-output-style@anthropics-claude-code` | 산출물 작성 시 근거 설명 추가 |
| **security-guidance** | `/plugin install security-guidance@anthropics-claude-code` | 프리셋 데이터 보호 |

---

## 15. 트러블슈팅 & FAQ

**Q: AI가 브랜드와 맞지 않는 결과를 내놓아요.**
→ `tone-manner.json`이나 `visual-identity.json`이 충분히 상세한지 확인하세요. 프리셋이 구체적일수록 결과물의 브랜드 정합성이 높아집니다.

**Q: 이전 시즌 작업을 참고하고 싶어요.**
→ "이전 시즌 인사이트 보여줘", "26SS에서 배울 점은?"이라고 요청하면 인사이트 아키텍트가 knowledge/ 아카이브를 검색합니다.

**Q: 단계를 건너뛰고 싶어요.**
→ 가능하지만 권장하지 않습니다. Quality Gate를 "강제 통과"할 수 있습니다. "강제 통과해줘"라고 말하면 됩니다.

**Q: 한 아이템만 먼저 진행하고 싶어요.**
→ 가능합니다. "그래픽 티 먼저 디자인 진행하자"처럼 특정 아이템을 지정하면 됩니다.

**Q: 여러 시즌을 동시에 관리할 수 있나요?**
→ `.fpof-state.json`의 `current_season`을 변경하여 시즌을 전환할 수 있습니다. 각 시즌의 산출물은 `output/[시즌코드]/`에 독립적으로 저장됩니다.

**Q: 프리셋 데이터를 변경하고 싶어요.**
→ 해당 JSON 파일을 직접 수정하거나, "brand.config에서 비전을 수정해줘"라고 요청하면 됩니다.
