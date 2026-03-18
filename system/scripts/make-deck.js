// ================================================================
//  FPOF × 와키윌리 AI 패션 하우스 완전 정복
//  강의용 프레젠테이션 — pptxgenjs 생성 스크립트
//  컬러 시스템: Black #000000 + Signature Yellow #FEF200 + Sky Blue #68A8DB
//  Layout: LAYOUT_16x9 (10" × 5.625")
// ================================================================
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout  = "LAYOUT_16x9";
pres.title   = "FPOF × 와키윌리 AI 패션 하우스 완전 정복";
pres.author  = "와키윌리 사업부";
pres.subject = "FPOF 사용 가이드";

// ── 새 브랜드 컬러 팔레트 ──────────────────────────────────────────
const C = {
  yellow:    "FEF200",   // Signature Yellow — 주 액센트
  black:     "000000",   // Black — 주 배경/폰트
  white:     "FFFFFF",   // White
  sky:       "68A8DB",   // Sky Blue — 보조 액센트
  offWhite:  "F9F9F9",   // Off-White
  dark:      "111111",   // Near Black panel
  darkCard:  "1A1A1A",   // Dark card
  mid:       "555555",   // Mid Gray
  light:     "999999",   // Light Gray
  pale:      "EEEEEE",   // Pale Gray
  yellowD:   "C8BC00",   // Dark Yellow (shade)
  yellowL:   "FFFDE0",   // Light Yellow tint
  skyD:      "4A88BB",   // Dark Sky Blue
};

// ── 헬퍼 ──────────────────────────────────────────────────────────
const rect = (s, x, y, w, h, fill, opts = {}) =>
  s.addShape(pres.shapes.RECTANGLE,
    { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, ...opts });

const txt = (s, text, x, y, w, h, opts = {}) =>
  s.addText(text, { x, y, w, h, margin: 0, ...opts });

const addSlideNum = (s, n) =>
  txt(s, `${n} / 20`, 9.05, 5.3, 0.85, 0.22,
    { fontSize: 8, color: C.light, align: "right" });

// ================================================================
// SLIDE 01: COVER
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.black };

  // Right yellow panel — big brand block
  rect(s, 7.2, 0, 2.8, 5.625, C.yellow);
  // Thin separator
  rect(s, 7.18, 0, 0.04, 5.625, C.black);

  // "WW" on yellow panel
  txt(s, "W\nW", 7.2, 0.3, 2.8, 4.2,
    { fontSize: 88, bold: true, color: C.black,
      fontFace: "Arial Black", align: "center", valign: "middle" });

  // Left accent bar
  rect(s, 0, 0, 0.14, 5.625, C.yellow);

  // Brand label
  txt(s, "WACKY WILLY  ×  FPOF", 0.35, 0.52, 6.5, 0.38,
    { fontSize: 10, color: C.yellow, bold: true, charSpacing: 4 });

  // Yellow separator line
  rect(s, 0.35, 1.05, 6.6, 0.055, C.yellow);

  // Main title
  s.addText(
    [{ text: "AI 패션 하우스", options: { breakLine: true } },
     { text: "완전 정복",      options: {} }],
    { x: 0.35, y: 1.2, w: 6.7, h: 2.3,
      fontSize: 60, bold: true, color: C.white,
      fontFace: "Arial Black", margin: 0 }
  );

  txt(s, "비개발자도 쉽게 따라하는 전체 사용 가이드",
    0.35, 3.65, 6.7, 0.48,
    { fontSize: 15, color: C.light });

  txt(s, "2026.03  |  와키윌리 사업부", 0.35, 5.1, 5, 0.35,
    { fontSize: 9, color: C.mid });
}

// ================================================================
// SLIDE 02: AGENDA
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 2);

  txt(s, "오늘의 순서", 0.5, 0.2, 6, 0.7,
    { fontSize: 32, bold: true, color: C.black, fontFace: "Arial Black" });

  txt(s, "이 가이드 하나로 AI 패션 하우스를 완벽하게 활용합니다",
    0.5, 0.95, 7.5, 0.35, { fontSize: 13, color: C.mid });

  const items = [
    ["01", "FPOF가 뭔가요?",              "AI 패션 하우스 개념 + 기존 방식과의 차이"],
    ["02", "우리 팀은 누구인가요?",        "6개 에이전시 20명의 역할 + 자동 라우팅"],
    ["03", "어떻게 사용하나요?",           "자연어 요청법 + 시즌 사이클 + 명령어"],
    ["04", "무엇을 만들 수 있나요?",       "산출물 목록 + 문서 자동 변환 시스템"],
    ["05", "핵심 원칙과 시작하는 법",      "3가지 원칙 + 오늘 바로 시작하는 액션"],
  ];

  items.forEach(([num, title, desc], i) => {
    const y = 1.45 + i * 0.77;
    rect(s, 0.45, y, 0.5, 0.5, i === 0 ? C.yellow : C.pale);
    txt(s, num, 0.45, y, 0.5, 0.5,
      { fontSize: 13, bold: true,
        color: i === 0 ? C.black : C.mid,
        align: "center", valign: "middle" });
    txt(s, title, 1.1, y, 3.2, 0.5,
      { fontSize: 15, bold: true, color: C.black, valign: "middle" });
    txt(s, desc, 4.6, y, 5.0, 0.5,
      { fontSize: 12, color: C.mid, valign: "middle" });
  });
}

