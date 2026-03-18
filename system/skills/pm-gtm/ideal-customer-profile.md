---
type: skill
id: ideal-customer-profile
name: 이상적 고객 프로필 (Ideal Customer Profile)
agency: data-intelligence
role: 고객 분석가 (Customer Analyst)
phase: plan
triggers:
  - "ICP 정의해줘"
  - "이상적 고객 프로필"
  - "핵심 고객 정의"
  - "ideal customer profile"
  - "define our best customer"
presets:
  - brand.config.json
  - personas.json
  - channels.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_ideal-customer-profile.md"
source: pm-skills/pm-go-to-market/ideal-customer-profile
---

# 이상적 고객 프로필 (ICP)

> Jobs to Be Done 이론 기반 고객 프로파일링 -- 와키윌리의 코어 타겟을 더 세밀하게 정의 (personas.json 기반 확장)

## 언제 사용
- 와키윌리의 ICP를 리서치/서베이 데이터 기반으로 정의할 때
- 고부가가치 고객 세그먼트를 타겟팅할 때
- 고객 성공 및 확장 패턴을 분석할 때
- 세일즈 및 마케팅 리소스 우선순위를 결정할 때
- 새로운 고객 기회의 적합성을 평가할 때
- 타겟 시장 정의를 정제할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리 브랜드의 코어 타겟을 personas.json 기반으로 확장/정밀화하는 데 활용합니다
- 5대 경영목표 중 "브랜드 아이덴티티 정립"의 코어타겟 매출 비중, 인지도/선호도 향상에 직결
- 관련 프리셋: personas.json (UNI/WOMAN 페르소나), brand.config.json (비전/전략), channels.json (채널), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `personas.json`에서 기존 UNI/WOMAN 페르소나 데이터 확인
- `brand.config.json`에서 코어 타겟 정의 및 전략 방향 확인
- 고객 리서치 데이터(서베이, 인터뷰, 구매 데이터) 수집

## ICP 프레임워크 구성요소

### 인구통계 (Demographics)
고객의 인구통계학적/라이프스타일 관점:
- 연령대 및 성별
- 거주 지역 (도시/해외)
- 직업/학교 및 소득 수준
- 패션 관여도 및 소비 수준
- 라이프스타일 및 관심사
- 소셜 미디어 활동 수준

### 행동 패턴 (Behaviors)
어떻게 패션을 소비하고 의사결정하는가?
- 브랜드/상품을 발견하고 평가하는 방법
- 구매 프로세스 및 의사결정 타임라인
- 트렌드 수용 속도 및 패션 리터러시
- 소셜 미디어 영향력 및 구전 활동
- 브랜드 전환 빈도
- 커뮤니티 참여 수준

### Jobs to Be Done (JTBD)
무엇을 달성하려 하는가?
- 주요 목표/잡 (기능적 잡)
- 이차적 잡 (주요 잡을 지원하는)
- 감정적 잡 (어떤 기분을 느끼고 싶은가)
- 사회적 잡 (지위와 인식)
- 피하고 싶은 잡
- 각 잡의 빈도와 중요도
- 잡 완료의 성공 지표

### 니즈와 페인 포인트
와키윌리 제품이 해결하는 문제:
- 구체적인 페인 포인트
- 현재 대안/우회 방법과 한계
- 생산성/결과물에 미치는 영향
- 문제의 비용/시간 부담
- 감정적 좌절 수준
- 문제 해결의 장벽
- 가용 예산
- 경쟁 우선순위

## 실행 절차

### Step 1: 고객 데이터 수집
실제 및 잠재 고객에 대한 리서치 수집:
- 구매 데이터 및 재구매 패턴
- 고객 인터뷰 트랜스크립트
- SNS/커뮤니티 반응 데이터
- 고객 피드백 및 CS 내역
- 이탈 분석 및 고객 라이프사이클 데이터
- 채널별 Win/Loss 분석
- 경쟁 브랜드 고객 분석

