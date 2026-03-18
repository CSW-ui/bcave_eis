---
type: skill
id: prioritize-assumptions
name: 가정 우선순위화 (Prioritize Assumptions)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "가정 우선순위"
  - "리스크 매트릭스"
  - "prioritize assumptions"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_prioritize-assumptions.md"
source: pm-skills/pm-product-discovery/prioritize-assumptions
---

# 가정 우선순위화 (Prioritize Assumptions)

> Impact x Risk 매트릭스로 시즌 핵심 가정 우선순위화 -- 가정을 분류하고 실험이 필요한 항목에 대해 타겟 실험을 제안

## 언제 사용
- 식별된 가정 목록의 우선순위를 정할 때
- 무엇을 먼저 테스트할지 결정할 때
- Assumption Prioritization Canvas를 적용할 때
- 시즌 기획의 핵심 가정을 체계적으로 관리할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 시즌 기획에서 식별된 가정들의 우선순위를 Impact x Risk 매트릭스로 결정하는 데 활용합니다
- identify-assumptions-existing/new 스킬의 후속 단계로 활용
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 시즌 목표/KPI 확인
- 가정 목록 또는 리서치 데이터 수집 (identify-assumptions 스킬 산출물 등)

## 도메인 컨텍스트

**ICE**는 가정 우선순위화에 효과적: Impact (Opportunity Score x # Customers) x Confidence (1~10) x Ease (1~10). Opportunity Score = Importance x (1 - Satisfaction), 0~1로 정규화 (Dan Olsen). **RICE**는 Impact를 Reach x Impact로 분리: (R x I x C) / E. 대규모 팀에 적합.

**Impact x Risk 매트릭스 4분면:**
- **Low Impact, Low Risk** -- 더 높은 우선순위 가정이 처리된 후까지 테스트 보류
- **High Impact, Low Risk** -- 구현 진행 (낮은 리스크, 높은 보상)
- **Low Impact, High Risk** -- 아이디어 기각 (투자 대비 가치 없음)
- **High Impact, High Risk** -- 실험 설계하여 테스트

## 실행 절차

### Step 1: 가정별 2차원 평가
각 가정에 대해 두 차원을 평가:
- **Impact**: 이 가정을 검증함으로써 창출되는 가치 AND 영향받는 고객 수
  - ICE 기준: Impact = Opportunity Score x # Customers
- **Risk**: (1 - Confidence) x Effort로 정의

### Step 2: 매트릭스 분류
각 가정을 Impact x Risk 매트릭스에 배치:
- **Low Impact, Low Risk** -- 보류
- **High Impact, Low Risk** -- 구현 진행
- **Low Impact, High Risk** -- 기각
- **High Impact, High Risk** -- 실험 필요

### Step 3: 테스트 필요 가정에 대한 실험 제안
실험이 필요한 각 가정에 대해:
- 최소 노력으로 최대 검증된 학습을 달성하는 실험
- 의견이 아닌 실제 행동을 측정
- 명확한 성공 지표와 임계값

### Step 4: 우선순위 결과 정리
매트릭스 또는 우선순위 테이블로 제시

### Step 5: 와키윌리 적용 필터링
- 5대 경영목표 기준으로 Impact 가중치 조정
- 코어 타겟(18~25세 트렌드리더) 영향 범위 평가
- 시즌 타임라인 내 테스트 가능 여부 확인
- 채널별 리스크 차이 반영

## 산출물 포맷

```markdown
# 가정 우선순위화

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## Impact x Risk 매트릭스

### High Impact, High Risk (실험 필요)
| 가정 | Impact | Risk | 실험 제안 | 성공 지표 |
|------|--------|------|----------|----------|
| | | | | |

### High Impact, Low Risk (구현 진행)
| 가정 | Impact | Risk | 근거 |
|------|--------|------|------|
| | | | |

### Low Impact, High Risk (기각)
| 가정 | Impact | Risk | 기각 근거 |
|------|--------|------|----------|
| | | | |

### Low Impact, Low Risk (보류)
| 가정 | Impact | Risk | 비고 |
|------|--------|------|------|
| | | | |

## 실험 설계 (High Impact, High Risk)
### 가정 1: [제목]
- 실험:
- 지표:
- 성공 기준:

## 와키윌리 적용 시사점
- 경영목표 기준 가중치:
- 시즌 타임라인 적합성:
- 채널별 리스크 차이:
```

## 완료 조건
- [ ] 모든 가정의 Impact 및 Risk 평가 완료
- [ ] 4분면 매트릭스 분류 완료
- [ ] High Impact, High Risk 가정에 대한 실험 설계
- [ ] 우선순위 결과 테이블/매트릭스 제시
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향이 Impact 평가에 반영?
- [ ] personas.json의 코어 타겟 규모가 고객 수 산정에 활용?
- [ ] categories.json의 카테고리 전략과 정합?
- [ ] 실험이 행동 기반 측정인가 (의견이 아닌)?
- [ ] 시즌 타임라인 내 실행 가능한 실험인가?

## 참고 자료
- Dan Olsen, *The Lean Product Playbook* -- Opportunity Score
- [Assumption Prioritization Canvas: How to Identify And Test The Right Assumptions](https://www.productcompass.pm/p/assumption-prioritization-canvas)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
