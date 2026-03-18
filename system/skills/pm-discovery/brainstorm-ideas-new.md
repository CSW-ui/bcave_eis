---
type: skill
id: brainstorm-ideas-new
name: 신규 상품 아이디어 브레인스토밍 (Brainstorm Ideas - New Product)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "신규 상품 아이디어"
  - "새로운 아이디어 발굴"
  - "brainstorm new ideas"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_brainstorm-ideas-new.md"
source: pm-skills/pm-product-discovery/brainstorm-ideas-new
---

# 신규 상품 아이디어 브레인스토밍 (New Product)

> 신규 카테고리/라인 런칭, IP 콜라보 신규 아이디어 발굴을 위한 다관점 아이디에이션 -- PM, 디자이너, 엔지니어 관점에서 구체적인 피처 아이디어를 생성

## 언제 사용
- 신규 카테고리 또는 라인을 런칭할 때
- IP 콜라보 신규 아이디어를 발굴할 때
- 새로운 상품 컨셉의 초기 디스커버리를 시작할 때
- 비전, 비즈니스 모델, 시장 검증 단계에서 아이디에이션이 필요할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 시즌 기획(Plan 단계)에서 신규 카테고리/라인/IP 콜라보 아이디어를 발굴하는 데 활용합니다
- 5대 경영목표 중 "히트상품 + IMC 강화", "용품 라인업 경쟁력", "글로벌 대응 강화" 달성을 위한 신규 아이디어 도출 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `personas.json`에서 코어 타겟 니즈/페인 포인트 확인
- `categories.json`에서 현재 카테고리 전략 및 미개척 영역 확인
- 시장 리서치, 경쟁 분석 자료가 있으면 먼저 읽기

## 도메인 컨텍스트

**Initial Discovery vs Continuous Discovery**: Initial Discovery는 비전, 비즈니스 모델, 시장 검증에 집중합니다 -- 상품이 존재해야 하는지를 테스트합니다. Continuous Discovery는 딜리버리와 병행하여 실행합니다 -- 라이브 상품을 지속적으로 학습하고 반복합니다. 이 스킬은 **Initial Discovery**를 위한 것입니다.

## 실행 절차

### Step 1: 기회 이해
상품 컨셉, 타겟 시장 세그먼트, 고객이 달성하고자 하는 것을 확인:
- 와키윌리의 어떤 전략적 목표에 연결되는가?
- 코어 타겟(18~25세 트렌드리더)의 어떤 니즈를 해결하는가?
- 기존 카테고리와의 차별점은?

### Step 2: 세 가지 관점에서 아이디에이션
각 관점에서 5개의 구체적인 아이디어 생성:

- **프로덕트 매니저 관점**: 시장 적합성, 가치 창출, 경쟁 우위
  - 패션 컨텍스트: 카테고리 포지셔닝, 가격대, 채널 전략
- **프로덕트 디자이너 관점**: 사용자 경험, 온보딩, 인게이지먼트
  - 패션 컨텍스트: 디자인 컨셉, 프린트, 컬러, IP 캐릭터 활용
- **소프트웨어 엔지니어 관점**: 기술 혁신, API 통합, 플랫폼 역량
  - 패션 컨텍스트: 생산 기술, QR 생산, 소재 혁신, 커스터마이징

### Step 3: 상위 5개 아이디어 우선순위화
모든 관점의 아이디어를 통합하여 상위 5개를 선정. 신규 상품이므로 다음에 가중치:
- 핵심 가치 전달 (주요 문제를 해결하는가?)
- 검증 속도 (빠르게 테스트할 수 있는가?)
- 차별화 잠재력

### Step 4: 우선순위 아이디어별 근거 및 핵심 가정
각 우선순위 아이디어에 대해:
- 선정 근거
- 테스트해야 할 핵심 가정

### Step 5: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점
- IP 캐릭터(키키 + 11 캐릭터) 활용 기회
- 기존 카테고리(유니/우먼스/용품)와의 시너지

## 산출물 포맷

```markdown
# 신규 상품 아이디어 브레인스토밍

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 기회 정의
- 상품 컨셉:
- 타겟 시장:
- 고객 달성 목표:

## 아이디에이션

### PM 관점 (5개)
1. [아이디어] — [근거]
2. ...

### 디자이너 관점 (5개)
1. [아이디어] — [근거]
2. ...

### 엔지니어 관점 (5개)
1. [아이디어] — [근거]
2. ...

## 상위 5개 우선순위
| 순위 | 아이디어 | 핵심 가치 | 검증 속도 | 차별화 | 핵심 가정 |
|------|---------|----------|----------|--------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- IP 활용 기회:
- 시즌 전략 연결:
```

## 완료 조건
- [ ] 세 가지 관점에서 각 5개 아이디어 생성 (총 15개)
- [ ] 상위 5개 아이디어 우선순위화 및 근거 제시
- [ ] 각 우선순위 아이디어의 핵심 가정 명시
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] personas.json의 코어 타겟 니즈가 반영?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] 아이디어가 Initial Discovery(신규 상품) 관점인가?
- [ ] 핵심 가정이 테스트 가능한 형태인가?

## 참고 자료
- [Startup Canvas: Product Strategy and a Business Model for a New Product](https://www.productcompass.pm/p/startup-canvas)
- [Product Innovation Masterclass](https://www.productcompass.pm/p/product-innovation-masterclass) (video course)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