### Step 2: 가치 기준 세그먼테이션
고객 코호트별 가치 파악:
- 최고 LTV (생애 가치) 고객
- 가장 빠른 시간-투-밸류 고객
- 최저 이탈률 고객
- 최고 확장/업셀 고객 (다중 카테고리 구매)
- 가장 열정적/참여적 고객 (SNS 활동)
- 최고 레퍼런스/사례 잠재력
- 브랜드 비전과 가장 정렬된 고객

### Step 3: 인구통계 프로파일링
패턴 추출:
- 공통 연령대, 성별, 지역
- 주요 직업군/학교
- 지역적 집중도 (서울 특정 지역, 해외 특정 도시)
- 소득 및 패션 소비 수준
- 라이프스타일 지표

### Step 4: 행동 패턴 식별
의사결정 및 소비 패턴 매핑:
- 와키윌리를 어떻게 발견했는가 (채널)
- 평가 과정 및 타임라인
- 구매 의사결정의 핵심 요인
- 구매 과정의 장애물
- 상품 수용 속도 및 범위
- SNS 참여 빈도
- 재구매 주기

### Step 5: JTBD 정의
고객이 달성하려는 것을 명확히:
- 주요 잡/목표 (기능적 잡)
- 감정적 차원 (어떤 기분을 원하는가)
- 사회적 차원 (또래 집단 내 영향)
- 성공 지표 (어떻게 성공을 측정하는가)
- 맥락과 제약 (언제, 어디서, 누구와)
- 경쟁 잡과 우선순위
- 각 잡의 중요도 랭킹

### Step 6: 페인 포인트와 니즈 문서화
구체적 문제 영역 종합:
- Before 상태 (현재 상황과 좌절)
- 원하는 After 상태 (이상적 미래)
- 갭 크기와 영향 정량화
- 문제의 감정적 차원
- 해결을 방해하는 리소스 제약
- 회의감이나 주저함
- 솔루션의 성공 기준

### Step 7: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점 (특히 "브랜드 아이덴티티 정립")
- personas.json 기존 페르소나와의 비교/확장 포인트

## 산출물 포맷

```markdown
# 이상적 고객 프로필 (ICP)

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 데이터 인텔리전스
**담당**: 고객 분석가

## 개요
[ICP 정의 목적 및 배경]

## 인구통계 프로필
[연령, 성별, 지역, 직업, 소득, 라이프스타일]

## 행동 프로필
[구매 패턴, 소비 스타일, 의사결정 방식]

## JTBD 매핑
[기능적, 감정적, 사회적 잡]

## 상위 5~7개 페인 포인트 및 니즈
[구체적 문제와 영향 정량화]

## 의사결정 프로세스
[구매 여정 및 핵심 터치포인트]

## GTM 시사점 및 메시징
[마케팅 채널 및 메시지 방향]

## 비적합 기준 (Disqualification)
[ICP가 아닌 고객의 특성]

## ICP 중 최적 세그먼트
[ideal-of-the-ideal]

## 와키윌리 적용 시사점
- personas.json 기존 페르소나와 비교:
- 브랜드 DNA 정합성:
- 5대 경영목표 연결:
```

## 완료 조건
- [ ] 인구통계, 행동, JTBD, 니즈 전 영역 프로파일링 완료
- [ ] 정량/정성 데이터 모두 활용
- [ ] GTM 시사점 및 메시징 방향 포함
- [ ] 비적합 기준 정의
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] personas.json의 기존 페르소나와 정합성/확장성?
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] channels.json의 채널별 타겟팅과 연결?
- [ ] 정량 데이터(구매, 재구매)와 정성 데이터(인터뷰) 모두 반영?
- [ ] ICP가 조직 전체(마케팅, 세일즈, MD)에서 활용 가능한 수준인가?

## 참고 자료
- Clayton Christensen, *Jobs to Be Done* 이론
- [5 GTM Principles You Should Know as a PM](https://www.productcompass.pm/p/5-gtm-principles-with-frameworks-templates)
- [How to Design a Value Proposition Customers Can't Resist?](https://www.productcompass.pm/p/how-to-design-value-proposition-template)