// ================================================================
// SLIDE 03: SECTION 01 — FPOF란?
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.black };

  // Yellow left panel
  rect(s, 0, 0, 3.8, 5.625, C.yellow);

  // "01" on yellow panel
  txt(s, "01", 0.1, 0.4, 3.6, 3.2,
    { fontSize: 160, bold: true, color: C.black,
      fontFace: "Arial Black", align: "center", valign: "bottom" });

  txt(s, "SECTION", 0.1, 3.75, 3.6, 0.4,
    { fontSize: 10, bold: true, color: C.black, charSpacing: 5, align: "center" });

  txt(s, "FPOF란\n무엇인가?", 4.1, 1.5, 5.7, 1.9,
    { fontSize: 42, bold: true, color: C.white, fontFace: "Arial Black" });

  txt(s, "AI 패션 하우스의 개념과\n기존 방식과의 차이를 알아봅니다",
    4.1, 3.6, 5.7, 1.0, { fontSize: 14, color: C.light });
}

// ================================================================
// SLIDE 04: FPOF 개념
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 4);

  txt(s, "FPOF = 우리만의 AI 직원들", 0.5, 0.2, 4.6, 0.62,
    { fontSize: 28, bold: true, color: C.black, fontFace: "Arial Black" });

  txt(s, "Fashion PDCA Orchestration Framework",
    0.5, 0.88, 4.6, 0.35,
    { fontSize: 12, color: C.sky, bold: true, charSpacing: 2 });

  txt(s, "와키윌리의 모든 패션 업무를\nAI가 담당합니다",
    0.5, 1.38, 4.5, 0.78,
    { fontSize: 17, bold: true, color: C.black });

  const bullets = [
    "패션 실무자가 자연어로 지시",
    "AI가 브랜드 지식 기반으로 실무 산출물 생성",
    "6개 에이전시, 20명의 AI 전문가 팀",
    "트렌드 브리프부터 테크팩까지 자동화",
  ];
  s.addText(
    bullets.map((t, i) => ({
      text: t,
      options: { bullet: true, breakLine: i < bullets.length - 1 }
    })),
    { x: 0.5, y: 2.28, w: 4.5, h: 2.6,
      fontSize: 13, color: "333333", margin: 0, paraSpaceAfter: 6 }
  );

  // Right: stacked agency blocks (start at 5.25, 6 blocks × 0.80h = 4.8, fits in 5.625)
  const agencies = [
    ["전략기획실",         C.yellow,  C.black],
    ["크리에이티브",       C.sky,     C.white],
    ["프로덕트 랩",       "222222",   C.white],
    ["마케팅 쇼룸",       C.yellow,   C.black],
    ["데이터 인텔리전스", "333333",   C.white],
    ["QC 본부",           "444444",   C.white],
  ];
  agencies.forEach(([name, bg, fg], i) => {
    const y = 0.18 + i * 0.87;
    rect(s, 5.25, y, 4.6, 0.8, bg);
    txt(s, name, 5.4, y, 4.35, 0.8,
      { fontSize: 13, bold: true, color: fg, valign: "middle" });
    rect(s, 9.82, y, 0.07, 0.8, C.black);
  });
}

// ================================================================
// SLIDE 05: 기존 방식 vs FPOF
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  addSlideNum(s, 5);

  txt(s, "기존 방식 vs FPOF", 0.4, 0.18, 9, 0.6,
    { fontSize: 28, bold: true, color: C.black, fontFace: "Arial Black" });

  rect(s, 4.9, 0.9, 0.1, 4.5, C.pale);

  // Before header
  rect(s, 0.4, 0.9, 4.3, 0.55, C.pale);
  txt(s, "😩  기존 방식", 0.55, 0.9, 4.1, 0.55,
    { fontSize: 15, bold: true, color: C.mid, valign: "middle" });

  // After header
  rect(s, 5.2, 0.9, 4.3, 0.55, C.yellow);
  txt(s, "🚀  FPOF 도입 후", 5.35, 0.9, 4.1, 0.55,
    { fontSize: 15, bold: true, color: C.black, valign: "middle" });

  const befores = [
    "엑셀 수작업으로 라인시트 정리",
    "PPT 직접 만드는 트렌드 브리프",
    "여러 자료 찾아 헤매는 브랜드 가이드",
    "담당자마다 다른 산출물 포맷",
    "시즌 기획 → 런칭까지 수개월 걸림",
  ];
  const afters = [
    "자연어 한 문장으로 라인시트 자동 생성",
    "\"트렌드 브리프 만들어줘\"로 즉시 완성",
    "브랜드 DNA가 모든 산출물에 자동 반영",
    "표준화된 템플릿 + 브랜드 컬러 자동 적용",
    "AI가 24시간 병렬 처리로 속도 10배+",
  ];

  befores.forEach((t, i) => {
    const y = 1.6 + i * 0.72;
    rect(s, 0.4, y, 4.3, 0.62, i % 2 === 0 ? "EEEEEE" : C.pale);
    txt(s, "✗  " + t, 0.55, y, 4.05, 0.62,
      { fontSize: 12, color: C.mid, valign: "middle" });
  });
  afters.forEach((t, i) => {
    const y = 1.6 + i * 0.72;
    rect(s, 5.2, y, 4.3, 0.62, i % 2 === 0 ? C.yellowL : "FFFEF0");
    txt(s, "✓  " + t, 5.35, y, 4.05, 0.62,
      { fontSize: 12, color: "222222", valign: "middle" });
  });
}

