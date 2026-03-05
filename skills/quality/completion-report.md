---
type: skill
id: completion-report
name: PDCA 완료 보고서
agency: quality-control
role: 리포트 제너레이터 (Report Generator)
phase: check
triggers:
  - 완료 보고서 만들어줘
  - 시즌 리포트 작성해줘
  - PDCA 요약해줘
  - 이번 시즌 정리해줘
  - 다음 시즌 추천해줘
presets:
  - brand.config.json
  - channels.json
outputs:
  - "output/[시즌]/check/completion-report.md"
---

# PDCA 완료 보고서

> 리포트 제너레이터가 PDCA 사이클 전체를 요약하고 다음 시즌 추천을 도출하는 전문 매뉴얼

## 언제 사용
- "시즌 정리해줘", "완료 보고서 만들어줘", "PDCA 요약해줘"
- QG4 PASS 후 또는 Act 단계 완료 후

## 사전 준비
1. `output/[시즌]/plan/` → Plan 단계 산출물 전체
2. `output/[시즌]/design/` → Design 단계 산출물
3. `output/[시즌]/do/` → Do 단계 산출물
4. `output/[시즌]/check/sales-analysis.md` → 매출 분석
5. `output/[시즌]/check/gap-report.md` → 갭 분석 리포트
6. `knowledge/insights/` → 도출된 인사이트
7. `presets/wacky-willy/brand.config.json` → 경영목표

## 실행 절차

### Step 1: PDCA 사이클 타임라인
| 단계 | 시작일 | 완료일 | 주요 산출물 | QG 결과 |
|------|--------|--------|-------------|---------|
| Plan | | | | QG1 |
| Design | | | | QG2 |
| Do | | | | QG3 |
| Check | | | | QG4 |

### Step 2: 핵심 성과 요약
- 전체 매출 달성률
- 5대 경영목표 KPI 달성 현황
- 챔피언 상품 성과
- 히트상품 기여율
- 글로벌 성장률

### Step 3: Top 3 성공 & Top 3 개선점
**성공:**
| # | 항목 | 성과 | 성공 요인 |
**개선점:**
| # | 항목 | Gap | 원인 | 개선 방향 |

### Step 4: 인사이트 & 러닝 요약
- 이번 시즌 핵심 인사이트 (knowledge/에서 추출)
- 재현 가능한 성공 패턴
- 회피해야 할 실패 패턴

### Step 5: 다음 시즌 추천
| # | 추천 항목 | 근거 | 우선순위 | 담당 에이전시 |
- 상품 방향 추천
- 마케팅 전략 추천
- 채널 전략 추천
- 운영 개선 추천

### Step 6: 경영진 한 페이지 요약
```
[시즌] 한눈에 보기
━━━━━━━━━━━━━━━━━
매출: [X]억 (달성률 [X]%)
Match Rate: [X]%
핵심 성과: [한 줄]
핵심 과제: [한 줄]
다음 시즌 키워드: [3개]
```

## 산출물 포맷
```markdown
# [시즌] PDCA 완료 보고서

## 작성일: YYYY-MM-DD
## 작성자: Report Generator

## 1. PDCA 사이클 타임라인
## 2. 핵심 성과 요약
## 3. 경영목표 KPI 달성 현황
| 경영목표 | KPI | 목표 | 실적 | 달성률 |
## 4. Top 3 성공 & Top 3 개선점
## 5. 인사이트 요약
## 6. 다음 시즌 추천
## 7. 경영진 한 페이지 요약

## 판정
전체 Match Rate: [X]% → [시즌 완료 / Act 단계 속행]
```

## 완료 조건
- [ ] PDCA 전 단계 타임라인 정리
- [ ] 경영목표 KPI 달성 현황 완성
- [ ] Top 3 성공/개선점 도출
- [ ] 다음 시즌 추천 작성
- [ ] 경영진 한 페이지 요약

## 체크리스트
- [ ] 모든 단계의 산출물이 참조되었는가?
- [ ] 갭 분석 결과가 반영되었는가?
- [ ] 인사이트가 knowledge/와 연결되었는가?
- [ ] 다음 시즌 추천이 구체적이고 실행 가능한가?
- [ ] 경영진 요약이 1페이지 이내인가?
