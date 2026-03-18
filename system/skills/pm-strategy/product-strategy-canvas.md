---
type: skill
id: product-strategy-canvas
name: 상품 전략 캔버스 (Product Strategy Canvas)
agency: strategy-planning
role: 전략 컨설턴트 (Strategy Consultant)
phase: plan
triggers:
  - 상품 전략 캔버스
  - 9섹션 전략
  - 프로덕트 전략 수립
  - 전략 캔버스 만들어줘
  - product strategy canvas
  - 9-section strategy
presets:
  - brand.config.json
  - categories.json
  - channels.json
outputs:
  - "output/[시즌]/_season/plan_product-strategy-canvas.md"
source: pm-skills/pm-product-strategy/product-strategy
---

# 상품 전략 캔버스

> 비전, 시장 세그먼트, 비용, 가치 제안, 트레이드오프, 지표, 성장, 역량, 방어 가능성의 9개 섹션으로 종합적인 상품 전략을 수립합니다 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 시즌 전체 상품 전략을 체계적으로 수립할 때
- 특정 카테고리/라인의 전략적 방향을 정의할 때
- 전략적 정합성을 검증하고 취약점을 발견할 때
- PDCA Plan 단계에서 brand-strategy 수립의 핵심 프레임워크로

## FPOF 컨텍스트
- 이 스킬은 와키윌리 브랜드의 시즌 상품 전략 또는 카테고리별 전략을 수립하는 핵심 프레임워크입니다
- 관련 프리셋: `brand.config.json`(비전, DNA, 로드맵), `categories.json`(유니/우먼스/용품), `channels.json`(채널 전략)
- 9개 섹션이 서로 강화하고 맞물려야 하며, 전체로서 복제 불가능해야 합니다

## 사전 준비
1. `.fpof-state.json` → 현재 시즌 확인
2. `brand.config.json` → 비전, DNA, 5대 경영목표, 로드맵 참조
3. `categories.json` → 상품 카테고리, SKU 전략 참조
4. `channels.json` → 채널별 매출/목표/성장률 참조
5. 이전 시즌 전략 산출물 참조 (있다면)

## 실행 절차

### Section 1: 비전 (Vision)
- 어떻게 사람들에게 영감을 줄 수 있는가?
- 무엇을 달성하고자 하는가?
- 어떤 가치를 지키는가?
- *와키윌리 맥락: "2029 NO.1 K-Lifestyle Brand" — K-컬처 기반 글로벌 문화 브랜드*

### Section 2: 시장 세그먼트 (Market Segments)
- 시장은 사람들의 문제(인구통계가 아닌)로 정의
- JTBD, 원하는 결과, 제약 조건
- 첫 번째 세그먼트는? 왜?
- *와키윌리 맥락: UNI(유니섹스) — "개성을 표현할 유니크한 스트리트웨어" / WOMAN — "감성적이면서 트렌디한 데일리룩"*

### Section 3: 상대적 비용 (Relative Costs)
- 저비용 최적화 vs 고유 가치 강조?
- 경쟁사 대비 비용 포지션?
- *와키윌리 맥락: 고유 가치(IP 유니버스, Kitsch 감성) 강조 전략, 단 QR을 통한 비용 효율성 동시 추구*

### Section 4: 가치 제안 (Value Proposition)
각 타겟 세그먼트별:
- **What before**: 고객의 현재 상황, 고통, 니즈
- **How**: 상품이 솔루션을 전달하는 방식
- **What after**: 개선된 결과, 미래 상태
- **Alternatives**: 현재 고객이 사용하는 대안
- *와키윌리 맥락: IP 캐릭터가 있는 스토리텔링 패션, Kitsch Street 감성, K-컬처 오리지널리티*

### Section 5: 트레이드오프 (Trade-offs)
- 무엇을 하지 않을 것인가?
- 어떤 기능/시장이 범위 밖인가?
- "No"라고 말하는 것이 어떻게 집중을 만들고 가치를 증폭시키는가?
- *와키윌리 맥락: "모든 연령대/모든 스타일을 커버하지 않는다" — 명확한 타겟과 감성 집중*

