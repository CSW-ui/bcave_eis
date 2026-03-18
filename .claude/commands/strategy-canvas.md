# 프로덕트 전략 캔버스 (Strategy Canvas)

비전부터 방어력까지 9개 섹션의 종합 전략 문서를 작성합니다.

## 사용법
`/strategy-canvas <대상 브랜드 또는 상품>` — 대상을 생략하면 와키윌리 전체 브랜드 전략을 수립합니다.

## 절차

### Step 1: 컨텍스트 파악
1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `system/presets/wacky-willy/brand.config.json` 참조 — DNA, 비전, 포지셔닝
3. `system/presets/wacky-willy/personas.json` 참조 — 타겟 세그먼트
4. `system/presets/wacky-willy/categories.json` 참조 — 카테고리 전략
5. 사용자에게 확인:
   - 전략 대상 (브랜드 전체 / 특정 라인 / 신규 카테고리)
   - 현재 단계 (아이디어 / MVP / 성장 / 성숙)
   - 전략 문서 용도 (시즌 기획 / 경영 보고 / 신규 사업)

### Step 2: 9개 섹션 전략 캔버스 작성
`system/skills/pm-strategy/product-strategy-canvas.md` + `system/skills/pm-strategy/product-vision.md` 참조:

1. **비전**: 팀을 동기부여하는 영감적 방향성
2. **타겟 세그먼트**: 누구를 위한 것인지 (누구를 위하지 않는지)
3. **페인 포인트 & 가치**: 해결하는 문제와 창출하는 가치
4. **밸류 프로포지션**: JTBD 프레임 기반 세그먼트별 가치 제안
5. **전략적 트레이드오프**: 하지 않기로 선택한 것 (하는 것만큼 중요)
6. **핵심 지표**: 성공 측정 기준
7. **성장 엔진**: 사용자 획득·확장 메커니즘
8. **핵심 역량**: 구축·유지해야 할 역량
9. **방어력**: 모방이 어려운 이유 (네트워크 효과, 데이터, 브랜드, 전환 비용)

### Step 3: 전략 리스크 도출
전략을 무효화할 수 있는 Top 3 리스크와 대응 방향 정리.

### Step 4: 산출물 저장
산출물을 `workspace/_season/plan_strategy-canvas.md`에 저장한다.
`.fpof-state.json`의 artifacts 배열에 파일 경로 추가.

### Step 5: 다음 단계 제안
- "이 전략에 맞춰 **Lean Canvas**나 **BMC**를 작성하시겠어요?"
- "전략에 정렬된 **로드맵**을 만드시겠어요?"
- "가정을 검증할 **거시 환경 분석(Market Scan)**을 실행하시겠어요?"
- "섹션 6 기반으로 **OKR**을 정의하시겠어요?"
