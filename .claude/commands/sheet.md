# FPOF 엑셀 시트 생성

패션 실무에 필요한 엑셀 스프레드시트를 생성합니다. XLSX 스킬을 활용합니다.

## 사용법
`/sheet [유형]` — 유형을 생략하면 현재 단계에서 필요한 시트를 추천합니다.

## 시트 유형

### Plan 단계
- `line-sheet` — 라인시트 (SKU 목록, 사이즈/컬러 비율, OTB 수량, 가격)
- `otb` — OTB (Open-To-Buy) 시트 (카테고리별 예산 배분, 수량 계획)
- `category-mix` — 카테고리 믹스 (카테고리별 SKU 수, 매출 비중 계획)

### Design 단계
- `cost-estimate` — 원가 견적서 (아이템별 원부자재, 가공비, 원가율)
- `color-size` — 컬러/사이즈 브레이크다운 (SKU별 색상-사이즈 매트릭스)

### Do 단계
- `bom` — BOM (Bill of Materials) 시트 (원부자재 명세, 단가, 소요량)
- `production` — 생산 오더시트 (공장별 오더 수량, 납기, 선적 일정)
- `marketing-budget` — 마케팅 예산 시트 (채널별 예산 배분, ROAS 목표)

### Check 단계
- `sales-data` — 매출 데이터 시트 (채널별/카테고리별/SKU별 매출)
- `kpi-tracker` — KPI 추적 시트 (목표 vs 실적, 달성률)

## 절차

1. `.fpof-state.json`에서 현재 시즌 확인
2. `system/presets/wacky-willy/categories.json`, `channels.json` 참조
3. `workspace/`에서 기존 산출물 데이터 참조
4. XLSX 스킬을 사용하여 스프레드시트 생성:
   - 시트 탭 구조: 요약 → 상세 데이터 → 차트 데이터
   - 컬럼 헤더에 필터 적용
   - 합계/소계 수식 자동 삽입
   - 조건부 서식 (달성률 색상 코딩 등)
   - 인쇄 영역 설정
5. `workspace/[프로젝트]/` 에 XLSX 파일 저장

## 시트 디자인 원칙
- 헤더 행: 브랜드 컬러 배경, 흰색 텍스트
- 데이터 영역: 격자 줄 표시, 교대 행 색상
- 합계 행: 볼드, 상단 테두리
- 통화: ₩ 포맷, 천단위 구분
- 비율: % 포맷, 소수점 1자리

$ARGUMENTS 에 유형이 지정되면 해당 시트를, 없으면 추천합니다.
