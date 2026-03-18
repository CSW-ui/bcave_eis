---
type: skill
id: prioritize-features
name: 피처 우선순위화 (Prioritize Features)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "피처 우선순위"
  - "백로그 정리"
  - "prioritize features"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_prioritize-features.md"
source: pm-skills/pm-product-discovery/prioritize-features
---

# 피처 우선순위화 (Prioritize Features)

> SKU 우선순위, 마케팅 채널 우선순위, Opportunity Score 기반 백로그 평가 및 상위 5개 추천 -- Impact, Effort, Risk, 전략 정합성 기반

## 언제 사용
- SKU 백로그의 우선순위를 정할 때
- 마케팅 채널/캠페인의 우선순위를 결정할 때
- 시즌 기획의 피처/아이디어 목록을 랭킹할 때
- 스코프 결정이 필요할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 시즌 기획에서 SKU, 마케팅 채널, 상품 아이디어의 우선순위를 결정하는 데 활용합니다
- 5대 경영목표 중 "히트상품 + IMC 강화" 달성을 위한 전략적 스코프 결정 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `categories.json`에서 카테고리별 상품 전략 확인
- `channels.json`에서 채널별 매출/목표 확인
- 스프레드시트, 백로그, 기회 평가 자료가 있으면 먼저 읽기

## 도메인 컨텍스트

**Opportunity Score** (Dan Olsen, *The Lean Product Playbook*): 고객 문제 평가에 권장. Opportunity Score = Importance x (1 - Satisfaction), 0~1로 정규화. High Importance + Low Satisfaction = 최고의 기회. **문제(기회)를 우선순위화하라, 솔루션이 아닌.**

**ICE**: 이니셔티브의 빠른 스코어링에 권장. Impact (Opportunity Score x # Customers) x Confidence x Ease. **RICE**는 대규모 팀에 Reach를 별도 팩터로 추가: (R x I x C) / E.

## 실행 절차

### Step 1: 우선순위 기준 이해
상품 목표와 성공 지표를 확인:
- 시즌 OKR 또는 상품 전략에서 도출
- 5대 경영목표 중 해당 목표

### Step 2: 각 피처/SKU 평가
4가지 기준으로 평가:
- **Impact**: 원하는 결과에 얼마나 기여하는가? 고객 데이터가 있으면 Opportunity Score 활용
  - 패션 컨텍스트: 매출 기여도, 트래픽 기여도, 브랜드 인지도 기여
- **Effort**: 개발, 디자인, 조율에 얼마나 필요한가?
  - 패션 컨텍스트: 생산 복잡도, 리드타임, 소재 조달 난이도
- **Risk**: 불확실성이 얼마나 높은가? 테스트 필요한 가정은?
  - 패션 컨텍스트: 트렌드 리스크, 재고 리스크, 품질 리스크
- **Strategic Alignment**: 상품 비전과 현재 목표에 얼마나 부합하는가?
  - 패션 컨텍스트: 브랜드 DNA 정합성, 5대 경영목표 기여도

### Step 3: 상위 5개 추천
1~5 순위로 명확히 랭킹:
- 각 선정 근거
- 고려한 핵심 트레이드오프
- 무엇이 비우선순위화되었고 왜인지

### Step 4: 우선순위 테이블 제시

### Step 5: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성 가중치
- 코어 타겟(18~25세 트렌드리더) Impact 가중치
- 5대 경영목표별 기여도 매핑
- 채널별(자사몰, 무신사, 글로벌) 우선순위 차이

## 산출물 포맷

```markdown
# 피처 우선순위화

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 상품 목표 및 성공 지표
[목표]

## 우선순위 평가

| # | 피처/SKU | Impact | Effort | Risk | Strategic Fit | Score |
|---|---------|--------|--------|------|--------------|-------|
| | | | | | | |

## 상위 5개 추천

### 1. [피처/SKU명]
- 근거:
- 트레이드오프:
- 핵심 가정:

### 2. [피처/SKU명]
- 근거:
- 트레이드오프:
- 핵심 가정:

(3~5 동일 형식)

## 비우선순위화 항목
| 피처/SKU | 비우선순위 근거 |
|---------|---------------|
| | |

## 와키윌리 적용 시사점
- 브랜드 DNA 가중치:
- 경영목표 기여도:
- 채널별 우선순위 차이:
```

## 완료 조건
- [ ] 모든 피처/SKU의 4가지 기준 평가
- [ ] 상위 5개 추천 및 순위 근거 제시
- [ ] 비우선순위화 항목 및 근거 명시
- [ ] 트레이드오프 분석 포함
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향이 Strategic Alignment에 반영?
- [ ] personas.json의 코어 타겟이 Impact 평가에 반영?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] 문제(기회)를 우선순위화하고 있는가 (솔루션이 아닌)?
- [ ] Opportunity Score가 적용 가능한 곳에 활용?

## 참고 자료
- Dan Olsen, *The Lean Product Playbook* -- Opportunity Score
- [Kano Model: How to Delight Your Customers Without Becoming a Feature Factory](https://www.productcompass.pm/p/kano-model-how-to-delight-your-customers)
- [The Product Management Frameworks Compendium + Templates](https://www.productcompass.pm/p/the-product-frameworks-compendium)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
