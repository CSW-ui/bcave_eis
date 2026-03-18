# 고객 인터뷰 (Interview)

인터뷰 스크립트 작성(prep) 또는 인터뷰 트랜스크립트 요약(summarize) 두 가지 모드를 지원합니다.

## 사용법
`/interview [prep|summarize] <주제 또는 트랜스크립트>` — 모드를 생략하면 확인합니다.

## 절차

---

### Prep 모드: 인터뷰 스크립트 작성

#### Step 1: 리서치 목표 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/personas.json` 참조 — 타겟 페르소나
3. 사용자에게 확인:
   - 알고 싶은 것 (구체적 리서치 질문)
   - 인터뷰 대상 (세그먼트, 역할)
   - 인터뷰 시간 (15분 / 30분 / 60분)
   - 이 리서치가 영향을 미칠 의사결정

#### Step 2: 인터뷰 스크립트 생성
`system/skills/pm-discovery/interview-script.md` 참조:
- "The Mom Test" 원칙 적용 — 그들의 삶에 대해 물어보고, 당신의 아이디어를 피칭하지 않기
- 유도 질문 없이, 과거 행동과 실제 상황에 집중
- 구성: 워밍업 → 핵심 탐색(JTBD, 워크플로우, 페인) → 특정 주제 → 마무리
- 각 질문에 "왜 묻는지" + 후속 질문 가이드 포함

#### Step 3: 산출물 저장
산출물을 `workspace/_season/plan_interview-script.md`에 저장한다.

---

### Summarize 모드: 인터뷰 요약

#### Step 1: 트랜스크립트 수집
- 텍스트, 파일, 오디오 요약 등 모든 형식 수용

#### Step 2: 구조화된 인사이트 추출
`system/skills/pm-discovery/summarize-interview.md` 참조:
- 참가자 프로필, JTBD, 현재 워크플로우
- 페인 포인트, 만족 시그널
- 핵심 인용구 (타임스탬프 포함)
- 검증/무효화된 가설
- 액션 아이템

#### Step 3: 산출물 저장
산출물을 `workspace/_season/check_interview-summary.md`에 저장한다.

---

`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### 다음 단계 제안
- "다른 인터뷰와 **교차 분석**하시겠어요?"
- "인터뷰 결과로 **가설을 업데이트**하시겠어요?"
- "복수 인터뷰에서 **페르소나를 추출**하시겠어요?"
