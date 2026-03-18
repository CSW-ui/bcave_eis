# Skills Universal — 유니버설 스킬 마스터 인덱스

FPOF 패션 하우스에서 사용 가능한 **모든 범용 스킬**의 통합 인덱스입니다.
자연어로 요청하면 `nl-triggers.md`를 참조해 적합한 스킬로 라우팅됩니다.

---

## 구조

```
skills-universal/
├── README.md               ← 이 파일 (마스터 인덱스)
├── nl-triggers.md          ← 한국어/영어 자연어 → 스킬 매핑
├── adapters/
│   ├── llm-api-guide.md    ← 모델 무관 LLM API 가이드 (claude-api 어댑터)
│   └── brand-styler.md     ← 와키윌리 브랜드 적용 가이드 (brand-guidelines 어댑터)
└── bridges/
    └── fpof-universal-map.md ← FPOF 에이전시 ↔ 유니버설 스킬 연계 맵
```

---

## 범용 유틸리티 스킬 (19개 원본 + 2개 어댑터)

> 출처: `.claude/skills/` (원본 보존, 수정 없음) + `skills-universal/adapters/` (신규)

### 문서 생성

| 스킬 | 설명 | 원본 경로 |
|------|------|----------|
| `pptx` | PowerPoint 슬라이드 덱 생성/편집 | `.claude/skills/pptx` |
| `docx` | Word 문서 생성/편집 | `.claude/skills/docx` |
| `xlsx` | Excel 스프레드시트 생성/편집 | `.claude/skills/xlsx` |
| `pdf` | PDF 처리, 추출, 변환, 병합 | `.claude/skills/pdf` |
| `doc-coauthoring` | 문서 공동 작성 워크플로우 | `.claude/skills/doc-coauthoring` |
| `executive-summary` | 임원 보고용 요약 보고서 작성 | `.claude/skills/executive-summary` |
| `internal-comms` | 내부 공지/뉴스레터/상태 리포트 | `.claude/skills/internal-comms` |

### 비주얼 & 디자인

| 스킬 | 설명 | 원본 경로 |
|------|------|----------|
| `theme-factory` | 슬라이드/문서/웹 테마 스타일링 | `.claude/skills/theme-factory` |
| `canvas-design` | PNG/PDF 포스터·아트 생성 | `.claude/skills/canvas-design` |
| `algorithmic-art` | p5.js 제너러티브 아트 | `.claude/skills/algorithmic-art` |
| `slack-gif-creator` | Slack용 애니메이션 GIF 생성 | `.claude/skills/slack-gif-creator` |
| `brand-styler` | **와키윌리 브랜드** 적용 (WW 전용) | `adapters/brand-styler.md` |

### 웹 & 프론트엔드

| 스킬 | 설명 | 원본 경로 |
|------|------|----------|
| `frontend-design` | 웹 UI/컴포넌트/대시보드 | `.claude/skills/frontend-design` |
| `web-artifacts-builder` | 멀티페이지 React 웹앱 | `.claude/skills/web-artifacts-builder` |
| `webapp-testing` | Playwright 웹앱 테스트 자동화 | `.claude/skills/webapp-testing` |

### 지식 구조화

| 스킬 | 설명 | 원본 경로 |
|------|------|----------|
| `json-canvas` | Obsidian 캔버스/마인드맵 생성 | `.claude/skills/json-canvas` |

### 개발 도구

| 스킬 | 설명 | 원본 경로 |
|------|------|----------|
| `mcp-builder` | MCP 서버 개발 가이드 | `.claude/skills/mcp-builder` |
| `skill-creator` | 신규 스킬 설계/개선 | `.claude/skills/skill-creator` |
| `llm-api-guide` | **모델 무관** LLM API 개발 가이드 | `adapters/llm-api-guide.md` |

---

## FPOF 패션 하우스 전용 스킬 (21개)

> 출처: `skills/` (원본 보존, 수정 없음)
> 자세한 연계 정보: `bridges/fpof-universal-map.md`

| 카테고리 | 스킬 |
|----------|------|
| 전략기획 | `trend-research`, `brand-strategy`, `md-planning`, `line-sheet` |
| 크리에이티브 | `moodboard`, `design-spec`, `visual-generation` |
| 프로덕트 | `techpack`, `costing-ve`, `qr-process` |
| 마케팅 | `imc-strategy`, `visual-content`, `copywriting`, `social-viral` |
| 데이터 | `sales-analysis`, `insight-archiving` |
| QC | `quality-gate`, `gap-analysis`, `completion-report`, `pdca-iteration` |
| 태스크 | `format-conversion` |

---

## 범용 유틸리티 vs FPOF 패션 하우스 스킬

| 구분 | 범용 유틸리티 (`skills-universal/`) | FPOF 패션 하우스 (`skills/`) |
|------|-----------------------------------|-----------------------------|
| 대상 | 어떤 AI/프로젝트에서도 사용 가능 | 와키윌리 브랜드 & FPOF 워크플로우 전용 |
| 트리거 | 자연어 → `nl-triggers.md` 매핑 | PDCA 단계 + 에이전시 라우팅 |
| 산출물 | 범용 문서/코드/비주얼 | 브랜드 정체성 기반 패션 실무 산출물 |
| 브랜드 | 없음 (또는 `brand-styler`로 WW 적용) | 와키윌리 DNA 내장 |

---

## 사용법

1. **자연어로 요청** — "PPT 덱 만들어줘", "임원 보고서 요약해줘" 등
2. **`nl-triggers.md` 참조** — 요청 키워드 → 스킬 이름 확인
3. **스킬 실행** — 해당 스킬의 SKILL.md 또는 어댑터 가이드 따름
4. **FPOF 연계가 필요하면** — `bridges/fpof-universal-map.md` 참조