// ================================================================
// SLIDE 06: SECTION 02 — 팀 구성
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.yellow };

  rect(s, 0, 0, 0.14, 5.625, C.black);

  txt(s, "02", 0.25, 0.0, 5.8, 3.6,
    { fontSize: 200, bold: true, color: C.black,
      fontFace: "Arial Black", align: "left" });

  txt(s, "SECTION", 0.25, 3.75, 5, 0.4,
    { fontSize: 10, bold: true, color: C.black, charSpacing: 5 });

  txt(s, "패션 하우스\n팀을 만나봐요", 5.5, 1.4, 4.3, 1.8,
    { fontSize: 38, bold: true, color: C.black, fontFace: "Arial Black" });

  txt(s, "6개 에이전시 · 20명의 AI 전문가\n자동 라우팅 시스템",
    5.5, 3.4, 4.3, 1.0, { fontSize: 14, color: "444444" });
}

// ================================================================
// SLIDE 07: 6개 에이전시 카드
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.dark };
  addSlideNum(s, 7);

  txt(s, "6개 에이전시 · 20명의 AI 전문가 팀", 0.45, 0.15, 9, 0.58,
    { fontSize: 24, bold: true, color: C.white, fontFace: "Arial Black" });

  const cards = [
    { name: "전략기획실",          sub: "시장·MD·브랜드·컬렉션 기획",    members: "4명", bg: C.yellow,  fg: C.black,  ab: C.black  },
    { name: "크리에이티브 스튜디오", sub: "무드보드·디자인·비주얼",        members: "3명", bg: C.sky,     fg: C.white,  ab: C.yellow },
    { name: "프로덕트 랩",         sub: "테크팩·원가·QC·생산",           members: "3명", bg: "222222",  fg: C.white,  ab: C.yellow },
    { name: "마케팅 쇼룸",         sub: "IMC·콘텐츠·카피·소셜",          members: "4명", bg: C.yellow,  fg: C.black,  ab: C.black  },
    { name: "데이터 인텔리전스",    sub: "트렌드 분석·인사이트 아카이빙",  members: "2명", bg: "1A1A1A",  fg: C.white,  ab: C.yellow },
    { name: "QC 본부",            sub: "품질검증·갭분석·리포트·PDCA",   members: "4명", bg: "2A2A2A",  fg: C.white,  ab: C.yellow },
  ];

  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.2;
    const y = 0.88 + row * 2.28;

    rect(s, x, y, 3.05, 2.05, c.bg);
    rect(s, x, y, 3.05, 0.07, c.ab);   // top accent

    txt(s, c.name, x + 0.18, y + 0.18, 2.7, 0.55,
      { fontSize: 15, bold: true, color: c.fg, fontFace: "Arial Black" });
    txt(s, c.sub, x + 0.18, y + 0.8, 2.7, 0.65,
      { fontSize: 11, color: c.fg === C.white ? "CCCCCC" : "444444" });

    // Member badge
    rect(s, x + 2.3, y + 1.58, 0.6, 0.3,
      c.bg === C.yellow ? C.black : "333333");
    txt(s, c.members, x + 2.3, y + 1.58, 0.6, 0.3,
      { fontSize: 10, bold: true,
        color: c.bg === C.yellow ? C.yellow : C.yellow,
        align: "center", valign: "middle" });
  });
}

