# 스프린트 라이프사이클 (Sprint)

스프린트 플래닝(plan), 회고(retro), 릴리즈 노트(release-notes) 세 가지 모드를 지원합니다.

## 사용법
`/sprint [plan|retro|release-notes] <컨텍스트>` — 모드를 생략하면 확인합니다.

## 절차

---

### Plan 모드: 스프린트 플래닝

#### Step 1: 스프린트 컨텍스트 수집
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. 스프린트 기간, 팀 구성, 가용 인력
3. 스프린트 목표 또는 포커스 영역
4. 백로그 아이템 (붙여넣기, 업로드, 설명)
5. 이전 스프린트 캐리오버, 예정된 방해 요소

#### Step 2: 캐패시티 산정 및 스토리 선정
`system/skills/pm-execution/sprint-plan.md` 참조:
- 가용 시간/포인트 계산 (회의, 온콜, PTO 차감)
- 이론적 캐패시티의 70% 적용 (또는 과거 벨로시티)
- 캐패시티 내 스토리 선정 및 시퀀싱
- 의존성, 리스크, 미정의 스토리 식별

#### Step 3: 산출물 저장
산출물을 `workspace/_season/do_sprint-plan.md`에 저장한다.

---

### Retro 모드: 스프린트 회고

#### Step 1: 피드백 수집
- 팀 피드백 (설문, Slack, 문서)
- 스프린트 메트릭 (벨로시티, 버그, 인시던트)
- 회고 포맷 선택: Start/Stop/Continue | 4Ls | Sailboat

#### Step 2: 분석 및 구조화
`system/skills/pm-execution/retro.md` 참조:
- 선택한 프레임워크로 카테고리화
- 테마와 패턴 식별, 증상과 근본 원인 분리
- 축하할 성과 강조

#### Step 3: 산출물 저장
산출물을 `workspace/_season/check_sprint-retro.md`에 저장한다.

---

### Release-Notes 모드: 릴리즈 노트

#### Step 1: 릴리즈 콘텐츠 수집
- 티켓, 체인지로그, PRD, 커밋 메시지 등

#### Step 2: 사용자 관점으로 변환
`system/skills/pm-execution/release-notes.md` 참조:
- 기술 언어 → 사용자 혜택으로 번역
- New Features / Improvements / Bug Fixes 분류
- `system/presets/wacky-willy/tone-manner.json` 참조하여 브랜드 보이스 적용

#### Step 3: 산출물 저장
산출물을 `workspace/_season/do_release-notes.md`에 저장한다.

---

`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### 다음 단계 제안
- "plan → retro → release-notes 순서로 **다음 단계**를 실행하시겠어요?"
- "액션 아이템으로 **티켓을 생성**하시겠어요?"
- "릴리즈 노트를 **다른 채널 포맷**으로 변환하시겠어요?"
