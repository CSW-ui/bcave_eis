# Fashion PDCA Orchestration Framework (FPOF) v1.0

> **Subtitle**: AI-Native Fashion Brand Orchestration System
> **Type**: Architecture Document
> **Status**: Draft - Pending Approval

---

## 1. Executive Summary

Fashion PDCA Orchestration Framework(FPOF)는 **패션 브랜드 운영의 전체 사이클**을 AI 에이전트 협업으로 자동화하는 범용 프레임워크이다.

**핵심 가치**: 시즌 기획(Plan) → 크리에이티브 제작(Design) → 상품화/런칭(Do) → 성과 분석(Check) → 개선 실행(Act)의 PDCA 사이클을 패션 도메인에 최적화하여 반자동으로 운영한다.

### 설계 원칙
1. **Brand-Agnostic Core**: 프레임워크 코어는 특정 브랜드에 종속되지 않는다
2. **Preset-Based Customization**: 브랜드별 특화 요소는 프리셋(Theme)으로 분리한다
3. **Semi-Automatic Flow**: 각 단계 완료 시 다음 단계를 추천하고, 품질 게이트는 자동 실행한다
4. **Document-Driven**: 모든 의사결정과 산출물은 문서로 추적한다

---

## 2. System Architecture

### 2.1 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Brand Preset                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Wacky Willy  │ │ Brand B      │ │ Brand C      │        │
│  │ Preset       │ │ Preset       │ │ Preset       │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Domain Agents (Fashion Specialists)               │
│  ┌────────────┐┌────────────┐┌────────────┐┌────────────┐  │
│  │ Strategy   ││ Creative   ││ Product    ││ Marketing  │  │
│  │ Planning   ││ Studio     ││ Lab        ││ Showroom   │  │
│  └────────────┘└────────────┘└────────────┘└────────────┘  │
│  ┌────────────┐                                             │
│  │ Data       │                                             │
│  │Intelligence│                                             │
│  └────────────┘                                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: PDCA Engine (Quality & Automation)                │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────────────┐ │
│  │ Plan ││Design││  Do  ││Check ││ Act  ││ Quality Gate │ │
│  └──────┘└──────┘└──────┘└──────┘└──────┘└──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Orchestrator Core                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Conductor (Session Manager + Router + State Machine) │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Layer 상세

#### Layer 1: Orchestrator Core (지휘자)
세션 관리, 에이전트 라우팅, 상태 머신을 담당하는 핵심 엔진.

| Component | 역할 | 구현 |
|-----------|------|------|
| **Conductor** | 전체 워크플로우 제어, 에이전트 호출 순서 결정 | Claude Opus 4.5 (Session Orchestrator) |
| **State Machine** | 현재 PDCA 단계 추적, 전환 조건 관리 | `.pdca-status.json` |
| **Router** | 사용자 입력을 적절한 에이전트/스킬로 라우팅 | 키워드 트리거 + 컨텍스트 분석 |
| **Memory** | 세션 간 컨텍스트 유지, 브랜드 지식 축적 | `.brand-memory.json` |

#### Layer 2: PDCA Engine (품질 엔진)
bkit의 PDCA 방법론을 패션 도메인에 매핑한 품질 관리 계층.

| PDCA Phase | Fashion Protocol | 트리거 | 자동화 |
|------------|-----------------|--------|--------|
| **Plan** | Season Strategy | `/season plan` | 반자동: 트렌드 분석 → 시즌 컨셉 → 사용자 승인 |
| **Design** | Creative Development | `/season design` | 반자동: 디자인 루프 → 원가 검증 → 사용자 승인 |
| **Do** | Production & Launch | `/season launch` | 반자동: 테크팩 → 마케팅 → 사용자 승인 후 실행 |
| **Check** | Performance Review | `/season review` | 자동: KPI 분석 → 갭 탐지 → 리포트 생성 |
| **Act** | Improvement Cycle | `/season improve` | 자동: 갭 < 90% 시 개선안 자동 생성 → 사용자 승인 |

**Quality Gate (품질 게이트)**:
각 단계 전환 시 자동 실행되는 검증 프로세스.

