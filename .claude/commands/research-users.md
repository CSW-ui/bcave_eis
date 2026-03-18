# 사용자 리서치 종합 (User Research)

페르소나 구축, 사용자 세그멘테이션, 고객 여정 맵을 한 번에 실행합니다.

## 사용법
`/research-users <리서치 데이터 또는 대상>` — 데이터를 생략하면 와키윌리 기존 페르소나 기반으로 심화 분석합니다.

## 절차

### Step 1: 리서치 인풋 수집
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/personas.json` 참조 — 기존 UNI/WOMAN 페르소나
3. `system/presets/wacky-willy/channels.json` 참조 — 채널별 고객 접점
4. 사용자에게 확인:
   - 보유 리서치 데이터 유형 (설문, 인터뷰, 리뷰, CS 데이터, 판매 데이터)
   - 이해하려는 것 (고객이 누구인지 / 어떻게 다른지 / 어디서 마찰이 발생하는지)
   - 의사결정 목적 (로드맵 / 포지셔닝 / 가격 / 온보딩)

### Step 2: 페르소나 구축
`system/skills/pm-research/user-personas.md` 참조:
- 3~4개 구별되는 페르소나 식별
- 각 페르소나: 이름, 역할, 목표(JTBD), 페인 포인트, 게인, 행동 패턴
- 페르소나 비중 (전체 고객 중 비율)

### Step 3: 사용자 세그멘테이션
`system/skills/pm-research/user-segmentation.md` + `system/skills/pm-research/market-segments.md` 참조:
- 행동 기반 세그먼트 (인구통계가 아닌 행동 패턴)
- 각 세그먼트: 규모, JTBD, 상품 적합성, 지불 의향, 참여도
- 최고 가치 세그먼트와 최고 성장 세그먼트 식별

### Step 4: 고객 여정 맵
`system/skills/pm-research/customer-journey-map.md` 참조:
- 엔드투엔드 여정 매핑: 인지 → 고려 → 구매 → 사용 → 재구매 → 옹호
- 각 단계: 터치포인트, 감정, 페인 포인트, 아하 모먼트
- 최대 이탈 지점 식별
- 확대할 가치가 있는 만족 순간

### Step 5: 산출물 저장
산출물을 `workspace/_season/plan_user-research.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 6: 다음 단계 제안
- "특정 페르소나를 심층 탐색할 **인터뷰 스크립트**를 만드시겠어요?"
- "세그먼트별 **감성 분석**을 실행하시겠어요?"
- "핵심 페르소나 기반으로 **밸류 프로포지션**을 설계하시겠어요?"
- "여정 맵의 페인 포인트를 **기능 기회로 우선순위**를 매기시겠어요?"
