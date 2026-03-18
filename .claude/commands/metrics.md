# 메트릭스 대시보드 설계 (Metrics Dashboard)

North Star Metric, 인풋 메트릭, 헬스 메트릭, 알림 임계치를 포함한 종합 메트릭스 프레임워크를 설계합니다.

## 사용법
`/metrics <대상 상품 또는 영역>` — 대상을 생략하면 와키윌리 시즌 전체 기준으로 설계합니다.

## 절차

### Step 1: 측정 대상 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/channels.json` 참조 — 채널별 KPI
3. `system/presets/wacky-willy/brand.config.json` 참조 — 5대 경영목표
4. 사용자에게 확인:
   - 메트릭스 설계 대상 (시즌 전체 / 특정 캠페인 / 채널)
   - 현재 단계 (프리런칭 / 런칭 직후 / 성숙)
   - 현재 비즈니스 목표 또는 OKR
   - 기존 메트릭스가 있는지, 무엇이 부족한지

### Step 2: 메트릭스 프레임워크 설계
`system/skills/data/sales-analysis.md` (메트릭스 대시보드/NSM 내장) 참조:

**North Star Metric**:
- 상품이 고객에게 전달하는 가치를 가장 잘 포착하는 단일 지표
- 검증 기준: 가치 전달 측정, 선행 지표, 측정 가능, 전원 이해, 실행 가능, 허영 지표 아님

**인풋 메트릭 (3~5개)**:
- North Star를 구동하는 레버
- 각 메트릭이 특정 팀에 의해 직접 영향 가능
- 인과 체인 매핑: 인풋 → North Star → 비즈니스 성과

**헬스 메트릭 (3~5개)**:
- 안정적이어야 하는 지표 — 하락하면 문제 신호
- 건강 범위와 악화 임계치 정의

**카운터 메트릭 (1~2개)**:
- 잘못된 방향으로 최적화하는 것을 방지하는 지표

### Step 3: 알림 임계치 설계
각 메트릭별 Green/Yellow/Red 기준 및 점검 빈도 설정.

### Step 4: 산출물 저장
산출물을 `workspace/_season/check_metrics-dashboard.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "이 메트릭스를 계산할 **SQL 쿼리**를 작성하시겠어요?"
- "메트릭스 프레임워크 기반으로 **OKR**을 만드시겠어요?"
- "현실적 기준선을 설정할 **코호트 분석**을 하시겠어요?"
