---
type: skill
id: beachhead-segment
name: 비치헤드 세그먼트 선정 (Beachhead Segment)
agency: strategy-planning
role: GTM 전략가 (GTM Strategist)
phase: plan
triggers:
  - "비치헤드 세그먼트 찾아줘"
  - "최초 타겟 시장 선정"
  - "런칭 타겟 좁혀줘"
  - "beachhead segment analysis"
  - "first target market selection"
presets:
  - brand.config.json
  - personas.json
  - channels.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_beachhead-segment.md"
source: pm-skills/pm-go-to-market/beachhead-segment
---

# 비치헤드 세그먼트 선정

> Geoffrey Moore의 "Crossing the Chasm" 비치헤드 전략을 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징 -- 와키윌리의 글로벌 확장 시 첫 번째 공략 시장 선정에 활용

## 언제 사용
- 새로운 시장(글로벌/국내)에 진출할 첫 번째 타겟 세그먼트를 선정할 때
- 신규 카테고리(용품, 우먼스 등) 런칭 시 초기 공략 세그먼트 결정
- 제한된 리소스를 집중할 시장을 선택해야 할 때
- GTM 가정을 초기 얼리어답터로 검증할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리 브랜드의 글로벌 확장(5대 경영목표 중 "글로벌 대응 강화") 및 신규 카테고리 런칭에 활용합니다
- 관련 프리셋: brand.config.json (비전/로드맵), personas.json (코어 타겟), channels.json (6개 채널), categories.json (카테고리 전략)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `brand.config.json`에서 글로벌 확장 로드맵, 5대 경영목표 확인
- `personas.json`에서 UNI/WOMAN 페르소나 데이터 확인
- `channels.json`에서 채널별 매출/목표/성장률 확인
- 대상 시장에 대한 시장 조사 데이터 수집

## 핵심 평가 기준

### 1. 절실한 페인 포인트 (Burning Pain Point)
해당 세그먼트가 해결되지 않은 급성 문제를 경험하고 있는가?
- 현재 패션 소비에 대한 불만족
- 스타일/가격대/브랜드 경험의 공백
- 기존 대안이 비싸거나 부족한 상황
- 문제가 시간이 갈수록 심화되는 추세

### 2. 지불 의향 (Willingness to Pay)
해당 세그먼트가 예산과 구매 동기를 가지고 있는가?
- 패션 소비에 대한 예산 할당 수준
- ROI가 명확 (브랜드 가치 > 가격)
- 경쟁 브랜드 대비 가격 수용도
- 의사결정자의 구매 자율성

### 3. 시장 점유 가능성 (Winnable Market Share)
3~18개월 내 해당 세그먼트의 60~70%를 점유할 수 있는가?
- 세그먼트가 충분히 크되 과포화되지 않은 상태
- 경쟁이 제한적이거나 차별화가 용이
- 와키윌리만의 경쟁 우위가 명확
- 유통/접근 경로에 대한 독점적 이점

### 4. 레퍼럴 잠재력 (Referral Potential)
고객이 자연스럽게 추천하고 확산시킬 것인가?
- 세그먼트 내 커뮤니티/소셜 네트워크 존재
- 인접 세그먼트와의 상호작용 (확장 기회)
- 높은 구전 문화 (SNS, 스트릿 문화)
- 한 세그먼트의 성공이 인접 세그먼트 수요를 창출

## 실행 절차

### Step 1: 잠재 세그먼트 리스트업
가능한 모든 타겟 세그먼트를 브레인스토밍:
- 지역별 (국내 도시, 해외 주요 시장)
- 연령/라이프스타일 (코어 18~25 vs 확장 타겟)
- 채널별 (무신사, 자사몰, 글로벌 플랫폼)
- 카테고리별 (유니/우먼스/용품)
- 고객 성숙도 (트렌드리더 vs 매스)
- 사용 목적 (데일리, 스트릿, IP 콜라보)

