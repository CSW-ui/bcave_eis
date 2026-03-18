# _external/ — FPOF 외부 항목 분리 보관

> 2026-03-12 정리. Firecrawl 플러그인 설치 시 자동 생성된 AI 도구 설정 파일과 기타 비-FPOF 항목을 분리 보관합니다.

## 폴더 구조

```
_external/
├── ai-tool-configs/     ← 29개 AI 코딩 도구 설정 디렉토리 (firecrawl skill 사본 포함)
│   ├── .adal/  .agent/  .agents/  .augment/  .codebuddy/  .commandcode/
│   ├── .continue/  .cortex/  .crush/  .factory/  .goose/  .iflow/
│   ├── .junie/  .kilocode/  .kiro/  .kode/  .mcpjam/  .mux/
│   ├── .neovate/  .openhands/  .pi/  .pochi/  .qoder/  .qwen/
│   └── .roo/  .trae/  .vibe/  .windsurf/  .zencoder/
├── skill-sources/       ← 스킬 원본 소스 코드
│   └── excalidraw-diagram-skill/   ← excalidraw 스킬 개발용 원본
├── eval-workspace/      ← 테스트/평가 작업 공간
│   └── html-slide-workspace/       ← 슬라이드 스킬 평가용 임시 작업물
└── skills-lock.json     ← 스킬 버전 잠금 파일
```

## FPOF 적용 가능성 평가

### 1. ai-tool-configs/ (29개 디렉토리)
- **내용**: Firecrawl 플러그인이 감지된 모든 AI 코딩 도구 디렉토리에 동일한 firecrawl skill 파일을 복제
- **FPOF 적용**: 불필요. Claude Code의 firecrawl 스킬은 `.claude/skills/`에 이미 설치됨
- **처분 권장**: 삭제 가능. 필요 시 `firecrawl` 플러그인 재설치로 복원됨

### 2. skill-sources/excalidraw-diagram-skill/
- **내용**: excalidraw 다이어그램 스킬의 개발용 원본 소스
- **FPOF 적용**: 이미 적용 완료. `.claude/skills/excalidraw-diagram/`에 설치되어 운영 중
- **처분 권장**: 보관 유지. 스킬 업데이트/커스터마이징 시 참조용

### 3. eval-workspace/html-slide-workspace/
- **내용**: 슬라이드 스킬 테스트 시 생성된 임시 HTML 파일
- **FPOF 적용**: 불필요. 실제 산출물은 `output/` 폴더에 저장됨
- **처분 권장**: 삭제 가능

### 4. skills-lock.json
- **내용**: 스킬 버전 관리 잠금 파일
- **FPOF 적용**: Claude Code 스킬 시스템의 부산물. 직접적 FPOF 연관 없음
- **처분 권장**: 보관 유지 (스킬 버전 추적용)

## FPOF에 유지된 항목 (이동하지 않음)

| 항목 | 사유 |
|------|------|
| `data/market-intel/` | 마켓 인텔리전스 파이프라인 데이터 — FPOF 운영에 활용 |
| `_pm-skills-source/` | PM 스킬 65개 원본 — FPOF에 통합 완료, 참조용 보관 |
