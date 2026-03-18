---
type: skill
id: opportunity-solution-tree
name: 기회-솔루션 트리 (Opportunity Solution Tree)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "OST 만들어줘"
  - "기회-솔루션 트리"
  - "고객 기회 매핑"
  - "opportunity solution tree"
  - "map opportunities to solutions"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_opportunity-solution-tree.md"
source: pm-skills/pm-product-discovery/opportunity-solution-tree
---

# 기회-솔루션 트리 (OST)

> Teresa Torres의 Continuous Discovery Habits 기반 OST 프레임워크 -- 히트상품 기획 시 고객 기회 -> 상품 솔루션 -> 검증 실험 구조화에 활용

## 언제 사용
- 시즌 기획 시 고객 기회를 구조적으로 매핑할 때
- 히트상품 후보를 고객 니즈 기반으로 도출할 때
- "무엇을 만들 것인가"를 결정하기 위한 디스커버리 구조화
- 기회 공간을 탐색하고 솔루션 후보를 비교할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 시즌 기획(Plan 단계)에서 고객 기회를 구조화하고 상품 솔루션을 도출하는 데 활용합니다
- 5대 경영목표 중 "히트상품 + IMC 강화" 달성을 위한 체계적 상품 기획 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `personas.json`에서 코어 타겟 니즈/페인 포인트 확인
- 고객 리서치 데이터 (인터뷰, 서베이, 분석, 피드백) 수집

## 도메인 컨텍스트

**Opportunity Solution Tree** (Teresa Torres, *Continuous Discovery Habits*)는 현대 프로덕트 디스커버리의 핵심 프레임워크입니다. 솔루션으로 바로 뛰어들지 않고, 먼저 기회 공간을 매핑하도록 강제합니다.

**구조 (4단계):**

1. **원하는 성과 (Desired Outcome)** (최상위) -- 팀이 추구하는 측정 가능한 비즈니스/상품 성과. 단일하고 명확한 지표 (예: "코어타겟 매출 비중 50% 달성"). OKR 또는 상품 전략에서 도출.

2. **기회 (Opportunities)** (2단계) -- 리서치를 통해 발견한 고객 니즈, 페인 포인트, 욕구. 피처가 아닌 문제. 고객 관점으로 프레이밍: "나는 ~하기 어렵다" 또는 "나는 ~하고 싶다". Opportunity Score로 우선순위: **중요도 x (1 - 만족도)** (Dan Olsen).

3. **솔루션 (Solutions)** (3단계) -- 각 기회를 해결하는 가능한 방법들. 기회당 여러 솔루션을 생성 -- 첫 번째 아이디어에 집착하지 않기. **Product Trio** (PM + 디자이너 + 엔지니어)가 함께 아이디에이션.

4. **실험 (Experiments)** (최하위) -- 솔루션이 실제로 기회를 해결하는지 검증하는 빠르고 저비용 테스트. 가정 테스팅 (가치, 사용성, 실행 가능성, 기술적 타당성 리스크). 의견 기반이 아닌 "skin-in-the-game" 실험 선호.

**핵심 원칙:**
- **한 번에 하나의 성과.** 모든 것을 해결하려 하지 않기. 단일 성과에 트리를 집중.
- **기회, 피처 아님.** "고객이 솔루션을 설계하게 하지 마세요. 기회(문제)를 우선순위화하세요."
- **비교와 대조.** 선택 전 기회당 최소 3개 솔루션을 생성. "첫 번째 아이디어" 함정 회피.
- **디스커버리는 비선형.** 실험이 실패하면 되돌아가기. 검증되지 않는 솔루션은 제거. 새 가지 탐색.
- **지속적, 주기적이 아닌.** 인터뷰, 분석, 실험에서 배운 것으로 매주 트리 업데이트.

## 실행 절차

### Step 1: 원하는 성과 정의
트리 최상위에 단일하고 측정 가능한 성과를 확인하거나 설정:
- 시즌 OKR 또는 상품 전략에서 도출
- 예: "26SS 히트상품 상위 20% 매출 기여 50% 이상"

### Step 2: 기회 매핑
제공된 리서치에서 3~7개 고객 기회 식별:
- 관련 기회를 그룹핑
- 각각을 고객 관점에서 프레이밍
- 패션 컨텍스트 예: "나는 키치한 스타일을 일상에서 입기 어렵다", "나는 좋아하는 캐릭터가 있는 옷을 찾고 싶다"

### Step 3: 기회 우선순위화
Opportunity Score 또는 정성적 평가로 랭킹:
- 상위 2~3개에 집중
- 중요도 x (1 - 만족도) 스코어 활용

### Step 4: 솔루션 생성
우선순위화된 각 기회에 대해 3개 이상 솔루션 브레인스토밍:
- MD 관점: 상품 전략, 카테고리, SKU
- 디자이너 관점: 디자인, 프린트, 컬러, 소재
- 프로덕션 관점: 생산 방식, QR, 코스팅

### Step 5: 실험 설계
가장 유망한 솔루션에 대해 1~2개 빠른 실험 제안:
- 가설, 방법, 지표, 성공 기준 명시
- 패션 컨텍스트: 팝업 테스트, SNS 반응 테스트, 소량 프리오더

### Step 6: 트리 시각화
전체 OST를 명확한 계층 구조로 제시

### Step 7: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점 (특히 "히트상품 + IMC 강화")
- IP 캐릭터 활용 기회

## 산출물 포맷

```markdown
# 기회-솔루션 트리 (OST)

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 원하는 성과 (Desired Outcome)
[측정 가능한 단일 성과]

## 기회 (Opportunities)
### 기회 1: [고객 관점 프레이밍]
- Opportunity Score: [점수]
- 근거: [리서치 데이터]

### 기회 2: ...

## 솔루션 (Solutions)
### 기회 1 솔루션
1. [솔루션 A]
2. [솔루션 B]
3. [솔루션 C]

## 실험 (Experiments)
### 솔루션 A 실험
- 가설:
- 방법:
- 지표:
- 성공 기준:

## OST 시각화
[계층 구조 다이어그램]

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- IP 활용 기회:
- 시즌 전략 연결:
```

## 완료 조건
- [ ] 단일 측정 가능 성과 정의
- [ ] 3~7개 고객 기회 식별 및 우선순위화
- [ ] 우선순위 기회당 3개 이상 솔루션 생성
- [ ] 유망 솔루션에 대한 실험 설계
- [ ] 전체 트리 시각화
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] personas.json의 코어 타겟 니즈가 기회에 반영?
- [ ] categories.json의 카테고리 전략과 솔루션 정합?
- [ ] 기회가 고객 관점으로 프레이밍되었는가 (피처가 아닌)?
- [ ] 솔루션이 다양한 관점에서 생성되었는가?

## 참고 자료
- Teresa Torres, *Continuous Discovery Habits*
- Dan Olsen, *The Lean Product Playbook* -- Opportunity Score
- [The Extended Opportunity Solution Tree](https://www.productcompass.pm/p/the-extended-opportunity-solution-tree)
- [What Is Product Discovery?](https://www.productcompass.pm/p/what-exactly-is-product-discovery)
- [Product Trio: Beyond the Obvious](https://www.productcompass.pm/p/product-trio)