// ================================================================
// SLIDE 08: 자연어 → 에이전시 라우팅
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 8);

  txt(s, "이렇게 말하면 이 팀이 움직여요", 0.45, 0.2, 9, 0.6,
    { fontSize: 28, bold: true, color: C.black, fontFace: "Arial Black" });

  rect(s, 0.4, 0.95, 5.5, 0.42, C.black);
  txt(s, "이런 말을 하면...", 0.55, 0.95, 5.35, 0.42,
    { fontSize: 12, bold: true, color: C.white, valign: "middle" });
  rect(s, 6.05, 0.95, 3.5, 0.42, C.yellow);
  txt(s, "이 팀이 담당해요", 6.1, 0.95, 3.4, 0.42,
    { fontSize: 12, bold: true, color: C.black, valign: "middle" });

  const rows = [
    ["트렌드, 시즌 기획, SKU, MD 계획",          "전략기획실"],
    ["무드보드, 디자인, 컬러, 비주얼, 그래픽",    "크리에이티브 스튜디오"],
    ["테크팩, 원가, BOM, QC, 사이즈 스펙",        "프로덕트 랩"],
    ["마케팅, 캠페인, GTM, 채널 전략",            "마케팅 쇼룸"],
    ["화보, 룩북, 숏폼, 콘텐츠 제작",             "마케팅 쇼룸"],
    ["인플루언서, 바이럴, 런칭, 시딩",             "마케팅 쇼룸"],
    ["매출, KPI, 분석, 성과, 데이터",             "데이터 인텔리전스"],
    ["검수, 갭 분석, 품질 체크, 보고서",           "QC 본부"],
  ];

  rows.forEach(([keyword, agency], i) => {
    const y = 1.48 + i * 0.51;
    const bg = i % 2 === 0 ? "FAFAFA" : C.white;
    rect(s, 0.4, y, 5.5, 0.48, bg);
    rect(s, 6.05, y, 3.5, 0.48, bg);
    txt(s, keyword, 0.55, y, 5.35, 0.48,
      { fontSize: 11, color: "333333", valign: "middle" });
    txt(s, agency, 6.1, y, 3.4, 0.48,
      { fontSize: 11, bold: true, color: C.sky, valign: "middle" });
  });
}

// ================================================================
// SLIDE 09: SECTION 03 — 어떻게 사용하나요?
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.black };

  rect(s, 6.6, 0, 3.4, 5.625, C.dark);
  rect(s, 6.58, 0, 0.06, 5.625, C.yellow);

  txt(s, "03", 0.35, 0.05, 6.2, 3.0,
    { fontSize: 180, bold: true, color: "1E1E1E",
      fontFace: "Arial Black" });

  txt(s, "어떻게\n사용하나요?", 0.35, 3.1, 6.0, 1.35,
    { fontSize: 42, bold: true, color: C.white, fontFace: "Arial Black" });

  txt(s, "자연어 요청 → 시즌 사이클 → 명령어 활용",
    0.35, 4.52, 6.2, 0.38, { fontSize: 12, color: C.light });

  txt(s, "SECTION 03", 0.35, 5.08, 5, 0.38,
    { fontSize: 9, bold: true, color: C.mid, charSpacing: 4 });
}

// ================================================================
// SLIDE 10: 사용법 3단계
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 10);

  txt(s, "딱 3단계면 끝납니다", 0.45, 0.2, 9, 0.62,
    { fontSize: 28, bold: true, color: C.black, fontFace: "Arial Black" });

  txt(s, "Claude Code를 열고, 말하고, 결과물을 받으면 됩니다",
    0.45, 0.85, 8.5, 0.38, { fontSize: 13, color: C.mid });

  const steps = [
    {
      num: "1", title: "Claude Code\n열기",
      desc: "macOS: 터미널에서\n`claude` 명령어 입력\n\n(conductor-playground\n폴더에서 실행)",
      bg: C.yellow, fg: C.black, numFg: C.black,
    },
    {
      num: "2", title: "자연어로\n요청하기",
      desc: "예:\n\"26SS 트렌드 브리프\n만들어줘\"\n\n한국어로 그냥\n말하면 됩니다",
      bg: C.sky, fg: C.white, numFg: C.white,
    },
    {
      num: "3", title: "결과물\n확인하기",
      desc: "output/26SS/_season/\n폴더에 MD 파일 생성\n\n→ /deck 명령어로\nPPTX 변환까지 자동",
      bg: C.black, fg: C.white, numFg: C.white,
    },
  ];

  steps.forEach((st, i) => {
    const x = 0.4 + i * 3.15;
    rect(s, x, 1.38, 3.0, 3.88, C.offWhite);
    rect(s, x, 1.38, 3.0, 0.08, st.bg);
    // Number circle
    rect(s, x + 0.2, 1.6, 0.7, 0.7, st.bg);
    txt(s, st.num, x + 0.2, 1.6, 0.7, 0.7,
      { fontSize: 22, bold: true, color: st.numFg,
        align: "center", valign: "middle" });
    txt(s, "STEP " + (i + 1), x + 1.05, 1.72, 1.7, 0.4,
      { fontSize: 9, bold: true, color: st.bg === C.black ? C.black : st.bg, charSpacing: 2 });
    txt(s, st.title, x + 0.18, 2.45, 2.65, 0.82,
      { fontSize: 17, bold: true, color: C.black, fontFace: "Arial Black" });
    txt(s, st.desc, x + 0.18, 3.38, 2.65, 1.72,
      { fontSize: 11, color: C.mid });
  });

  [0, 1].forEach(i => {
    txt(s, "→", 3.44 + i * 3.15, 2.9, 0.28, 0.5,
      { fontSize: 20, color: C.yellow, bold: true, align: "center" });
  });
}