```
[Plan 완료] → QG1: 기획 완전성 검증 → [Design 진입]
[Design 완료] → QG2: 디자인-기획 정합성 검증 → [Do 진입]
[Do 완료] → QG3: 산출물 품질 검증 → [Check 진입]
[Check 완료] → QG4: 개선 필요성 판단 → [Act 또는 다음 사이클]
```

#### Layer 3: Domain Agents (패션 전문가 에이전트)
5개 부서, 각 부서별 전문 에이전트 구성.

##### Dept 1. Strategy Planning (전략 기획실)
| Agent | 역할 | Model Tier | PDCA Phase |
|-------|------|------------|------------|
| **Brand Strategist** | 브랜드 포지셔닝, DNA 정의, SWOT 분석 | Tier 1 (Strategic) | Plan |
| **Chief Merchandiser** | 시즌 컨셉, 카테고리 믹스, SKU 전략 | Tier 1 (Strategic) | Plan |
| **Collection Planner** | 라인 시트, OTB, 사이즈 브레이크다운 | Tier 2 (Execution) | Plan → Design |

##### Dept 2. Creative Studio (크리에이티브 스튜디오)
| Agent | 역할 | Model Tier | PDCA Phase |
|-------|------|------------|------------|
| **Creative Director** | 시즌 비주얼 총괄, 무드보드, 캠페인 테마 | Tier 1 (Strategic) | Design |
| **Art Director** | AI 이미지/영상 생성 실행, 품질 관리 | Tier 2 (Execution) | Design → Do |
| **Fashion Designer** | 의류 디자인, 플랫 스케치, 소재/컬러 선정 | Tier 2 (Execution) | Design |

##### Dept 3. Product Lab (프로덕트 랩)
| Agent | 역할 | Model Tier | PDCA Phase |
|-------|------|------------|------------|
| **Production Manager** | 테크팩, BOM, 원가계산, QC 관리 | Tier 2 (Execution) | Do |

##### Dept 4. Marketing Showroom (마케팅 쇼룸)
| Agent | 역할 | Model Tier | PDCA Phase |
|-------|------|------------|------------|
| **Marketing Director** | IMC 전략, 채널 믹스, GTM 총괄 | Tier 1 (Strategic) | Do |
| **Fashion Editor** | 브랜드 스토리텔링, PDP 카피, SNS 콘텐츠 | Tier 2 (Execution) | Do |
| **Social Strategy Director** | 소셜 채널 전략, 페르소나 매핑 | Tier 2 (Execution) | Do |

##### Dept 5. Data Intelligence (데이터 인텔리전스)
| Agent | 역할 | Model Tier | PDCA Phase |
|-------|------|------------|------------|
| **Market Researcher** | 글로벌 트렌드 분석, 경쟁사 동향 | Tier 2 (Execution) | Plan, Check |
| **Trend Analyst** | RFM/코호트 분석, 세그먼테이션 | Tier 2 (Execution) | Check |

##### Quality Department (품질 관리부) - PDCA Engine 소속
| Agent | 역할 | 자동화 | PDCA Phase |
|-------|------|--------|------------|
| **Gap Detector** | 기획-구현 갭 분석 | 자동 (단계 전환 시) | Check |
| **Design Validator** | 설계 문서 완전성 검증 | 자동 (QG 통과 시) | Check |
| **PDCA Iterator** | 갭 < 90% 시 자동 개선 반복 | 자동 (최대 5회) | Act |
| **Report Generator** | PDCA 사이클 완료 보고서 생성 | 자동 | Act |

**Model Tier 정책**:
| Tier | 용도 | 기본 모델 | 백업 모델 |
|------|------|-----------|-----------|
| **Tier 1 (Strategic)** | 고차원 추론, 전략 수립, 복합 판단 | Claude Sonnet | Gemini Pro |
| **Tier 2 (Execution)** | 데이터 처리, 코딩, 콘텐츠 생성 | GLM-4.7 | Gemini Flash |
| **Tier 0 (Orchestrator)** | 세션 관리, 에이전트 오케스트레이션 | Claude Opus 4.5 | - |

#### Layer 4: Brand Preset (브랜드 프리셋)
브랜드별 특화 설정을 분리하여 프레임워크 재사용성을 보장한다.

