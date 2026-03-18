---
type: skill
id: startup-canvas
name: 스타트업 캔버스 (Startup Canvas)
agency: strategy-planning
role: 전략 컨설턴트 (Strategy Consultant)
phase: plan
triggers:
  - 스타트업 캔버스
  - 신규 사업 캔버스
  - 신규 상품 전략 캔버스
  - startup canvas
  - new product canvas
presets:
  - brand.config.json
  - categories.json
  - channels.json
outputs:
  - "output/[시즌]/_season/plan_startup-canvas.md"
source: pm-skills/pm-product-strategy/startup-canvas
---

# 스타트업 캔버스

> 9섹션 Product Strategy Canvas와 비즈니스 모델(비용 구조 + 수익원)을 결합하여 신규 상품/사업의 전략과 사업 모델을 동시에 설계합니다 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 완전히 새로운 상품 라인/사업 영역을 기획할 때
- 전략적 명확성과 비즈니스 모델을 동시에 필요로 할 때
- BMC나 Lean Canvas보다 체계적인 전략 수립이 필요할 때
- PDCA Plan 단계에서 신규 사업 기획 시

## FPOF 컨텍스트
- 이 스킬은 와키윌리 브랜드의 신규 사업(IP 라이선싱, 글로벌 진출, 신규 카테고리 등) 전략 수립에 활용합니다
- 관련 프리셋: `brand.config.json`(비전, 로드맵), `categories.json`(카테고리 전략), `channels.json`(채널 구조)
- 전략(Part 1)과 비즈니스 모델(Part 2)을 분리하여 체계적으로 설계합니다

## 사전 준비
1. `.fpof-state.json` → 현재 시즌 확인
2. `brand.config.json` → 비전, 5대 경영목표, 로드맵 참조
3. `categories.json` → 상품 카테고리 및 확장 전략 참조
4. `channels.json` → 채널별 매출/성장률 참조

### 참고: Startup Canvas vs BMC vs Lean Canvas

BMC와 Lean Canvas는 전략과 비즈니스 모델을 하나의 프레임으로 혼합합니다. **Startup Canvas**(Pawel Huryn)는 이를 분리합니다: Product Strategy Canvas의 9개 전략 섹션 + 비용 구조 & 수익원.

- **BMC의 한계**: 비전 없음, Can't/Won't 테스트 없음, 트레이드오프 없음, 핵심 지표 없음
- **Lean Canvas의 한계**: Problem/Market Segments 중복, Solution/Value Proposition 중복, 비전/트레이드오프 부재
- **Startup Canvas 권장**: 전략적 명확성과 비즈니스 모델 모두 필요한 신규 상품에 최적

## 실행 절차

### Part 1: 상품 전략 (Product Strategy — 9 Sections)

**1. 비전 (Vision)**
- 어떻게 사람들에게 영감을 줄 수 있는가?
- 무엇을 달성하고자 하는가?
- 어떤 가치를 지키는가?
- 간단하게 시작. 전략과 함께 비전도 진화한다.
- *패션 맥락: "2029 NO.1 K-Lifestyle Brand" 비전과의 정합성*

**2. 시장 세그먼트 (Market Segments)**
- 시장은 사람들의 문제(인구통계가 아닌)로 정의된다
- JTBD(Jobs to Be Done), 원하는 결과, 제약 조건
- 첫 번째 고객 세그먼트는? 왜 이 세그먼트부터?
- *패션 맥락: UNI/WOMAN 세그먼트, 18~25세 트렌드리더의 JTBD*

**3. 상대적 비용 (Relative Costs)**
- 저비용(사우스웨스트 항공처럼) vs 고유 가치(스타벅스처럼) 중 무엇을 최적화?
- 저비용이 반드시 저가격을 의미하지는 않음
- *패션 맥락: 와키윌리의 가격 포지셔닝과 가치 전략*

**4. 가치 제안 (Value Proposition)**
각 시장 세그먼트별:
- **What before**: 기존의 문제 있는 상태
- **How**: 상황을 바꾸는 기능과 역량
- **What after**: 이점과 결과
- **Alternatives**: 경쟁자/대체재 대비 고유 가치 (Value Curve 고려)
- *패션 맥락: Kitsch Street 감성, IP 유니버스 경험*

