---
type: skill
id: md-planning
name: MD 전략 & 시즌 컨셉
agency: strategy-planning
role: 수석 MD (Chief Merchandiser)
phase: plan
triggers:
  - 이번 시즌 어떻게 구성하지?
  - SKU 짜줘
  - 카테고리 믹스 제안해줘
  - 챔피언 상품 뭐로 하지?
  - 히트상품 전략 세워줘
  - 가격대 어떻게 잡을까?
  - QR 계획 세워줘
presets:
  - categories.json
  - channels.json
  - brand.config.json
outputs:
  - "output/[시즌]/plan/season-concept.md"
---

# MD 전략 & 시즌 컨셉

> 수석 MD가 시즌 테마를 실제 상품 구성으로 번역하고, 카테고리/가격/물량 전략을 수립하는 전문 매뉴얼

## 언제 사용
- "SKU 어떻게 짜지?", "카테고리 믹스 해줘", "챔피언 상품 정해줘"
- Plan 단계에서 브랜드 전략 수립 완료 후 진행

## 사전 준비
1. `output/[시즌]/plan/brand-strategy.md` → 시즌 테마, 경영목표 연결 (필수 선행)
2. `presets/wacky-willy/categories.json` → 카테고리 트리, 상품 전략
3. `presets/wacky-willy/channels.json` → 채널별 매출 목표
4. `presets/wacky-willy/brand.config.json` → 5대 경영목표 KPI
5. `knowledge/` → 이전 시즌 히트/부진 상품 데이터

## 실행 절차

### Step 1: 카테고리 믹스 설계
전체 SKU를 라인별로 배분한다.
- 유니섹스 : 우먼스 : 용품 비율 결정
- 각 라인 내 서브 카테고리 비중 (상의/하의/아우터/원피스 등)
- 경영목표 #4(용품 경쟁력) 반영: 용품 비중 목표치 설정

### Step 2: 가격 전략 수립
가격대별 SKU를 배분한다.
- 엔트리 (입문가): 볼륨 확보, 신규 고객 유입
- 미들 (중심가): 매출 주력, 브랜드 대표 가격대
- 프리미엄 (상위가): 브랜드 이미지 견인, 화제성
- 채널별 가격 전략: 자사몰 vs 외부몰 vs 오프라인

