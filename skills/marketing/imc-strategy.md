---
type: skill
id: imc-strategy
name: IMC 전략 & GTM
agency: marketing-showroom
role: 마케팅 디렉터 (Marketing Director)
phase: do
triggers:
  - 마케팅 전략 짜줘
  - GTM 계획 세워줘
  - 채널 믹스 어떻게?
  - 마케팅 예산 배분 제안해줘
  - 런칭 로드맵 만들어줘
  - IMC 캘린더 짜줘
  - 캠페인 큰 그림 그려줘
presets:
  - channels.json
  - brand.config.json
  - personas.json
outputs:
  - "output/[시즌]/do/campaign-brief.md"
  - "output/[시즌]/do/imc-calendar.md"
---

# IMC 전략 & GTM

> 마케팅 디렉터가 통합 마케팅 커뮤니케이션 전략을 수립하고 런칭을 총괄하는 전문 매뉴얼

## 언제 사용
- "마케팅 전략 짜줘", "캠페인 어떻게 갈까?", "GTM 계획 세워줘"
- PDCA Do 단계에서 마케팅 작업 시작 시

## 사전 준비
1. `output/[시즌]/plan/brand-strategy.md` → 시즌 테마, 타겟
2. `output/[시즌]/plan/season-concept.md` → 챔피언 상품, 가격 전략
3. `presets/wacky-willy/channels.json` → 6개 채널 매출 목표/성장률
4. `presets/wacky-willy/brand.config.json` → 경영목표 (히트상품+IMC)
5. `presets/wacky-willy/personas.json` → 타겟 미디어 소비 습관

## 캠페인 3단계 설계

**Phase 1: TEASING (D-14 ~ D-7)**
- 목적: 호기심 유발, 기대감 조성
- 채널: 인스타 스토리, TikTok 티저
- 콘텐츠: 실루엣 힌트, 컬러 티저, 카운트다운
- KPI: 도달율, 저장/공유 수

**Phase 2: MAIN LAUNCH (D-Day ~ D+7)**
- 목적: 전면 공개, 구매 전환
- 채널: 전 채널 동시
- 콘텐츠: 룩북, 화보, PDP, 인플루언서 리뷰
- KPI: 매출, 전환율, ROAS

**Phase 3: SUSTAIN (D+7 ~ D+30)**
- 목적: 지속 노출, 리뷰/UGC 확산
- 채널: SNS, 자사몰 기획전
- 콘텐츠: 착용샷, 스타일링 가이드, 고객 리뷰
- KPI: 재구매율, UGC 수, 팬덤 활성도

## 채널 믹스 설계
channels.json 기반으로 채널별 역할과 예산을 배분한다.
- 온라인: 자사몰(전환), 외부몰(노출), SNS(인게이지먼트)
- 오프라인: 샵인샵(볼륨), FSS(경험), 면세(글로벌)
- 글로벌: 대만 1호점 연계 (경영목표 #5)

## 산출물 포맷

```markdown
# [시즌] 캠페인 브리프

## 작성일: YYYY-MM-DD
## 작성자: Marketing Director

## 캠페인 개요
- 시즌 테마:
- 핵심 메시지:
- 타겟:
- 캠페인 기간:

## 3단계 로드맵
| 단계 | 기간 | 목적 | 채널 | 핵심 콘텐츠 | KPI |

## 채널 믹스
| 채널 | 역할 | 콘텐츠 유형 | 예산 비중 | 매출 목표 |

## 마케팅 KPI
| KPI | 목표 | 측정 방법 |

## IMC 캘린더
| 주차 | 단계 | 채널 | 액션 | 담당 | 상태 |

## 글로벌 GTM (해당 시)
| 시장 | 채널 | 현지화 포인트 | KOL 전략 |
```

## 완료 조건
- [ ] 캠페인 3단계 설계
- [ ] 채널 믹스 & 예산 배분
- [ ] KPI 설정
- [ ] IMC 캘린더 완성
- [ ] 사용자 승인

## 체크리스트
- [ ] channels.json의 채널별 목표와 정합성?
- [ ] 경영목표 #2(히트상품+IMC)에 기여하는 구조인가?
- [ ] 챔피언 상품에 마케팅 자원이 집중되어 있는가?
- [ ] 코어 타겟의 미디어 소비 습관에 맞는 채널 선택인가?
