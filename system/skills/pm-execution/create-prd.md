---
type: skill
id: create-prd
name: PRD 작성 (Create PRD)
agency: strategy-planning
role: PM (Product Manager)
phase: plan
triggers:
  - "PRD 작성해줘"
  - "요구사항 정의서"
  - "상품 기획서"
  - "create PRD"
  - "product requirements document"
presets:
  - brand.config.json
  - categories.json
  - personas.json
outputs:
  - "output/[시즌]/[프로젝트]/plan_prd.md"
source: pm-skills/pm-execution/create-prd
---

# PRD 작성

> 8개 섹션 템플릿 기반 종합 요구사항 정의서 작성 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 신규 카테고리/라인 론칭 시 요구사항 정의서 작성
- 상품 기획 문서 작성
- 기능 스펙 문서 작성
- 기존 PRD 검토 및 개선

## FPOF 컨텍스트
- 패션 하우스의 신규 라인/카테고리 론칭, IP 협업 기획, 채널 전용 상품 기획 등에 활용
- `categories.json`의 카테고리 전략, `personas.json`의 타겟 페르소나 참조
- `brand.config.json`의 비전/포지셔닝과 정합

## 사전 준비
- `.fpof-state.json`에서 현재 시즌/단계 확인
- 관련 프리셋 파일 (categories, personas, brand.config) 로드
- 사용자 제공 리서치 자료, 고객 데이터 읽기

## 실행 절차

### Step 1: 정보 수집
사용자가 파일을 제공하면 꼼꼼히 읽는다. 리서치, URL, 고객 데이터를 언급하면 웹 검색으로 추가 컨텍스트와 시장 인사이트를 수집한다.

### Step 2: 단계적 사고
작성 전에 분석:
- 어떤 문제를 해결하는가?
- 누구를 위해 해결하는가?
- 성공을 어떻게 측정할 것인가?
- 제약 조건과 가정은 무엇인가?

### Step 3: PRD 8개 섹션 템플릿 적용

**1. 요약 (Summary)** (2-3문장)
- 이 문서의 내용은 무엇인가?

**2. 담당자 (Contacts)**
- 주요 이해관계자의 이름, 역할, 코멘트

**3. 배경 (Background)**
- 컨텍스트: 이 이니셔티브는 무엇에 관한 것인가?
- 왜 지금인가? 무엇이 변했는가?
- 최근에 가능해진 것인가?

**4. 목표 (Objective)**
- 목표는 무엇인가? 왜 중요한가?
- 회사와 고객에게 어떤 이익이 있는가?
- 비전과 전략에 어떻게 부합하는가?
- Key Results: 성공을 어떻게 측정할 것인가? (SMART OKR 형식)

**5. 시장 세그먼트 (Market Segments)**
- 누구를 위해 만드는가?
- 어떤 제약이 있는가?
- 참고: 시장은 인구통계가 아닌 사람들의 문제/과업으로 정의

**6. 가치 제안 (Value Propositions)**
- 어떤 고객 과업/니즈를 다루는가?
- 고객은 무엇을 얻는가?
- 어떤 불편함을 피할 수 있는가?
- 경쟁사보다 나은 점은?
- Value Curve 프레임워크 고려

**7. 솔루션 (Solution)**
- 7.1 UX/프로토타입 (와이어프레임, 사용자 플로우)
- 7.2 핵심 기능 (상세 기능 설명)
- 7.3 기술 (해당 시에만)
- 7.4 가정 (믿지만 증명하지 못한 것)

**8. 출시 (Release)**
- 소요 기간은?
- 1차 버전 vs 향후 버전 범위
- 정확한 날짜 대신 상대적 일정 사용

### Step 4: 접근 가능한 언어 사용
초등학생도 이해할 수 있는 수준으로 작성. 전문 용어 회피. 명확하고 짧은 문장 사용.

### Step 5: 와키윌리 적용 필터링
- 시장 세그먼트에 `personas.json`의 UNI/WOMAN 페르소나 반영
- 가치 제안에 와키윌리의 Kitsch Street & IP Universe 컨셉 연결
- 출시 계획에 시즌 PDCA 사이클과의 타이밍 맞춤

## 산출물 포맷
```markdown
# PRD — [상품/프로젝트명]

## 1. 요약
## 2. 담당자
## 3. 배경
## 4. 목표
## 5. 시장 세그먼트
## 6. 가치 제안
## 7. 솔루션
## 8. 출시
```

## 완료 조건
- 8개 섹션 모두 작성
- 데이터 기반의 구체적인 내용
- 각 섹션이 전체 전략에 연결
- 가정이 명확히 표시

## 체크리스트
- [ ] 8개 섹션 모두 충실히 작성되었는가?
- [ ] 구체적이고 데이터 기반인가?
- [ ] 각 섹션이 전체 전략에 연결되어 있는가?
- [ ] 가정이 명확히 표시되어 검증 가능한가?
- [ ] 초등학생도 이해할 수 있는 언어로 작성되었는가?
- [ ] 와키윌리 브랜드 컨텍스트가 반영되었는가?

---

### 참고 자료
- [How to Write a Product Requirements Document? The Best PRD Template.](https://www.productcompass.pm/p/prd-template)
- [A Proven AI PRD Template by Miqdad Jaffer (Product Lead @ OpenAI)](https://www.productcompass.pm/p/ai-prd-template)