### Step 3: 챔피언 상품 전략
상위 20% 매출 기여를 목표로 핵심 아이템을 선정한다. (경영목표 #2)
- 챔피언 후보 아이템 선정 (3~5개)
- 각 아이템의 매출 기여 목표
- IMC 연계 전략 (마케팅 쇼룸과 협업 포인트)
- 히트상품 공식 적용 (knowledge/playbooks/ 참조)

#### Impact/Effort 매트릭스 (PM-Skills 통합)
챔피언 후보 아이템을 Impact(매출 기여도) × Effort(개발/생산 난이도) 2×2 매트릭스로 배치한다.

| 구분 | High Impact | Low Impact |
|------|-----------|-----------|
| **Low Effort** | Quick Win (최우선) | Fill-in (여유 시 진행) |
| **High Effort** | Strategic (전략적 투자) | Avoid (보류) |

#### RICE 스코어링 (PM-Skills 통합)
각 챔피언 후보에 RICE 프레임워크를 적용하여 정량적으로 우선순위를 산정한다.

| 후보 아이템 | R (도달 고객 수) | I (영향력 0.25~3) | C (확신도 0~100%) | E (투입 리소스, 인월) | RICE 스코어 |
|-----------|----------------|-------------------|------------------|---------------------|------------|
| | | | | | = (R×I×C)/E |

- **R (Reach):** 해당 아이템이 도달할 타겟 고객 수 (personas.json 기준)
- **I (Impact):** 매출/브랜드 기여 영향력 (0.25=최소 ~ 3=대규모)
- **C (Confidence):** 히트 가능성에 대한 확신도 (이전 시즌 데이터, 트렌드 적합성 기반)
- **E (Effort):** 디자인→생산→마케팅 전체 투입 리소스 (인월 단위)
- RICE 스코어 상위 3~5개를 챔피언 상품으로 최종 선정

### Step 4: QR(Quick Response) 계획
인시즌 대응을 위한 QR 전략을 수립한다. (경영목표 #3)
- SPOT 스타일 수 (트렌드 반응형 신규 투입)
- 리오더 기준 (판매율 몇% 이상일 때?)
- 인시즌 리드타임 목표
- QR 전용 소재/공장 확보 계획

### Step 5: 신상 vs Carry-over 비율
전체 SKU 중 신상과 이월/리오더 비율을 결정한다.
- 신상 비율: 시즌 신선도 vs 검증된 아이템 안정성
- Carry-over 선정 기준: 전 시즌 판매율, 고객 재구매 데이터
- 리뉴얼 아이템: 기존 히트를 시즌 테마에 맞게 변형

## 산출물 포맷

```markdown
# [시즌] 시즌 컨셉 & MD 전략

## 작성일: YYYY-MM-DD
## 작성자: Chief Merchandiser
## 선행 산출물: brand-strategy.md

## 시즌 컨셉 요약
- 테마:
- 키 컬러:
- 키 실루엣:
- 키 소재:

## 카테고리 믹스
| 라인 | 비중(%) | SKU 수 | 핵심 아이템 | 전시즌 대비 |

## 가격 전략
| 밴드 | 가격대 | 비중(%) | 용도 | 채널 |

## 챔피언 상품 전략
| 순위 | 아이템 | 예상 기여 매출 | IMC 연계 | 히트 전략 |

## 신상 vs Carry-over
| 구분 | 비율(%) | SKU 수 | 비고 |

## QR 계획
- SPOT 스타일 수:
- 리오더 기준: 판매율 [X]% 이상
- 인시즌 리드타임 목표: [X]일
- QR 예비 예산:

## 매출 목표 배분
| 채널 | 매출 목표 | 비중 | 성장률 |

## 챔피언 상품 RICE 스코어
| 순위 | 아이템 | Reach | Impact | Confidence | Effort | RICE 스코어 | 판정 |
```

## 우선순위 프레임워크 참조 (PM-Skills 통합)
챔피언 상품 선정 및 SKU 우선순위 결정 시 아래 프레임워크를 상황에 맞게 활용한다.

### 핵심 원칙
고객의 문제(기회)를 우선순위화하라. 솔루션이 아닌 문제를 먼저 평가한다.

### 프레임워크별 공식 및 용도
| 프레임워크 | 공식/방법 | 적합한 상황 |
|-----------|----------|-----------|
| **Opportunity Score** | Importance × (1 − Satisfaction), 0~1 정규화 | 고객 니즈 기반 기회 평가 |
| **ICE** | Impact × Confidence × Ease | 아이디어/이니셔티브 빠른 스코어링 |
| **RICE** | (Reach × Impact × Confidence) / Effort | 대규모 SKU 정량 비교 |
| **Kano 모델** | Must-be / Performance / Attractive / Indifferent / Reverse | 고객 기대 수준 이해 |
| **Impact vs Effort** | 2×2 매트릭스 (Quick Win / Strategic / Fill-in / Avoid) | 빠른 트리아지 |
| **MoSCoW** | Must / Should / Could / Won't | 요구사항 분류 |

### Kano 모델 적용 (패션 맥락)
- **Must-be (기본):** 고객이 당연히 기대하는 품질/핏/소재 → 미충족 시 불만
- **Performance (성능):** 더 좋으면 더 만족 (디자인 완성도, 컬러 선택지)
- **Attractive (매력):** 없어도 불만 없지만 있으면 감동 (IP 캐릭터 히든 디테일, 한정판 요소)

### Opportunity Score 적용법
1. personas.json의 코어 타겟에게 각 니즈의 중요도(Importance)와 현재 만족도(Satisfaction) 조사
2. Opportunity Score = Importance × (1 − Satisfaction)
3. 높은 Importance + 낮은 Satisfaction = 최고 기회

## 완료 조건
- [ ] 카테고리 믹스 확정
- [ ] 가격 전략 수립
- [ ] 챔피언 상품 3개 이상 선정
- [ ] 챔피언 상품 RICE 스코어링 완료
- [ ] QR 계획 수립
- [ ] 사용자 승인

## 체크리스트
- [ ] channels.json의 채널별 매출 목표와 정합성 있는가?
- [ ] 경영목표 #2(히트상품 기여 ≥50%)에 부합하는 챔피언 전략인가?
- [ ] 경영목표 #3(QR 비중)을 위한 QR 계획이 구체적인가?
- [ ] 경영목표 #4(용품 경쟁력)를 위한 용품 비중이 반영되었는가?
- [ ] 이전 시즌 히트/부진 데이터를 참고했는가?
- [ ] 챔피언 상품 선정에 RICE 또는 ICE 스코어링이 적용되었는가?
- [ ] Impact/Effort 매트릭스로 Quick Win 아이템이 식별되었는가?
- [ ] Kano 모델 관점에서 Attractive 요소가 챔피언 상품에 포함되어 있는가?