**프리셋 구조**:
```
presets/
├── _template/              # 빈 프리셋 템플릿
│   ├── brand.config.json   # 브랜드 기본 설정
│   ├── channels.json       # 판매 채널 정의
│   ├── categories.json     # 상품 카테고리 정의
│   ├── personas.json       # 타겟 페르소나
│   ├── tone-manner.json    # 톤앤매너 가이드
│   └── visual-identity.json # 비주얼 아이덴티티
├── wacky-willy/            # 와키윌리 프리셋
└── [brand-name]/           # 추가 브랜드
```

**프리셋이 제어하는 항목**:
| 설정 항목 | 설명 | 예시 (와키윌리) |
|-----------|------|-----------------|
| `brand.identity` | 브랜드 DNA, 철학, 비전 | "Kitsch Street", Vision 2028 |
| `brand.tone` | 에이전트 커뮤니케이션 톤앤매너 | Gen-Z 감성, 위트, 반전 |
| `channels` | 판매 채널 목록 및 우선순위 | 10개 채널 (3 온라인 + 7 오프라인) |
| `categories` | 상품 카테고리 트리 | 어패럴/악세서리/슈즈 |
| `personas` | 타겟 고객 페르소나 | Hype Hunter, Kitsch Lover, Smart Casual |
| `ip` | IP 캐릭터 및 세계관 | KiKi 캐릭터, Wacky Universe |
| `kpi` | 성과 지표 기준값 | 재구매율 30%, 반품률 5% 미만 |
| `visual` | 컬러 팔레트, 타이포, 무드 | Vivid Orange, Street Grunge |

---

## 3. Unified Command System

### 3.1 시즌 사이클 커맨드 (Season Cycle)

전체 시즌 워크플로우를 PDCA 사이클로 운영하는 메인 커맨드.

```
/season plan [season_keyword]     → PDCA Plan Phase
/season design [item_or_category] → PDCA Design Phase
/season launch [product_name]     → PDCA Do Phase
/season review [period]           → PDCA Check Phase
/season improve                   → PDCA Act Phase
/season status                    → 현재 진행 상태 확인
/season next                      → 다음 추천 액션
```

### 3.2 부서별 전문 커맨드 (Department Commands)

각 부서의 핵심 워크플로우를 직접 실행하는 커맨드.

| Command | 부서 | 기능 | 호출 에이전트 |
|---------|------|------|--------------|
| `/plan-season [keyword]` | Strategy | 시즌 기획 파이프라인 | Market Researcher → Chief MD → Collection Planner |
| `/design-drop [item]` | Creative | 디자인 시각화 | Creative Director → Fashion Designer → Art Director |
| `/create-techpack [design]` | Product | 테크팩 생성 | Production Manager |
| `/launch-campaign [product]` | Marketing | 마케팅 캠페인 실행 | Marketing Director → Fashion Editor → Social Strategy |
| `/analyze-sales [period]` | Data | 매출 데이터 분석 | Market Researcher → Trend Analyst |

### 3.3 품질 관리 커맨드 (Quality Commands)

| Command | 기능 | 자동화 수준 |
|---------|------|-------------|
| `/quality check` | 현재 단계 산출물 갭 분석 | 자동 실행 |
| `/quality validate` | 설계 문서 완전성 검증 | 자동 실행 |
| `/quality improve` | 갭 기반 자동 개선 반복 | 자동 (최대 5회) |
| `/quality report` | PDCA 사이클 완료 보고서 | 자동 생성 |

### 3.4 유틸리티 커맨드 (Utility Commands)

| Command | 기능 |
|---------|------|
| `/brand load [preset_name]` | 브랜드 프리셋 로드 |
| `/brand status` | 현재 로드된 브랜드 정보 |
| `/brand create [name]` | 새 브랜드 프리셋 생성 (인터랙티브) |

---

## 4. Workflow: Season Cycle

### 4.1 전체 흐름도

