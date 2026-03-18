#!/bin/bash
# ============================================================
# FPOF 시작 전 알림 장치 (Pre-Start Routing Hook)
# UserPromptSubmit → 키워드 분석 → 스킬/프리셋 라우팅
# "강제로 막는 게 아니라 상기시키는" 리마인더 방식
# v2.0: PM-Skills 통합 (71개 스킬 매칭)
# ============================================================

PROMPT="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.fpof-state.json"

# 현재 PDCA 단계 읽기
CURRENT_PHASE="unknown"
if [ -f "$STATE_FILE" ]; then
  CURRENT_PHASE=$(grep -o '"current_phase"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" | head -1 | sed 's/.*"current_phase"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
fi

# 매칭 결과 변수
AGENCY=""
ROLE=""
SKILL=""
SKILL_PATH=""
PRESETS=""

# ── 키워드 → 스킬 매핑 (71개) ──────────────────────────────

# ================================================================
# 1. 전략기획실 (Strategy Planning)
# ================================================================

if echo "$PROMPT" | grep -qiE "트렌드|경쟁사|TikTok|틱톡|시장.*분석|마이크로.*트렌드|유행"; then
  AGENCY="전략기획실" ROLE="시장 리서처" SKILL="trend-research"
  SKILL_PATH="system/skills/strategy/trend-research.md"
  PRESETS="brand.config.json, categories.json, channels.json"

elif echo "$PROMPT" | grep -qiE "브랜드|포지셔닝|SWOT|시즌.*테마|DNA|시즌.*컨셉"; then
  AGENCY="전략기획실" ROLE="브랜드 전략가" SKILL="brand-strategy"
  SKILL_PATH="system/skills/strategy/brand-strategy.md"
  PRESETS="brand.config.json, personas.json, tone-manner.json"

elif echo "$PROMPT" | grep -qiE "SKU|카테고리|챔피언|히트.*상품|MD|상품.*기획|카테고리.*믹스"; then
  AGENCY="전략기획실" ROLE="수석 MD" SKILL="md-planning"
  SKILL_PATH="system/skills/strategy/md-planning.md"
  PRESETS="brand.config.json, categories.json, personas.json"

elif echo "$PROMPT" | grep -qiE "라인시트|OTB|물량|사이즈.*비율|컬러.*비율|브레이크다운"; then
  AGENCY="전략기획실" ROLE="컬렉션 플래너" SKILL="line-sheet"
  SKILL_PATH="system/skills/strategy/line-sheet.md"
  PRESETS="categories.json, brand.config.json"

# PM-Strategy 스킬
elif echo "$PROMPT" | grep -qiE "PESTLE|거시.*환경|외부.*환경|정치.*경제|세상.*변"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="pestle-analysis"
  SKILL_PATH="system/skills/pm-strategy/pestle-analysis.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "Porter|5.*Forces|경쟁.*강도|진입.*장벽|업계.*경쟁"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="porters-five-forces"
  SKILL_PATH="system/skills/pm-strategy/porters-five-forces.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "Ansoff|성장.*전략|해외.*진출|신규.*카테고리|다각화"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="ansoff-matrix"
  SKILL_PATH="system/skills/pm-strategy/ansoff-matrix.md"
  PRESETS="brand.config.json, channels.json"

elif echo "$PROMPT" | grep -qiE "비즈니스.*모델|BMC|사업.*구조|돈.*버는|수익.*구조"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="business-model-canvas"
  SKILL_PATH="system/skills/pm-strategy/business-model-canvas.md"
  PRESETS="brand.config.json, channels.json"

elif echo "$PROMPT" | grep -qiE "린.*캔버스|MVP|최소.*기능|빠르게.*가설"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="lean-canvas"
  SKILL_PATH="system/skills/pm-strategy/lean-canvas.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "수익화|매출.*모델|모네타이제이션|과금|monetiz"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="monetization-strategy"
  SKILL_PATH="system/skills/pm-strategy/monetization-strategy.md"
  PRESETS="brand.config.json, channels.json"

elif echo "$PROMPT" | grep -qiE "밸류.*프로포지션|가치.*제안|왜.*사야|value.*prop"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="value-proposition"
  SKILL_PATH="system/skills/pm-strategy/value-proposition.md"
  PRESETS="brand.config.json, personas.json"

elif echo "$PROMPT" | grep -qiE "전략.*캔버스|9칸|strategy.*canvas|전략.*한.*장"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="product-strategy-canvas"
  SKILL_PATH="system/skills/pm-strategy/product-strategy-canvas.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "비전.*수립|비전.*한.*문장|어디로.*가|product.*vision"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="product-vision"
  SKILL_PATH="system/skills/pm-strategy/product-vision.md"
  PRESETS="brand.config.json"

# PM-GTM 스킬
elif echo "$PROMPT" | grep -qiE "배틀카드|경쟁.*비교표|바이어.*비교|battlecard"; then
  AGENCY="전략기획실" ROLE="경쟁 분석가" SKILL="competitive-battlecard"
  SKILL_PATH="system/skills/pm-gtm/competitive-battlecard.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "비치헤드|첫.*시장|런칭.*타겟|beachhead|첫.*공략"; then
  AGENCY="전략기획실" ROLE="GTM 전략가" SKILL="beachhead-segment"
  SKILL_PATH="system/skills/pm-gtm/beachhead-segment.md"
  PRESETS="brand.config.json, personas.json"

elif echo "$PROMPT" | grep -qiE "ICP|핵심.*고객|이상.*고객|ideal.*customer"; then
  AGENCY="전략기획실" ROLE="GTM 전략가" SKILL="ideal-customer-profile"
  SKILL_PATH="system/skills/pm-gtm/ideal-customer-profile.md"
  PRESETS="personas.json, brand.config.json"

# PM-Discovery 스킬
elif echo "$PROMPT" | grep -qiE "OST|기회.*솔루션|opportunity.*solution"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="opportunity-solution-tree"
  SKILL_PATH="system/skills/pm-discovery/opportunity-solution-tree.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "아이디어|브레인스토밍|새로운.*거|뭐.*없을까"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="brainstorm-ideas-new"
  SKILL_PATH="system/skills/pm-discovery/brainstorm-ideas-new.md"
  PRESETS="brand.config.json, personas.json"

elif echo "$PROMPT" | grep -qiE "실험.*설계|테스트.*해|검증.*방법|experiment"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="brainstorm-experiments-new"
  SKILL_PATH="system/skills/pm-discovery/brainstorm-experiments-new.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "가정.*점검|리스크.*가정|잘못.*가정|assumption"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="identify-assumptions-new"
  SKILL_PATH="system/skills/pm-discovery/identify-assumptions-new.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "가정.*우선순위|위험.*순서|prioritize.*assumption"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="prioritize-assumptions"
  SKILL_PATH="system/skills/pm-discovery/prioritize-assumptions.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "피처.*우선순위|뭐부터|상품.*우선순위|prioritize.*feature"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="prioritize-features"
  SKILL_PATH="system/skills/pm-discovery/prioritize-features.md"
  PRESETS="brand.config.json, categories.json"

elif echo "$PROMPT" | grep -qiE "고객.*요청|리뷰.*패턴|피드백.*분석|feature.*request"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="analyze-feature-requests"
  SKILL_PATH="system/skills/pm-discovery/analyze-feature-requests.md"
  PRESETS="personas.json"

elif echo "$PROMPT" | grep -qiE "인터뷰.*스크립트|질문지|interview.*script|인터뷰.*어떻게"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="interview-script"
  SKILL_PATH="system/skills/pm-discovery/interview-script.md"
  PRESETS="personas.json"

elif echo "$PROMPT" | grep -qiE "인터뷰.*정리|인터뷰.*요약|summarize.*interview"; then
  AGENCY="전략기획실" ROLE="디스커버리 리드" SKILL="summarize-interview"
  SKILL_PATH="system/skills/pm-discovery/summarize-interview.md"
  PRESETS="personas.json"

# PM-Execution 스킬 (전략기획실)
elif echo "$PROMPT" | grep -qiE "OKR|분기.*목표|핵심.*결과|objective.*key"; then
  AGENCY="전략기획실" ROLE="OKR 코치" SKILL="brainstorm-okrs"
  SKILL_PATH="system/skills/pm-execution/brainstorm-okrs.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "PRD|요구사항.*문서|product.*requirement"; then
  AGENCY="전략기획실" ROLE="PM" SKILL="create-prd"
  SKILL_PATH="system/skills/pm-execution/create-prd.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "유저.*스토리|사용자.*스토리|user.*story"; then
  AGENCY="전략기획실" ROLE="PM" SKILL="user-stories"
  SKILL_PATH="system/skills/pm-execution/user-stories.md"
  PRESETS="personas.json"

elif echo "$PROMPT" | grep -qiE "잡.*스토리|job.*story|JTBD"; then
  AGENCY="전략기획실" ROLE="PM" SKILL="job-stories"
  SKILL_PATH="system/skills/pm-execution/job-stories.md"
  PRESETS="personas.json"

elif echo "$PROMPT" | grep -qiE "로드맵|roadmap|성과.*중심"; then
  AGENCY="전략기획실" ROLE="로드맵 설계자" SKILL="outcome-roadmap"
  SKILL_PATH="system/skills/pm-execution/outcome-roadmap.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "이해관계자|stakeholder|보고.*구조"; then
  AGENCY="전략기획실" ROLE="이해관계자 매니저" SKILL="stakeholder-map"
  SKILL_PATH="system/skills/pm-execution/stakeholder-map.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "스프린트|sprint|이번.*주.*할.*일"; then
  AGENCY="전략기획실" ROLE="스프린트 플래너" SKILL="sprint-plan"
  SKILL_PATH="system/skills/pm-execution/sprint-plan.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "회의록|미팅.*노트|meeting|회의.*정리"; then
  AGENCY="전략기획실" ROLE="회의록 작성자" SKILL="summarize-meeting"
  SKILL_PATH="system/skills/pm-execution/summarize-meeting.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "NDA|비밀유지|기밀.*계약"; then
  AGENCY="전략기획실" ROLE="법무 어시스턴트" SKILL="draft-nda"
  SKILL_PATH="system/skills/pm-toolkit/draft-nda.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "개인정보|privacy|처리방침"; then
  AGENCY="전략기획실" ROLE="법무 어시스턴트" SKILL="privacy-policy"
  SKILL_PATH="system/skills/pm-toolkit/privacy-policy.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "WWAS|무엇.*왜.*어떻게"; then
  AGENCY="전략기획실" ROLE="PM" SKILL="wwas"
  SKILL_PATH="system/skills/pm-execution/wwas.md"
  PRESETS="brand.config.json"

# ================================================================
# 2. 크리에이티브 스튜디오 (Creative Studio)
# ================================================================

elif echo "$PROMPT" | grep -qiE "무드보드|비주얼.*톤|캠페인.*테마|컨셉.*보드"; then
  AGENCY="크리에이티브 스튜디오" ROLE="크리에이티브 디렉터" SKILL="moodboard"
  SKILL_PATH="system/skills/creative/moodboard.md"
  PRESETS="visual-identity.json, brand.config.json, ip-bible.json"

elif echo "$PROMPT" | grep -qiE "디자인|도식화|프린트|소재|컬러.*개발|스펙.*작성|디테일"; then
  AGENCY="크리에이티브 스튜디오" ROLE="패션 디자이너" SKILL="design-spec"
  SKILL_PATH="system/skills/creative/design-spec.md"
  PRESETS="visual-identity.json, categories.json, ip-bible.json"

elif echo "$PROMPT" | grep -qiE "이미지.*생성|룩북|플랫.*이미지|비주얼.*생성|AI.*이미지"; then
  AGENCY="크리에이티브 스튜디오" ROLE="아트 디렉터" SKILL="visual-generation"
  SKILL_PATH="system/skills/creative/visual-generation.md"
  PRESETS="visual-identity.json, ip-bible.json, brand.config.json"

# ================================================================
# 3. 프로덕트 랩 (Product Lab)
# ================================================================

elif echo "$PROMPT" | grep -qiE "테크팩|BOM|봉제|사이즈.*스펙|생산.*사양"; then
  AGENCY="프로덕트 랩" ROLE="프로덕션 매니저" SKILL="techpack"
  SKILL_PATH="system/skills/product/techpack.md"
  PRESETS="categories.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "원가|VE|원가율|코스팅|마진|가격.*분석|가격.*전략|가격.*포지셔닝|가격.*어떻게|비용.*얼마|비용.*분석|비용.*계산|코스트"; then
  AGENCY="프로덕트 랩" ROLE="프로덕션 매니저" SKILL="costing-ve"
  SKILL_PATH="system/skills/product/costing-ve.md"
  PRESETS="categories.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "리오더|SPOT|QR|긴급.*생산|퀵.*리스폰스|추가.*생산"; then
  AGENCY="프로덕트 랩" ROLE="프로덕션 매니저" SKILL="qr-process"
  SKILL_PATH="system/skills/product/qr-process.md"
  PRESETS="categories.json, brand.config.json"

# ================================================================
# 4. 마케팅 쇼룸 (Marketing Showroom)
# ================================================================

elif echo "$PROMPT" | grep -qiE "마케팅|IMC|GTM|캠페인.*전략|런칭.*전략|런칭.*계획|런칭.*로드맵|시즌.*마케팅"; then
  AGENCY="마케팅 쇼룸" ROLE="마케팅 디렉터" SKILL="imc-strategy"
  SKILL_PATH="system/skills/marketing/imc-strategy.md"
  PRESETS="brand.config.json, personas.json, channels.json"

elif echo "$PROMPT" | grep -qiE "화보|영상|촬영|숏폼|콘텐츠.*기획|시나리오"; then
  AGENCY="마케팅 쇼룸" ROLE="콘텐츠 디렉터" SKILL="visual-content"
  SKILL_PATH="system/skills/marketing/visual-content.md"
  PRESETS="visual-identity.json, channels.json, tone-manner.json"

elif echo "$PROMPT" | grep -qiE "카피|상품.*설명|캡션|해시태그|PDP|슬로건"; then
  AGENCY="마케팅 쇼룸" ROLE="패션 에디터" SKILL="copywriting"
  SKILL_PATH="system/skills/marketing/copywriting.md"
  PRESETS="tone-manner.json, personas.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "인플루언서|바이럴|시딩|런칭.*시퀀스|소셜"; then
  AGENCY="마케팅 쇼룸" ROLE="소셜 전략 디렉터" SKILL="social-viral"
  SKILL_PATH="system/skills/marketing/social-viral.md"
  PRESETS="channels.json, personas.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "고객.*여정|구매.*경험|customer.*journey|터치포인트|어디서.*뭘.*보고|어디서.*사|어떻게.*사|구매.*과정|고객.*동선"; then
  AGENCY="마케팅 쇼룸" ROLE="CX 디자이너" SKILL="customer-journey-map"
  SKILL_PATH="system/skills/pm-research/customer-journey-map.md"
  PRESETS="personas.json, channels.json"

elif echo "$PROMPT" | grep -qiE "상품명|이름.*뭐|네이밍|product.*name"; then
  AGENCY="마케팅 쇼룸" ROLE="브랜드 네이밍 전문가" SKILL="product-name"
  SKILL_PATH="system/skills/pm-marketing/product-name.md"
  PRESETS="tone-manner.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "릴리즈.*노트|런칭.*안내|업데이트.*내역|release.*note"; then
  AGENCY="마케팅 쇼룸" ROLE="릴리즈 매니저" SKILL="release-notes"
  SKILL_PATH="system/skills/pm-execution/release-notes.md"
  PRESETS="tone-manner.json"

# ================================================================
# 5. 데이터 인텔리전스 (Data Intelligence)
# ================================================================

elif echo "$PROMPT" | grep -qiE "매출|KPI|실적|세일즈|판매.*데이터|채널별.*비교|시즌.*어땠|이번.*시즌.*성과|성과.*어때|결과.*어때"; then
  AGENCY="데이터 인텔리전스" ROLE="트렌드 애널리스트" SKILL="sales-analysis"
  SKILL_PATH="system/skills/data/sales-analysis.md"
  PRESETS="categories.json, channels.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "왜.*팔|실패.*원인|실패.*이유|실패.*한.*이유|인사이트|플레이북|성공.*요인|학습|성공.*패턴|왜.*잘|히트.*비결"; then
  AGENCY="데이터 인텔리전스" ROLE="인사이트 아키텍트" SKILL="insight-archiving"
  SKILL_PATH="system/skills/data/insight-archiving.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "A/B.*테스트|실험.*결과|어떤.*버전|ab.*test"; then
  AGENCY="데이터 인텔리전스" ROLE="데이터 애널리스트" SKILL="ab-test-analysis"
  SKILL_PATH="system/skills/pm-analytics/ab-test-analysis.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "코호트|재구매|리텐션|이탈.*패턴|cohort"; then
  AGENCY="데이터 인텔리전스" ROLE="데이터 애널리스트" SKILL="cohort-analysis"
  SKILL_PATH="system/skills/pm-analytics/cohort-analysis.md"
  PRESETS="brand.config.json, personas.json"

elif echo "$PROMPT" | grep -qiE "SQL|쿼리|데이터.*뽑|데이터베이스"; then
  AGENCY="데이터 인텔리전스" ROLE="데이터 애널리스트" SKILL="sql-queries"
  SKILL_PATH="system/skills/pm-analytics/sql-queries.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "페르소나.*다시|고객.*프로필|user.*persona"; then
  AGENCY="데이터 인텔리전스" ROLE="리서치 애널리스트" SKILL="user-personas"
  SKILL_PATH="system/skills/pm-research/user-personas.md"
  PRESETS="personas.json"

elif echo "$PROMPT" | grep -qiE "세그먼트|고객.*그룹|고객.*나눠|segmentation"; then
  AGENCY="데이터 인텔리전스" ROLE="리서치 애널리스트" SKILL="user-segmentation"
  SKILL_PATH="system/skills/pm-research/user-segmentation.md"
  PRESETS="personas.json"

elif echo "$PROMPT" | grep -qiE "시장.*세그먼트|market.*segment|시장.*나눠"; then
  AGENCY="데이터 인텔리전스" ROLE="리서치 애널리스트" SKILL="market-segments"
  SKILL_PATH="system/skills/pm-research/market-segments.md"
  PRESETS="brand.config.json"

elif echo "$PROMPT" | grep -qiE "더미.*데이터|테스트.*데이터|샘플.*데이터|dummy"; then
  AGENCY="데이터 인텔리전스" ROLE="데이터 엔지니어" SKILL="dummy-dataset"
  SKILL_PATH="system/skills/pm-execution/dummy-dataset.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "North.*Star|핵심.*지표|north.*star|노스스타"; then
  AGENCY="데이터 인텔리전스" ROLE="트렌드 애널리스트" SKILL="sales-analysis (North Star)"
  SKILL_PATH="system/skills/data/sales-analysis.md"
  PRESETS="brand.config.json"

# ================================================================
# 6. QC 본부 (Quality Control)
# ================================================================

elif echo "$PROMPT" | grep -qiE "검수|품질|QG|다음.*단계|게이트|통과"; then
  AGENCY="QC 본부" ROLE="품질 검증관" SKILL="quality-gate"
  SKILL_PATH="system/skills/quality/quality-gate.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "갭.*분석|Match.*Rate|기획대로|정합성|기획.*대비|계획대로|얼마나.*됐|목표.*대비"; then
  AGENCY="QC 본부" ROLE="갭 디텍터" SKILL="gap-analysis"
  SKILL_PATH="system/skills/quality/gap-analysis.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "완료.*보고서|시즌.*정리|PDCA.*요약|리포트|시즌.*마무리|마무리.*하자|끝내자|시즌.*끝"; then
  AGENCY="QC 본부" ROLE="리포트 제너레이터" SKILL="completion-report"
  SKILL_PATH="system/skills/quality/completion-report.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "자동.*개선|갭.*줄|Match.*올|이터레이션|반복.*개선"; then
  AGENCY="QC 본부" ROLE="PDCA 이터레이터" SKILL="pdca-iteration"
  SKILL_PATH="system/skills/quality/pdca-iteration.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "회고|레트로|잘한.*거.*못한|retro|KPT"; then
  AGENCY="QC 본부" ROLE="회고 퍼실리테이터" SKILL="retro"
  SKILL_PATH="system/skills/pm-execution/retro.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "테스트.*시나리오|QA.*시나리오|test.*scenario"; then
  AGENCY="QC 본부" ROLE="QA 리드" SKILL="test-scenarios"
  SKILL_PATH="system/skills/pm-execution/test-scenarios.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "문법|교정|다듬어|grammar|proofread|맞춤법"; then
  AGENCY="QC 본부" ROLE="에디터" SKILL="grammar-check"
  SKILL_PATH="system/skills/pm-toolkit/grammar-check.md"
  PRESETS="tone-manner.json"

elif echo "$PROMPT" | grep -qiE "프리모텀|pre.*mortem|런칭.*전.*리스크|위험.*점검"; then
  AGENCY="QC 본부" ROLE="품질 검증관" SKILL="quality-gate (Pre-Mortem)"
  SKILL_PATH="system/skills/quality/quality-gate.md"
  PRESETS="(전체 프리셋 참조)"

# ================================================================
# 7. 기타 유틸리티
# ================================================================

elif echo "$PROMPT" | grep -qiE "이력서|지원자|resume|서류.*검토"; then
  AGENCY="유틸리티" ROLE="HR 어시스턴트" SKILL="review-resume"
  SKILL_PATH="system/skills/pm-toolkit/review-resume.md"
  PRESETS=""

elif echo "$PROMPT" | grep -qiE "스타트업.*캔버스|startup.*canvas"; then
  AGENCY="전략기획실" ROLE="전략 컨설턴트" SKILL="startup-canvas"
  SKILL_PATH="system/skills/pm-strategy/startup-canvas.md"
  PRESETS="brand.config.json"
fi

# ── 결과 출력 ─────────────────────────────────────────────

if [ -n "$SKILL" ]; then
  cat <<EOF
[FPOF] $AGENCY > $ROLE
  skill: $SKILL_PATH
  presets: $PRESETS
  phase: $CURRENT_PHASE
EOF
fi

# 매칭 실패 시 빈 출력 (조용히 패스)
