---
type: skill
id: social-viral
name: 소셜 & 바이럴 전략
agency: marketing-showroom
role: 소셜 전략 디렉터 (Social Strategy Director)
phase: do
triggers:
  - 인플루언서 매핑해줘
  - 바이럴 전략 세워줘
  - 콘텐츠 캘린더 짜줘
  - 런칭 시퀀스 설계해줘
  - 시딩 전략 짜줘
  - 팬덤 전략 세워줘
presets:
  - personas.json
  - channels.json
outputs:
  - "output/[시즌]/do/social-strategy.md"
  - "output/[시즌]/do/influencer-map.md"
  - "output/[시즌]/do/launch-sequence.md"
---

# 소셜 & 바이럴 전략

> 소셜 전략 디렉터가 인플루언서, 바이럴, 런칭 시퀀스를 설계하는 전문 매뉴얼

## 언제 사용
- "인플루언서 찾아줘", "바이럴 전략 세워줘", "런칭 시퀀스 짜줘"
- Do 단계에서 IMC 전략 수립 후

## 사전 준비
1. `output/[시즌]/do/campaign-brief.md` → 캠페인 전략, 3단계 로드맵
2. `presets/wacky-willy/personas.json` → 타겟의 미디어 소비, 팔로우 인플루언서 유형
3. `presets/wacky-willy/channels.json` → 온라인 채널 전략

## 인플루언서 매핑

**매핑 기준:**
- 타겟 페르소나: UNI(남녀 공통) / WOMAN
- 팔로워 규모: 나노(1K~10K) / 마이크로(10K~50K) / 미드(50K~200K) / 매크로(200K+)
- 카테고리: 패션 / 라이프스타일 / 뷰티 / 엔터
- 브랜드핏: 와키윌리 감성(키치/스트릿/자유분방)과의 정합성

## 시딩 전략
- 시딩 상품 선정 (챔피언 상품 우선)
- 발송 시기: Teasing 단계 전
- 언박싱 가이드라인: 브랜드 경험 설계
- 콘텐츠 가이드라인: 자유도 vs 브랜드 메시지 밸런스

## 바이럴 메커니즘
- 챌린지: TikTok 해시태그 챌린지
- UGC 유도: 착용샷 이벤트, 스타일링 대결
- 밈 소재: 키키 캐릭터 밈 템플릿
- 커뮤니티: 팬덤 공간 (디스코드/오픈채팅)

## 런칭 시퀀스

| D-날짜 | 액션 | 채널 | 담당 | 콘텐츠 |
|--------|------|------|------|--------|
| D-14 | 티저 이미지 공개 | 인스타 스토리 | Content Director | 실루엣 힌트 |
| D-10 | 인플루언서 시딩 | 오프라인 | Social Strategy | 언박싱 키트 |
| D-7 | 컬러 티저 | 인스타/TikTok | Content Director | 컬러 스포일러 |
| D-3 | 카운트다운 | 인스타/TikTok | Fashion Editor | 카운트다운 카피 |
| D-Day | 전 채널 오픈 | 전체 | Marketing Director | 풀 런칭 |
| D+1 | 인플루언서 리뷰 | 인스타/유튜브 | Social Strategy | 리뷰 콘텐츠 |
| D+3 | 착용샷/스타일링 | 인스타/TikTok | Content Director | 스타일링 가이드 |
| D+7 | UGC 리그램 | 인스타 | Social Strategy | 고객 콘텐츠 |
| D+14 | 챌린지/이벤트 | TikTok | Social Strategy | 해시태그 챌린지 |

## 산출물 포맷

```markdown
# [시즌] 소셜 & 바이럴 전략

## 작성일: YYYY-MM-DD
## 작성자: Social Strategy Director

## 인플루언서 매핑
| # | 이름 | 플랫폼 | 팔로워 | 카테고리 | 브랜드핏 | 협업 형태 |

## 시딩 전략
- 시딩 상품:
- 발송 시기:
- 언박싱 가이드:

## 바이럴 메커니즘
| 유형 | 기획 내용 | 채널 | 목표 KPI |

## 런칭 시퀀스
| D-날짜 | 액션 | 채널 | 담당 | 상태 |

## 팬덤/커뮤니티
- 운영 채널:
- 핵심 프로그램:
```

## 완료 조건
- [ ] 인플루언서 매핑 완료
- [ ] 시딩 전략 수립
- [ ] 런칭 시퀀스 설계
- [ ] 바이럴 메커니즘 1개 이상
- [ ] 사용자 승인

## 체크리스트
- [ ] 인플루언서가 코어 타겟(18~25세)에 영향력 있는가?
- [ ] 시딩 시기가 캠페인 3단계(Teasing)에 맞는가?
- [ ] 런칭 시퀀스가 캠페인 브리프와 정합성 있는가?
- [ ] IP 캐릭터(키키)를 활용한 바이럴 요소가 있는가?