### Section 6: 핵심 지표 (Key Metrics)
- **North Star Metric**: 전체 사업 성공을 견인하는 단일 지표
- **OMTM (One Metric That Matters)**: 이번 분기 최적화할 단일 지표
- *와키윌리 맥락: 코어타겟 매출 비중, 시즌 판매율, 히트상품 기여도, ROAS*

### Section 7: 성장 (Growth)
- Sales-Led Growth or Product-Led Growth?
- 주요 획득 채널
- 스케일 방법
- 유닛 이코노믹스
- *와키윌리 맥락: SNS 중심 성장 + 인플루언서 시딩 + 채널 확장(글로벌)*

### Section 8: 역량 (Capabilities)
- 필요한 역량과 자원은?
- 자체 구축 vs 파트너십?
- 승리하기 위해 개발해야 할 역량?
- *와키윌리 맥락: 디자인 역량, IP 관리, QR 시스템, 글로벌 오퍼레이션, 디지털 마케팅*

### Section 9: Can't/Won't
- 왜 경쟁자가 이것을 쉽게 복제할 수 없는가?
- 방어 가능성은? (네트워크 효과, 전환 비용, IP)
- 신규 경쟁자에 대한 진입 장벽?
- *와키윌리 맥락: IP 캐릭터 유니버스(키키+11) + Kitsch Street 감성 + K-컬처 오리지널리티의 통합 전략은 단일 요소가 아닌 전체로서 복제 불가*

### Step 10: 전략 정합성 검증
9개 요소가 논리적으로 맞물리고 서로 강화하는지 검증합니다.

1. 각 섹션이 다른 섹션을 지지하는지 확인
2. 성공을 위해 반드시 참이어야 할 가설 도출
3. 저비용 검증 실험 제안
4. 분기별 재점검 계획

### Step 11: 와키윌리 적용 필터링
분석 결과를 와키윌리 브랜드 렌즈로 필터링합니다.

- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점:
  - 브랜드 아이덴티티 정립 → Section 1(비전), 4(가치 제안)
  - 히트상품 + IMC → Section 6(지표), 7(성장)
  - QR 비중 확대 → Section 3(비용), 8(역량)
  - 용품 라인업 → Section 2(세그먼트), 4(가치 제안)
  - 글로벌 대응 → Section 7(성장), 8(역량)
- IP 캐릭터 활용 가능성
  - Section 9(Can't/Won't)의 핵심 방어 자산

## 산출물 포맷
```markdown
# [시즌] 상품 전략 캔버스

## 작성일: YYYY-MM-DD
## 작성자: 전략 컨설턴트 (Strategy Consultant)

## 1. 비전
## 2. 시장 세그먼트
## 3. 상대적 비용
## 4. 가치 제안
## 5. 트레이드오프
## 6. 핵심 지표
## 7. 성장
## 8. 역량
## 9. Can't/Won't

## 전략 정합성 검증
- 섹션 간 정합성:
- 핵심 가설:
- 검증 실험:

## 와키윌리 시사점
- 브랜드 적용:
- 경영목표 연결:
- 다음 액션:
```

## 완료 조건
- [ ] 9개 섹션 모두 작성 완료
- [ ] 전략 정합성 검증 완료
- [ ] Can't/Won't 테스트 통과
- [ ] 핵심 가설 및 검증 실험 설계
- [ ] 와키윌리 브랜드 적용 필터링 완료
- [ ] 경영목표 연결 확인

## 체크리스트
- [ ] 9개 요소가 서로 맞물리고 강화하는가?
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] 코어 타겟 감성에 부합하는가?
- [ ] 트레이드오프가 명확하게 정의되었는가?
- [ ] North Star Metric이 적절한가?
- [ ] 전체 전략이 복제 불가능한 통합체인가?
