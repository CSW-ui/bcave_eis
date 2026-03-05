#!/bin/bash
# ============================================================
# FPOF 시작 전 알림 장치 (Pre-Start Routing Hook)
# UserPromptSubmit → 키워드 분석 → 스킬/프리셋 라우팅
# "강제로 막는 게 아니라 상기시키는" 리마인더 방식
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

# ── 키워드 → 스킬 매핑 (20개) ──────────────────────────────

# 1. 전략기획실 (Strategy Planning)
if echo "$PROMPT" | grep -qiE "트렌드|경쟁사|TikTok|틱톡|시장.*분석|마이크로.*트렌드"; then
  AGENCY="전략기획실" ROLE="시장 리서처" SKILL="trend-research"
  SKILL_PATH="skills/strategy/trend-research.md"
  PRESETS="brand.config.json, categories.json, channels.json"

elif echo "$PROMPT" | grep -qiE "브랜드|포지셔닝|SWOT|테마|시즌.*컨셉|DNA"; then
  AGENCY="전략기획실" ROLE="브랜드 전략가" SKILL="brand-strategy"
  SKILL_PATH="skills/strategy/brand-strategy.md"
  PRESETS="brand.config.json, personas.json, tone-manner.json"

elif echo "$PROMPT" | grep -qiE "SKU|카테고리|가격|챔피언|히트.*상품|MD|상품.*기획"; then
  AGENCY="전략기획실" ROLE="수석 MD" SKILL="md-planning"
  SKILL_PATH="skills/strategy/md-planning.md"
  PRESETS="brand.config.json, categories.json, personas.json"

elif echo "$PROMPT" | grep -qiE "라인시트|OTB|물량|사이즈.*비율|컬러.*비율|브레이크다운"; then
  AGENCY="전략기획실" ROLE="컬렉션 플래너" SKILL="line-sheet"
  SKILL_PATH="skills/strategy/line-sheet.md"
  PRESETS="categories.json, brand.config.json"

# 2. 크리에이티브 스튜디오 (Creative Studio)
elif echo "$PROMPT" | grep -qiE "무드보드|비주얼.*톤|캠페인.*테마|컨셉.*보드"; then
  AGENCY="크리에이티브 스튜디오" ROLE="크리에이티브 디렉터" SKILL="moodboard"
  SKILL_PATH="skills/creative/moodboard.md"
  PRESETS="visual-identity.json, brand.config.json, ip-bible.json"

elif echo "$PROMPT" | grep -qiE "디자인|도식화|프린트|소재|컬러.*개발|스펙.*작성|디테일"; then
  AGENCY="크리에이티브 스튜디오" ROLE="시니어 디자이너" SKILL="design-spec"
  SKILL_PATH="skills/creative/design-spec.md"
  PRESETS="visual-identity.json, categories.json, ip-bible.json"

elif echo "$PROMPT" | grep -qiE "이미지.*생성|룩북|플랫.*이미지|비주얼.*생성|AI.*이미지"; then
  AGENCY="크리에이티브 스튜디오" ROLE="비주얼 아티스트" SKILL="visual-generation"
  SKILL_PATH="skills/creative/visual-generation.md"
  PRESETS="visual-identity.json, ip-bible.json, brand.config.json"

# 3. 프로덕트 랩 (Product Lab)
elif echo "$PROMPT" | grep -qiE "테크팩|BOM|봉제|사이즈.*스펙|생산.*사양"; then
  AGENCY="프로덕트 랩" ROLE="테크니컬 디자이너" SKILL="techpack"
  SKILL_PATH="skills/product/techpack.md"
  PRESETS="categories.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "원가|VE|원가율|코스팅|가격.*분석|마진"; then
  AGENCY="프로덕트 랩" ROLE="코스팅 엔지니어" SKILL="costing-ve"
  SKILL_PATH="skills/product/costing-ve.md"
  PRESETS="categories.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "리오더|SPOT|QR|긴급.*생산|퀵.*리스폰스|추가.*생산"; then
  AGENCY="프로덕트 랩" ROLE="QR 매니저" SKILL="qr-process"
  SKILL_PATH="skills/product/qr-process.md"
  PRESETS="categories.json, brand.config.json"

# 4. 마케팅 쇼룸 (Marketing Showroom)
elif echo "$PROMPT" | grep -qiE "마케팅|IMC|GTM|캠페인.*전략|런칭.*전략"; then
  AGENCY="마케팅 쇼룸" ROLE="마케팅 디렉터" SKILL="imc-strategy"
  SKILL_PATH="skills/marketing/imc-strategy.md"
  PRESETS="brand.config.json, personas.json, channels.json"

elif echo "$PROMPT" | grep -qiE "화보|영상|촬영|숏폼|콘텐츠.*기획|시나리오"; then
  AGENCY="마케팅 쇼룸" ROLE="콘텐츠 프로듀서" SKILL="visual-content"
  SKILL_PATH="skills/marketing/visual-content.md"
  PRESETS="visual-identity.json, channels.json, tone-manner.json"

elif echo "$PROMPT" | grep -qiE "카피|상품.*설명|캡션|해시태그|PDP|슬로건"; then
  AGENCY="마케팅 쇼룸" ROLE="패션 에디터" SKILL="copywriting"
  SKILL_PATH="skills/marketing/copywriting.md"
  PRESETS="tone-manner.json, personas.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "인플루언서|바이럴|시딩|런칭.*시퀀스|소셜"; then
  AGENCY="마케팅 쇼룸" ROLE="소셜 전략가" SKILL="social-viral"
  SKILL_PATH="skills/marketing/social-viral.md"
  PRESETS="channels.json, personas.json, brand.config.json"

# 5. 데이터 인텔리전스 (Data Intelligence)
elif echo "$PROMPT" | grep -qiE "매출|KPI|실적|분석|세일즈|판매.*데이터"; then
  AGENCY="데이터 인텔리전스" ROLE="데이터 애널리스트" SKILL="sales-analysis"
  SKILL_PATH="skills/data/sales-analysis.md"
  PRESETS="categories.json, channels.json, brand.config.json"

elif echo "$PROMPT" | grep -qiE "왜.*팔|실패.*원인|인사이트|플레이북|성공.*요인|학습"; then
  AGENCY="데이터 인텔리전스" ROLE="인사이트 매니저" SKILL="insight-archiving"
  SKILL_PATH="skills/data/insight-archiving.md"
  PRESETS="brand.config.json, categories.json"

# 6. QC 본부 (Quality Control)
elif echo "$PROMPT" | grep -qiE "검수|품질|QG|다음.*단계|게이트|통과"; then
  AGENCY="QC 본부" ROLE="품질 검증관" SKILL="quality-gate"
  SKILL_PATH="skills/quality/quality-gate.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "갭.*분석|Match.*Rate|기획대로|정합성"; then
  AGENCY="QC 본부" ROLE="갭 디텍터" SKILL="gap-analysis"
  SKILL_PATH="skills/quality/gap-analysis.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "완료.*보고서|시즌.*정리|PDCA.*요약|리포트"; then
  AGENCY="QC 본부" ROLE="리포트 제너레이터" SKILL="completion-report"
  SKILL_PATH="skills/quality/completion-report.md"
  PRESETS="(전체 프리셋 참조)"

elif echo "$PROMPT" | grep -qiE "자동.*개선|갭.*줄|Match.*올|이터레이션|반복.*개선"; then
  AGENCY="QC 본부" ROLE="PDCA 이터레이터" SKILL="pdca-iteration"
  SKILL_PATH="skills/quality/pdca-iteration.md"
  PRESETS="(전체 프리셋 참조)"
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
