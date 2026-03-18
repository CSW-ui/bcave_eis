---
type: skill
id: summarize-interview
name: 고객 인터뷰 요약 (Summarize Customer Interview)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "인터뷰 정리해줘"
  - "고객 인터뷰 요약"
  - "summarize interview"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/_season/plan_summarize-interview.md"
source: pm-skills/pm-product-discovery/summarize-interview
---

# 고객 인터뷰 요약 (Summarize Customer Interview)

> JTBD 기반 인터뷰 요약 및 인사이트 카드 연계 -- 인터뷰 트랜스크립트를 구조화된 요약으로 변환하여 디스커버리 의사결정에 활용

## 언제 사용
- 고객 인터뷰 녹음/트랜스크립트를 정리할 때
- 디스커버리 인터뷰를 합성하여 패턴을 발견할 때
- 인터뷰 요약을 팀과 공유할 때
- 인사이트 카드로 연결하여 지식 베이스에 축적할 때

## FPOF 컨텍스트
- 이 스킬은 와키윌리 코어 타겟 인터뷰 결과를 구조화하여 시즌 기획에 반영하는 데 활용합니다
- 데이터 인텔리전스의 insight-archiving 스킬과 연계하여 브랜드 지식 베이스에 축적
- 관련 프리셋: brand.config.json (전략), personas.json (코어 타겟), categories.json (카테고리)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `personas.json`에서 코어 타겟 프로필 확인 (요약 시 맥락 활용)
- 인터뷰 트랜스크립트 (텍스트, PDF, 오디오 전사) 준비
- 첨부 파일이 있으면 먼저 읽기

## 도메인 컨텍스트

고객 인터뷰 요약은 Continuous Discovery에서 인사이트를 체계적으로 축적하는 핵심 활동입니다. 단순 녹취록이 아닌, JTBD 관점에서 고객의 현재 솔루션, 만족/불만족 요소, 핵심 인사이트를 구조화합니다.

## 실행 절차

### Step 1: 전체 트랜스크립트 읽기
요약하기 전에 전체 트랜스크립트를 주의 깊게 읽기

### Step 2: 요약 템플릿 작성
아래 템플릿을 채우기. 정보가 없는 항목은 "-"로 표기. 수치가 없으면 정성적 설명으로 대체 (예: "만족하지 않음").

### Step 3: 명확하고 간단한 언어 사용
초등학생도 이해할 수 있는 수준의 명확하고 간단한 언어로 작성

### Step 4: 와키윌리 적용 필터링
- 코어 타겟(18~25세 트렌드리더) 관점에서의 인사이트 태깅
- 브랜드 DNA(Kitsch Street & IP Universe) 관련 언급 하이라이트
- 채널(무신사, 자사몰 등) 관련 인사이트 분리
- 5대 경영목표와 연결 가능한 인사이트 표시

## 산출물 포맷

```markdown
# 고객 인터뷰 요약

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 인터뷰 정보
**날짜**: [인터뷰 일시]
**참여자**: [이름과 역할]
**배경**: [고객 배경 정보]

## 현재 솔루션
[현재 사용하는 솔루션]

## 현재 솔루션의 좋은 점
- [JTBD, 원하는 결과, 중요도, 만족도]

## 현재 솔루션의 문제점
- [JTBD, 원하는 결과, 중요도, 만족도]

## 핵심 인사이트
- [예상치 못한 발견 또는 주목할 인용]

## 액션 아이템
- [날짜, 담당자, 액션]

## 와키윌리 적용 시사점
- 코어 타겟 인사이트:
- 브랜드 관련 인사이트:
- 채널 관련 인사이트:
- 경영목표 연결:
```

## 완료 조건
- [ ] 전체 트랜스크립트를 읽고 요약
- [ ] JTBD 기반 구조화 완성
- [ ] 현재 솔루션의 좋은 점/문제점 분리
- [ ] 핵심 인사이트 및 액션 아이템 도출
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] personas.json의 코어 타겟 프로필과 인터뷰이 매칭?
- [ ] brand.config.json의 전략 방향과 연결된 인사이트가 표시?
- [ ] 명확하고 간단한 언어로 작성되었는가?
- [ ] 의견이 아닌 행동/사실 기반으로 정리되었는가?
- [ ] 인사이트 아카이빙(knowledge/)과 연계 가능한가?

## 참고 자료
- Rob Fitzpatrick, *The Mom Test*
- Teresa Torres, *Continuous Discovery Habits*
- [User Interviews: The Ultimate Guide to Research Interviews](https://www.productcompass.pm/p/interviewing-customers-the-ultimate)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
