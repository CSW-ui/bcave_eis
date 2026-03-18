# 거시 환경 분석 (Market Scan)

SWOT, PESTLE, Porter's Five Forces, Ansoff Matrix 4개 전략 프레임워크를 한 번에 실행합니다.

## 사용법
`/market-scan <분석 대상 시장 또는 브랜드>` — 대상을 생략하면 와키윌리 현재 시즌 기준으로 분석합니다.

## 절차

### Step 1: 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 PDCA 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — DNA, 포지셔닝, 경영목표
3. 사용자에게 확인:
   - 분석 대상 (브랜드 전체 / 특정 카테고리 / 특정 시장)
   - 분석 목적 (시즌 전략 / 시장 진입 / 경쟁 대응 / 연간 리뷰)
   - 특정 프레임워크만 원하는지, 전체 4개 모두 실행할지

### Step 2: 4대 프레임워크 순차 실행

**SWOT 분석** (`system/skills/strategy/brand-strategy.md` 내장):
- 내부: 강점(Strengths), 약점(Weaknesses)
- 외부: 기회(Opportunities), 위협(Threats)
- 각 사분면별 실행 가능한 전략 도출

**PESTLE 분석** (`system/skills/pm-strategy/pestle-analysis.md`):
- 정치(Political), 경제(Economic), 사회(Social), 기술(Technological), 법률(Legal), 환경(Environmental)
- 각 요인별 영향도 및 시간축 평가

**Porter's Five Forces** (`system/skills/pm-strategy/porters-five-forces.md`):
- 경쟁 강도, 공급자 교섭력, 구매자 교섭력, 대체재 위협, 신규 진입 위협
- 산업 매력도 종합 평가

**Ansoff Matrix** (`system/skills/pm-strategy/ansoff-matrix.md`):
- 시장 침투, 시장 개발, 제품 개발, 다각화
- 리스크 조정된 성장 기회 도출

### Step 3: 크로스 프레임워크 종합
프레임워크 간 교차 분석:
- **수렴 시그널**: 여러 프레임워크가 공통으로 지적하는 포인트
- **전략적 필수 과제**: 분석 전반에서 긴급한 액션
- **핵심 리스크**: 완화해야 할 위협과 역학
- **최적 성장 기회**: 리스크 대비 최고의 성장 플레이

### Step 4: 산출물 저장
산출물을 `workspace/_season/plan_market-scan.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "이 분석 결과를 바탕으로 **브랜드 전략**을 수립하시겠어요?"
- "Porter 분석에서 나온 **주요 경쟁사를 심층 분석**하시겠어요?"
- "시장 침투 기회에 맞는 **가격 전략**을 설계하시겠어요?"