// ================================================================
// SLIDE 11: 자연어 요청 실전 예시
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.dark };
  addSlideNum(s, 11);

  txt(s, "이렇게 말하면 됩니다 — 실전 예시",
    0.45, 0.18, 9, 0.58,
    { fontSize: 26, bold: true, color: C.white, fontFace: "Arial Black" });

  const convos = [
    { user: "26SS 트렌드 브리프 만들어줘",         ai: "전략기획실 → 트렌드 리서처 → plan_trend-brief.md 생성 완료 ✓",   y: 0.92 },
    { user: "이번 시즌 무드보드 크리에이티브하게",  ai: "크리에이티브 스튜디오 → design_moodboard.md 생성 완료 ✓",       y: 2.1  },
    { user: "그래픽 티셔츠 테크팩 뽑아줘",         ai: "프로덕트 랩 → do_techpack.md 생성 완료 ✓",                       y: 3.28 },
  ];

  convos.forEach(c => {
    // User bubble (right, yellow)
    rect(s, 4.6, c.y, 5.1, 0.55, C.yellow);
    txt(s, "👤  " + c.user, 4.75, c.y, 4.85, 0.55,
      { fontSize: 12, bold: true, color: C.black, valign: "middle" });
    rect(s, 9.7, c.y + 0.17, 0.15, 0.2, C.yellow);

    // AI bubble (left, dark)
    const aiY = c.y + 0.65;
    rect(s, 0.4, aiY, 6.0, 0.55, "1E1E1E");
    rect(s, 0.4, aiY, 0.06, 0.55, C.yellow);
    txt(s, "🤖  " + c.ai, 0.58, aiY, 5.72, 0.55,
      { fontSize: 11, color: C.light, valign: "middle" });
  });

  txt(s, "자연어 한 줄로 전문 산출물이 자동 생성됩니다",
    0.45, 4.62, 9, 0.55,
    { fontSize: 14, color: C.yellow, bold: true, align: "center" });
}

// ================================================================
// SLIDE 12: PDCA 시즌 사이클
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: "0A0A0A" };
  addSlideNum(s, 12);

  txt(s, "시즌 PDCA 사이클", 0.45, 0.18, 9, 0.55,
    { fontSize: 26, bold: true, color: C.white, fontFace: "Arial Black" });
  txt(s, "시즌마다 이 사이클을 따라가면 됩니다 — /next 명령어로 단계 이동",
    0.45, 0.75, 9, 0.35, { fontSize: 12, color: C.light });

  const phases = [
    { letter: "P",  label: "PLAN",   bg: C.yellow,  fg: C.black,  sub: "트렌드 브리프\n브랜드 전략\nMD 기획\n라인시트" },
    { letter: "D",  label: "DESIGN", bg: C.sky,     fg: C.white,  sub: "무드보드\n디자인 스펙\n비주얼\n원가 검토" },
    { letter: "Do", label: "DO",     bg: "222222",  fg: C.white,  sub: "테크팩\nQC 프로세스\nIMC 전략\n콘텐츠 제작" },
    { letter: "C",  label: "CHECK",  bg: "333333",  fg: C.white,  sub: "매출 분석\n인사이트\n갭 분석\n완료 보고서" },
    { letter: "A",  label: "ACT",    bg: "444444",  fg: C.white,  sub: "PDCA 반복\n전략 보완\n다음 시즌 준비" },
  ];

  phases.forEach((p, i) => {
    const x = 0.35 + i * 1.88;
    rect(s, x, 1.28, 1.72, 3.85, p.bg);
    txt(s, p.letter, x, 1.28, 1.72, 1.32,
      { fontSize: 56, bold: true, color: p.fg,
        fontFace: "Arial Black", align: "center", valign: "middle" });
    txt(s, p.label, x, 2.65, 1.72, 0.38,
      { fontSize: 10, bold: true, color: p.fg,
        align: "center", charSpacing: 2 });
    txt(s, p.sub, x + 0.12, 3.12, 1.5, 1.88,
      { fontSize: 10, color: p.fg, align: "center" });
  });

  [0, 1, 2, 3].forEach(i => {
    txt(s, "→", 2.0 + i * 1.88, 2.52, 0.18, 0.42,
      { fontSize: 14, color: C.yellow, bold: true, align: "center" });
  });

  txt(s, "* 품질 기준(90%) 미달 시 자동 루프 → QC 본부 개입",
    0.35, 5.22, 9, 0.28,
    { fontSize: 9, color: C.mid, align: "center" });
}

