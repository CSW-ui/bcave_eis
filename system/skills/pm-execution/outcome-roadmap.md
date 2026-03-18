---
type: skill
id: outcome-roadmap
name: 아웃컴 로드맵 (Outcome Roadmap)
agency: strategy-planning
role: 로드맵 설계자 (Roadmap Designer)
phase: plan
triggers:
  - "로드맵 아웃컴으로 전환"
  - "아웃컴 중심 로드맵"
  - "기능 목록 말고 성과 중심으로"
  - "outcome roadmap"
  - "transform roadmap"
presets:
  - brand.config.json
  - channels.json
outputs:
  - "output/[시즌]/_season/plan_outcome-roadmap.md"
source: pm-skills/pm-execution/outcome-roadmap
---

# 아웃컴 로드맵

> 아웃풋 중심 로드맵을 아웃컴(성과) 중심 로드맵으로 전환 — pm-skills 원본 프레임워크를 FPOF 패션 하우스 컨텍스트에 맞게 커스터마이징

## 언제 사용
- 시즌 로드맵을 아웃컴 중심으로 전환할 때
- 기능 목록형 로드맵을 전략적 의도가 드러나는 로드맵으로 개선할 때
- 이니셔티브를 고객/비즈니스 임팩트 문장으로 재작성할 때

## FPOF 컨텍스트
- 시즌 기획의 "이 상품을 만든다" 대신 "이 고객 문제를 해결한다"로 전환
- `brand.config.json`의 비전/로드맵을 아웃컴 프레임에 매핑
- `channels.json`의 채널별 비즈니스 지표를 아웃컴 측정 기준으로 활용

## 사전 준비
- 현재 로드맵 문서 (기능/상품 목록 형태)
- `brand.config.json`에서 전략/비전 확인
- 사용자 제공 전략 문서, 목표 자료 읽기

## 실행 절차

### Step 1: 정보 수집
사용자가 현재 로드맵을 제공하면 꼼꼼히 읽는다. 전략 문서나 회사 목표를 언급하면 로드맵이 어떻게 부합해야 하는지 파악한다.

### Step 2: 단계적 사고
각 이니셔티브에 대해:
- "우리가 달성하려는 아웃컴은 무엇인가?"
- 어떤 고객 문제를 해결하는가?
- 어떤 비즈니스 지표가 개선되는가?
- 고객 경험이나 비즈니스에 어떤 영향을 미치는가?
- 동일한 아웃컴을 달성하는 더 나은 방법이 있는가?

### Step 3: 변환 프로세스
로드맵의 각 이니셔티브에 대해:
- **아웃풋 식별**: 계획된 기능이나 프로젝트는 무엇인가?
- **아웃컴 발굴**: 왜 만드는가? 고객이나 비즈니스에 무엇이 변하는가?
- **아웃컴 문장 재작성**:
  ```
  [고객 세그먼트]가 [원하는 고객 결과]를 달성하게 하여 [비즈니스 임팩트]를 만든다
  ```

**변환 예시**:
- **아웃풋 (기존)**: Q2: 그래픽 티 라인 출시, IP 콜라보 3건, 무신사 전용 상품 제작
- **아웃컴 (전환)**:
  - Q2: 코어타겟이 와키윌리만의 키치 스트리트 아이덴티티를 경험하게 하여 브랜드 인지도 30% 향상
  - Q2: IP 캐릭터 팬덤이 패션에서도 자기표현 수단을 찾게 하여 IP 상품 매출 비중 15% 달성
  - Q2: 무신사 고객이 와키윌리를 '발견의 기쁨'으로 경험하게 하여 채널 신규 유입 40% 증대

### Step 4: 산출물 구조화
- 분기/페이즈별 기존 이니셔티브 목록
- 각 이니셔티브의 아웃컴 문장
- 성공을 나타낼 핵심 지표
- 의존성 또는 순서 참고사항

### Step 5: 전략적 컨텍스트 추가
- 아웃컴이 회사 전략에 어떻게 부합하는지
- 고객 니즈에 대한 핵심 가정
- 유연한 출시 윈도우 (분기 단위, 특정 날짜 아님)

### Step 6: 와키윌리 적용 필터링
- 5대 경영목표별 아웃컴 매핑 확인
- 시즌 PDCA 단계와의 정합성 점검
- 패션 비즈니스 특성(시즌성, 트렌드 민감성) 반영 여부 확인

## 산출물 포맷
```markdown
# 아웃컴 로드맵 — [시즌/연도]

## 전략 정합성
...

## 분기별 아웃컴

### Q1
| 기존 이니셔티브 | 아웃컴 문장 | 핵심 지표 | 경영목표 연결 |
|---|---|---|---|

### Q2
...
```

## 완료 조건
- 모든 이니셔티브에 대해 아웃컴 문장 전환 완료
- 각 아웃컴이 테스트 및 측정 가능
- 전략 정합성 명시
- 유연한 일정 프레임 사용

## 체크리스트
- [ ] 모든 이니셔티브가 아웃컴 문장으로 전환되었는가?
- [ ] 각 아웃컴이 측정 가능한가?
- [ ] 회사 전략과의 정합이 명시되었는가?
- [ ] 유연한 일정(분기 단위)을 사용했는가?
- [ ] "So what?" 테스트를 통과하는가?

---

### 참고 자료
- [Product Vision vs Strategy vs Objectives vs Roadmap](https://www.productcompass.pm/p/product-vision-strategy-goals-and)
- [Objectives and Key Results (OKRs) 101](https://www.productcompass.pm/p/okrs-101-advanced-techniques)
- [Business Outcomes vs Product Outcomes vs Customer Outcomes](https://www.productcompass.pm/p/business-outcomes-vs-product-outcomes)
