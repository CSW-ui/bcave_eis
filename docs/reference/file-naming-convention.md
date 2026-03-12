# FPOF 파일 네이밍 컨벤션

> 와키윌리 패션 하우스 시스템의 모든 산출물에 적용되는 파일명·폴더명 표준 규칙

---

## 1. 현재 상태 진단 — 발견된 불일치 7가지

### 1-1. 날짜 형식 4가지 혼용
| 형식 | 사용 예 | 문제 |
|------|---------|------|
| `YYYY-MM-DD` | `plan_market-intel-weekly-2026-03-10.md` | ISO 표준이나 소수만 사용 |
| `YYYYMMDD` | `design_meeting-경영진통합회의-20260309.md` | 가독성 낮음 |
| `YYYY.MM.DD` | `2026.03.04 와키윌리 주간리뷰 대시보드.html` | 비표준 |
| 날짜 없음 | `plan_strategy-summary.md` | 시점 추적 불가 |

### 1-2. 구분자(separator) 3가지 혼용
| 구분자 | 사용 예 |
|--------|---------|
| 하이픈 `-` (kebab) | `market-intel-weekly`, `consumer-insight-brief` |
| 언더스코어 `_` (snake) | `imc_weekly_sync`, `product_status_data` |
| 공백 ` ` | `2026.03.04 와키윌리 사업부 주간리뷰 요약보고.md` |

### 1-3. 한글/영문 파일명 혼용
- 영문: `plan_strategy-summary.md`
- 한글: `와키윌리 소싱 팀장 지원자 면접 요약 보고서.md`
- 혼합: `design_meeting-경영진통합회의-20260309.md`

### 1-4. PDCA 접두사 누락
- 있음: `plan_market-intel-weekly-2026-03-10.md`
- 없음: `strategy-summary-presentation.pptx` (같은 폴더 내)

### 1-5. 주차 표기 불일치
- 폴더: `w9`, `w10` (소문자, 패딩 없음)
- 파일: `W6`, `W7`, `W9` (대문자)

### 1-6. 버전 표기 불일치
- `_v2` 접미사: `_cum_detail_v2.json`
- `_final` 접미사: `_per_detail_final.json`
- 본문 내 `v2`: `2026.03.04 와키윌리 주간리뷰 v2.html`

### 1-7. 폴더명 공백·케이스 불일치
- 공백: `weekly review/`, `product master/`, `weekly sales/`
- 케밥: `camp-kitsch/`, `text-hip-graphic/`
- 무공백: `dashboard/`, `meeting/`

---

## 2. 네이밍 컨벤션 규칙

### 2-1. 기본 원칙

| # | 규칙 | 설명 |
|---|------|------|
| 1 | **모두 소문자** | 대문자 사용 금지. 시즌코드(`26SS`)만 예외 |
| 2 | **공백 금지** | 파일명·폴더명 모두 공백 없음 |
| 3 | **한글 금지 (파일명)** | 파일명은 영문+숫자만. 한글은 문서 내부 제목에 사용 |
| 4 | **언더스코어 `_`** = 세그먼트 구분 | 파일명의 큰 단위를 나눔 |
| 5 | **하이픈 `-`** = 단어 구분 | 한 세그먼트 내 단어 연결 |
| 6 | **날짜 = `YYYY-MM-DD`** | ISO 8601 표준. 항상 파일명 끝(확장자 앞) |
| 7 | **주차 = `wNN`** | 소문자 `w` + 2자리 제로패딩: `w06`, `w09`, `w10` |
| 8 | **버전 = `_vN`** | `_v2`, `_v3` 형태. `_final` 사용 금지 |

### 2-2. 파일명 구조

#### PDCA 산출물 — 시즌 전략 + 개별 프로젝트 (`season-strategy/`, `[project]/`)
```
[pdca]_[content-description][_YYYY-MM-DD][_vN].[ext]
```