// ================================================================
// SLIDE 13: 명령어 치트시트
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 13);

  txt(s, "명령어 치트시트", 0.45, 0.2, 9, 0.62,
    { fontSize: 28, bold: true, color: C.black, fontFace: "Arial Black" });

  const cmds = [
    { cmd: "/status",  desc: "지금 어디까지 진행됐어?\n시즌·단계·산출물 현황 조회",    accent: C.yellow },
    { cmd: "/brief",   desc: "문서 작성\n/brief trend-brief, /brief moodboard",  accent: C.sky    },
    { cmd: "/deck",    desc: "PPTX 슬라이드 생성\n/deck trend, /deck lookbook",   accent: C.yellow },
    { cmd: "/pdf",     desc: "PDF 보고서 생성\n/pdf season-book, /pdf techpack",  accent: C.black  },
    { cmd: "/sheet",   desc: "엑셀 시트 생성\n/sheet line-sheet, /sheet otb",    accent: C.sky    },
    { cmd: "/doc",     desc: "Word 문서 생성\n/doc campaign-plan",               accent: C.black  },
    { cmd: "/review",  desc: "현재 단계 품질 검수\n\"검수해줘\" → 자동 실행",      accent: C.yellow },
    { cmd: "/next",    desc: "다음 PDCA 단계 이동\n품질 기준 통과 후 실행",        accent: C.black  },
  ];

  cmds.forEach((c, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 2.38;
    const y = 1.0 + row * 2.18;

    rect(s, x, y, 2.2, 2.0, C.offWhite);
    rect(s, x, y, 2.2, 0.07, c.accent);

    txt(s, c.cmd, x + 0.14, y + 0.2, 1.95, 0.52,
      { fontSize: 18, bold: true, color: C.black, fontFace: "Consolas" });
    txt(s, c.desc, x + 0.14, y + 0.82, 1.95, 1.0,
      { fontSize: 10, color: C.mid });
  });
}

// ================================================================
// SLIDE 14: SECTION 04 — 결과물
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.yellow };

  rect(s, 9.86, 0, 0.14, 5.625, C.black);

  txt(s, "04", 0.2, 0.0, 6, 3.6,
    { fontSize: 200, bold: true, color: C.black,
      fontFace: "Arial Black" });

  txt(s, "SECTION 04", 0.2, 5.1, 5, 0.35,
    { fontSize: 9, bold: true, color: "666666", charSpacing: 4 });

  txt(s, "무엇을\n만들 수 있나요?", 5.3, 1.5, 4.5, 1.8,
    { fontSize: 38, bold: true, color: C.black, fontFace: "Arial Black" });

  txt(s, "산출물 목록 + 문서 변환 시스템",
    5.3, 3.5, 4.5, 0.7, { fontSize: 14, color: "444444" });
}

// ================================================================
// SLIDE 15: 산출물 갤러리
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 15);

  txt(s, "만들 수 있는 모든 산출물", 0.45, 0.2, 9, 0.58,
    { fontSize: 26, bold: true, color: C.black, fontFace: "Arial Black" });

  const docs = [
    { icon: "📊", name: "트렌드 브리프",       team: "전략기획실",   file: "plan_trend-brief.md",     accent: C.yellow },
    { icon: "🎯", name: "브랜드 전략",         team: "전략기획실",   file: "plan_brand-strategy.md",  accent: C.yellow },
    { icon: "📋", name: "MD 기획 / 라인시트",  team: "전략기획실",   file: "plan_line-sheet.xlsx",    accent: C.yellow },
    { icon: "🎨", name: "무드보드",            team: "크리에이티브", file: "design_moodboard.md",     accent: C.sky    },
    { icon: "✏️", name: "디자인 스펙",         team: "크리에이티브", file: "design_spec.md",          accent: C.sky    },
    { icon: "📦", name: "테크팩",              team: "프로덕트 랩",  file: "do_techpack.md",          accent: C.black  },
    { icon: "💰", name: "원가 / BOM",          team: "프로덕트 랩",  file: "do_costing.md",           accent: C.black  },
    { icon: "📣", name: "IMC 전략",            team: "마케팅 쇼룸",  file: "do_imc-strategy.md",     accent: C.yellow },
    { icon: "📸", name: "화보 / 콘텐츠",       team: "마케팅 쇼룸",  file: "do_visual-content.md",   accent: C.yellow },
    { icon: "✍️", name: "카피라이팅",          team: "마케팅 쇼룸",  file: "do_copywriting.md",      accent: C.yellow },
    { icon: "📈", name: "매출 분석",            team: "데이터",       file: "check_sales-analysis.md", accent: C.sky   },
    { icon: "✅", name: "완료 보고서",          team: "QC 본부",      file: "check_completion.md",     accent: C.black },
  ];

  docs.forEach((d, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 2.38;
    const y = 0.98 + row * 1.5;

    rect(s, x, y, 2.2, 1.32, C.offWhite);
    rect(s, x, y, 2.2, 0.06, d.accent);

    txt(s, d.icon + "  " + d.name, x + 0.12, y + 0.15, 2.0, 0.45,
      { fontSize: 12, bold: true, color: C.black });
    txt(s, d.team, x + 0.12, y + 0.62, 2.0, 0.28,
      { fontSize: 9, color: d.accent === C.black ? C.sky : d.accent, bold: true });
    txt(s, d.file, x + 0.12, y + 0.95, 2.0, 0.28,
      { fontSize: 8, color: C.light, fontFace: "Consolas" });
  });
}