```
                    ┌─────────────┐
                    │ /brand load │
                    │ [preset]    │
                    └──────┬──────┘
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │                  PDCA SEASON CYCLE                      │
  │                                                        │
  │  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
  │  │   PLAN   │───▶│  DESIGN  │───▶│    DO    │         │
  │  │          │ QG1│          │ QG2│          │         │
  │  │ /season  │    │ /season  │    │ /season  │         │
  │  │  plan    │    │  design  │    │  launch  │         │
  │  └──────────┘    └──────────┘    └──────────┘         │
  │       ▲                               │                │
  │       │                               ▼                │
  │  ┌──────────┐                   ┌──────────┐          │
  │  │   ACT    │◀──────────────────│  CHECK   │          │
  │  │          │     Gap < 90%     │          │          │
  │  │ /season  │                   │ /season  │          │
  │  │ improve  │                   │  review  │          │
  │  └──────────┘                   └──────────┘          │
  │       │                                                │
  │       ▼ Gap >= 90%                                     │
  │  ┌──────────┐                                          │
  │  │ COMPLETE │ → 리포트 생성 → 다음 시즌 Plan으로       │
  │  └──────────┘                                          │
  └────────────────────────────────────────────────────────┘
```

### 4.2 Phase 상세: PLAN (시즌 기획)

**트리거**: `/season plan [season_keyword]` (예: `/season plan 26SS`)

**워크플로우**:
```
1. [Market Researcher] 트렌드 분석
   ├── 글로벌 패션 위크 트렌드
   ├── SNS/TikTok 마이크로 트렌드
   └── 경쟁사 동향 분석

2. [Brand Strategist] 브랜드 전략 수립
   ├── 시즌 테마 & 무드 정의
   ├── 포지셔닝 확인/조정
   └── 타겟 페르소나 업데이트

3. [Chief Merchandiser] 시즌 컨셉 & MD 전략
   ├── 카테고리 믹스 설계
   ├── 가격대별 SKU 배분
   └── 챔피언 상품 전략 (Carry-over)

4. [Collection Planner] 라인 시트 작성
   ├── SKU별 상세 기획
   ├── OTB (Open-to-Buy) 계획
   └── 사이즈/컬러 브레이크다운

→ [사용자 승인] → QG1 자동 실행 → Design Phase
```

**산출물**:
- `[season]-trend-brief.md` — 트렌드 분석 리포트
- `[season]-brand-strategy.md` — 브랜드 전략 브리프
- `[season]-season-concept.md` — 시즌 컨셉 노트
- `[season]-line-sheet.md` — 프리미너리 라인 시트

### 4.3 Phase 상세: DESIGN (크리에이티브 개발)

**트리거**: `/season design [item_or_category]`

**워크플로우**:
```
1. [Creative Director] 아트 디렉션
   ├── 무드보드 제작
   ├── 키 비주얼 컨셉 설정
   └── 캠페인 테마 개발

2. [Fashion Designer] 디자인 개발
   ├── 플랫 스케치 (도식화)
   ├── 그래픽/프린트 개발
   └── 소재/컬러 선정

3. [Art Director] 비주얼 제작
   ├── AI 이미지 생성 (룩북/플랫/디테일)
   ├── 비디오 콘텐츠 기획
   └── 비주얼 품질 검수

4. [Production Manager] 원가 검증
   ├── BOM 산출
   ├── 타겟 원가 대비 검증
   └── Over Budget 시 VE 제안

→ [사용자 승인] → QG2 자동 실행 → Do Phase
```

**산출물**:
- `[item]-moodboard.md` — 무드보드
- `[item]-design-spec.md` — 디자인 스펙
- `[item]-visual/` — 생성 이미지 폴더
- `[item]-costing.md` — 원가 계산서

### 4.4 Phase 상세: DO (상품화 & 런칭)

**트리거**: `/season launch [product_name]`

**워크플로우**:
```
1. [Production Manager] 테크팩 & 생산 관리
   ├── 테크팩 생성 (BOM, 사이즈 스펙, 공정)
   ├── 샘플링 QC 체크리스트
   └── 벌크 생산 관리

2. [Marketing Director] 캠페인 전략
   ├── IMC 전략 수립 (Teasing → Main → Sustain)
   ├── 채널 믹스 & 물량 배분
   └── 글로벌 GTM 계획

3. [Fashion Editor] 콘텐츠 제작
   ├── PDP 카피라이팅
   ├── SNS 콘텐츠 (캡션, 해시태그)
   └── 에디토리얼 스토리텔링

4. [Social Strategy Director] 바이럴 전략
   ├── 인플루언서 매핑
   ├── 채널별 콘텐츠 캘린더
   └── 런칭 시퀀스 설계

→ [사용자 승인 후 런칭] → QG3 자동 실행 → Check Phase
```

