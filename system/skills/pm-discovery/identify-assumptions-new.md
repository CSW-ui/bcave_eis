---
type: skill
id: identify-assumptions-new
name: 8대 리스크 가정 식별 - 신규 상품 (Identify Assumptions - New Product)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "신규 사업 리스크"
  - "8대 리스크 점검"
  - "new product assumptions"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_identify-assumptions-new.md"
source: pm-skills/pm-product-discovery/identify-assumptions-new
---

# 8대 리스크 가정 식별 - 신규 상품 (New Product)

> 글로벌 진출, 신규 카테고리, 새로운 채널 런칭 시 8대 리스크 카테고리 전반의 포괄적 가정 식별 -- Teresa Torres의 4대 리스크를 Ethics, GTM, Strategy, Team으로 확장

## 언제 사용
- 글로벌 시장 진출 전 리스크를 포괄적으로 점검할 때
- 신규 카테고리/라인 런칭 시 가정을 식별할 때
- 새로운 채널(해외 플랫폼 등) 진입 전 리스크 매핑
- 신규 벤처/사업의 가정을 평가할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 신규 사업 영역(글로벌 진출, 신규 카테고리, 새 채널)에 대한 포괄적 리스크 식별에 활용합니다
- 5대 경영목표 중 "글로벌 대응 강화", "용품 라인업 경쟁력" 등 신규 영역 목표 달성의 리스크 관리 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 및 글로벌 전략 확인
- `personas.json`에서 코어 타겟 프로필 확인
- `channels.json`에서 채널별 현황 및 목표 확인
- 사업 계획서, 리서치 자료가 있으면 먼저 읽기

## 도메인 컨텍스트

**4대 핵심 상품 리스크** (Teresa Torres, *Continuous Discovery Habits*): Value, Usability, Viability, Feasibility.

**신규 상품은 8대 리스크 카테고리로 확장.** 좋은 팀은 아이디어의 최소 3/4이 기대만큼 수행되지 않을 것이라고 가정합니다.

**8대 리스크 카테고리:**
1. **가치 (Value)**: 고객에게 가치를 창출하는가? 계속 사용할 것인가?
2. **사용성 (Usability)**: 사용법을 알아낼 수 있는가? 충분히 빠르게 온보딩 가능한가? 인지 부하를 증가시키는가?
3. **사업성 (Viability)**: 판매/수익화/자금 조달 가능한가? 비용 대비 가치 있는가? 고객 지원 및 성공 가능한가? 규모 확장 가능한가? 컴플라이언스?
4. **실행 가능성 (Feasibility)**: 현재 기술로 가능한가? 통합 가능한가? 효율적인가? 확장 가능한가?
5. **윤리 (Ethics)**: 해야 하는가? 윤리적 고려사항? 고객 리스크?
6. **GTM (Go-to-Market)**: 마케팅 가능한가? 필요한 채널이 있는가? 고객 시도 설득 가능한가? 적절한 메시지/타이밍/런칭 방법인가?
7. **전략 & 목표 (Strategy & Objectives)**: 가정은 무엇인가? 전략 복제 가능한가? PESTLE 고려? 최적의 문제를 해결하고 있는가?
8. **팀 (Team)**: 팀 협업은? 적절한 인력? 적절한 도구? 팀 유지?

## 실행 절차

### Step 1: 세 가지 관점에서 실패 가능성 탐색
신규 상품이 왜 실패할 수 있는지 세 관점에서 분석:
- **프로덕트 매니저 관점**: 시장 수요, 지불 의사, 경쟁 환경
  - 패션 컨텍스트: 글로벌 시장 수요, 현지 경쟁 브랜드, 가격 전략
- **디자이너 관점**: 첫 사용자 경험, 온보딩, 인게이지먼트
  - 패션 컨텍스트: 현지 취향 적합성, 사이즈 체계, 문화적 감수성
- **엔지니어 관점**: 빌드 vs 바이, 확장성, 기술 부채
  - 패션 컨텍스트: 현지 생산 파트너, 물류, 결제 시스템

### Step 2: 8대 리스크 카테고리별 가정 식별

#### 가치 (Value)
- 고객에게 가치를 창출하는가? 계속 사용/구매할 것인가?

#### 사용성 (Usability)
- 사용법을 알아낼 수 있는가? 온보딩이 충분히 빠른가?

#### 사업성 (Viability)
- 판매/수익화/자금 조달 가능한가? 비용 대비 가치? 컴플라이언스?

#### 실행 가능성 (Feasibility)
- 현재 기술로 가능한가? 통합 가능한가?

#### 윤리 (Ethics)
- 해야 하는가? 윤리적 고려사항? 고객에게 리스크?

#### GTM (Go-to-Market)
- 마케팅 가능한가? 채널 확보? 고객 시도 설득? 메시지/타이밍?
- 패션 컨텍스트: 현지 플랫폼(해외 무신사급), 인플루언서 네트워크, 런칭 타이밍

#### 전략 & 목표 (Strategy & Objectives)
- 전략 가정? 경쟁사 복제 가능성? PESTLE 요인?

#### 팀 (Team)
- 팀 협업? 적절한 인력/도구? 팀 유지?
- 패션 컨텍스트: 현지 파트너, 바이어, 에이전트 역량

### Step 3: 가정별 확신도 평가 및 테스트 제안
각 가정에 대해 확신도(High/Medium/Low)를 평가하고 테스트 방법을 제안

### Step 4: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)의 글로벌 통용성
- 코어 타겟(18~25세 트렌드리더)의 현지 시장 존재 여부
- K-컬처 기반 글로벌 문화 브랜드 비전과의 정합성
- 5대 경영목표 중 "글로벌 대응 강화"와의 직접 연결

## 산출물 포맷

```markdown
# 8대 리스크 가정 식별 - 신규 상품

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 대상 신규 사업/상품
[설명]

## 다관점 실패 분석
### PM 관점
- ...
### 디자이너 관점
- ...
### 엔지니어 관점
- ...

## 8대 리스크 가정

| 리스크 카테고리 | 가정 | 확신도 | 테스트 방법 |
|---------------|------|--------|-----------|
| 가치 | | | |
| 사용성 | | | |
| 사업성 | | | |
| 실행 가능성 | | | |
| 윤리 | | | |
| GTM | | | |
| 전략 & 목표 | | | |
| 팀 | | | |

## 와키윌리 적용 시사점
- 글로벌 통용성:
- K-컬처 연결:
- 시즌 전략 연결:
```

## 완료 조건
- [ ] 세 가지 관점(PM, 디자이너, 엔지니어)에서 실패 가능성 분석
- [ ] 8대 리스크 카테고리 모두 커버
- [ ] 각 가정의 확신도 및 테스트 방법 명시
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향(특히 글로벌)과 정합성?
- [ ] personas.json의 코어 타겟 가정이 검증 대상에 포함?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] 8대 리스크 카테고리가 모두 커버되었는가?
- [ ] 신규 상품 특유의 리스크(Ethics, GTM, Strategy, Team)가 충분히 다뤄졌는가?

## 참고 자료
- Teresa Torres, *Continuous Discovery Habits*
- [Assumption Prioritization Canvas: How to Identify And Test The Right Assumptions](https://www.productcompass.pm/p/assumption-prioritization-canvas)
- [What Is Product Discovery? The Ultimate Guide Step-by-Step](https://www.productcompass.pm/p/what-exactly-is-product-discovery)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
