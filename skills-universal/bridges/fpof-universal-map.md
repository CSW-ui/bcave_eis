# FPOF Universal Map — 에이전시 ↔ 유니버설 스킬 연계 맵

FPOF 패션 하우스의 6개 에이전시와 유니버설 스킬의 연계를 정의합니다.
에이전시 전용 스킬로 산출물을 만든 후, 유니버설 스킬로 포맷 변환·시각화·배포를 이어받습니다.

---

## 에이전시별 연계 맵

### 전략기획실

| FPOF 스킬 | 산출물 | 연계 유니버설 스킬 | 활용 목적 |
|----------|--------|-----------------|----------|
| `trend-research` | 트렌드 리포트 MD | `executive-summary` | 임원 보고용 요약 |
| `brand-strategy` | 브랜드 전략 MD | `pptx` | 전략 발표 덱 |
| `md-planning` | MD 기획 MD | `xlsx` | SKU/OTB 시트 연동 |
| `line-sheet` | 라인시트 MD | `xlsx` | 엑셀 라인시트 변환 |
| `brand-strategy` | 전략 문서 | `json-canvas` | 전략 마인드맵 시각화 |

**주요 흐름:**
```
brand-strategy → pptx (바이어 미팅 덱)
md-planning → xlsx (시즌 OTB 시트)
trend-research → executive-summary (임원 보고)
```

---

### 크리에이티브 스튜디오

| FPOF 스킬 | 산출물 | 연계 유니버설 스킬 | 활용 목적 |
|----------|--------|-----------------|----------|
| `moodboard` | 무드보드 MD | `canvas-design` | 비주얼 무드보드 PNG |
| `moodboard` | 무드보드 MD | `theme-factory` | 슬라이드 테마 적용 |
| `design-spec` | 디자인 사양서 | `docx` | Word 디자인 스펙 문서 |
| `visual-generation` | 비주얼 가이드 | `algorithmic-art` | 패턴/텍스처 생성 |
| (모든 산출물) | 비주얼 결과물 | `brand-styler` | WW 브랜드 적용 |

**주요 흐름:**
```
moodboard → canvas-design (비주얼 무드보드 이미지)
moodboard → theme-factory (시즌 슬라이드 테마)
design-spec → docx (디자이너용 사양서)
```

---

### 프로덕트 랩

| FPOF 스킬 | 산출물 | 연계 유니버설 스킬 | 활용 목적 |
|----------|--------|-----------------|----------|
| `techpack` | 테크팩 MD | `docx` | 공장용 Word 테크팩 |
| `techpack` | 테크팩 MD | `pdf` | PDF 배포용 테크팩 |
| `costing-ve` | 원가 분석 MD | `xlsx` | 원가/BOM 엑셀 시트 |
| `qr-process` | QR 프로세스 | `docx` | 내부 프로세스 문서 |

**주요 흐름:**
```
techpack → docx → pdf (공장 제출용 테크팩)
costing-ve → xlsx (원가 계산 시트)
```

---

### 마케팅 쇼룸

| FPOF 스킬 | 산출물 | 연계 유니버설 스킬 | 활용 목적 |
|----------|--------|-----------------|----------|
| `imc-strategy` | IMC 전략 MD | `pptx` | 마케팅 전략 발표 덱 |
| `imc-strategy` | IMC 전략 MD | `executive-summary` | 임원 보고 요약 |
| `visual-content` | 비주얼 기획 | `canvas-design` | 캠페인 비주얼 생성 |
| `visual-content` | 비주얼 기획 | `frontend-design` | 캠페인 랜딩페이지 |
| `copywriting` | 카피 MD | `doc-coauthoring` | 카피 공동 편집 |
| `copywriting` | 카피 MD | `internal-comms` | 내부 공유 뉴스레터 |
| `social-viral` | 소셜 전략 MD | `slack-gif-creator` | Slack 알림 GIF |
| (캠페인 산출물) | 모든 비주얼 | `brand-styler` | WW 브랜드 일관성 |

**주요 흐름:**
```
imc-strategy → pptx (캠페인 브리핑 덱)
visual-content → canvas-design (캠페인 키비주얼)
copywriting → doc-coauthoring (카피 공동 작성)
```