**산출물**:
- `[product]-techpack.md` — 테크팩
- `[product]-campaign-brief.md` — 캠페인 브리프
- `[product]-copy-deck.md` — 카피 데크
- `[product]-launch-plan.md` — 런칭 계획서

### 4.5 Phase 상세: CHECK (성과 분석)

**트리거**: `/season review [period]` (예: `/season review 2026-01`)

**워크플로우**:
```
1. [Trend Analyst] 데이터 수집 & 분석
   ├── 매출 데이터 파싱 (채널별/카테고리별)
   ├── KPI 대시보드 업데이트
   └── RFM/코호트 분석

2. [Market Researcher] 시장 맥락 분석
   ├── 경쟁사 대비 성과 비교
   ├── 트렌드 적중률 평가
   └── 소비자 반응 분석

3. [Gap Detector] 갭 분석 (자동)
   ├── 기획 vs 실적 갭 측정
   ├── 카테고리별 Match Rate 산출
   └── 개선 필요 영역 식별

4. [Report Generator] 리포트 생성 (자동)
   ├── PDCA 사이클 완료 보고서
   ├── KPI 달성률 요약
   └── 다음 사이클 추천 액션

→ Match Rate >= 90%: COMPLETE → 다음 시즌
→ Match Rate < 90%: → Act Phase (자동)
```

**산출물**:
- `[period]-sales-analysis.md` — 매출 분석 리포트
- `[period]-gap-report.md` — 갭 분석 리포트
- `[period]-pdca-report.md` — PDCA 사이클 보고서

### 4.6 Phase 상세: ACT (개선 반복)

**트리거**: 자동 (Check에서 Gap < 90% 시) 또는 `/season improve`

**워크플로우**:
```
1. [PDCA Iterator] 개선 계획 수립 (자동)
   ├── 갭 원인 분석
   ├── 개선 액션 아이템 도출
   └── 우선순위 결정

2. [관련 에이전트] 개선 실행
   ├── 카테고리 조정 → Chief Merchandiser
   ├── 디자인 수정 → Creative Director
   ├── 마케팅 조정 → Marketing Director
   └── 가격 조정 → Collection Planner

3. [Gap Detector] 재검증 (자동)
   ├── 개선 후 Match Rate 재측정
   └── 반복 (최대 5회) 또는 완료

→ [사용자에게 개선 결과 보고] → 다음 사이클 Plan으로
```

**산출물**:
- `[period]-improvement-plan.md` — 개선 계획서
- `[period]-action-items.md` — 액션 아이템 목록

---

## 5. Quality Gate System

### 5.1 게이트 정의

| Gate | 위치 | 검증 내용 | 통과 기준 |
|------|------|-----------|-----------|
| **QG1** | Plan → Design | 시즌 컨셉 완전성, SKU 계획 유효성, 예산 정합성 | 필수 항목 100% 작성, 숫자 정합성 통과 |
| **QG2** | Design → Do | 디자인-기획 정합성, 원가 타겟 충족, 비주얼 완성도 | 원가 타겟 이내, 디자인 스펙 완전 |
| **QG3** | Do → Check | 테크팩 완전성, 마케팅 자료 완비, 런칭 계획 수립 | 모든 산출물 생성 완료 |
| **QG4** | Check → Next | KPI 달성률, 갭 분석 결과 | Match Rate >= 90% → Complete |

### 5.2 게이트 실행 프로세스

```
[단계 완료 선언]
       │
       ▼
[Design Validator] 문서 완전성 체크
       │
       ├── PASS → [Gap Detector] 정합성 체크
       │              │
       │              ├── Match >= 90% → QG PASS → 다음 단계 추천
       │              └── Match < 90% → QG CONDITIONAL
       │                                    │
       │                                    ▼
       │                           [사용자에게 갭 리포트 제시]
       │                           [수정 후 재검증 / 강제 통과 선택]
       │
       └── FAIL → [누락 항목 리스트 제시]
                   [자동 보완 제안]
```

