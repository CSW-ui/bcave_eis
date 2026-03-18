# PRD 작성 (Product Requirements Document)

기능 아이디어나 문제 정의에서 구조화된 PRD를 작성합니다.

## 사용법
`/prd <기능명 또는 문제 정의>` — 모호한 아이디어부터 상세 브리프까지 모든 수준의 입력을 지원합니다.

## 절차

### Step 1: 기능 이해
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — 전략 방향
3. `system/presets/wacky-willy/categories.json` 참조 — 카테고리 전략
4. 입력 수용 형식: 기능명, 문제 정의, 사용자 요청, 아이디어, 업로드 문서

### Step 2: 컨텍스트 수집 (대화형)
가장 중요한 질문부터 순서대로:
1. **사용자 문제**: 어떤 문제를 해결하는가? 누가 겪는가? 얼마나 아픈가?
2. **타겟**: 어떤 세그먼트? 현재 우회 방법은?
3. **성공 지표**: 성공 여부를 어떻게 알 수 있는가?
4. **제약**: 기술, 타임라인, 규제, 의존성
5. **선행 사례**: 이전 시도, 시장 기존 솔루션
6. **범위**: 풀 솔루션 vs 단계적 접근

### Step 3: PRD 생성
`system/skills/pm-execution/create-prd.md` 참조 — 8개 섹션:
1. 요약 (Executive Summary)
2. 배경 및 맥락 (Background & Context)
3. 목표 및 성공 지표 (Objectives & Success Metrics) + 비목표 (Non-Goals)
4. 타겟 사용자 및 세그먼트
5. 유저 스토리 및 요구사항 (P0/P1/P2)
6. 솔루션 개요
7. 미해결 질문
8. 타임라인 및 단계

### Step 4: 산출물 저장
산출물을 `workspace/[프로젝트]/plan_prd.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "범위를 **더 줄이시겠어요**? P1 중 P2로 내릴 항목을 챌린지해 볼까요?"
- "이 PRD에 **프리모템(Pre-mortem)**을 실행하시겠어요?"
- "엔지니어링을 위해 **유저 스토리로 분해**하시겠어요?"
- "이해관계자 공유용 **업데이트를 작성**하시겠어요?"
