---
type: skill
id: costing-ve
name: 원가 계산 & VE
agency: product-lab
role: 프로덕션 매니저 (Production Manager)
phase: design
triggers:
  - 원가 계산해줘
  - 이 디자인 원가 맞아?
  - 원가 오버야 어떻게 해?
  - VE 제안해줘
  - 마진 맞아?
presets:
  - categories.json
  - channels.json
outputs:
  - "output/[시즌]/design/[상품]-costing.md"
---

# 원가 계산 & VE (Value Engineering)

> 프로덕션 매니저가 디자인의 원가를 산출하고, 타겟 초과 시 VE를 제안하는 전문 매뉴얼

## 언제 사용
- "원가 맞아?", "VE 해줘", "마진 계산해줘"
- Design 단계에서 디자인 스펙 완료 후 (QG2 전에)

## 사전 준비
1. `output/[시즌]/design/[아이템]-design-spec.md` → 소재, 디테일 정보
2. `output/[시즌]/plan/season-concept.md` → 가격대별 원가율 기준
3. `presets/wacky-willy/categories.json` → 카테고리별 타겟 원가율

## 실행 절차

### Step 1: 소재비 산출
- 원단: 단가(원/yard) × 소요량(yard)
- 소요량 산출: 패턴 배치 효율 고려 (로스율 포함)

### Step 2: 부자재비 산출
- 항목별 단가 × 수량
- 특수 부자재 별도 산출

### Step 3: 가공비 산출
- 봉제 가공비: 난이도별 단가
- 프린트/자수: 기법별, 위치별 단가
- 후가공: 워싱, 가먼트다잉 등

### Step 4: 원가 합산 & 검증
- 총 원가 = 소재비 + 부자재비 + 가공비 + 기타
- 원가율 = 총 원가 ÷ 소비자가 × 100
- 판정: Under Budget / On Target / Over Budget

### Step 5: VE 제안 (Over Budget 시)
- **소재 VE**: 동등 품질 대체 소재, 조성 비율 조정
- **공정 VE**: 봉제 단순화, 공정 수 축소
- **디테일 VE**: 부자재 변경, 프린트 컬러 수 감소
- **수량 VE**: 발주 물량 증가로 단가 협상
- 각 VE의 절감 금액과 품질 영향도 명시

## 산출물 포맷

```markdown
# [아이템명] 원가 계산서

## 작성일: YYYY-MM-DD
## 작성자: Production Manager

## 소재비
| # | 소재명 | 단가 | 소요량 | 로스율 | 금액 |

## 부자재비
| # | 부자재명 | 단가 | 수량 | 금액 |

## 가공비
| # | 공정 | 단가 | 비고 |

## 원가 합계
| 항목 | 금액 |
|------|------|
| 총 원가 | |
| 소비자가 | |
| 원가율 | |
| 타겟 원가율 | |
| 판정 | Under/On/Over |

## VE 제안 (Over Budget 시)
| # | VE 유형 | 제안 내용 | 절감 금액 | 품질 영향 | 추천도 |
```

## 완료 조건
- [ ] 전체 원가 산출 완료
- [ ] 타겟 원가율 이내 확인 (또는 VE 적용)
- [ ] 사용자 승인

## 체크리스트
- [ ] 소재 소요량에 로스율이 반영되었는가?
- [ ] 특수 공정 비용이 누락되지 않았는가?
- [ ] VE 제안이 브랜드 품질 수준을 훼손하지 않는가?
- [ ] 원가율이 채널별 마진 구조에 부합하는가?