| 세그먼트 | 필수 | 값 | 예시 |
|----------|------|-----|------|
| `pdca` | 필수 | `plan`, `design`, `do`, `check`, `act` | `plan_` |
| `content-description` | 필수 | kebab-case, 2~5단어 | `trend-brief`, `market-intel-weekly` |
| `YYYY-MM-DD` | 선택* | 날짜별 산출물일 때 | `_2026-03-10` |
| `vN` | 선택 | 동일 파일 버전 존재 시 | `_v2` |
| `ext` | 필수 | `md`, `pptx`, `xlsx`, `pdf`, `html` | `.md` |

> *반복 생성 문서(주간 인텔, 리뷰 등)는 날짜 필수. 일회성 문서는 생략 가능.
> **PDCA 접두사는 시즌 전략과 프로젝트 산출물에만 사용합니다.**

**예시:**
```
plan_trend-brief.md
plan_strategy-summary.md
plan_strategy-summary.pptx          ← 동일 내용 다른 포맷
plan_market-intel-weekly_2026-03-10.md
design_consumer-insight-brief.md
design_item-brief.md                ← 아이템 프로젝트 브리프
do_souvenir-zone-annual-plan.md
do_souvenir-zone-annual-plan.pptx
check_opening-analysis.md
```

#### 운영 산출물 — 주간/대시보드 (`weekly/wNN/`, `dashboard/`)
```
[doc-type]_[content-description][_YYYY-MM-DD][_vN].[ext]
```

| doc-type | 용도 | 예시 |
|----------|------|------|
| `review` | 주간/월간 리뷰 보고 | `review_weekly-exec-summary_2026-03-04.md` |
| `meeting` | 회의록 | `meeting_imc-weekly-sync_2026-03-05.md` |
| `deck` | 프레젠테이션 | `deck_weekly-exec-report_2026-03-04.pptx` |
| `board` | HTML 대시보드 | `board_weekly-dashboard_2026-03-04.html` |
| `sheet` | 엑셀 시트 | `sheet_product-master_w09.xlsx` |
| `report` | PDF 보고서 | `report_weekly-exec_2026-03-04.pdf` |
| `data` | JSON 데이터 | `data_sales-weekly_2026-03-04.json` |

### 2-3. 폴더명 규칙

| # | 규칙 | 예시 |
|---|------|------|
| 1 | 모두 소문자 kebab-case | `weekly/` (~~weekly review/~~) |
| 2 | 공백 금지 | `product-master/` (~~product master/~~) |
| 3 | 시즌코드만 대문자 | `26SS/`, `26FW/` |
| 4 | 주차 폴더 = `wNN` (제로패딩) | `w09/`, `w10/` |
| 5 | 모든 산출물은 시즌 아래 프로젝트 폴더에 | `output/26SS/[project]/` |

### 2-4. content-description 작성 가이드

**구성:** `[주제]-[세부]` (kebab-case, 2~5단어)

**스킬별 표준 description:**

| 스킬 | description | 파일명 예시 |
|------|------------|------------|
| `trend-research` | `trend-brief` | `plan_trend-brief.md` |
| `brand-strategy` | `brand-strategy` | `plan_brand-strategy.md` |
| `md-planning` | `md-plan` | `plan_md-plan.md` |
| `line-sheet` | `line-sheet` | `plan_line-sheet.xlsx` |
| `market-intel` | `market-intel-weekly` | `plan_market-intel-weekly_2026-03-10.md` |
| `moodboard` | `moodboard` | `design_moodboard.md` |
| `design-spec` | `design-spec` | `design_design-spec.md` |
| `costing-ve` | `costing-analysis` | `design_costing-analysis.md` |
| `techpack` | `techpack` | `do_techpack.md` |
| `imc-strategy` | `imc-strategy` | `do_imc-strategy.md` |
| `copywriting` | `pdp-copy`, `sns-copy` | `do_pdp-copy.md` |
| `sales-analysis` | `sales-analysis` | `check_sales-analysis.md` |
| `quality-gate` | `quality-gate` | `check_quality-gate.md` |
| `completion-report` | `completion-report` | `check_completion-report.md` |

**주간 운영 파일 description:**

