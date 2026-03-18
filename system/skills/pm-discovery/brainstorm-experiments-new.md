---
type: skill
id: brainstorm-experiments-new
name: 린 스타트업 실험 설계 (Design Lean Startup Experiments - New Product)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "프리토타입 설계"
  - "신규 실험"
  - "pretotype experiments"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_brainstorm-experiments-new.md"
source: pm-skills/pm-product-discovery/brainstorm-experiments-new
---

# 린 스타트업 실험 설계 (New Product)

> 팝업스토어, 한정판 드롭, SNS 캠페인 실험을 위한 XYZ 가설 수립 및 프리토타입 실험 설계 -- Alberto Savoia의 "The Right It" 방법론 기반

## 언제 사용
- 팝업스토어 기획 전 시장 수요를 검증할 때
- 한정판 드롭의 반응을 사전 테스트할 때
- SNS 캠페인의 효과를 프리토타입으로 검증할 때
- 신규 상품 컨셉의 시장 수요를 최소 비용으로 테스트할 때
- XYZ 가설을 수립하고 검증 실험을 설계할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 신규 상품/캠페인/채널의 시장 검증을 위한 프리토타입 실험에 활용합니다
- 5대 경영목표 중 "히트상품 + IMC 강화", "글로벌 대응 강화" 달성을 위한 린(Lean) 검증 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `personas.json`에서 코어 타겟 프로필 확인
- 시장 리서치, 랜딩 페이지 목업 등 자료가 있으면 먼저 읽기

## 도메인 컨텍스트

**XYZ 가설** (Alberto Savoia, *The Right It*): "최소 X%의 Y가 Z를 할 것이다" 형태로 가설을 수립합니다.
- **X%**: 참여할 것으로 예상되는 타겟 시장 비율
- **Y**: 특정 타겟 시장 (예: "18~25세 키치 스타일 선호 여성")
- **Z**: 상품/서비스와 어떻게 참여할 것인가

**핵심 원칙** (Alberto Savoia, *The Right It*):
- **Skin-in-the-Game**: 관심이 아닌 지불 의사를 테스트. 실제 커밋먼트(시간, 돈, 평판)만이 신뢰할 수 있는 신호.
- **Your Own Data (YODA)**: 시장 리포트나 유사 사례(ODP)가 아닌 자체 실험 데이터 수집. "당신의 아이디어 시장은 다른 사람의 아이디어 시장에 관심 없다."
- 실제 행동을 측정, 사용자 의견이 아닌

## 실행 절차

### Step 1: XYZ 가설 수립
"최소 X%의 Y가 Z를 할 것이다" 형태로 가설 작성:
- 패션 컨텍스트 예: "최소 15%의 무신사 와키윌리 방문자가 신규 IP 콜라보 한정판 사전예약을 할 것이다"
- 패션 컨텍스트 예: "최소 5%의 인스타그램 팔로워가 팝업스토어 위치 투표에 참여할 것이다"

### Step 2: 프리토타입 실험 제안 (2~3개)
가설 검증을 위한 최소 노력 실험을 제안. 다음 방법을 고려:
- **랜딩 페이지**: 사인업 또는 클릭으로 관심 측정
- **설명 영상**: 참여 지표로 이해도와 매력도 측정
- **이메일 캠페인**: 응답률과 클릭률로 수요 측정
- **사전 주문 / 웨이트리스트**: Skin-in-the-Game 커밋먼트로 지불 의사 측정
- **컨시어지 / 수동 MVP**: 수동으로 서비스 제공하여 가치 테스트
- 패션 컨텍스트: SNS 스토리 투표, 무신사 사전예약, 팝업 안내 DM 반응, 인스타 숏폼 인게이지먼트

### Step 3: 실험별 상세 명세
각 실험에 대해 명시:
- **가설**: 테스트하는 XYZ 가설
- **방법**: 구체적인 실행 방법
- **지표**: 측정할 항목
- **성공 기준**: 예상 임계값

### Step 4: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에게 자연스러운 실험 채널인가?
- IP 캐릭터를 활용한 프리토타입 기회
- 글로벌 시장 검증에 활용 가능한가?

## 산출물 포맷

```markdown
# 린 스타트업 실험 설계

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## XYZ 가설
"최소 [X]%의 [Y]가 [Z]를 할 것이다"

## 프리토타입 실험

### 실험 1: [방법명]
- 가설:
- 방법:
- 지표:
- 성공 기준:
- 예상 비용/기간:

### 실험 2: [방법명]
- 가설:
- 방법:
- 지표:
- 성공 기준:
- 예상 비용/기간:

### 실험 3: [방법명]
- 가설:
- 방법:
- 지표:
- 성공 기준:
- 예상 비용/기간:

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- IP 활용 기회:
- 글로벌 검증 가능성:
```

## 완료 조건
- [ ] XYZ 가설이 구체적이고 측정 가능한 형태로 수립
- [ ] 2~3개 프리토타입 실험 설계
- [ ] 각 실험의 가설-방법-지표-성공 기준 명시
- [ ] Skin-in-the-Game 원칙 적용 여부 확인
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] personas.json의 코어 타겟 프로필이 Y에 반영?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] Skin-in-the-Game 원칙이 적용되었는가?
- [ ] YODA 원칙(자체 데이터 수집)을 따르는가?

## 참고 자료
- Alberto Savoia, *The Right It*
- [How to Build the Right Product with Alberto Savoia (ex-Innovator at Google)](https://www.productcompass.pm/p/how-to-build-the-right-product-with)
- [Testing Product Ideas: The Ultimate Validation Experiments Library](https://www.productcompass.pm/p/the-ultimate-experiments-library)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
