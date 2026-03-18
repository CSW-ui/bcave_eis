---
type: skill
id: brainstorm-okrs
name: OKR 브레인스토밍 (Brainstorm OKRs)
agency: strategy-planning
role: OKR 코치 (OKR Coach)
phase: plan
triggers:
  - "OKR 짜줘"
  - "분기 목표 설정"
  - "핵심 성과지표 브레인스토밍"
  - "brainstorm OKRs"
  - "quarterly objectives"
presets:
  - brand.config.json
  - channels.json
outputs:
  - "output/[시즌]/_season/plan_okrs.md"
source: pm-skills/pm-execution/brainstorm-okrs
---

# OKR 브레인스토밍

> 팀 레벨 OKR을 회사 목표에 맞춰 브레인스토밍 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 시즌 OKR 수립 시
- 분기별 팀 목표 설정 시
- 5대 경영목표와 연결된 핵심 성과지표 도출 시
- 효과적인 OKR 작성 방법 학습 시

## FPOF 컨텍스트
- 와키윌리 5대 경영목표(브랜드 아이덴티티, 히트상품+IMC, QR 비중, 용품 라인업, 글로벌)와 OKR을 연결
- `brand.config.json`의 비전/로드맵을 참조하여 전략 정합성 확보
- `channels.json`의 채널별 매출/목표/성장률을 Key Result 수치 기준으로 활용

## 사전 준비
- `.fpof-state.json`에서 현재 시즌/단계 확인
- `brand.config.json`에서 5대 경영목표 및 KPI 확인
- 사용자가 제공하는 전략 문서, 팀 컨텍스트 파일 읽기

## 실행 절차

### Step 1: 컨텍스트 수집
사용자가 회사 목표, 전략 문서, 팀 컨텍스트를 파일로 제공하면 철저히 읽는다. 회사 전략을 언급하면 웹 검색으로 업계 벤치마크와 베스트 프랙티스를 파악한다.

### Step 2: 프레임워크 이해

**OKR** (Christina Wodtke, *Radical Focus*):
- **Objective** (Why, What, When): 정성적이고 영감을 주는 시간 제한 목표. 보통 분기 단위. SMART 기준 충족.
- **Key Results** (How much): 정량적 지표(보통 3개)와 기대 수치.

**OKR, KPI, NSM의 관계:**
- **Key Results**: 항상 정량적 지표를 가리키며, 일부는 KPI일 수 있음
- **KPI**: 장기간 추적하는 핵심 정량 지표. Key Result로 사용하거나, 건강 지표(OKR 균형 수단)로 사용
- **North Star Metric**: 단일 고객 중심 KPI. 비즈니스 성공의 선행 지표

OKR의 핵심: (1) 하나의 영감 있는 목표 설정 (2) 팀이 최적 접근법을 스스로 결정 (3) 지속적 진행 모니터링, 실패 학습, 개선

### Step 3: 단계적 사고
- 회사 전략은 무엇인가?
- 팀이 영향을 줄 수 있는 가장 중요한 3~5개 영역은?
- 팀의 노력이 회사 목표에 어떻게 연결되는가?
- 고객과 비즈니스에 성공은 어떤 모습인가?

### Step 4: 3개의 OKR 세트 생성
각 세트별로:
- 명확하고 영감 있는 Objective 문장으로 시작
- 정확히 3개의 Key Results 정의:
  - 측정 가능 (숫자로 추적 가능)
  - 도전적이나 달성 가능 (60-70% 신뢰도)
  - 회사 전략과 정합

**예시 포맷**:
```
Objective: 신규 고객에게 원활한 온보딩 경험을 제공한다
Key Results:
- 온보딩 설문 CSAT >= 75%
- 66%+ 온보딩이 2일 이내 완료
- 평균 Time-to-Value (TTV) <= 20분
```

### Step 5: 산출물 구조화
3개 OKR 세트를 동등한 비중으로 제시. 각각:
- Objective (1-2문장)
- 3개 Key Results (구체적 지표 + 목표 수치)
- 근거 (회사와 팀에 왜 중요한지)

### Step 6: 와키윌리 적용 필터링
- 각 OKR이 5대 경영목표 중 어떤 것과 연결되는지 매핑
- Key Result 수치가 `channels.json`의 채널 목표/성장률과 정합하는지 확인
- 패션 업계 특성(시즌 주기, 리드타임, 재고 회전율 등) 반영 여부 점검

## 산출물 포맷
```markdown
# [팀명] OKR — [분기/시즌]

## OKR 세트 A
**Objective**: ...
**Key Results**:
1. ...
2. ...
3. ...
**근거**: ...
**경영목표 연결**: ...

## OKR 세트 B
...

## OKR 세트 C
...
```

## 완료 조건
- 3개의 독립적이고 동등한 수준의 OKR 세트 제시
- 각 Key Result가 독립적으로 측정 가능
- 아웃풋이 아닌 아웃컴 중심 지표 사용
- 데이터 가용성에 대한 가정 표시

## 체크리스트
- [ ] 각 Key Result가 독립적으로 측정 가능한가?
- [ ] 아웃풋 지표("기능 5개 출시") 대신 아웃컴 지표를 사용했는가?
- [ ] 3개 세트 모두 신뢰할 만한 수준인가? (하나만 두드러지지 않는가?)
- [ ] 데이터 가용성에 대한 가정을 표시했는가?
- [ ] 5대 경영목표와의 연결이 명확한가?

---

### 참고 자료
- [Objectives and Key Results (OKRs) 101](https://www.productcompass.pm/p/okrs-101-advanced-techniques)
- [OKR vs KPI: What's the Difference?](https://www.productcompass.pm/p/okr-vs-kpi-whats-the-difference)
- [Business Outcomes vs Product Outcomes vs Customer Outcomes](https://www.productcompass.pm/p/business-outcomes-vs-product-outcomes)
