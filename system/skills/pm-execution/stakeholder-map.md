---
type: skill
id: stakeholder-map
name: 이해관계자 매핑 (Stakeholder Map)
agency: strategy-planning
role: 이해관계자 매니저 (Stakeholder Manager)
phase: all
triggers:
  - "이해관계자 매핑해줘"
  - "커뮤니케이션 계획"
  - "stakeholder map"
  - "stakeholder communication plan"
presets:
  - brand.config.json
outputs:
  - "output/[시즌]/_season/plan_stakeholder-map.md"
source: pm-skills/pm-execution/stakeholder-map
---

# 이해관계자 매핑

> Power x Interest 그리드로 이해관계자를 매핑하고 커뮤니케이션 계획 수립 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 바이어, 디자이너, 경영진 등 내부 이해관계자 매핑 시
- 시즌 런칭 준비 시 커뮤니케이션 계획 수립
- 크로스펑셔널 팀 정렬 시
- 이해관계자 참여 전략 수립 시

## FPOF 컨텍스트
- 패션 하우스의 내부(디자이너, MD, 마케터, 경영진)와 외부(바이어, 유통, 인플루언서) 이해관계자 모두 포함
- 시즌 PDCA 각 단계별로 이해관계자 중요도가 변할 수 있음
- `brand.config.json`의 조직 구조와 의사결정 체계 참조

## 사전 준비
- 프로젝트/이니셔티브 개요
- 조직도, 팀 명단, 프로젝트 브리프 (사용자 제공 시)
- `.fpof-state.json`에서 현재 시즌/단계 확인

## 실행 절차

### Step 1: 이해관계자 식별
경영진, 디자인 리드, MD, 마케팅, 영업, 지원, 법무, 재무, 외부 파트너, 최종 소비자 등 모든 관련 개인과 그룹을 나열한다.

### Step 2: 이해관계자 분류
두 가지 차원으로 분류:
- **Power** (높음/낮음): 의사결정, 자원, 결과에 대한 영향력
- **Interest** (높음/낮음): 프로젝트가 직접 영향을 미치는 정도 또는 참여도

### Step 3: Power x Interest 그리드 배치

| | 높은 관심 | 낮은 관심 |
|---|---|---|
| **높은 권한** | **밀착 관리** — 정기 1:1, 의사결정 참여, 초기 의견 수렴 | **만족 유지** — 정기 업데이트, 중요 이슈만 에스컬레이션 |
| **낮은 권한** | **정보 공유** — 정기 상태 업데이트, 데모 초대, 피드백 수집 | **모니터링** — 가벼운 업데이트, 요청 시 제공 |

### Step 4: 사분면별 커뮤니케이션 전략
각 사분면에 대해 권장:
- 커뮤니케이션 빈도 (일간, 주간, 격주, 월간)
- 커뮤니케이션 형식 (1:1, 이메일, 슬랙, 미팅, 대시보드)
- 핵심 메시지와 프레이밍
- 이 이해관계자를 소홀히 할 경우의 리스크

### Step 5: 커뮤니케이션 계획 테이블 작성

| 이해관계자 | 역할 | 권한 | 관심 | 전략 | 빈도 | 채널 | 핵심 메시지 |
|---|---|---|---|---|---|---|---|

### Step 6: 잠재적 갈등 식별
상충하는 이해관계를 가진 이해관계자를 식별하고 정렬 전략을 제안한다.

### Step 7: 와키윌리 적용 필터링
- 패션 업계 특수 이해관계자 (바이어, 소재 공급처, 인플루언서, 유통 플랫폼) 포함 여부 확인
- 시즌 단계별 이해관계자 중요도 변화 반영 (Plan: 경영진/MD, Design: 디자이너/소재, Do: 생산/마케팅, Check: 데이터/QC)

## 산출물 포맷
```markdown
# 이해관계자 맵 — [프로젝트/시즌]

## Power x Interest 그리드
...

## 커뮤니케이션 계획
| 이해관계자 | 역할 | 권한 | 관심 | 전략 | 빈도 | 채널 | 핵심 메시지 |
|---|---|---|---|---|---|---|---|

## 잠재적 갈등 및 정렬 전략
...
```

## 완료 조건
- 모든 관련 이해관계자가 식별되고 분류됨
- Power x Interest 그리드 완성
- 커뮤니케이션 계획 테이블 완성
- 잠재적 갈등 식별 및 정렬 전략 제시

## 체크리스트
- [ ] 내부/외부 이해관계자 모두 포함했는가?
- [ ] Power와 Interest 분류가 합리적인가?
- [ ] 각 사분면에 적합한 커뮤니케이션 전략이 있는가?
- [ ] 잠재적 갈등과 정렬 전략이 식별되었는가?
- [ ] 시즌 단계별 이해관계자 중요도 변화가 반영되었는가?

---

### 참고 자료
- [The Product Management Frameworks Compendium + Templates](https://www.productcompass.pm/p/the-product-frameworks-compendium)
- [Team Topologies: A Handbook to Set and Scale Product Teams](https://www.productcompass.pm/p/team-topologies-a-handbook-to-set)