| 문서 유형 | description | 파일명 예시 |
|----------|------------|------------|
| 전부서 원본 | `full-raw` | `review_full-raw_2026-03-05.md` |
| 임원 요약 | `exec-summary` | `review_exec-summary_2026-03-04.md` |
| 사업부 요약 | `dept-summary` | `review_dept-summary_2026-03-04.md` |
| 임원 발표 | `exec-report` | `deck_exec-report_2026-03-04.pptx` |
| 대시보드 | `dashboard` | `board_dashboard_2026-03-04.html` |
| 회의록 | `[회의주제]` | `meeting_imc-sync_2026-03-05.md` |

---

## 3. 폴더 구조 — 프로젝트 중심 설계

### 3-1. 설계 철학

> **"한 프로젝트의 모든 산출물은 한 폴더에"**

현재 구조의 문제:
- `_season/`에 전략·회의록·분석이 뒤섞임
- `weekly review/`, `meeting/`, `dashboard/`가 시즌 밖에 흩어져 맥락 단절
- 같은 프로젝트(수버니어 존)의 기획서와 분석 보고서가 다른 폴더에 존재

해결: **모든 산출물을 시즌 아래 프로젝트 폴더로 통합**

### 3-2. 프로젝트 유형 (패션 하우스 분류)

| 유형 | 폴더명 패턴 | 설명 | 예시 |
|------|-----------|------|------|
| **시즌 전략** | `season-strategy/` | 시즌 전체 방향·트렌드·MD 기획 | 브랜드 전략, 트렌드 브리프, 라인시트 |
| **아이템** | `[item-name]/` | 개별 상품 개발 | `camp-kitsch/`, `oversized-hoodie/` |
| **캠페인** | `campaign-[name]/` | IMC·마케팅 캠페인 | `campaign-ss-launch/`, `campaign-kiki-collab/` |
| **리테일** | `retail-[name]/` | 매장·팝업·오프라인 이벤트 | `retail-seongsu-flagship/`, `retail-popup-daegu/` |
| **콜라보** | `collab-[partner]/` | 브랜드·IP 협업 | `collab-sanrio/`, `collab-disney/` |
| **주간 운영** | `weekly/` | 주간리뷰·회의·대시보드 | 매주 반복되는 운영 산출물 |

### 3-3. 전체 구조

```
output/
└── 26SS/                                    # 시즌
    │
    ├── season-strategy/                     # 🎯 시즌 전략
    │   ├── plan_trend-brief.md
    │   ├── plan_brand-strategy.md
    │   ├── plan_strategy-summary.md
    │   ├── plan_strategy-summary.pptx
    │   ├── plan_line-sheet.xlsx
    │   ├── plan_market-intel-weekly_2026-03-10.md
    │   ├── design_consumer-insight-brief.md
    │   └── check_completion-report.md
    │
    ├── camp-kitsch/                         # 👕 아이템
    │   ├── plan_category-brief.md
    │   ├── design_moodboard.md
    │   ├── design_design-spec.md
    │   ├── do_techpack.md
    │   └── do_pdp-copy.md
    │
    ├── text-hip-graphic/                    # 👕 아이템
    │   └── design_brief.md
    │
    ├── retail-seongsu-flagship/              # 🏬 리테일
    │   ├── do_souvenir-zone-annual-plan.md
    │   ├── do_souvenir-zone-annual-plan.pptx
    │   └── check_opening-analysis.md
    │
    ├── campaign-ss-launch/                  # 📣 캠페인 (예시)
    │   ├── do_imc-strategy.md
    │   ├── do_visual-content.md
    │   ├── do_sns-copy.md
    │   └── check_campaign-performance.md
    │
    ├── weekly/                              # 📅 주간 운영
    │   ├── data/                            # 📂 원본 데이터 (매주 업로드)
    │   │   ├── sheet_product-master_w06.xlsx
    │   │   ├── sheet_product-master_w07.xlsx
    │   │   ├── ...
    │   │   ├── sheet_sales-review_w06.xlsx
    │   │   └── sheet_sales-review_w07.xlsx
    │   ├── w09/                             # 산출물만
    │   │   ├── review_dept-summary_2026-03-04.md
    │   │   ├── review_exec-summary_2026-03-04.md
    │   │   ├── review_full-raw_2026-03-05.md
    │   │   ├── deck_exec-report_2026-03-04.pptx
    │   │   ├── report_exec_2026-03-04.pdf
    │   │   ├── board_dashboard_2026-03-04.html
    │   │   └── meeting_imc-sync_2026-03-05.md
    │   └── w10/
    │       ├── review_exec-summary_2026-03-11.md
    │       └── board_dashboard_w10.html
    │
    ├── dashboard/                           # 📊 대시보드 (매주 갱신, PDCA 무관)
    │   ├── data_sales.json                 # _meta.week로 기준 주차 확인
    │   ├── data_product-status.json
    │   ├── data_per-detail.json
    │   ├── data_per-styles.json
    │   ├── data_cum-detail.json
    │   ├── board_sales.html
    │   └── board_product-status.html
    │
    └── _archive/                            # 🗄️ 대체된 구버전
        └── (이전 버전 파일)
```

