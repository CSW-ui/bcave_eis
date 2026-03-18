# MD 마켓 인텔리전스 리포트

네이버 데이터랩 + 구글 트렌드 데이터를 자동 수집하여 MD용 키워드 트렌드 리포트를 생성합니다.

## 사용법
`/market-intel` — 즉시 파이프라인 실행 (fetch → report → Teams 알림)
`/market-intel config` — config/market-intel-config.json 현재 설정 확인
`/market-intel last` — 가장 최근 리포트 요약 조회 (새 데이터 수집 없음)

## 절차

### Step 1: 컨텍스트 확인
1. `.fpof-state.json`에서 현재 시즌 확인
2. `config/market-intel-config.json` 참조 — 현재 추적 키워드 목록 확인
3. 인자가 `config`이면 설정 파일 내용만 보여주고 종료
4. 인자가 `last`이면 가장 최근 `workspace/_season/plan_market-intel-weekly-*.md`를 읽어 요약 후 종료

### Step 2: 사전 확인
사용자에게 확인 (옵션):
- 특정 키워드 그룹만 분석할지, 전체 실행할지
- 경쟁사 비교 포함 여부

### Step 3: 파이프라인 실행
```bash
./scripts/market-intel/run-pipeline.sh
```
실행 로그를 실시간으로 사용자에게 표시한다.

### Step 4: 리포트 요약 제시
생성된 리포트에서 다음을 인라인으로 요약:
- 이 주의 핵심 3가지
- 키워드 트렌드 랭킹 테이블
- MD 즉시 액션 항목

### Step 5: 연계 제안
- "이 트렌드 데이터를 바탕으로 **트렌드 브리프**를 업데이트하시겠어요?" → `trend-research` 스킬
- "급상승 키워드를 챔피언 상품 전략에 반영하시겠어요?" → `md-planning` 스킬
- "경쟁사 분석을 더 깊게 하시겠어요?" → `competitive-battlecard` 스킬

### Step 6: 산출물 확인
산출물이 `.fpof-state.json`에 등록되었는지 확인하고, 미등록 시 직접 추가한다.

## 참조 스킬
- `system/skills/data/market-intelligence.md` — 스킬 상세 매뉴얼
- `system/skills/strategy/trend-research.md` — 트렌드 리서치 (보완 관계)
- `system/skills/strategy/md-planning.md` — MD 기획 (액션 연계)
