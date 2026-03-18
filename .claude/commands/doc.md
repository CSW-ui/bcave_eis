# FPOF 워드 문서 생성

패션 실무에 필요한 워드 문서를 생성합니다. DOCX 스킬을 활용합니다.

## 사용법
`/doc [유형]` — 유형을 생략하면 현재 단계에서 필요한 문서를 추천합니다.

## 문서 유형

### Plan 단계
- `trend-brief` — 트렌드 브리프 (시장 분석, 키워드, 방향성)
- `season-plan` — 시즌 기획서 (테마, 컨셉, 전략, 일정)
- `brand-brief` — 브랜드 브리프 (포지셔닝, 타겟, 핵심 메시지)

### Design 단계
- `design-brief` — 디자인 브리프 (컨셉, 무드, 레퍼런스, 디자인 요구사항)
- `design-review` — 디자인 리뷰 문서 (디자인별 평가, 수정 사항)

### Do 단계
- `production-spec` — 생산 사양서 (소재, 봉제, QC 기준)
- `campaign-plan` — 캠페인 기획서 (전략, 채널, 콘텐츠, 일정)
- `press-release` — 보도자료 (브랜드 스토리, 시즌 하이라이트)
- `pdp-copy` — 상품 상세 페이지 카피 (상품명, 설명, 소재 정보)

### Check 단계
- `season-review` — 시즌 리뷰 문서 (성과 분석, 교훈, 제안)
- `playbook` — 플레이북 (재현 가능한 성공/실패 패턴)

## 절차

1. `.fpof-state.json`에서 현재 시즌과 단계 확인
2. `workspace/`에서 관련 산출물 참조
3. `system/presets/wacky-willy/tone-manner.json`에서 톤앤매너 확인
4. DOCX 스킬을 사용하여 문서 생성:
   - 표지: 문서 제목, 시즌, 날짜, 작성자(에이전시명)
   - 본문: 제목(H1) → 섹션(H2) → 소제목(H3) 계층 구조
   - 테이블, 리스트 적절히 활용
   - 목차 자동 생성
5. `workspace/[프로젝트]/` 에 DOCX 파일 저장

## 문서 스타일 원칙
- 제목: 브랜드 Primary 컬러
- 본문: 깔끔한 산세리프 폰트
- 톤앤매너: tone-manner.json 기준 (내부 문서는 'professional', 외부 문서는 'brand voice')
- 페이지 설정: A4, 여백 2.5cm

$ARGUMENTS 에 유형이 지정되면 해당 문서를, 없으면 추천합니다.
