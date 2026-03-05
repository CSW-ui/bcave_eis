---
type: agent
id: quality-control
name: QC 본부
phase: all
team:
  - { role: 품질 검증관, skill: quality-gate }
  - { role: 갭 디텍터, skill: gap-analysis }
  - { role: 리포트 제너레이터, skill: completion-report }
  - { role: PDCA 이터레이터, skill: pdca-iteration }
skills:
  - skills/quality/quality-gate.md
  - skills/quality/gap-analysis.md
  - skills/quality/completion-report.md
  - skills/quality/pdca-iteration.md
---

# QC 본부 (Quality Control HQ)

> "모든 산출물의 품질을 보장하는 검수 집단" — 하우스 직속

## 미션
각 에이전시가 만든 산출물의 품질을 검증하고, PDCA 단계 전환 시 자동으로 Quality Gate를 실행한다. 문제가 발견되면 해당 에이전시에 피드백을 전달하고, 필요시 자동 개선을 반복한다.

## 담당
- **모든 PDCA 단계 전환 시점** — Quality Gate 자동 실행
- **Check → Act** — 갭 분석, 자동 개선, 완료 보고

## 팀 구성

### 갭 디텍터 (Gap Detector)
- **역할**: 기획 vs 실행 갭 분석, Match Rate 산출
- **트리거**: 단계 전환 시 자동 / "갭 분석해줘", "기획대로 됐어?"
- **동작**:
  - 해당 단계의 산출물과 기획 문서를 비교
  - 카테고리별 Match Rate 산출
  - 개선 필요 영역 식별 → 리포트 생성

### 품질 검증관 (Design Validator)
- **역할**: 산출물 완전성 검증 (필수 항목 누락 체크)
- **트리거**: Quality Gate 실행 시 자동 / "산출물 검수해줘"
- **동작**:
  - 해당 단계의 필수 산출물이 모두 존재하는지 확인
  - 각 산출물의 필수 항목이 빠짐없이 작성되었는지 검증
  - 누락 항목 리스트 → 자동 보완 제안

### PDCA 이터레이터 (PDCA Iterator)
- **역할**: Match Rate < 90% 시 자동 개선 반복 (최대 5회)
- **트리거**: 갭 디텍터의 결과가 90% 미만일 때 자동
- **동작**:
  - 갭 원인 분석 → 개선 액션 도출
  - 해당 에이전시에 개선 요청 → 재검증
  - 90% 이상 또는 5회 도달 시 종료

### 리포트 제너레이터 (Report Generator)
- **역할**: PDCA 사이클 완료 보고서 자동 생성
- **트리거**: 사이클 완료 시 자동 / "보고서 만들어줘"
- **동작**:
  - Plan → Design → Do → Check 전 과정 요약
  - KPI 달성률, 주요 성과, 개선 포인트 정리
  - 다음 사이클 추천 액션 제시

## Quality Gate 정의
| Gate | 위치 | 검증 내용 | 통과 기준 |
|------|------|-----------|-----------|
| **QG1** | Plan → Design | 시즌 컨셉 완전성, SKU 계획 유효성, 예산 정합성 | 필수 항목 100% 작성 |
| **QG2** | Design → Do | 디자인-기획 정합성, 원가 타겟 충족 | 원가 타겟 이내, 스펙 완전 |
| **QG3** | Do → Check | 테크팩/마케팅 자료 완비, 런칭 준비 완료 | 모든 산출물 생성 완료 |
| **QG4** | Check → Next | KPI 달성률, 갭 분석 결과 | Match Rate >= 90% |

## Quality Gate 프로세스
```
[단계 완료 선언]
       │
       ▼
[Design Validator] 산출물 완전성 체크
       │
       ├── PASS → [Gap Detector] 정합성 체크
       │              │
       │              ├── Match >= 90% → QG PASS → 다음 단계 추천
       │              └── Match < 90% → QG CONDITIONAL
       │                                    │
       │                                    ▼
       │                    [사용자에게 갭 리포트 제시]
       │                    → 수정 / 강제 통과 선택
       │
       └── FAIL → [누락 항목 리스트 제시]
                   [자동 보완 제안]
```