// ================================================================
// SLIDE 16: 문서 변환 시스템
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: "0D0D0D" };
  addSlideNum(s, 16);

  txt(s, "문서 변환 시스템", 0.45, 0.18, 9, 0.58,
    { fontSize: 26, bold: true, color: C.white, fontFace: "Arial Black" });
  txt(s, "MD 파일 하나로 바이어 PPT, 내부 보고서, 데이터 시트, 인쇄용 PDF 모두 자동 생성",
    0.45, 0.78, 9, 0.35, { fontSize: 12, color: C.light });

  // MD source box (yellow) — fits within y=1.18 to 4.56
  rect(s, 0.4, 1.18, 2.6, 3.28, C.yellow);
  txt(s, "MD\n파일", 0.4, 1.18, 2.6, 1.5,
    { fontSize: 52, bold: true, color: C.black,
      fontFace: "Arial Black", align: "center", valign: "middle" });
  txt(s, "plan_trend-brief.md", 0.5, 2.75, 2.4, 0.35,
    { fontSize: 9, color: C.black, fontFace: "Consolas", align: "center" });
  txt(s, "YAML frontmatter\n+ Markdown 본문\n+ 표 + 불릿",
    0.5, 3.18, 2.4, 0.78,
    { fontSize: 10, color: "444444", align: "center" });

  // Arrow
  txt(s, "→", 3.1, 2.62, 0.6, 0.72,
    { fontSize: 32, bold: true, color: C.yellow, align: "center" });

  // 4 format outputs (y start=1.18, h=0.8, gap=0.02 → 4 rows end at 1.18+4*0.82=4.46; terminal at 4.52)
  const fmts = [
    { fmt: "PPTX",  desc: "바이어 미팅\n발표 슬라이드",  bg: C.yellow,  fg: C.black,  cmd: "--format pptx --template executive" },
    { fmt: "DOCX",  desc: "테크팩·사양서\nWord 문서",    bg: C.sky,     fg: C.white,  cmd: "--format docx --template internal"  },
    { fmt: "XLSX",  desc: "SKU 목록·OTB\n데이터 시트",   bg: "222222",  fg: C.white,  cmd: "--format xlsx --template internal"  },
    { fmt: "PDF",   desc: "시즌 리포트\n인쇄용 문서",    bg: "333333",  fg: C.white,  cmd: "--format pdf  --template report"    },
  ];

  fmts.forEach((f, i) => {
    const y = 1.18 + i * 0.84;
    rect(s, 3.85, y, 1.25, 0.76, f.bg);
    txt(s, f.fmt, 3.85, y, 1.25, 0.76,
      { fontSize: 19, bold: true, color: f.fg,
        fontFace: "Arial Black", align: "center", valign: "middle" });
    txt(s, f.desc, 5.25, y + 0.04, 2.0, 0.7,
      { fontSize: 11, color: C.white });
    txt(s, f.cmd, 7.45, y + 0.15, 2.3, 0.5,
      { fontSize: 9, color: "888888", fontFace: "Consolas" });
  });

  rect(s, 0.4, 4.58, 9.2, 0.38, "1A1A1A");
  txt(s, "python converter/convert.py --input [파일] --format [포맷] --template [템플릿]",
    0.55, 4.58, 9.0, 0.38,
    { fontSize: 10, color: C.yellow, fontFace: "Consolas", valign: "middle" });
}

// ================================================================
// SLIDE 17: SECTION 05 — 핵심 원칙
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.black };

  rect(s, 0, 0,    10, 0.14, C.yellow);
  rect(s, 0, 5.49, 10, 0.14, C.yellow);

  txt(s, "05", 0.35, 0.14, 6, 3.0,
    { fontSize: 180, bold: true, color: "1E1E1E",
      fontFace: "Arial Black" });

  txt(s, "핵심 원칙과\n시작하는 법", 0.35, 3.2, 5.8, 1.35,
    { fontSize: 42, bold: true, color: C.white, fontFace: "Arial Black" });

  txt(s, "꼭 지켜야 할 3가지 + 오늘 바로 시작하는 법",
    0.35, 4.62, 6.2, 0.38, { fontSize: 12, color: C.light });

  txt(s, "SECTION 05", 0.35, 5.08, 5, 0.35,
    { fontSize: 9, bold: true, color: C.mid, charSpacing: 4 });
}

// ================================================================
// SLIDE 18: 핵심 원칙 3가지
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  rect(s, 0, 0, 10, 0.07, C.yellow);
  addSlideNum(s, 18);

  txt(s, "이것만 기억하세요 — 핵심 원칙 3가지",
    0.45, 0.2, 9, 0.62,
    { fontSize: 26, bold: true, color: C.black, fontFace: "Arial Black" });

  const principles = [
    {
      num: "01", title: "계획이 먼저",
      body: "\"알아서 해\"는 금지입니다.\n반드시 계획 → 승인 → 실행 순서로 진행합니다.\nAI가 제안한 계획을 먼저 확인하고 OK를 주세요.",
      accent: C.yellow,
    },
    {
      num: "02", title: "브랜드 보이스 준수",
      body: "고객 대면 콘텐츠는 반드시 와키윌리 톤앤매너를 따릅니다.\nAI가 자동으로 tone-manner.json을 참조하지만,\n결과물은 항상 사람이 최종 확인해야 합니다.",
      accent: C.sky,
    },
    {
      num: "03", title: "참고자료가 진실",
      body: "브랜드 정보는 절대 지어내지 않습니다.\n프리셋 JSON(브랜드 설정 파일)에 있는 내용만 기반으로\n산출물을 생성합니다. 모르면 물어보세요.",
      accent: C.black,
    },
  ];

  principles.forEach((p, i) => {
    const y = 1.0 + i * 1.52;
    rect(s, 0.4, y, 9.2, 1.35, i % 2 === 0 ? C.offWhite : C.white);
    rect(s, 0.4, y, 0.08, 1.35, p.accent);
    txt(s, p.num, 0.62, y + 0.1, 0.8, 0.52,
      { fontSize: 11, bold: true,
        color: p.accent === C.black ? C.sky : p.accent, charSpacing: 2 });
    txt(s, p.title, 0.62, y + 0.62, 2.2, 0.52,
      { fontSize: 18, bold: true, color: C.black, fontFace: "Arial Black" });
    txt(s, p.body, 3.1, y + 0.1, 6.2, 1.15,
      { fontSize: 11, color: C.mid });
  });
}

