---
type: skill
id: user-stories
name: 유저 스토리 작성 (User Stories)
agency: strategy-planning
role: PM (Product Manager)
phase: plan
triggers:
  - "유저 스토리 작성"
  - "As a/I want/So that"
  - "user stories"
  - "백로그 스토리"
presets:
  - personas.json
outputs:
  - "output/[시즌]/_season/plan_user-stories.md"
source: pm-skills/pm-execution/user-stories
---

# 유저 스토리 작성

> INVEST 기준과 3C's(Card/Conversation/Confirmation) 프레임워크를 적용한 유저 스토리 작성 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 기능을 백로그 아이템으로 분해할 때
- 자사몰/앱 기능의 유저 스토리 작성 시
- 수용 기준이 필요한 구조화된 스토리 정의 시
- 스프린트 단위로 개발 가능한 작업 분할 시

## FPOF 컨텍스트
- `personas.json`의 UNI/WOMAN 페르소나를 유저 역할에 반영
- 와키윌리 자사몰, 앱, 무신사 등 채널별 사용자 경험 차이를 스토리에 반영
- 고객(18~25세 트렌드리더)의 쇼핑 행동과 기대를 기반으로 스토리 작성

## 사전 준비
- `.fpof-state.json`에서 현재 시즌/단계 확인
- `personas.json`에서 페르소나별 특성, 행동 패턴 확인
- 사용자가 제공하는 기능 설명, 디자인 파일, 가정 사항 읽기

## 실행 절차

### Step 1: 기능 분석
제공된 디자인과 컨텍스트를 기반으로 기능을 분석한다.

### Step 2: 사용자 역할 식별
구분되는 사용자 역할과 고유한 사용자 여정을 식별한다.

### Step 3: 3C's 프레임워크 적용
- **Card**: 간단한 제목과 한 줄 설명
- **Conversation**: 의도에 대한 상세 논의
- **Confirmation**: 명확한 수용 기준

### Step 4: INVEST 기준 준수
- **I**ndependent: 독립적 — 다른 스토리와 독립적으로 개발 가능
- **N**egotiable: 협상 가능 — 구현 방식은 팀이 결정
- **V**aluable: 가치 있음 — 사용자 또는 비즈니스 가치를 전달
- **E**stimable: 추정 가능 — 팀이 규모를 추정할 수 있음
- **S**mall: 작음 — 한 스프린트 내 완료 가능
- **T**estable: 테스트 가능 — 수용 기준으로 검증 가능

### Step 5: 평이한 언어 사용
누구나 이해할 수 있는 쉬운 용어로 작성한다.

### Step 6: 디자인 파일 연결

### Step 7: 와키윌리 적용 필터링
- 사용자 역할이 `personas.json`의 페르소나와 일치하는지 확인
- 스토리가 와키윌리 채널(자사몰, 무신사, 29CM 등)의 UX와 정합하는지 확인
- 각 스토리가 5대 경영목표에 기여하는지 점검

## 스토리 템플릿
```markdown
**제목:** [기능명]

**설명:** As a [사용자 역할], I want to [행동], so that [혜택].

**디자인:** [디자인 파일 링크]

**수용 기준:**
1. [명확하고 테스트 가능한 기준]
2. [관찰 가능한 행동]
3. [시스템 검증]
4. [엣지 케이스 처리]
5. [성능 또는 접근성 고려]
6. [통합 포인트]
```

## 예시 (와키윌리 컨텍스트)
```markdown
**제목:** 캐릭터별 상품 필터

**설명:** As a 와키윌리 온라인 쇼퍼, I want to 좋아하는 캐릭터(키키, 몽몽 등)로 상품을 필터링하고 싶어서, so that 원하는 캐릭터 콜라보 상품을 빠르게 찾을 수 있다.

**디자인:** [Figma 링크]

**수용 기준:**
1. 상품 리스트 페이지에 캐릭터 필터가 노출됨
2. 필터 선택 시 해당 캐릭터가 적용된 상품만 표시됨
3. 복수 캐릭터 동시 선택 가능
4. 필터 결과가 0건일 때 안내 메시지 표시
5. 필터 해제 시 전체 상품으로 복귀
6. 모바일/데스크톱 모두에서 동일하게 작동
```

## 산출물 포맷
```markdown
# [기능명] 유저 스토리 — [시즌]

## 유저 스토리 1
**제목**: ...
**설명**: As a ..., I want to ..., so that ...
**디자인**: ...
**수용 기준**: ...
**INVEST 체크**: ...
**페르소나 연결**: ...

## 유저 스토리 2
...
```

## 완료 조건
- 기능에 대한 완전한 유저 스토리 세트 제시
- 각 스토리에 제목, 설명, 디자인 링크, 4~6개 수용 기준 포함
- 스토리가 독립적이고 순서에 관계없이 개발 가능
- 각 스토리가 한 스프린트 내 완료 가능한 크기

## 체크리스트
- [ ] 모든 스토리가 INVEST 기준을 충족하는가?
- [ ] 3C's(Card/Conversation/Confirmation)가 적용되었는가?
- [ ] 수용 기준이 테스트 가능하고 관찰 가능한가?
- [ ] `personas.json`의 페르소나와 연결되었는가?
- [ ] 스토리가 한 스프린트 크기로 적절한가?
- [ ] 디자인 파일 참조가 포함되었는가?

---

### 참고 자료
- [How to Write User Stories: The Ultimate Guide](https://www.productcompass.pm/p/how-to-write-user-stories)
