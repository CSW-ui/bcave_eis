# NL Triggers — 자연어 → 유니버설 스킬 매핑

자연어(한국어/영어)로 요청하면 이 테이블을 참조해 스킬을 선택합니다.
FPOF 에이전시 라우팅과 **별개**입니다 — 범용 유틸리티 스킬 전용 매핑입니다.

---

## 매핑 테이블

### 문서 생성

| 이런 말을 하면 | 사용할 스킬 | 원본 경로 | 비고 |
|--------------|-----------|----------|------|
| PPT, PowerPoint, 슬라이드, 덱, 발표자료 | `pptx` | `.claude/skills/pptx` | 파일 생성/편집/읽기 모두 |
| Word, 워드, .docx, 문서 작성, 기획서 | `docx` | `.claude/skills/docx` | 레터헤드·TOC·서식 포함 |
| 엑셀, Excel, 스프레드시트, .xlsx, SKU표, OTB표 | `xlsx` | `.claude/skills/xlsx` | 수식·차트·서식 포함 |
| PDF, 추출, PDF 병합, PDF 분할, PDF 변환 | `pdf` | `.claude/skills/pdf` | 읽기·쓰기·변환 모두 |
| 문서 공동 작성, 초안 작성, 기술 스펙, 제안서 | `doc-coauthoring` | `.claude/skills/doc-coauthoring` | 구조화 워크플로우 |
| 임원 보고, 주간 보고, 요약 보고서, 보고용으로 요약 | `executive-summary` | `.claude/skills/executive-summary` | 한국어 보고 양식 |
| 내부 공지, 뉴스레터, 팀 업데이트, 상태 보고 | `internal-comms` | `.claude/skills/internal-comms` | 내부 커뮤니케이션 |

### 비주얼 & 디자인

| 이런 말을 하면 | 사용할 스킬 | 원본 경로 | 비고 |
|--------------|-----------|----------|------|
| 테마, 슬라이드 스타일, 색상 테마, 디자인 테마 | `theme-factory` | `.claude/skills/theme-factory` | 10가지 프리셋 + 커스텀 |
| 포스터, 일러스트, 아트워크, PNG 만들기, 디자인 이미지 | `canvas-design` | `.claude/skills/canvas-design` | PNG/PDF 출력 |
| 제너러티브 아트, p5.js, 알고리즘 아트, 파티클, 플로우필드 | `algorithmic-art` | `.claude/skills/algorithmic-art` | 인터랙티브 가능 |
| Slack GIF, 슬랙 애니메이션, GIF 만들기 | `slack-gif-creator` | `.claude/skills/slack-gif-creator` | Slack 최적화 규격 |
| 와키윌리 브랜드, WW 스타일, 브랜드 컬러 적용, 브랜드 가이드 | `brand-styler` | `adapters/brand-styler.md` | WW 전용 어댑터 |

### 웹 & 프론트엔드

| 이런 말을 하면 | 사용할 스킬 | 원본 경로 | 비고 |
|--------------|-----------|----------|------|
| 웹 UI, 프론트엔드, 대시보드, 랜딩페이지, React 컴포넌트 | `frontend-design` | `.claude/skills/frontend-design` | 프로덕션급 퀄리티 |
| 멀티페이지 웹앱, React 앱, shadcn, Tailwind 앱 | `web-artifacts-builder` | `.claude/skills/web-artifacts-builder` | 복잡한 상태관리 포함 |
| 웹앱 테스트, Playwright, 브라우저 자동화, UI 검증 | `webapp-testing` | `.claude/skills/webapp-testing` | 스크린샷·로그 포함 |

### 지식 구조화

| 이런 말을 하면 | 사용할 스킬 | 원본 경로 | 비고 |
|--------------|-----------|----------|------|
| 옵시디언 캔버스, 마인드맵, .canvas 파일, 시각적 노트 | `json-canvas` | `.claude/skills/json-canvas` | Obsidian 호환 |

### 개발 도구

| 이런 말을 하면 | 사용할 스킬 | 원본 경로 | 비고 |
|--------------|-----------|----------|------|
| MCP 서버 만들기, MCP 도구 개발, FastMCP | `mcp-builder` | `.claude/skills/mcp-builder` | Python/TypeScript |
| 새 스킬 만들기, 스킬 개선, 스킬 평가, eval | `skill-creator` | `.claude/skills/skill-creator` | 스킬 설계 가이드 |
| LLM API, AI API 연동, OpenAI API, Gemini API, 모델 API 개발 | `llm-api-guide` | `adapters/llm-api-guide.md` | 모델 무관 가이드 |

---

## 라우팅 우선순위

```
1. FPOF 패션 실무 요청 (무드보드, 테크팩, 카피라이팅 등)
   → CLAUDE.md 에이전시 라우팅 테이블 사용 (FPOF 스킬)

2. 범용 유틸리티 요청 (문서 포맷, 웹 UI, API 개발 등)
   → 이 테이블 사용 (유니버설 스킬)

3. 두 가지 모두 필요한 경우
   → bridges/fpof-universal-map.md 참조
```

---

## 영어 트리거 (빠른 참조)

| English Trigger | Skill |
|----------------|-------|
| slides / deck / presentation / pptx | `pptx` |
| word doc / docx / spec document | `docx` |
| excel / spreadsheet / xlsx / csv | `xlsx` |
| pdf / extract / merge pdf | `pdf` |
| executive summary / report / weekly update | `executive-summary` |
| internal memo / newsletter / announcement | `internal-comms` |
| theme / slide style / color palette | `theme-factory` |
| poster / artwork / illustration / png | `canvas-design` |
| generative art / p5.js / particle system | `algorithmic-art` |
| slack gif / animation | `slack-gif-creator` |
| web UI / frontend / dashboard / landing page | `frontend-design` |
| web app / react app / multi-page | `web-artifacts-builder` |
| playwright / browser test / web automation | `webapp-testing` |
| obsidian canvas / mind map | `json-canvas` |
| mcp server / mcp tool | `mcp-builder` |
| new skill / skill improvement / eval | `skill-creator` |
| llm api / ai api / model integration | `llm-api-guide` |
| wacky willy brand / WW style | `brand-styler` |