---

### 데이터 인텔리전스

| FPOF 스킬 | 산출물 | 연계 유니버설 스킬 | 활용 목적 |
|----------|--------|-----------------|----------|
| `sales-analysis` | 매출 분석 MD | `xlsx` | 분석 대시보드 시트 |
| `sales-analysis` | 매출 분석 MD | `executive-summary` | KPI 임원 보고 |
| `insight-archiving` | 인사이트 MD | `pptx` | 인사이트 공유 덱 |
| `insight-archiving` | 인사이트 MD | `json-canvas` | 인사이트 마인드맵 |

**주요 흐름:**
```
sales-analysis → xlsx (채널별 KPI 시트)
sales-analysis → executive-summary (주간/월간 보고)
insight-archiving → json-canvas (플레이북 마인드맵)
```

---

### QC 본부

| FPOF 스킬 | 산출물 | 연계 유니버설 스킬 | 활용 목적 |
|----------|--------|-----------------|----------|
| `gap-analysis` | 갭 분석 MD | `executive-summary` | 갭 요약 보고 |
| `gap-analysis` | 갭 분석 MD | `docx` | 갭 보고서 문서 |
| `completion-report` | 완료 리포트 MD | `pptx` | 시즌 마무리 발표 |
| `completion-report` | 완료 리포트 MD | `pdf` | PDF 시즌 보고서 |
| `pdca-iteration` | PDCA 루프 결과 | `internal-comms` | 팀 내부 공지 |
| `quality-gate` | QG 체크리스트 | `xlsx` | QG 체크 시트 |

**주요 흐름:**
```
completion-report → pptx → pdf (시즌 리뷰 덱 + 보고서)
gap-analysis → docx (품질 갭 보고서)
quality-gate → xlsx (검수 체크리스트 시트)
```

---

## 전체 수출 파이프라인

모든 에이전시의 MD 산출물 → 문서 변환 → 외부 배포

```
FPOF 스킬 산출물 (MD)
        ↓
[포맷 결정]
  발표/미팅 → pptx
  문서/사양 → docx
  데이터/표 → xlsx
  리포트/배포 → pdf
        ↓
[브랜드 적용]
  비주얼 포함 → brand-styler
        ↓
output/[시즌]/[프로젝트]/exports/[파일명].[확장자]
```

> 자동화: `converter/convert.py` 또는 `/deck`, `/pdf`, `/sheet`, `/doc` 명령어

---

## 특수 연계

### AI 개발 연동

| 시나리오 | 유니버설 스킬 |
|---------|-------------|
| FPOF 에이전시에 LLM API 연결 | `llm-api-guide` |
| 새 에이전시 스킬 개발 | `skill-creator` |
| FPOF용 MCP 서버 구축 | `mcp-builder` |

### 브랜드 비주얼 일관성

| 시나리오 | 유니버설 스킬 |
|---------|-------------|
| 모든 PPTX에 WW 색상 적용 | `brand-styler` → `pptx` |
| 웹 캠페인 페이지 WW 스타일 | `brand-styler` → `frontend-design` |
| 비주얼 콘텐츠 WW 브랜드화 | `brand-styler` → `canvas-design` |

---

## 빠른 참조: 요청 유형 → 스킬 경로

| 요청 | FPOF 스킬 | 유니버설 스킬 |
|------|---------|-------------|
| "26SS 브랜드 전략 발표 덱 만들어" | `brand-strategy` | `pptx` + `brand-styler` |
| "테크팩 PDF로 공장에 보내야 해" | `techpack` | `docx` → `pdf` |
| "이번 시즌 매출 임원 보고용으로" | `sales-analysis` | `executive-summary` |
| "무드보드 이미지로 뽑아줘" | `moodboard` | `canvas-design` + `brand-styler` |
| "OTB 엑셀 시트 만들어" | `md-planning` | `xlsx` |
| "시즌 리뷰 최종 발표 자료" | `completion-report` | `pptx` |
| "캠페인 랜딩페이지 만들어" | `imc-strategy` + `visual-content` | `frontend-design` + `brand-styler` |
