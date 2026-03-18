# 가격 전략 설계 (Pricing Strategy)

원가 분석(costing-ve)과 가격 전략 프레임워크를 결합하여 최적 가격 포지셔닝을 설계합니다.

## 사용법
`/pricing <가격 전략 대상 상품 또는 카테고리>` — 대상을 생략하면 현재 시즌 주력 아이템 기준으로 분석합니다.

## 절차

### Step 1: 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 PDCA 단계 확인
2. `system/presets/wacky-willy/categories.json` 참조 — 카테고리별 상품 전략
3. `system/presets/wacky-willy/channels.json` 참조 — 채널별 매출 구조
4. 사용자에게 확인:
   - 대상 상품/카테고리
   - 현재 가격 구조 (있는 경우)
   - 가격 검토 계기 (신상품 / 가격 변경 / 경쟁 대응 / 채널 확대)

### Step 2: 원가 분석
`system/skills/product/costing-ve.md` 참조:
- BOM 원가, 가공비, 부자재비 등 원가 구조 분석
- 목표 마진율 기준 손익 시뮬레이션
- VE(Value Engineering) 관점 원가 절감 포인트

### Step 3: 가격 포지셔닝 전략
`system/skills/pm-strategy/pricing-strategy.md` 참조:
- 가격 모델 평가 (정가 / 할인 / 번들 / 채널별 차등)
- 경쟁사 가격 벤치마킹 (3~5개 경쟁 브랜드)
- 타겟 고객의 지불 의향(WTP) 추정
- 가격 탄력성 시나리오 분석

### Step 4: 가격 전략 권고안 작성
- 추천 가격 모델과 근거
- 채널별 가격 구조 (자사몰 / 백화점 / 아울렛 / 글로벌)
- 시즌 가격 운영 계획 (정상가 → 프로모션 → 시즌오프)
- 수익 시뮬레이션 (보수적 / 기대 / 낙관)

### Step 5: 산출물 저장
산출물을 `workspace/[프로젝트]/plan_pricing-strategy.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 6: 다음 단계 제안
- "이 가격 전략에 맞춰 **라인시트를 업데이트**하시겠어요?"
- "가격 가설을 검증할 **A/B 테스트를 설계**하시겠어요?"
- "채널별 **GTM 전략**을 수립하시겠어요?"