---

## 6. Skill Library

### 6.1 스킬 카테고리

| Category | Skills | 용도 |
|----------|--------|------|
| **Strategy** | brand-positioning, persona-framework, segmentation-framework, pipeline-framework, analysis-reports, brand-comparison, sales-analyzer | Plan, Check |
| **Creative** | image-prompt-guide, kie-image-generator, kie-video-generator, video-production | Design |
| **Product** | techpack-generator, costing, qc-checklist | Do |
| **Marketing** | message-architecture, content-pillars, hook-formulas, channel-roadmap, activation-map | Do |
| **Tools** | auth-manager, diagram-generator, docx, pdf, pptx | 전 단계 |

### 6.2 스킬 자동 매핑

각 PDCA Phase에서 사용 가능한 스킬이 자동으로 활성화된다:

```json
{
  "plan": ["brand-positioning", "persona-framework", "segmentation-framework",
           "analysis-reports", "brand-comparison", "sales-analyzer"],
  "design": ["image-prompt-guide", "kie-image-generator", "kie-video-generator",
             "video-production", "costing"],
  "do": ["techpack-generator", "qc-checklist", "message-architecture",
         "content-pillars", "hook-formulas", "channel-roadmap", "activation-map"],
  "check": ["sales-analyzer", "analysis-reports", "brand-comparison"],
  "act": ["pipeline-framework"],
  "always": ["auth-manager", "diagram-generator", "docx", "pdf", "pptx"]
}
```

---

## 7. State Management

### 7.1 상태 파일 구조

**`.fpof-state.json`** — 프레임워크 전역 상태:
```json
{
  "framework_version": "1.0.0",
  "active_brand": "wacky-willy",
  "current_season": "26SS",
  "pdca_phase": "plan",
  "phase_progress": {
    "plan": { "status": "in_progress", "completion": 60, "artifacts": [] },
    "design": { "status": "pending", "completion": 0, "artifacts": [] },
    "do": { "status": "pending", "completion": 0, "artifacts": [] },
    "check": { "status": "pending", "completion": 0, "artifacts": [] },
    "act": { "status": "pending", "completion": 0, "artifacts": [] }
  },
  "quality_gates": {
    "QG1": { "status": "pending", "last_result": null },
    "QG2": { "status": "pending", "last_result": null },
    "QG3": { "status": "pending", "last_result": null },
    "QG4": { "status": "pending", "last_result": null }
  },
  "cycle_count": 1,
  "history": []
}
```

### 7.2 반자동 흐름 제어

각 단계 완료 시 Conductor가 실행하는 로직:

```
ON phase_complete(phase):
  1. RUN quality_gate(phase)
  2. IF gate_passed:
       SUGGEST next_phase with reason
       WAIT user_approval
       IF approved: TRANSITION to next_phase
  3. IF gate_conditional:
       SHOW gap_report
       ASK user: "수정하시겠습니까? / 강제 통과하시겠습니까?"
  4. IF gate_failed:
       SHOW missing_items
       SUGGEST auto_fix
       WAIT user_action
```

---

## 8. File Structure

### 8.1 프레임워크 디렉토리 구조