**5. 트레이드오프 (Trade-offs)**
- 무엇을 하지 않을 것인가?
- 트레이드오프가 집중을 만들고 가치를 증폭시킴
- 스타트업에서 모든 기회를 쫓고 싶은 유혹이 클 때 특히 중요
- *패션 맥락: 타겟 연령, 가격대, 스타일 범위의 제한*

**6. 핵심 지표 (Key Metrics)**
- 상품과 전략이 작동하는지 측정할 몇 가지 핵심 지표
- North Star Metric과 이번 분기 OMTM(One Metric That Matters)
- *패션 맥락: 시즌 판매율, 타겟 매출 비중, 채널별 성장률*

**7. 성장 (Growth)**
- Product-Led Growth or Sales-Led Growth?
- 선호 채널: 소셜 미디어, SEO, 인플루언서, 리셀러?
- *패션 맥락: SNS 중심 성장, 인플루언서 시딩, 채널 확장 전략*

**8. 역량 (Capabilities)**
- 획득해야 할 역량과 자원은?
- 자체 구축 vs 파트너십?
- *패션 맥락: 디자인 역량, 생산 인프라, IP 관리, 글로벌 오퍼레이션*

**9. Can't/Won't**
- 왜 경쟁자가 이 전략을 복제할 수 없다고/하지 않을 것이라고 생각하는가?
- 전체 전략이 복제하기 어려워야 함 — 단일 요소가 아닌 통합된 전체
- 모든 요소가 서로 맞물리고 강화하는가?
- *패션 맥락: IP 유니버스 + Kitsch 감성 + K-컬처 오리지널리티의 통합 방어력*

### Part 2: 비즈니스 모델 (Business Model)

**10. 비용 구조 (Cost Structure)**
- 임대료, 하드웨어, 라이선스, 기술, 마케팅, 구독, 급여
- 어떤 것이 반복 비용인가? 규모에 따라 어떻게 변하는가?
- *패션 맥락: 소재비, 봉제비, 매장 운영비, 마케팅비, 물류비*

**11. 수익원 (Revenue Streams)**
- 각 채널에서 얼마의 매출?
- 가격 접근법: 침투 가격, 가치 기반, 경쟁 기반, 사용량 기반?
- 수익 모델이 확장 가능한가? 가장 큰 불확실성은?
- *패션 맥락: 상품 판매, IP 라이선싱, 콜라보/한정판 수익*

### Step 3: 전략 정합성 검증
모든 요소가 서로 강화하는지 검증합니다.

1. 11개 섹션이 논리적으로 맞물리는지 확인
2. Can't/Won't 테스트 통과 여부
3. 성공을 위해 반드시 참이어야 할 가설 식별
4. 저비용 검증 실험 제안

### Step 4: 와키윌리 적용 필터링
분석 결과를 와키윌리 브랜드 렌즈로 필터링합니다.

- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점
- IP 캐릭터 활용 가능성
- 기존 BMC/Lean Canvas 산출물과의 보완 관계

## 산출물 포맷
```markdown
# [시즌] 스타트업 캔버스 — [프로젝트명]

## 작성일: YYYY-MM-DD
## 작성자: 전략 컨설턴트 (Strategy Consultant)

## Part 1: 상품 전략

### 1. 비전
### 2. 시장 세그먼트
### 3. 상대적 비용
### 4. 가치 제안
### 5. 트레이드오프
### 6. 핵심 지표
### 7. 성장
### 8. 역량
### 9. Can't/Won't

## Part 2: 비즈니스 모델

### 10. 비용 구조
### 11. 수익원

## 전략 정합성 검증
- Can't/Won't 테스트:
- 핵심 가설:
- 검증 실험:

## 와키윌리 시사점
- 브랜드 적용:
- 경영목표 연결:
- 다음 액션:
```

## 완료 조건
- [ ] 전략 9섹션 + 비즈니스 모델 2섹션 모두 작성
- [ ] Can't/Won't 테스트 통과 확인
- [ ] 전략 정합성 검증 완료
- [ ] 핵심 가설 및 검증 실험 설계
- [ ] 와키윌리 브랜드 적용 필터링 완료
- [ ] 경영목표 연결 확인

## 체크리스트
- [ ] 모든 요소가 서로 강화하고 맞물리는가?
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] 코어 타겟 감성에 부합하는가?
- [ ] 전략과 비즈니스 모델이 명확히 분리되어 있는가?
- [ ] 검증 가능한 가설이 식별되었는가?
