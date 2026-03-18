---
type: skill
id: brainstorm-ideas-existing
name: 아이디어 브레인스토밍 - 기존 상품 (Brainstorm Ideas - Existing Product)
agency: strategy-planning
role: 디스커버리 리드 (Discovery Lead)
phase: plan
triggers:
  - "아이디어 브레인스토밍"
  - "상품 아이디어 발굴"
  - "기존 상품 개선 아이디어"
  - "brainstorm ideas for existing product"
presets:
  - brand.config.json
  - personas.json
  - categories.json
outputs:
  - "output/[시즌]/[프로젝트]/plan_brainstorm-ideas.md"
source: pm-skills/pm-product-discovery/brainstorm-ideas-existing
---

# 아이디어 브레인스토밍 - 기존 상품

> Product Trio 기반 다관점 아이디에이션 -- 시즌 기획, 기존 카테고리 개선, IP 콜라보 아이디어 발굴에 활용

## 언제 사용
- 기존 카테고리/아이템의 신규 피처 아이디어가 필요할 때
- 식별된 기회에 대한 솔루션을 브레인스토밍할 때
- Product Trio (MD + 디자이너 + 프로덕션) 관점 아이디에이션
- 시즌 기획 중 기존 라인 확장/개선 아이디어 도출

## FPOF 컨텍스트
- 이 스킬은 와키윌리의 기존 상품 라인(유니/우먼스/용품) 개선 및 확장 아이디어 발굴에 활용합니다
- 시즌 기획, IP 콜라보, 카테고리 확장 아이디어 도출
- 관련 프리셋: categories.json (카테고리 전략), personas.json (타겟), brand.config.json (전략)

## 사전 준비
- `.fpof-state.json`에서 현재 시즌 및 PDCA 단계 확인
- `categories.json`에서 기존 카테고리 구조 및 상품 전략 확인
- `personas.json`에서 코어 타겟 니즈 확인
- 관련 리서치 데이터, 기회 트리, 페르소나 준비

## 도메인 컨텍스트

**Product Trio** (Teresa Torres, *Continuous Discovery Habits*): PM + 디자이너 + 엔지니어가 디스커버리를 함께 수행. "최고의 아이디어는 종종 엔지니어에게서 나온다." 디스커버리는 비선형 -- 실험이 실패하면 되돌아가기. **Opportunity Solution Tree**를 활용하여 기회 -> 솔루션 -> 실험 매핑.

## 실행 절차

### Step 1: 기회 이해
상품, 목표, 시장 세그먼트, 원하는 성과를 확인:
- 어떤 카테고리/아이템에 대한 아이디에이션인가?
- 목표는 무엇인가? (매출 증대, 신규 고객, 재구매율 등)
- 모호한 부분이 있으면 명확히

### Step 2: 세 가지 관점에서 아이디에이션
각 관점에서 5개씩 아이디어 생성:

**수석 MD 관점**: 비즈니스 가치, 전략 정합성, 고객 임팩트에 집중
- 카테고리 확장 기회
- 가격대 전략
- IP 콜라보 기회
- 채널 특화 상품
- 시즌 트렌드 반영

**크리에이티브 디렉터 관점**: 사용자 경험, 착용감, 디자인 만족에 집중
- 비주얼 혁신
- 소재/텍스처 실험
- 스타일링 제안
- 패키징/언박싱 경험
- 커스터마이징

**프로덕션 매니저 관점**: 기술적 가능성, 생산 효율, 확장 가능한 솔루션에 집중
- 새로운 소재/원단 기술
- 생산 공정 혁신
- QR(Quick Response) 활용
- 지속 가능성
- 코스트 효율화

### Step 3: 상위 5개 아이디어 우선순위화
전체 관점에서 상위 5개를 다음 기준으로 선정:
- 시즌 목표와의 전략적 정합성
- 원하는 성과에 대한 잠재적 임팩트
- 실행 가능성과 필요 리소스
- 기존 솔루션 대비 차별화

### Step 4: 우선순위 아이디어 상세화
각 우선순위 아이디어에 대해:
- 명확한 이름과 한 문장 설명
- 선정 이유 (근거)
- 검증해야 할 핵심 가정

### Step 5: 와키윌리 적용 필터링
- 브랜드 DNA(Kitsch Street & IP Universe)와의 정합성
- 코어 타겟(18~25세 트렌드리더)에 대한 시사점
- 5대 경영목표와의 연결점
- IP 캐릭터(키키 등) 활용 가능성

## 산출물 포맷

```markdown
# 아이디어 브레인스토밍: [카테고리/아이템명]

**시즌**: [시즌코드]
**작성일**: [날짜]
**에이전시**: 전략기획실
**담당**: 디스커버리 리드

## 기회 정의
[목표, 타겟 세그먼트, 원하는 성과]

## 아이디에이션

### MD 관점 (5개)
1. ...

### 크리에이티브 관점 (5개)
1. ...

### 프로덕션 관점 (5개)
1. ...

## 상위 5개 우선순위 아이디어
| 순위 | 아이디어 | 관점 | 선정 이유 | 핵심 가정 |
|------|---------|------|----------|----------|

## 와키윌리 적용 시사점
- 브랜드 DNA 정합성:
- IP 활용 기회:
```

## 완료 조건
- [ ] 3개 관점에서 각 5개씩 15개 아이디어 생성
- [ ] 상위 5개 우선순위화 및 근거 제시
- [ ] 각 우선순위 아이디어의 핵심 가정 식별
- [ ] 와키윌리 브랜드 적용 필터링 완료

## 체크리스트
- [ ] brand.config.json의 전략 방향과 정합성?
- [ ] categories.json의 카테고리 전략에 부합?
- [ ] 코어 타겟 관점에서 매력적인 아이디어인가?
- [ ] 다양한 관점이 균형 있게 반영되었는가?

## 참고 자료
- Teresa Torres, *Continuous Discovery Habits* -- Product Trio
- [What Is Product Discovery?](https://www.productcompass.pm/p/what-exactly-is-product-discovery)
- [Product Trio: Beyond the Obvious](https://www.productcompass.pm/p/product-trio)
- [The Extended Opportunity Solution Tree](https://www.productcompass.pm/p/the-extended-opportunity-solution-tree)