### 3-4. 프로젝트별 PDCA 산출물 가이드

각 프로젝트 유형은 PDCA 흐름에 따라 **기대되는 산출물 세트**가 있습니다.

#### 시즌 전략 (`season-strategy/`)
```
plan_   trend-brief.md            ← 트렌드 리서치
        brand-strategy.md         ← 브랜드 방향
        strategy-summary.md       ← 전략 종합
        strategy-summary.pptx     ← 전략 발표자료
        md-plan.md                ← MD 기획
        line-sheet.xlsx           ← 라인시트
        market-intel-weekly_*.md  ← 주간 인텔 (반복)

design_ consumer-insight-brief.md ← 소비자 인사이트

check_  quality-gate.md           ← QG 검수
        completion-report.md      ← 시즌 완료 보고
```

#### 아이템 (`[item-name]/`)
```
plan_   category-brief.md        ← 카테고리 브리프

design_ moodboard.md             ← 무드보드
        design-spec.md           ← 디자인 스펙
        costing-analysis.md      ← 원가 분석

do_     techpack.md              ← 테크팩
        pdp-copy.md              ← 상품 상세 카피
        qr-reorder.md            ← 리오더

check_  sales-analysis.md        ← 판매 분석
        item-review.md           ← 아이템 리뷰
```

#### 캠페인 (`campaign-[name]/`)
```
plan_   campaign-brief.md        ← 캠페인 기획

do_     imc-strategy.md          ← IMC 전략
        visual-content.md        ← 비주얼 콘텐츠
        sns-copy.md              ← 소셜 카피
        influencer-plan.md       ← 인플루언서

check_  campaign-performance.md  ← 성과 분석
```

#### 리테일 (`retail-[name]/`)
```
plan_   store-plan.md            ← 매장 기획

do_     annual-plan.md           ← 연간 계획
        annual-plan.pptx         ← 발표 자료
        vmd-guide.md             ← VMD 가이드

check_  opening-analysis.md      ← 오프닝 분석
        foot-traffic.md          ← 방문객 분석
```

#### 주간 데이터 (`weekly/data/`)
```
sheet_  product-master_wNN.xlsx  ← 프로덕트 마스터 (매주 업로드)
        sales-review_wNN.xlsx    ← 매출 리뷰 (매주 업로드)
```
> `weekly/data/`의 원본 데이터가 업데이트되면 `dashboard/`의 시각화·JSON이 자동 갱신됩니다.
> 갱신 명령: `./scripts/dashboard/update-dashboard.sh`

#### 대시보드 (`dashboard/`)
```
data_   sales.json               ← 매출 데이터 (JSON 내 _meta.week으로 기준 주차 표시)
        product-status.json      ← 상품 현황
        per-detail.json          ← 주간 스타일 상세
        per-styles.json          ← 주간 스타일 Top
        cum-detail.json          ← 누적 스타일 상세

board_  sales.html               ← 매출 대시보드
        product-status.html      ← 상품 현황 보드
```
> 대시보드는 PDCA 단계와 무관하게 **매주** 갱신됩니다. JSON 파일 내 `_meta` 필드로 기준 주차를 확인합니다.

#### 주간 산출물 (`weekly/wNN/`)
```
review_ exec-summary_*.md        ← 임원 요약
        dept-summary_*.md        ← 사업부 요약
        full-raw_*.md            ← 전부서 원본

deck_   exec-report_*.pptx       ← 임원 발표

report_ exec_*.pdf               ← PDF 보고서

board_  dashboard_*.html         ← 대시보드

meeting_[topic]_*.md             ← 회의록
```

