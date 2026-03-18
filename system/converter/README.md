# FPOF Document Converter

FPOF(Fashion PDCA Orchestration Framework) 마크다운 문서를 **PPTX / DOCX / XLSX / PDF** 로 변환하는 독립 CLI 시스템.

> 이 시스템은 기존 FPOF 파일(CLAUDE.md, hooks.json, agents/, skills/)을 **전혀 수정하지 않습니다.**
> `presets/wacky-willy/visual-identity.json`을 읽기 전용으로 참조하여 브랜드 컬러를 자동 적용합니다.

---

## 설치

```bash
# 1. Python 패키지 설치
pip install -r converter/requirements.txt

# 2. 폰트 + PPTX 테마 다운로드 (최초 1회)
bash converter/setup.sh
```

---

## AI가 이 시스템을 사용하는 방법

### 1단계: 사용자 목적 분석

사용자의 자연어 요청에서 다음을 판단하세요:

- **format**: 아래 기준표 참고
- **template**: 아래 기준표 참고
- **lang**: 사용자 언어 또는 MD 파일 내용 언어 (생략 시 자동 감지)

### format 선택 기준

| 사용자 표현 예시 | format |
|----------------|--------|
| 발표, 미팅, 프레젠테이션, 슬라이드, 덱, deck, 무드보드, PPT | `pptx` |
| 테크팩, 사양서, 계획서, Word 문서, 기획서 | `docx` |
| 라인시트, 원가표, SKU, OTB, KPI 표, 데이터, 엑셀, 스프레드시트 | `xlsx` |
| 리포트, 보고서, PDF, 인쇄용, 아카이브 | `pdf` |

### template 선택 기준

| 사용자 표현 예시 | template |
|----------------|----------|
| 바이어 미팅, 외부 발표, 세련된, formal, 공식적, 프리젠테이션 | `executive` |
| 마케팅, 캠페인, 무드보드, 크리에이티브, 비주얼, 감성적 | `creative` |
| 분석, 리포트, 데이터, 시즌 리뷰, 인사이트, 숫자 | `report` |
| 팀 내부, 작업용, 사양서, 내부 공유, 빠른 정리 | `internal` |

### 2단계: CLI 실행

```bash
python converter/convert.py --input [파일] --format [포맷] --template [템플릿]
```

---

## CLI 레퍼런스

### 단일 파일 변환

```bash
python converter/convert.py \
  --input "output/26SS/_season/plan_trend-brief.md" \
  --format pptx \
  --template executive
```

### 선택 옵션

```bash
  --output "output/26SS/exports/"   # 출력 폴더 (기본: 입력 파일 옆 exports/)
  --title "26SS 트렌드 브리프"       # 제목 오버라이드 (기본: MD H1)
  --lang ko                          # ko | en | mixed (기본: 자동 감지)
  --preset-dir "presets/wacky-willy" # 브랜드 폴더 (기본: 자동 탐색)
  --quiet                            # 진행 메시지 숨기기
```

### 폴더 일괄 변환

```bash
python converter/convert.py \
  --input-dir "output/26SS/_season/" \
  --format pdf \
  --template report
```

### 지원 형식 확인

```bash
python converter/convert.py --list-formats
```

---

## 출력 파일 위치

```
output/26SS/_season/exports/
└── [원본파일명]_[template].[format]

예:
  plan_trend-brief_executive.pptx
  plan_brand-strategy_report.pdf
  data_sku-list_internal.xlsx
```

---

## 사용 예시 (AI 판단 로직)

### 예시 1: "트렌드 브리프 바이어 발표용으로 만들어줘"
```
→ format: pptx  (발표용)
→ template: executive  (바이어 = 외부 공식)
→ python converter/convert.py --input output/26SS/_season/plan_trend-brief.md --format pptx --template executive
```

### 예시 2: "SKU 목록 엑셀로 뽑아줘"
```
→ format: xlsx  (SKU = 데이터표)
→ template: internal  (내부 작업용)
→ python converter/convert.py --input output/26SS/_season/data_sku-list.md --format xlsx --template internal
```

### 예시 3: "시즌 리뷰 PDF 보고서로"
```
→ format: pdf  (보고서)
→ template: report  (리뷰 = 분석)
→ python converter/convert.py --input output/26SS/_season/report_season-review.md --format pdf --template report
```

### 예시 4: "캠페인 기획서 팀에 공유할 슬라이드"
```
→ format: pptx  (슬라이드)
→ template: creative  (캠페인 = 크리에이티브)
→ python converter/convert.py --input output/26SS/_season/plan_campaign.md --format pptx --template creative
```

---

## 폴더 구조

```
converter/
├── README.md                  ← 이 파일 (AI 가이드)
├── requirements.txt           ← pip install -r requirements.txt
├── setup.sh                   ← 폰트·테마 다운로드 (최초 1회)
├── convert.py                 ← 메인 CLI 진입점
│
├── core/
│   ├── content_model.py       ← 데이터 클래스 (DocumentContent, Section, Block)
│   ├── parser.py              ← MD + YAML frontmatter 파싱
│   └── brand_loader.py        ← visual-identity.json → BrandTheme
│
├── generators/
│   ├── pptx_generator.py      ← python-pptx 슬라이드 빌더
│   ├── docx_generator.py      ← python-docx 문서 빌더
│   ├── xlsx_generator.py      ← openpyxl 스프레드시트 빌더
│   └── pdf_generator.py       ← reportlab PDF 빌더
│
├── themes/                    ← PPTX 테마 (setup.sh 생성)
├── config/defaults.json       ← 기본값 + 브랜드 컬러 폴백
└── design/fonts/              ← Pretendard, Inter (setup.sh 다운로드)
```

---

## 브랜드 컬러 참조

시스템은 `presets/wacky-willy/visual-identity.json`에서 아래 컬러를 자동 로드합니다:

| 변수 | 색상 | 용도 |
|------|------|------|
| primary | `#FF6B00` Vivid Orange | 액센트, 강조 |
| secondary | `#000000` Black | 제목, 배경 |
| accent1 | `#0047FF` Electric Blue | 서브 액센트 |
| accent2 | `#FF1493` Hot Pink | 크리에이티브 강조 |
| accent3 | `#B5FF00` Acid Green | 포인트 컬러 |

파일이 없으면 `config/defaults.json`의 폴백 컬러를 사용합니다.

---

## 기술 스택 (전부 무료/오픈소스)

| 라이브러리 | 용도 | 라이선스 |
|-----------|------|---------|
| python-pptx | PPTX 생성 | MIT |
| python-docx | DOCX 생성 | MIT |
| openpyxl | XLSX 생성 | MIT |
| reportlab | PDF 생성 | BSD |
| python-frontmatter | MD YAML 파싱 | MIT |
| Markdown | MD 처리 | BSD |
| Pillow | 이미지 처리 | HPND |

---

## 문제 해결

**`ModuleNotFoundError`**: `pip install -r converter/requirements.txt` 재실행

**`themes/*.potx` 없음**: `bash converter/setup.sh` 실행 (python-pptx 설치 후)

**브랜드 컬러 미적용**: `presets/wacky-willy/visual-identity.json` 경로 확인 또는 `--preset-dir` 지정

**한글 깨짐 (PDF)**: reportlab은 기본 폰트로 영문만 지원. 한글 PDF는 Pretendard 폰트 등록 필요 (setup.sh 실행 후 자동 처리 예정)