// ================================================================
// SLIDE 19: 오늘부터 시작하는 3단계
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: "0D0D0D" };
  addSlideNum(s, 19);

  txt(s, "오늘 바로 시작하는 법", 0.45, 0.18, 9, 0.62,
    { fontSize: 28, bold: true, color: C.white, fontFace: "Arial Black" });
  txt(s, "지금 당장 할 수 있는 3단계 액션",
    0.45, 0.82, 7, 0.38, { fontSize: 13, color: C.light });

  const actions = [
    {
      num: "1", title: "Claude Code 설치",
      body: "터미널에서:\nnpm install -g @anthropic-ai/claude-code\n\nclaude 명령어로 실행",
      note: "설치 시간: 약 2분",
    },
    {
      num: "2", title: "프로젝트 폴더 열기",
      body: "conductor-playground 폴더로 이동\ncd conductor-playground\nclaude",
      note: "시작 시 자동으로 FPOF 모드 로드",
    },
    {
      num: "3", title: "첫 번째 요청 해보기",
      body: "이렇게 말해보세요:\n\"지금 어디까지 진행됐어?\"\n→ /status 명령이 자동 실행됩니다",
      note: "이 한 마디로 전체 현황 파악 완료",
    },
  ];

  actions.forEach((a, i) => {
    const y = 1.35 + i * 1.38;
    rect(s, 0.4, y, 0.72, 1.18, C.yellow);
    txt(s, a.num, 0.4, y, 0.72, 1.18,
      { fontSize: 36, bold: true, color: C.black,
        fontFace: "Arial Black", align: "center", valign: "middle" });
    rect(s, 1.22, y, 8.38, 1.18, "1A1A1A");
    txt(s, a.title, 1.42, y + 0.1, 3.5, 0.5,
      { fontSize: 16, bold: true, color: C.white, fontFace: "Arial Black" });
    txt(s, a.body, 1.42, y + 0.62, 5.5, 0.52,
      { fontSize: 10, color: "AAAAAA", fontFace: "Consolas" });
    rect(s, 7.18, y + 0.38, 2.25, 0.42, "282828");
    txt(s, "💡 " + a.note, 7.23, y + 0.38, 2.15, 0.42,
      { fontSize: 9, color: C.yellow, valign: "middle" });
  });
}

// ================================================================
// SLIDE 20: Q&A / CLOSING
// ================================================================
{
  const s = pres.addSlide();
  s.background = { color: C.black };

  // Left yellow bar
  rect(s, 0, 0, 0.14, 5.625, C.yellow);

  // Right side panel
  rect(s, 7.7, 0, 2.3, 5.625, C.dark);
  rect(s, 9.86, 0, 0.14, 5.625, C.yellow);

  // Big Q&A
  txt(s, "Q&A", 0.35, 0.55, 7.2, 2.4,
    { fontSize: 130, bold: true, color: C.white, fontFace: "Arial Black" });

  // Yellow separator
  rect(s, 0.35, 3.15, 7.2, 0.06, C.yellow);

  // Brand
  txt(s, "WACKY WILLY × FPOF", 0.35, 3.35, 7, 0.5,
    { fontSize: 11, bold: true, color: C.yellow, charSpacing: 4 });

  // Tagline
  txt(s, "상품력으로 신뢰를, 트렌드로 감도를, IP로 독창성을,\n고객에게 즐거움을.",
    0.35, 3.92, 7, 0.82,
    { fontSize: 14, color: C.light });

  // Slogan
  txt(s, "\"규칙은 없어, 우리만의 놀이터로 초대할게!\"",
    0.35, 4.82, 7, 0.5,
    { fontSize: 12, color: C.mid, italic: true });

  // Right side: color swatches
  [C.yellow, C.black, "FFFFFF", C.sky].forEach((col, i) => {
    rect(s, 7.85, 0.8 + i * 1.1, 2.0, 0.95, col);
  });
}

// ================================================================
// SAVE
// ================================================================
const outPath = "docs/FPOF-와키윌리-사용가이드.pptx";
pres.writeFile({ fileName: outPath })
  .then(() => console.log("✓ 저장 완료:", outPath))
  .catch(err => { console.error("저장 실패:", err); process.exit(1); });