### 3-5. 폴더 운영 규칙

| # | 규칙 | 설명 |
|---|------|------|
| 1 | **프로젝트 = 폴더** | 새 프로젝트가 시작되면 해당 시즌 아래 폴더 생성 |
| 2 | **한 프로젝트 안에 모든 포맷** | md·pptx·xlsx·pdf·html 같은 폴더에 공존 |
| 3 | **PDCA는 전략/프로젝트에만** | `plan_`~`act_` 접두사는 `season-strategy/`와 프로젝트 폴더에만 사용. `weekly/`와 `dashboard/`에는 doc-type 접두사 사용 |
| 4 | **주간 회의록은 `weekly/wNN/`에** | 프로젝트 회의가 아닌 정기 회의록은 해당 주차 폴더에 저장 |
| 5 | **원본 데이터는 `weekly/data/`에** | 매주 업로드하는 엑셀 원본은 data/ 폴더에 누적 관리 |
| 6 | **`data/` → `dashboard/` 흐름** | data/의 원본 데이터가 갱신되면 dashboard/의 시각화·JSON이 업데이트 |
| 7 | **`wNN/`에는 산출물만** | 데이터 파일 없이 리뷰·회의록·대시보드·발표자료만 저장 |
| 8 | **`_archive/`에 구버전 보관** | 대체된 파일은 삭제하지 않고 아카이브 |
| 9 | **시즌 전환 시 새 폴더** | `26FW/` 생성, 구조 동일하게 반복 |

---

## 4. 마이그레이션 맵 (Before → After)

### 4-1. 폴더 구조 변경

| Before (현재) | After (표준) | 이유 |
|--------------|-------------|------|
| `output/26SS/_season/` | `output/26SS/season-strategy/` | 역할 명확화 |
| `output/weekly review/w9/` | `output/26SS/weekly/w09/` | 시즌 아래 통합 + 제로패딩 |
| `output/meeting/` | `output/26SS/weekly/wNN/` | 해당 주차에 회의록 편입 |
| `output/dashboard/` | `output/26SS/dashboard/` | 시즌 아래 통합 |
| `output/dashboard/product master/` | (삭제 — `weekly/wNN/`에 시트 편입) | 주차별 관리 |
| `output/dashboard/weekly sales/` | (삭제 — `weekly/wNN/`에 시트 편입) | 주차별 관리 |
| `output/windows-installation-manual/` | (프로젝트 외 — 그대로 유지) | 시즌 무관 |

### 4-2. 시즌 전략 파일 이동 (`_season/` → `season-strategy/`)

| Before | After |
|--------|-------|
| `_season/plan_strategy-summary.md` | `season-strategy/plan_strategy-summary.md` |
| `_season/strategy-summary-presentation.pptx` | `season-strategy/plan_strategy-summary.pptx` |
| `_season/plan_market-intel-weekly-2026-03-10.md` | `season-strategy/plan_market-intel-weekly_2026-03-10.md` |
| `_season/design_consumer-insight-brief.md` | `season-strategy/design_consumer-insight-brief.md` |

### 4-3. 프로젝트 분리 (`_season/` → 개별 프로젝트)

| Before (모두 `_season/`에 혼재) | After (프로젝트별 분리) |
|-------------------------------|----------------------|
| `_season/do_seongsu-souvenir-zone-annual-plan.md` | `retail-seongsu-flagship/do_souvenir-zone-annual-plan.md` |
| `_season/do_seongsu-souvenir-zone-annual-plan.pptx` | `retail-seongsu-flagship/do_souvenir-zone-annual-plan.pptx` |
| `_season/check_seongsu-flagship-opening-analysis.md` | `retail-seongsu-flagship/check_opening-analysis.md` |
| `_season/design_meeting-경영진통합회의-20260309.md` | `weekly/w10/meeting_exec-review_2026-03-09.md` |

### 4-4. 주간 리뷰 이동 (`weekly review/` → `26SS/weekly/`)