### Step 2: 페인 포인트 리서치
각 세그먼트의 절실한 페인 포인트 검증:
- 고객 인터뷰 및 디스커버리 콜
- 설문 기반 문제 검증
- 시장 리서치 및 트렌드 리포트
- 경쟁 브랜드 포지셔닝 및 고객 리뷰
- 문제의 비용/영향 정량화
- 현재 대안(대체재)의 한계 파악

### Step 3: 지불 의향 평가
예산과 경제적 실행 가능성 판단:
- 세그먼트의 패션 소비 예산 규모
- ROI 계산 (획득 가치 vs 비용)
- 현재 패션 소비 지출 내역
- 구매 의사결정 프로세스
- 객단가 기대 수준
- 가격 민감도

### Step 4: 시장 점유 가능성 평가
현실적 시장 점유율 잠재력 평가:
- TAM (Total Addressable Market) 규모
- 경쟁 환경과 포지셔닝
- 와키윌리의 차별화 요소 (Kitsch Street, IP Universe)
- 유통 접근성 (채널 전략)
- 소요 시간과 리소스
- 시장 성장세와 모멘텀

### Step 5: 레퍼럴 경로 파악
확장 기회 매핑:
- 해당 세그먼트가 영향을 미치는 인접 세그먼트
- 세그먼트 내 네트워크 효과
- 전문 커뮤니티 및 인플루언서 생태계
- 고객 간 자연스러운 추천 구조
- 인접 시장으로의 자연스러운 확장 경로

### Step 6: 비치헤드 선정
주요 런칭 세그먼트 선택:
- 4가지 기준의 종합 점수 최고
- 현재 리소스로 가장 달성 가능
- PMF(Product-Market Fit) 및 매출까지 최단 경로
- 인접 확장을 위한 최적 레퍼런스
- 가장 열정적인 초기 고객 코호트

### Step 7: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점 (특히 "글로벌 대응 강화", "브랜드 아이덴티티 정립")
- IP 캐릭터(키키 등)의 활용 가능성

## 산출물 포맷

```markdown
# 비치헤드 세그먼트 분석

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: GTM 전략가

## 개요
[분석 목적 및 배경]

## 상위 3~5개 추천 세그먼트
| 세그먼트 | 페인 포인트 | 지불 의향 | 시장 점유 가능성 | 레퍼럴 잠재력 | 종합 점수 |
|----------|-----------|----------|---------------|-------------|----------|
| [A] | [점수] | [점수] | [점수] | [점수] | [종합] |

## 1차 비치헤드 세그먼트 추천
[추천 세그먼트 상세]

## 페인 포인트 검증 및 근거
[증거 기반 분석]

## 지불 의향 평가 및 가격 가이던스
[가격 전략]

## 현실적 시장 점유율 및 매출 전망
[정량 분석]

## 레퍼럴 및 확장 경로
[인접 세그먼트 확장 전략]

## 90일 고객 획득 계획
[단기 실행 계획]

## 비치헤드 이후 확장 로드맵
[중장기 확장 전략]

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- 코어 타겟 연관성:
- 5대 경영목표 연결:
```

## 완료 조건
- [ ] 상위 3~5개 세그먼트 평가 및 스코어링 완료
- [ ] 1차 비치헤드 세그먼트 추천 및 근거 제시
- [ ] 90일 고객 획득 계획 수립
- [ ] 비치헤드 이후 확장 로드맵 포함
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 글로벌 전략 방향과 정합성?
- [ ] personas.json의 코어 타겟과 세그먼트 일치?
- [ ] channels.json의 채널 전략과 유통 경로 정합성?
- [ ] 4가지 평가 기준 모두 정량적으로 평가?
- [ ] 비치헤드가 충분히 구체적이고 좁은 범위인가?

## 참고 자료
- Geoffrey Moore, *Crossing the Chasm* -- 비치헤드 시장 전략
- [5 GTM Principles You Should Know as a PM](https://www.productcompass.pm/p/5-gtm-principles-with-frameworks-templates)
- [How to Design a Value Proposition Customers Can't Resist?](https://www.productcompass.pm/p/how-to-design-value-proposition-template)
- [How to Achieve Product-Market Fit?](https://www.productcompass.pm/p/how-to-achieve-the-product-market)
