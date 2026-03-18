---
type: skill
id: analyze-feature-requests
name: 피처 요청 분석 (Analyze Feature Requests)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "피처 요청 분석"
  - "고객 요구사항 정리"
  - "analyze requests"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_analyze-feature-requests.md"
source: pm-skills/pm-product-discovery/analyze-feature-requests
---

# 피처 요청 분석 (Analyze Feature Requests)

> 고객 VOC, 무신사 리뷰, SNS 댓글 기반 상품 요청 분석 -- 테마별 분류, 전략 정합성 평가, 상위 3개 우선순위 추천 및 가정 테스트 방법 제안

## 언제 사용
- 고객 VOC(Voice of Customer)를 체계적으로 분석할 때
- 무신사 리뷰, SNS 댓글에서 상품 요청을 정리할 때
- 피처 요청 백로그를 분류하고 우선순위화할 때
- 고객 요구사항을 상품 기획에 반영할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 고객 접점(무신사 리뷰, SNS 댓글, 자사몰 VOC)에서 수집된 피처 요청을 분석하여 시즌 기획에 반영하는 데 활용합니다
- 5대 경영목표 중 "브랜드 아이덴티티 정립", "히트상품 + IMC 강화" 달성을 위한 고객 중심 의사결정 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `personas.json`에서 코어 타겟 니즈/페인 포인트 확인
- 스프레드시트, CSV, 피처 요청 문서가 있으면 먼저 읽기
- 무신사 리뷰, SNS 댓글 데이터가 있으면 먼저 읽기

## 도메인 컨텍스트

**고객이 솔루션을 설계하게 하지 마라.** **기회(문제)를 우선순위화하라, 피처가 아닌.** **Opportunity Score** (Dan Olsen)로 고객이 보고한 문제를 평가: Opportunity Score = Importance x (1 - Satisfaction), 0~1로 정규화.

## 실행 절차

### Step 1: 목표 이해
우선순위화를 안내할 상품 목표와 원하는 결과를 확인:
- 시즌 OKR 또는 상품 전략
- 5대 경영목표 중 해당 목표

### Step 2: 요청을 테마별로 분류
관련 요청을 그룹핑하고 각 테마에 이름 부여:
- 패션 컨텍스트 예: "사이즈 확장 요청", "IP 캐릭터 신규 활용", "소재 개선", "가격대 다양화"

### Step 3: 전략 정합성 평가
각 테마가 명시된 목표와 얼마나 잘 맞는지 평가:
- 브랜드 DNA(Kitsch Street & IP Universe) 정합성
- 5대 경영목표 기여도
- 코어 타겟(18~25세 트렌드리더) 니즈 부합

### Step 4: 상위 3개 피처 우선순위화
4가지 기준으로 평가:
- **Impact**: 고객 가치와 영향받는 사용자 수
- **Effort**: 개발 및 디자인 리소스 필요량
- **Risk**: 기술적, 시장 불확실성
- **Strategic Alignment**: 상품 비전 및 목표 적합성

### Step 5: 상위 피처별 상세 분석
각 상위 피처에 대해:
- 근거 (고객 니즈, 전략 정합성)
- 고려할 대안 솔루션
- 고위험 가정
- 최소 노력으로 해당 가정을 테스트하는 방법

### Step 6: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더) 요청의 비중 확인
- 채널별(무신사, 자사몰, SNS) 요청 패턴 차이
- IP 캐릭터 활용 관련 요청 하이라이트
- 5대 경영목표와의 연결 매핑

## 산출물 포맷

```markdown
# 피처 요청 분석

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 상품 목표
[목표]

## 데이터 소스
- [무신사 리뷰 / SNS 댓글 / 자사몰 VOC / ...]

## 테마별 분류

### 테마 1: [테마명]
- 요청 수: [N건]
- 대표 요청: [요청 예시]
- 전략 정합성: [High/Medium/Low]

### 테마 2: [테마명]
- ...

## 상위 3개 추천

### 1. [피처명]
- 근거:
- 대안 솔루션:
- 고위험 가정:
- 테스트 방법:

### 2. [피처명]
- 근거:
- 대안 솔루션:
- 고위험 가정:
- 테스트 방법:

### 3. [피처명]
- 근거:
- 대안 솔루션:
- 고위험 가정:
- 테스트 방법:

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- 채널별 요청 패턴:
- IP 활용 기회:
- 경영목표 연결:
```

## 완료 조건
- [ ] 피처 요청의 테마별 분류 완료
- [ ] 각 테마의 전략 정합성 평가
- [ ] 상위 3개 피처 우선순위화 및 근거 제시
- [ ] 각 상위 피처의 고위험 가정 및 테스트 방법 명시
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향이 정합성 평가에 반영?
- [ ] personas.json의 코어 타겟 니즈가 우선순위에 반영?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] 기회(문제)를 우선순위화하고 있는가 (솔루션이 아닌)?
- [ ] 고객이 솔루션을 설계하게 하지 않았는가?

## 참고 자료
- Dan Olsen, *The Lean Product Playbook* -- Opportunity Score
- [Kano Model: How to Delight Your Customers Without Becoming a Feature Factory](https://www.productcompass.pm/p/kano-model-how-to-delight-your-customers)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