| Before | After |
|--------|-------|
| `weekly review/w9/2026.03.04 와키윌리 사업부 주간리뷰 요약보고.md` | `26SS/weekly/w09/review_dept-summary_2026-03-04.md` |
| `weekly review/w9/2026.03.04 와키윌리 주간리뷰 임원보고.pptx` | `26SS/weekly/w09/deck_exec-report_2026-03-04.pptx` |
| `weekly review/w9/2026.03.04 와키윌리 주간리뷰 임원보고.pdf` | `26SS/weekly/w09/report_exec_2026-03-04.pdf` |
| `weekly review/w9/2026.03.04 와키윌리 주간리뷰 대시보드.html` | `26SS/weekly/w09/board_dashboard_2026-03-04.html` |
| `weekly review/w9/2026.03.05_weekly-sales-report.pptx` | `26SS/weekly/w09/deck_sales-report_2026-03-05.pptx` |

### 4-5. 회의록 이동 (`meeting/` → `26SS/weekly/wNN/`)

| Before | After |
|--------|-------|
| `meeting/imc_weekly_sync_2026-03-05.md` | `26SS/weekly/w09/meeting_imc-sync_2026-03-05.md` |
| `meeting/imc_weekly_sync_2026-03-05_ceo_deck.md` | `26SS/weekly/w09/meeting_imc-sync-ceo-deck_2026-03-05.md` |
| `meeting/와키윌리 소싱 팀장 지원자 면접 요약 보고서.md` | `26SS/weekly/w09/meeting_sourcing-interview-summary.md` |

### 4-6. 대시보드 이동 (`dashboard/` → `26SS/dashboard/` + `26SS/weekly/`)

| Before | After |
|--------|-------|
| `dashboard/sales_data.json` | `26SS/dashboard/data_sales.json` |
| `dashboard/product_status_data.json` | `26SS/dashboard/data_product-status.json` |
| `dashboard/wacky-willy-dashboard.html` | `26SS/dashboard/board_sales.html` |
| `dashboard/product-status-board.html` | `26SS/dashboard/board_product-status.html` |
| `dashboard/product master/Weekly_Product_Master_W9.xlsx` | `26SS/weekly/w09/sheet_product-master_w09.xlsx` |
| `dashboard/weekly sales/Weekly_Sales_Review_W9.xlsx` | `26SS/weekly/w09/sheet_sales-review_w09.xlsx` |

---

## 5. 검색 활용 가이드

### 5-1. Glob 패턴 (파일 찾기)

```bash
# 특정 PDCA 단계의 모든 산출물 (시즌 전체)
output/26SS/**/plan_*.md
output/26SS/**/design_*.md
output/26SS/**/do_*.md
output/26SS/**/check_*.md

# 특정 프로젝트의 모든 파일
output/26SS/camp-kitsch/*
output/26SS/retail-seongsu-flagship/*

# 특정 주차 전체 파일
output/26SS/weekly/w09/*

# 모든 주간 임원 요약
output/26SS/weekly/*/review_exec-summary_*.md

# 모든 회의록
output/26SS/weekly/*/meeting_*.md

# 포맷별 검색
output/26SS/**/*.pptx              # 모든 프레젠테이션
output/26SS/**/board_*.html        # 모든 대시보드
output/26SS/dashboard/data_*.json  # 모든 데이터

# 프로젝트 유형별 검색
output/26SS/campaign-*/*           # 모든 캠페인 프로젝트
output/26SS/retail-*/*             # 모든 리테일 프로젝트
output/26SS/collab-*/*             # 모든 콜라보 프로젝트
```

### 5-2. 파일명+경로로 즉시 파악 가능한 정보

```
output / 26SS / season-strategy / plan_market-intel-weekly_2026-03-10.md
  │       │         │               │     │                  │         │
  │       │         │               │     │                  │         └─ 포맷
  │       │         │               │     │                  └─ 날짜
  │       │         │               │     └─ 내용
  │       │         │               └─ PDCA 단계
  │       │         └─ 프로젝트
  │       └─ 시즌
  └─ 산출물 루트

output / 26SS / weekly / w09 / deck_exec-report_2026-03-04.pptx
  │       │       │      │      │    │            │         │
  │       │       │      │      │    │            │         └─ 포맷
  │       │       │      │      │    │            └─ 날짜
  │       │       │      │      │    └─ 내용
  │       │       │      │      └─ 문서 유형
  │       │       │      └─ 주차
  │       │       └─ 주간 운영
  │       └─ 시즌
  └─ 산출물 루트
```

