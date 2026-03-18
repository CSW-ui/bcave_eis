# 밸류 프로포지션 설계 (Value Proposition)

JTBD 기반 6파트 템플릿으로 명확한 가치 제안을 설계합니다.

## 사용법
`/value-prop <대상 상품 또는 브랜드>` — 대상을 생략하면 와키윌리 코어 타겟 기준으로 작성합니다.

## 절차

### Step 1: 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/personas.json` 참조 — 페르소나, JTBD
3. `system/presets/wacky-willy/brand.config.json` 참조 — 포지셔닝, 차별화
4. `system/presets/wacky-willy/tone-manner.json` 참조 — 브랜드 보이스
5. 사용자에게 확인:
   - 대상 상품/브랜드
   - 타겟 세그먼트 (복수 세그먼트 시 각각 작성)
   - 기존 가치 제안 유무

### Step 2: 밸류 프로포지션 작성
`system/skills/pm-strategy/value-proposition.md` 참조:

세그먼트별 6파트 템플릿:
1. **Who**: 타겟 사용자 프로필과 특성
2. **Why**: 해결하려는 과업 (JTBD)
3. **What Before**: 현재의 불편한 현실 (기존 대안, 마찰, 우회 방법)
4. **How**: 솔루션 접근 방식 (가치를 전달하는 구체적 기능/경험)
5. **What After**: 개선된 결과 (가능해지는 것)
6. **Alternatives**: 대안과 비교 우위

### Step 3: 밸류 프로포지션 스테이트먼트
- 원라이너: `[누구]를 위해 [니즈]가 있을 때, [제품]은 [카테고리]로서 [혜택]을 제공합니다. [대안]과 달리 [차별점]이 있습니다.`
- 마케팅용, 세일즈용, 온보딩용 각각 작성

### Step 4: 산출물 저장
산출물을 `workspace/_season/plan_value-proposition.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "경쟁사와 **밸류 커브(Blue Ocean)**로 비교하시겠어요?"
- "이 가치 제안 기반으로 **풀 전략 캔버스**를 만드시겠어요?"
- "밸류 프로포지션 스테이트먼트로 **마케팅 카피**를 작성하시겠어요?"
