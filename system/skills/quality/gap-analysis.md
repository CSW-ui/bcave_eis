---
type: skill
id: gap-analysis
name: 갭 분석
agency: quality-control
role: 갭 디텍터 (Gap Detector)
phase: check
triggers:
  - 갭 분석해줘
  - 기획대로 됐어?
  - Match Rate 뭐야?
  - 기획 vs 실적 비교해줘
presets:
  - brand.config.json
  - channels.json
outputs:
  - "output/[시즌]/check/gap-report.md"
---

# 갭 분석

> 갭 디텍터가 기획(Plan)과 실행(Do/Check) 간의 차이를 분석하고 Match Rate를 산출하는 전문 매뉴얼

## 언제 사용
- "기획대로 됐어?", "갭 분석해줘", "Match Rate 알려줘"
- Check 단계에서 매출 분석 완료 후

## 사전 준비
1. `output/[시즌]/plan/` → 기획 산출물 전체
2. `output/[시즌]/check/sales-analysis.md` → 실적 데이터
3. `presets/wacky-willy/brand.config.json` → 경영목표 KPI
4. `presets/wacky-willy/channels.json` → 채널별 목표

## 실행 절차

### Step 1: 영역별 기획 vs 실적 대비
- 매출 목표 달성률 (전체/채널별/카테고리별)
- 챔피언 상품 기여율
- QR 비중
- 마케팅 KPI (ROAS, 전환율)
- 경영목표 KPI 5개

### Step 2: Gap 크기 & 원인 분류
| 영역 | 기획 | 실적 | Gap | Gap율 | 원인 유형 | 심각도 |

**원인 유형:** 예측 오류 / 실행 부족 / 외부 변수 / 구조 문제
**심각도:** 🔴 Critical(>20%) / 🟡 Warning(10~20%) / 🟢 Minor(<10%)

### Step 3: Match Rate 산출
```
가중 Match Rate = Σ(영역별 달성률 × 가중치) ÷ Σ가중치
가중치: 경영목표 연결 = 3x, 매출 관련 = 2x, 기타 = 1x
```

### Step 4: Top 3 갭 상세 분석
각 갭: 기획 의도 → 실제 결과 → 외부/내부 원인 → 개선 방향

### Step 5: 개선 액션 도출
| # | 액션 | 담당 에이전시 | 우선순위 | 예상 효과 |

## 산출물 포맷
```markdown
# [시즌] 갭 분석 리포트

## 작성일: YYYY-MM-DD
## 전체 Match Rate: [XX]%

## 영역별 갭
| 영역 | 기획 | 실적 | Gap | 원인 | 심각도 |

## Top 3 갭 상세 분석
### 1. [영역명]
- 기획 의도:
- 실제 결과:
- 외부 요인:
- 내부 요인:
- 개선 방향:

## 개선 액션 (Act 단계 연결)
| # | 액션 | 담당 | 우선순위 | 예상 효과 |

## 판정
Match Rate [XX]% → [QG4 PASS / Act 단계 진입]
```

## 완료 조건
- [ ] 전체 Match Rate 산출
- [ ] 영역별 갭 분석
- [ ] Top 3 갭 상세 분석
- [ ] 개선 액션 도출

## 체크리스트
- [ ] 기획과 실적이 같은 기준으로 비교되었는가?
- [ ] 원인이 "외부 vs 내부"로 구분되었는가?
- [ ] 가중치가 경영목표 중요도를 반영하는가?
- [ ] 개선 액션이 구체적이고 담당자가 명확한가?
