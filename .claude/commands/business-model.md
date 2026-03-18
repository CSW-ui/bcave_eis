# 비즈니스 모델 탐색 (Business Model)

Lean Canvas, Business Model Canvas, Startup Canvas, Value Proposition 4개 프레임워크로 비즈니스 모델을 분석합니다.

## 사용법
`/business-model [lean|full|startup|value-prop|all] <대상>` — 유형을 생략하면 적합한 프레임워크를 추천합니다.

## 절차

### Step 1: 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — 비전, 포지셔닝, 경영목표
3. `system/presets/wacky-willy/channels.json` 참조 — 채널별 매출/수익 구조
4. 사용자에게 확인:
   - 분석 대상 (브랜드 전체 / 신규 라인 / 특정 채널)
   - 분석 목적 (전략 수립 / 신규 사업 / 투자자 발표 / 연간 리뷰)

### Step 2: 프레임워크 실행

**Lean Canvas** (`system/skills/pm-strategy/lean-canvas.md`):
- 문제(Top 3), 솔루션, 고유 가치 제안
- 핵심 지표, 불공정 우위, 채널, 고객 세그먼트
- 비용 구조, 수익원
- 가장 위험한 가정 + 검증 실험

**Business Model Canvas** (`system/skills/pm-strategy/business-model-canvas.md`):
- 9개 빌딩 블록 (핵심 파트너, 핵심 활동, 가치 제안, 고객 관계, 고객 세그먼트, 핵심 자원, 채널, 비용 구조, 수익원)
- 모델 강점/약점 분석

**Startup Canvas** (`system/skills/pm-strategy/startup-canvas.md`):
- 9개 전략 섹션 + 비즈니스 모델
- 전략 일관성 체크, 위험 가정 도출

**Value Proposition** (`system/skills/pm-strategy/value-proposition.md`):
- JTBD 기반 6파트 템플릿 (Who, Why, What Before, How, What After, Alternatives)
- 밸류 프로포지션 스테이트먼트

### Step 3: 종합 분석 (all 모드)
복수 프레임워크 간 인사이트를 교차 비교하여 수렴/발산 포인트 도출.

### Step 4: 산출물 저장
산출물을 `workspace/_season/plan_business-model.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "이 모델을 **SWOT/PESTLE 분석으로 스트레스 테스트**하시겠어요?"
- "수익원에 맞는 **가격 전략**을 설계하시겠어요?"
- "이 모델 기반으로 **프로덕트 전략 캔버스**를 만드시겠어요?"