```
Fashion House/
├── .claude/
│   ├── agents/                    # Layer 3: Domain Agents
│   │   ├── strategy-planning/
│   │   ├── creative-studio/
│   │   ├── product-lab/
│   │   ├── marketing-showroom/
│   │   ├── data-intelligence/
│   │   └── quality/               # [NEW] Quality Department
│   │       ├── gap-detector.md
│   │       ├── design-validator.md
│   │       ├── pdca-iterator.md
│   │       └── report-generator.md
│   ├── skills/
│   │   ├── strategy/
│   │   ├── creative/
│   │   ├── product/
│   │   ├── marketing/
│   │   └── tools/
│   ├── commands/                  # Unified Commands
│   │   ├── season/                # [NEW] Season Cycle
│   │   │   ├── plan.md
│   │   │   ├── design.md
│   │   │   ├── launch.md
│   │   │   ├── review.md
│   │   │   ├── improve.md
│   │   │   ├── status.md
│   │   │   └── next.md
│   │   ├── quality/               # [NEW] Quality Commands
│   │   │   ├── check.md
│   │   │   ├── validate.md
│   │   │   ├── improve.md
│   │   │   └── report.md
│   │   ├── brand/                 # [NEW] Brand Management
│   │   │   ├── load.md
│   │   │   ├── status.md
│   │   │   └── create.md
│   │   ├── creative-studio/       # Existing
│   │   ├── marketing-showroom/    # Existing
│   │   ├── product-lab/           # Existing
│   │   └── strategy-planning/     # Existing
│   └── auth/
├── presets/                        # [NEW] Layer 4: Brand Presets
│   ├── _template/
│   │   ├── brand.config.json
│   │   ├── channels.json
│   │   ├── categories.json
│   │   ├── personas.json
│   │   ├── tone-manner.json
│   │   └── visual-identity.json
│   └── wacky-willy/
├── docs/                          # Architecture & Guides
│   ├── Fashion_PDCA_Orchestration_Framework.md
│   └── Fashion_PDCA_Canvas.canvas
├── AGENTS.md                      # Agent Registry
├── Fashion_House_Manual.md        # Updated Manual (V4.0)
├── Fashion_House_Guides.md        # Updated Guides
└── .fpof-state.json               # Framework State
```

---

## 9. Resilience Protocol

### 9.1 모델 Failover

| Primary Model | Backup Model | 전환 조건 |
|---------------|-------------|-----------|
| Claude Opus 4.5 (Orchestrator) | Claude Sonnet (degraded) | Rate Limit, 5xx Error |
| Claude Sonnet (Tier 1) | Gemini Pro | Rate Limit, >10s latency |
| GLM-4.7 (Tier 2) | Gemini Flash | Rate Limit, 5xx Error |

### 9.2 에러 복구

```
ON agent_error(agent, error):
  1. LOG error to .fpof-state.json
  2. IF retryable: RETRY with backoff (1s, 3s, 10s)
  3. IF model_error: SWITCH to backup model
  4. IF persistent: NOTIFY user with context
  5. SAVE progress (partial artifacts preserved)
```

---

## 10. Migration Guide

### 기존 Fashion House → FPOF 마이그레이션

| 기존 | FPOF | 변경 사항 |
|------|------|-----------|
| Protocol A (Review→Plan) | `/season review` + `/season plan` | PDCA Check→Plan으로 매핑 |
| Protocol B (Plan→Design) | `/season plan` + `/season design` | QG1 게이트 추가 |
| Protocol C (Design→Sell) | `/season design` + `/season launch` | QG2 게이트 추가 |
| Protocol D (Sell→Review) | `/season launch` + `/season review` | QG3 게이트 추가 |
| Sisyphus (Orchestrator) | Conductor (Layer 1) | 역할 동일, 자동화 강화 |
| 5-Dept System | 5-Dept + Quality Dept | 품질관리부 신설 |
| 수동 산출물 관리 | 자동 산출물 추적 | `.fpof-state.json` 기반 |

---

## Appendix A. Glossary

| 용어 | 정의 |
|------|------|
| **FPOF** | Fashion PDCA Orchestration Framework |
| **Conductor** | 전체 워크플로우를 제어하는 오케스트레이터 |
| **Quality Gate (QG)** | PDCA 단계 전환 시 자동 실행되는 검증 프로세스 |
| **Brand Preset** | 브랜드별 특화 설정을 담은 구성 파일 모음 |
| **Match Rate** | 기획 대비 실행 정합도 (%) |
| **Tier 1/2** | 에이전트 모델 등급 (전략/실행) |
| **Champion Product** | 재구매율 30% 이상의 카테고리 대표 상품 |
| **VE (Value Engineering)** | 원가 초과 시 품질 유지하며 비용 절감하는 기법 |

---

> **Next**: 이 아키텍처 문서 승인 후 → Obsidian Canvas 시각화 → 와키윌리 프리셋 작성 → .claude/ 설정 파일 구현
