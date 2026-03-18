---
type: skill
id: identify-assumptions-existing
name: 리스크 가정 식별 - 기존 상품 (Identify Assumptions - Existing Product)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "리스크 가정 식별"
  - "핵심 가정 점검"
  - "identify assumptions"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_identify-assumptions-existing.md"
source: pm-skills/pm-product-discovery/identify-assumptions-existing
---

# 리스크 가정 식별 - 기존 상품 (Existing Product)

> 시즌 기획의 가치/사용성/사업성/기술 타당성 가정 점검 -- 다관점 Devil's Advocate 분석으로 4대 리스크 영역의 위험 가정을 서피스

## 언제 사용
- 기존 상품 라인의 시즌 기획 가정을 스트레스 테스트할 때
- 피처 아이디어의 리스크를 사전 평가할 때
- 가정 매핑(Assumption Mapping) 준비 시
- 기존 카테고리 리뉴얼/확장 전 리스크 점검

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 기존 상품 라인(유니/우먼스/용품)에 대한 시즌 기획 가정을 체계적으로 점검하는 데 활용합니다
- 5대 경영목표 달성을 위한 기획안의 리스크를 사전에 식별하여 실패 확률을 낮추는 도구
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- `personas.json`에서 코어 타겟 니즈/페인 포인트 확인
- 디자인, PRD, 리서치 자료가 있으면 먼저 읽기

## 도메인 컨텍스트

**Devil's Advocate 분석**: PM, 디자이너, 엔지니어 세 관점에서 "왜 이 피처가 실패할 수 있는가"를 건설적으로 탐색합니다. 목표는 아이디어를 죽이는 것이 아니라 강화하는 것입니다.

**4대 리스크 영역** (Teresa Torres, *Continuous Discovery Habits*):
1. **가치 (Value)**: 고객에게 가치를 창출하는가? 실제 문제를 해결하는가?
2. **사용성 (Usability)**: 사용자가 사용법을 알아낼 수 있는가? 학습 곡선이 수용 가능한가?
3. **사업성 (Viability)**: 마케팅, 영업, 재무, 법무가 지원할 수 있는가?
4. **실행 가능성 (Feasibility)**: 기존 기술로 구축할 수 있는가? 통합 리스크가 있는가?

## 실행 절차

### Step 1: 세 가지 관점에서 실패 가능성 탐색
이 피처/상품이 왜 실패할 수 있는지 세 관점에서 분석:
- **프로덕트 매니저 관점**: 사업성, 시장 적합성, 전략적 정합성
  - 패션 컨텍스트: 시즌 트렌드와의 괴리, 가격 경쟁력, 채널 전략 부적합
- **디자이너 관점**: 사용성, 사용자 경험, 채택 장벽
  - 패션 컨텍스트: 착용 장벽, 스타일링 난이도, 코어 타겟 취향 부적합
- **엔지니어 관점**: 기술적 실현 가능성, 성능, 통합 과제
  - 패션 컨텍스트: 소재/생산 기술 한계, QR 생산 가능성, 원가 구조

### Step 2: 4대 리스크 영역별 가정 식별
- **가치 (Value)**: 고객에게 가치를 창출하는가? 실제 문제를 해결하는가?
- **사용성 (Usability)**: 사용자가 알아낼 수 있는가? 학습 곡선은?
- **사업성 (Viability)**: 마케팅, 영업, 재무, 법무가 지원 가능한가?
- **실행 가능성 (Feasibility)**: 기존 기술/역량으로 구축 가능한가?

### Step 3: 가정별 상세 평가
각 가정에 대해 기록:
- 구체적으로 무엇이 잘못될 수 있는가
- 확신도 (High/Medium/Low)
- 테스트 제안 방법

### Step 4: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성 리스크
- 코어 타겟(18~25세 트렌드리더) 가정의 타당성
- 5대 경영목표와의 충돌 가능성
- 채널별(자사몰, 무신사, 글로벌) 리스크 차이

## 산출물 포맷

```markdown
# 리스크 가정 식별 - 기존 상품

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 대상 상품/피처
[설명]

## 다관점 실패 분석
### PM 관점
- [실패 가능성 1]
- [실패 가능성 2]

### 디자이너 관점
- [실패 가능성 1]
- [실패 가능성 2]

### 엔지니어 관점
- [실패 가능성 1]
- [실패 가능성 2]

## 4대 리스크 영역 가정

### 가치 (Value)
| 가정 | 리스크 | 확신도 | 테스트 방법 |
|------|--------|--------|-----------|
| | | | |

### 사용성 (Usability)
| 가정 | 리스크 | 확신도 | 테스트 방법 |
|------|--------|--------|-----------|
| | | | |

### 사업성 (Viability)
| 가정 | 리스크 | 확신도 | 테스트 방법 |
|------|--------|--------|-----------|
| | | | |

### 실행 가능성 (Feasibility)
| 가정 | 리스크 | 확신도 | 테스트 방법 |
|------|--------|--------|-----------|
| | | | |

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성 리스크:
- 코어 타겟 가정 타당성:
- 채널별 리스크:
```

## 완료 조건
- [ ] 세 가지 관점(PM, 디자이너, 엔지니어)에서 실패 가능성 분석
- [ ] 4대 리스크 영역별 가정 식별
- [ ] 각 가정의 확신도 및 테스트 방법 명시
- [ ] 건설적 톤 유지 (아이디어 강화 목적)
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] personas.json의 코어 타겟 가정이 검증 대상에 포함?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] 4대 리스크 영역이 모두 커버되었는가?
- [ ] 가정이 테스트 가능한 형태인가?

## 참고 자료
- Teresa Torres, *Continuous Discovery Habits*
- [Assumption Prioritization Canvas: How to Identify And Test The Right Assumptions](https://www.productcompass.pm/p/assumption-prioritization-canvas)
- [How to Manage Risks as a Product Manager](https://www.productcompass.pm/p/how-to-manage-risks-as-a-product-manager)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
