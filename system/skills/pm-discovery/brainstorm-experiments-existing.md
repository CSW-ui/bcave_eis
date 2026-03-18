---
type: skill
id: brainstorm-experiments-existing
name: 실험 설계 - 기존 상품 (Design Experiments - Existing Product)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "실험 설계해줘"
  - "기존 상품 테스트"
  - "design experiments"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_brainstorm-experiments-existing.md"
source: pm-skills/pm-product-discovery/brainstorm-experiments-existing
---

# 실험 설계 - 기존 상품 (Existing Product)

> 기존 상품 리뉴얼, 마케팅 실험, 채널 테스트를 위한 저비용 검증 실험 설계 -- 프로토타입, A/B 테스트, 스파이크 등 최소 노력으로 가정을 검증

## 언제 사용
- 기존 상품의 리뉴얼/업데이트 전 가정을 검증할 때
- 마케팅 캠페인의 효과를 사전 테스트할 때
- 채널 전략 변경 전 검증이 필요할 때
- 피처 아이디어를 풀 구현 전에 저비용으로 테스트할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 기존 상품 라인(유니/우먼스/용품)의 개선 및 최적화를 위한 실험 설계에 활용합니다
- 5대 경영목표 중 "히트상품 + IMC 강화", "QR 비중 확대" 달성을 위한 데이터 기반 의사결정 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `personas.json`에서 코어 타겟 행동 패턴 확인
- 기존 상품 성과 데이터, PRD, 가정 목록, 디자인 자료가 있으면 먼저 읽기

## 도메인 컨텍스트

기존 상품의 실험 설계는 **Continuous Discovery**의 핵심 활동입니다. 풀 구현에 투입하기 전에 저비용 실험으로 가정을 검증하여 리스크를 최소화합니다. 핵심 원칙은 "실제 행동을 측정하라, 의견이 아닌" 것입니다.

## 실행 절차

### Step 1: 아이디어 및 가정 명확화
팀이 구축하고자 하는 것과 검증이 필요한 것을 확인:
- 어떤 기존 상품/카테고리에 대한 실험인가?
- 어떤 가정이 가장 리스크가 높은가?

### Step 2: 가정별 실험 제안
각 가정에 대해 적절한 실험 방법을 제안. 다음 방법을 고려:
- **퍼스트 클릭 테스트** 또는 프로토타입 태스크 완료
- **피처 스텁** 또는 페이크 도어 테스트
- **기술 스파이크**
- **A/B 테스트** (리스크 완화 전략과 함께)
- **위자드 오브 오즈** 접근법
- **서베이 기반 검증** (행동 기반, 의견 기반이 아닌)
- 패션 컨텍스트: SNS 반응 테스트, 소량 프리오더, 무신사 사전 예약, 팝업 테스트

### Step 3: 핵심 원칙 적용
- 실제 행동을 측정, 사용자 의견이 아닌
- 책임감 있는 테스트 -- 사용자나 비즈니스를 리스크에 노출하지 않기
- 프로덕션 테스트(A/B 등)의 경우 리스크 완화 전략 설명
- 최소 노력으로 최대 검증된 학습 달성

### Step 4: 실험 상세 명세
각 실험에 대해 명시:
- **가정 (Assumption)**: 우리가 믿는 것은?
- **실험 (Experiment)**: 무엇을 구체적으로 할 것인가?
- **지표 (Metric)**: 무엇을 측정할 것인가?
- **성공 기준 (Success Threshold)**: 올바른 경우 예상 값

### Step 5: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더) 행동 패턴에 맞는 실험 방법인가?
- 채널별(자사몰, 무신사 등) 특성을 반영한 실험인가?
- 실험 결과가 시즌 의사결정에 활용 가능한가?

## 산출물 포맷

```markdown
# 실험 설계 - 기존 상품

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 대상 상품/카테고리
[기존 상품/카테고리 설명]

## 실험 설계

| # | 가정 | 실험 방법 | 지표 | 성공 기준 | 노력 수준 |
|---|------|----------|------|----------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## 실험 상세

### 실험 1: [제목]
- 가정:
- 실험:
- 지표:
- 성공 기준:
- 리스크 완화:

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- 채널 전략 연결:
- 시즌 의사결정 활용:
```

## 완료 조건
- [ ] 테스트 대상 가정 명확히 정의
- [ ] 가정별 저비용 실험 방법 제안
- [ ] 각 실험의 가설-방법-지표-성공 기준 명시
- [ ] 리스크 완화 전략 포함
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] personas.json의 코어 타겟 행동 패턴이 반영?
- [ ] categories.json의 카테고리 전략과 실험 대상 정합?
- [ ] 실험이 의견이 아닌 행동을 측정하는가?
- [ ] 최소 노력으로 최대 학습을 달성하는 설계인가?

## 참고 자료
- [Testing Product Ideas: The Ultimate Validation Experiments Library](https://www.productcompass.pm/p/the-ultimate-experiments-library)
- [Assumption Prioritization Canvas: How to Identify And Test The Right Assumptions](https://www.productcompass.pm/p/assumption-prioritization-canvas)
- [What Is Product Discovery? The Ultimate Guide Step-by-Step](https://www.productcompass.pm/p/what-exactly-is-product-discovery)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