### 5-3. Markdown Frontmatter 메타데이터 (선택)

검색 고도화를 위해 Markdown 파일에 YAML frontmatter를 추가할 수 있습니다:

```yaml
---
title: "26SS 마켓 인텔리전스 위클리"
season: 26SS
project: season-strategy
pdca: plan
skill: market-intel
agency: data-intelligence
date: 2026-03-10
tags: [market-intel, weekly, competitor, trend]
---
```

---

## 6. FPOF 시스템 통합

### 6-1. `.fpof-state.json` artifacts 경로

```json
{
  "artifacts": [
    "output/26SS/season-strategy/plan_trend-brief.md",
    "output/26SS/season-strategy/plan_strategy-summary.md",
    "output/26SS/season-strategy/plan_strategy-summary.pptx",
    "output/26SS/season-strategy/plan_market-intel-weekly_2026-03-10.md",
    "output/26SS/retail-seongsu-flagship/do_souvenir-zone-annual-plan.md"
  ]
}
```

### 6-2. 슬래시 명령어 → 저장 경로

| 명령어 | 프로젝트 | 파일명 |
|--------|---------|--------|
| `/brief trend-brief` | `season-strategy/` | `plan_trend-brief.md` |
| `/deck trend` | `season-strategy/` | `plan_trend-brief.pptx` |
| `/sheet line-sheet` | `season-strategy/` | `plan_line-sheet.xlsx` |
| `/market-intel` | `season-strategy/` | `plan_market-intel-weekly_YYYY-MM-DD.md` |
| `/meeting` | `weekly/wNN/` | `meeting_[topic]_YYYY-MM-DD.md` |
| `/brief moodboard` | `[item-name]/` | `design_moodboard.md` |

### 6-3. 자동 검증 정규식

```bash
# 프로젝트 산출물: [pdca]_[desc][_date][_vN].[ext]
^(plan|design|do|check|act)_[a-z0-9][a-z0-9-]*(_[0-9]{4}-[0-9]{2}-[0-9]{2})?(_v[0-9]+)?\.[a-z]+$

# 주간 운영 산출물: [type]_[desc][_date|_wNN][_vN].[ext]
^(review|meeting|deck|board|sheet|report|data)_[a-z0-9][a-z0-9-]*(_[0-9]{4}-[0-9]{2}-[0-9]{2}|_w[0-9]{2})?(_v[0-9]+)?\.[a-z]+$
```

---

## 7. 빠른 참조 카드

```
┌──────────────────────────────────────────────────────────────┐
│  FPOF 파일 네이밍 & 폴더링 — Quick Reference                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  폴더 구조:                                                   │
│  output / [SEASON] / [PROJECT] / 파일                         │
│                                                              │
│  프로젝트 유형:                                                │
│    season-strategy     시즌 전략                               │
│    [item-name]         아이템 (camp-kitsch, oversized-hoodie) │
│    campaign-[name]     캠페인                                  │
│    retail-[name]       리테일/팝업                              │
│    collab-[partner]    콜라보                                  │
│    weekly/wNN          주간 운영                                │
│    dashboard           대시보드·데이터                           │
│                                                              │
│  파일명:                                                      │
│  프로젝트:  [pdca]_[description]_[YYYY-MM-DD]_[vN].[ext]      │
│  주간운영:  [type]_[description]_[YYYY-MM-DD]_[vN].[ext]      │
│                                                              │
│  구분자:   _ 세그먼트 / - 단어                                  │
│  날짜:     YYYY-MM-DD                                         │
│  주차:     wNN (w06, w09)                                     │
│  버전:     _v2, _v3                                           │
│  언어:     영문만                                              │
│  케이스:   소문자 (26SS 예외)                                   │
│                                                              │
│  PDCA:  plan | design | do | check | act                     │
│  Type:  review | meeting | deck | board | sheet | report     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
