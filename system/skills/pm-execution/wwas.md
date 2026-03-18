---
type: skill
id: wwas
name: WWA 백로그 작성 (Why-What-Acceptance)
agency: strategy-planning
role: PM (Product Manager)
phase: plan
triggers:
  - "WWAS 작성"
  - "Why-What-Acceptance"
  - "백로그 아이템"
  - "WWA 포맷"
presets:
  - brand.config.json
outputs:
  - "output/[시즌]/_season/plan_wwas.md"
source: pm-skills/pm-execution/wwas
---

# WWA 백로그 작성

> Why-What-Acceptance Structure로 전략적 컨텍스트가 포함된 독립적이고 가치 있는 백로그 아이템 작성 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 전략적 맥락이 포함된 구조화된 백로그 아이템 작성 시
- 기능을 독립적인 작업 단위로 분해할 때
- 팀에 전략적 의도를 명확히 전달해야 할 때
- 유저 스토리 대신 Why-What-Acceptance 포맷을 사용할 때

## FPOF 컨텍스트
- `brand.config.json`의 5대 경영목표와 비전을 Why(전략적 이유)에 연결
- 와키윌리 시즌 로드맵의 마일스톤을 백로그 아이템의 전략 맥락으로 활용
- 각 아이템이 브랜드 전략에 어떻게 기여하는지를 Why 섹션에서 명시

## 사전 준비
- `.fpof-state.json`에서 현재 시즌/단계 확인
- `brand.config.json`에서 5대 경영목표, 비전, 로드맵 확인
- 사용자가 제공하는 기능 설명, 디자인 파일, 가정 사항 읽기

## 실행 절차

### Step 1: 전략적 Why 정의
작업을 비즈니스 및 팀 목표에 연결한다.

### Step 2: What 기술
간결하게 기술하고, 디자인을 참조한다. 상세 스펙이 아닌 논의의 기억(reminder)으로 작성한다.

### Step 3: Acceptance Criteria 작성
상세 스펙이 아닌 고수준의 수용 기준을 작성한다.

### Step 4: 독립성 확보
아이템을 순서에 관계없이 개발할 수 있게 한다.

### Step 5: 협상 가능성 유지
팀 대화를 유도하되, 제약을 부과하지 않는다.

### Step 6: 가치 확보
각 아이템이 측정 가능한 사용자 또는 비즈니스 가치를 전달하게 한다.

### Step 7: 테스트 가능성 확보
결과가 관찰 가능하고 검증 가능하게 한다.

### Step 8: 와키윌리 적용 필터링
- Why가 5대 경영목표 중 하나와 직접 연결되는지 확인
- What이 현재 시즌 PDCA 단계의 산출물과 정합하는지 확인
- 아이템 크기가 한 스프린트 내 추정/완료 가능한지 점검

## 아이템 템플릿
```markdown
**제목:** [전달할 것]

**Why:** [1-2문장. 전략적 맥락과 팀 목표에 연결]

**What:** [짧은 설명과 디자인 링크. 최대 1-2 단락. 논의의 기억이지, 상세 스펙이 아님.]

**Acceptance Criteria:**
- [관찰 가능한 결과 1]
- [관찰 가능한 결과 2]
- [관찰 가능한 결과 3]
- [관찰 가능한 결과 4]
```

## 예시 (와키윌리 컨텍스트)
```markdown
**제목:** IP 캐릭터 콜라보 상품 전용 랜딩 페이지

**Why:** 코어 타겟(18~25세)이 IP 캐릭터 콜라보 상품에 높은 관심을 보이고 있으며,
전용 랜딩 페이지를 통해 캐릭터 세계관 몰입과 구매 전환율을 동시에 높일 수 있다.
이는 '히트상품 + IMC 강화' 경영목표에 직접 기여한다.

**What:** 키키 캐릭터 콜라보 시즌 런칭에 맞춰 전용 랜딩 페이지를 제작한다.
캐릭터 세계관 스토리, 상품 라인업, 구매 동선을 포함한다.
디자인은 [Figma 링크] 참조. 상세 인터랙션은 개발팀과의 대화에서 결정한다.

**Acceptance Criteria:**
- 랜딩 페이지에서 캐릭터 세계관 스토리가 자연스럽게 노출됨
- 콜라보 상품 전체 라인업이 한눈에 파악 가능
- '바로 구매' CTA에서 상품 상세 페이지로 즉시 이동 가능
- 모바일/데스크톱 모두에서 3초 이내 로딩
```

## 산출물 포맷
```markdown
# [기능명] WWA 백로그 — [시즌]

## 아이템 1
**제목**: ...
**Why**: ...
**What**: ...
**Acceptance Criteria**: ...
**경영목표 연결**: ...

## 아이템 2
...
```

## 완료 조건
- 기능에 대한 완전한 WWA 백로그 아이템 세트 제시
- 각 아이템에 Why, What, Acceptance Criteria 섹션 포함
- 아이템이 독립적이고 순서에 관계없이 전달 가능
- 한 스프린트 내 추정/완료 가능한 크기
- 전략적 맥락이 팀 의사결정에 충분히 명확

## 체크리스트
- [ ] Why가 5대 경영목표와 직접 연결되는가?
- [ ] What이 상세 스펙이 아닌 논의의 기억(reminder)인가?
- [ ] Acceptance Criteria가 관찰 가능하고 검증 가능한가?
- [ ] 아이템이 독립적으로 개발 가능한가?
- [ ] 한 스프린트 크기로 적절한가?
- [ ] 디자인 참조가 포함되었는가?

---

### 참고 자료
- [How to Write User Stories: The Ultimate Guide](https://www.productcompass.pm/p/how-to-write-user-stories)
