const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "FPOF System";
pres.title = "와키윌리 FPOF 사용 매뉴얼";

// =========================================
// THEME: Dark Neon (NOT brand colors)
// =========================================
const C = {
  bg: "0A0A14",
  bgCard: "16162A",
  bgCardLight: "1C1C36",
  text: "FFFFFF",
  textMuted: "A0A0C0",
  textDim: "606080",
  blue: "0066FF",
  orange: "FF6B35",
  purple: "8B5CF6",
  cyan: "00E5CC",
  pink: "FF3CAC",
  red: "FF3C50",
  green: "10B981",
};

const FONT_H = "Arial Black";
const FONT_B = "Arial";

// Helper: fresh shadow factory (avoid mutation)
const cardShadow = () => ({ type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.3 });

// Helper: add dark bg + optional glow
function darkSlide(glowColor) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  if (glowColor) {
    s.addShape(pres.shapes.OVAL, {
      x: -2, y: -1.5, w: 6, h: 5,
      fill: { color: glowColor, transparency: 90 },
    });
  }
  return s;
}

// Helper: slide number
function addSlideNum(s, num) {
  s.addText(`${String(num).padStart(2, "0")} / 30`, {
    x: 8.5, y: 5.15, w: 1.2, h: 0.35,
    fontSize: 8, fontFace: FONT_B, color: C.textDim, align: "right",
  });
}

// Helper: chapter tag
function addTag(s, text, color) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 0.4, w: text.length * 0.11 + 0.5, h: 0.32,
    fill: { color: color, transparency: 85 },
    rectRadius: 0.1,
    line: { color: color, width: 0.5, transparency: 70 },
  });
  s.addText(text, {
    x: 0.6, y: 0.4, w: text.length * 0.11 + 0.5, h: 0.32,
    fontSize: 9, fontFace: FONT_B, color: color, align: "center", valign: "middle", margin: 0,
  });
}

// Helper: gradient bar (decorative)
function addGradientBar(s, x, y, w) {
  const barH = 0.04;
  const third = w / 3;
  s.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: third, h: barH, fill: { color: C.orange } });
  s.addShape(pres.shapes.RECTANGLE, { x: x + third, y: y, w: third, h: barH, fill: { color: C.pink } });
  s.addShape(pres.shapes.RECTANGLE, { x: x + third * 2, y: y, w: third, h: barH, fill: { color: C.purple } });
}

// Helper: card background
function addCard(s, x, y, w, h, opts = {}) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.color || C.bgCard },
    line: { color: opts.borderColor || "FFFFFF", width: 0.3, transparency: 92 },
    shadow: cardShadow(),
  });
  if (opts.topBorder) {
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h: 0.03,
      fill: { color: opts.topBorder },
    });
  }
  if (opts.leftBorder) {
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.04, h,
      fill: { color: opts.leftBorder },
    });
  }
}

// Helper: step number circle
function addStepCircle(s, x, y, num, color) {
  s.addShape(pres.shapes.OVAL, {
    x, y, w: 0.3, h: 0.3,
    fill: { color: color || C.purple },
  });
  s.addText(String(num), {
    x, y, w: 0.3, h: 0.3,
    fontSize: 10, fontFace: FONT_B, color: "FFFFFF", bold: true, align: "center", valign: "middle", margin: 0,
  });
}

// Helper: progress bar
function addProgressBar(s, x, y, w, pct, color) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.08,
    fill: { color: "FFFFFF", transparency: 95 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w: w * (pct / 100), h: 0.08,
    fill: { color },
  });
}

// =========================================
// SLIDE 1: TITLE
// =========================================
let s1 = darkSlide(C.purple);
addGradientBar(s1, 3.5, 1.8, 3);
s1.addText("와키윌리", {
  x: 0.5, y: 1.95, w: 9, h: 1.0,
  fontSize: 48, fontFace: FONT_H, color: C.orange, align: "center", valign: "middle", margin: 0,
});
s1.addText("FPOF 사용 매뉴얼", {
  x: 0.5, y: 2.85, w: 9, h: 0.7,
  fontSize: 32, fontFace: FONT_H, color: C.text, align: "center", valign: "middle", margin: 0,
});
s1.addText("비개발자를 위한 완벽 가이드", {
  x: 0.5, y: 3.6, w: 9, h: 0.5,
  fontSize: 16, fontFace: FONT_B, color: C.textMuted, align: "center", valign: "middle", margin: 0,
});
addSlideNum(s1, 1);

// =========================================
// SLIDE 2: TABLE OF CONTENTS
// =========================================
let s2 = darkSlide(C.blue);
addTag(s2, "Overview", C.purple);
s2.addText("목차", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const tocItems = [
  { ch: "1장", title: "시작하기", desc: "시스템 소개, 로그인, 첫 화면", color: C.blue },
  { ch: "2장", title: "기본 사용법", desc: "자연어 요청, 상태 확인, 산출물", color: C.purple },
  { ch: "3장", title: "PDCA 단계별", desc: "Plan → Design → Do → Check → Act", color: C.orange },
  { ch: "4장", title: "슬래시 명령어", desc: "상태, 산출물, 품질 명령어", color: C.cyan },
  { ch: "5장", title: "실전 시나리오", desc: "시즌 기획, 히트상품, 실패 분석", color: C.pink },
  { ch: "6장", title: "FAQ", desc: "자주 묻는 질문, 문제 해결", color: C.textMuted },
];

tocItems.forEach((item, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const cx = 0.6 + col * 4.5;
  const cy = 1.55 + row * 1.2;
  addCard(s2, cx, cy, 4.2, 0.95, { topBorder: item.color });
  s2.addText(`${item.ch} — ${item.title}`, {
    x: cx + 0.2, y: cy + 0.15, w: 3.8, h: 0.35,
    fontSize: 13, fontFace: FONT_H, color: item.color, margin: 0,
  });
  s2.addText(item.desc, {
    x: cx + 0.2, y: cy + 0.5, w: 3.8, h: 0.3,
    fontSize: 10, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s2, 2);

// =========================================
// SLIDE 3: WHAT IS FPOF
// =========================================
let s3 = darkSlide(C.orange);
addTag(s3, "1장 — 시작하기", C.blue);
s3.addText("FPOF란?", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});
addGradientBar(s3, 0.6, 1.4, 1.5);
s3.addText("Fashion PDCA Orchestration Framework", {
  x: 0.6, y: 1.7, w: 8.8, h: 0.5,
  fontSize: 18, fontFace: FONT_H, color: C.orange, margin: 0,
});
addCard(s3, 0.6, 2.5, 8.8, 1.5, { leftBorder: C.purple });
s3.addText([
  { text: '당신이 ', options: { fontSize: 14, color: C.text } },
  { text: '"무드보드 만들어줘"', options: { fontSize: 14, color: C.cyan, bold: true } },
  { text: '라고 말하면,', options: { fontSize: 14, color: C.text, breakLine: true } },
  { text: 'AI가 알아서 크리에이티브 디렉터를 불러와서', options: { fontSize: 14, color: C.text, breakLine: true } },
  { text: '무드보드를 만들어 주는 시스템입니다.', options: { fontSize: 14, color: C.text } },
], {
  x: 0.9, y: 2.65, w: 8.2, h: 1.2,
  fontFace: FONT_B, valign: "middle",
});
addSlideNum(s3, 3);

// =========================================
// SLIDE 4: 3 KEY FEATURES
// =========================================
let s4 = darkSlide();
addTag(s4, "1장 — 시작하기", C.blue);
s4.addText("3가지 핵심 기능", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const features = [
  { icon: "💬", title: "자연어 커뮤니케이션", desc: "복잡한 명령어 없이\n평소 말하듯 요청하면\nAI가 이해하고 실행", color: C.blue },
  { icon: "🤖", title: "자동 전문가 배정", desc: "20명의 AI 전문가 대기\n내용에 따라 자동으로\n적합한 전문가 배정", color: C.purple },
  { icon: "🎨", title: "브랜드 보이스 보장", desc: "와키윌리 DNA, 톤앤매너\n사전 세팅. 모든 결과물이\n브랜드에 맞음", color: C.orange },
];

features.forEach((f, i) => {
  const cx = 0.6 + i * 3.1;
  addCard(s4, cx, 1.6, 2.85, 2.8, { topBorder: f.color });
  s4.addText(f.icon, {
    x: cx, y: 1.85, w: 2.85, h: 0.5,
    fontSize: 28, align: "center", margin: 0,
  });
  s4.addText(f.title, {
    x: cx + 0.2, y: 2.45, w: 2.45, h: 0.35,
    fontSize: 13, fontFace: FONT_H, color: f.color, align: "center", margin: 0,
  });
  s4.addText(f.desc, {
    x: cx + 0.2, y: 2.9, w: 2.45, h: 1.2,
    fontSize: 10, fontFace: FONT_B, color: C.textMuted, align: "center", valign: "top", margin: 0,
  });
});
addSlideNum(s4, 4);

// =========================================
// SLIDE 5: GETTING STARTED
// =========================================
let s5 = darkSlide(C.blue);
addTag(s5, "1장 — 시작하기", C.blue);
s5.addText("로그인 & 첫 화면", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

// Left card: Claude Code start
addCard(s5, 0.6, 1.6, 4.2, 2.8, { topBorder: C.cyan });
s5.addText("Claude Code 시작", {
  x: 0.8, y: 1.75, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.cyan, margin: 0,
});
addCard(s5, 0.8, 2.2, 3.8, 1.0, { color: "000000" });
s5.addText([
  { text: '# 프로젝트 폴더로 이동', options: { color: C.textDim, fontSize: 9, breakLine: true } },
  { text: 'cd "FPOF V2.2 Claude"', options: { color: C.cyan, fontSize: 10, breakLine: true } },
  { text: '', options: { fontSize: 6, breakLine: true } },
  { text: '# Claude Code 시작', options: { color: C.textDim, fontSize: 9, breakLine: true } },
  { text: 'claude', options: { color: C.purple, fontSize: 10, bold: true } },
], {
  x: 1.0, y: 2.3, w: 3.4, h: 0.8,
  fontFace: "Courier New", valign: "top", margin: 0,
});

// Right card: First screen
addCard(s5, 5.2, 1.6, 4.2, 2.8, { topBorder: C.orange });
s5.addText("첫 화면 응답", {
  x: 5.4, y: 1.75, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
addCard(s5, 5.4, 2.2, 3.8, 1.8, { color: "000000" });
s5.addText([
  { text: '📊 현재 시즌: 26SS', options: { fontSize: 10, color: C.text, breakLine: true } },
  { text: '🔄 현재 단계: Plan', options: { fontSize: 10, color: C.text, breakLine: true } },
  { text: '📁 산출물 위치: output/26SS/', options: { fontSize: 10, color: C.text, breakLine: true } },
  { text: '', options: { fontSize: 6, breakLine: true } },
  { text: '💡 "지금 어디까지 진행됐어?"', options: { fontSize: 9, color: C.cyan } },
], {
  x: 5.6, y: 2.35, w: 3.4, h: 1.5,
  fontFace: FONT_B, valign: "top", margin: 0,
});
addSlideNum(s5, 5);

// =========================================
// SLIDE 6: NATURAL LANGUAGE
// =========================================
let s6 = darkSlide(C.orange);
addTag(s6, "2장 — 기본 사용법", C.orange);
s6.addText("자연어로 말하는 법", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

// Good examples
addCard(s6, 0.6, 1.55, 4.2, 1.7, { leftBorder: C.cyan });
s6.addText("✅ 잘하는 방법", {
  x: 0.85, y: 1.65, w: 3.7, h: 0.3,
  fontSize: 11, fontFace: FONT_H, color: C.cyan, margin: 0,
});
s6.addText([
  { text: '"그래픽 티 무드보드 만들어줘"', options: { breakLine: true } },
  { text: '"오버핏 후디 디자인 스펙 작성해줘"', options: { breakLine: true } },
  { text: '"이번 시즌 트렌드 분석해줘"', options: {} },
], {
  x: 0.85, y: 2.05, w: 3.7, h: 1.0,
  fontSize: 10, fontFace: "Courier New", color: C.cyan, margin: 0,
});

// Bad examples
addCard(s6, 5.2, 1.55, 4.2, 1.7, { leftBorder: C.red });
s6.addText("❌ 피해야 할 방법", {
  x: 5.45, y: 1.65, w: 3.7, h: 0.3,
  fontSize: 11, fontFace: FONT_H, color: C.red, margin: 0,
});
s6.addText([
  { text: '"알아서 해" → 너무 모호함', options: { breakLine: true } },
  { text: '"그거 만들어" → 무엇인지 모름', options: { breakLine: true } },
  { text: '"뭐 할까?" → 스스로 결정 안 함', options: {} },
], {
  x: 5.45, y: 2.05, w: 3.7, h: 1.0,
  fontSize: 10, fontFace: "Courier New", color: C.red, margin: 0,
});

// Tip card
addCard(s6, 0.6, 3.55, 8.8, 0.9, { leftBorder: C.cyan });
s6.addText([
  { text: 'Tip: ', options: { bold: true, color: C.cyan } },
  { text: '구체적으로 말할수록 좋습니다 — "키키 캐릭터를 활용한 유니섹스 그래픽 티셔츠 디자인해줘. 타겟은 18~22세, 스트리트 감성으로"', options: { color: C.textMuted } },
], {
  x: 0.85, y: 3.65, w: 8.3, h: 0.7,
  fontSize: 10, fontFace: FONT_B, valign: "middle", margin: 0,
});
addSlideNum(s6, 6);

// =========================================
// SLIDE 7: EXPERT & REFERENCE
// =========================================
let s7 = darkSlide();
addTag(s7, "2장 — 기본 사용법", C.orange);
s7.addText("전문가 지명 & 참조", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s7, 0.6, 1.55, 4.2, 2.6, { topBorder: C.purple });
s7.addText("특정 전문가 지명하기", {
  x: 0.8, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.purple, margin: 0,
});
s7.addText([
  { text: '"패션 에디터한테 PDP 카피 맡길게"', options: { breakLine: true } },
  { text: '"마케팅 디렉터가 GTM 계획 세워줘"', options: { breakLine: true } },
  { text: '"시장 리서처한테 경쟁사 분석 시켜줘"', options: {} },
], {
  x: 0.8, y: 2.15, w: 3.8, h: 1.5,
  fontSize: 10, fontFace: "Courier New", color: C.cyan, margin: 0,
});

addCard(s7, 5.2, 1.55, 4.2, 2.6, { topBorder: C.orange });
s7.addText("이전 산출물 참조하기", {
  x: 5.4, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
s7.addText([
  { text: '"아까 만든 무드보드 기반으로', options: { breakLine: true } },
  { text: ' 디자인 스펙 작성해줘"', options: { breakLine: true } },
  { text: '', options: { fontSize: 6, breakLine: true } },
  { text: '"트렌드 브리프에서 뽑은', options: { breakLine: true } },
  { text: ' 키워드로 시즌 테마 잡아줘"', options: {} },
], {
  x: 5.4, y: 2.15, w: 3.8, h: 1.5,
  fontSize: 10, fontFace: "Courier New", color: C.cyan, margin: 0,
});
addSlideNum(s7, 7);

// =========================================
// SLIDE 8: STATUS & DELIVERABLES
// =========================================
let s8 = darkSlide(C.blue);
addTag(s8, "2장 — 기본 사용법", C.orange);
s8.addText("상태 확인 & 산출물 요청", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s8, 0.6, 1.55, 4.2, 2.8, { topBorder: C.blue });
s8.addText("상태 확인", {
  x: 0.8, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.blue, margin: 0,
});
addCard(s8, 0.8, 2.15, 3.8, 0.7, { color: "000000" });
s8.addText([
  { text: '"지금 어디까지 진행됐어?"', options: { breakLine: true } },
  { text: '또는  /status', options: { color: C.purple } },
], {
  x: 1.0, y: 2.25, w: 3.4, h: 0.5,
  fontSize: 10, fontFace: "Courier New", color: C.cyan, margin: 0,
});
s8.addText("시즌, PDCA 단계, 진행률,\n완료/진행중 산출물 확인", {
  x: 0.8, y: 3.05, w: 3.8, h: 0.5,
  fontSize: 10, fontFace: FONT_B, color: C.textMuted, margin: 0,
});

addCard(s8, 5.2, 1.55, 4.2, 2.8, { topBorder: C.orange });
s8.addText("산출물 요청 패턴", {
  x: 5.4, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
addCard(s8, 5.4, 2.15, 3.8, 1.8, { color: "000000" });
s8.addText([
  { text: '[산출물 유형] [대상] 만들어줘', options: { color: C.textMuted, breakLine: true } },
  { text: '', options: { fontSize: 6, breakLine: true } },
  { text: '"무드보드 그래픽 티 만들어줘"', options: { color: C.cyan, breakLine: true } },
  { text: '"디자인 스펙 오버핏 후디 작성해줘"', options: { color: C.cyan, breakLine: true } },
  { text: '"테크팩 룩북 상품 만들어줘"', options: { color: C.cyan } },
], {
  x: 5.6, y: 2.25, w: 3.4, h: 1.6,
  fontSize: 10, fontFace: "Courier New", margin: 0,
});
addSlideNum(s8, 8);

// =========================================
// SLIDE 9: PDCA OVERVIEW
// =========================================
let s9 = darkSlide();
addTag(s9, "3장 — PDCA 단계별 사용법", C.purple);
s9.addText("PDCA 사이클", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, align: "center", margin: 0,
});

// PDCA flow pills
const pdcaItems = [
  { label: "Plan", color: C.blue },
  { label: "Design", color: C.purple },
  { label: "Do", color: C.orange },
  { label: "Check", color: C.cyan },
  { label: "Act", color: C.pink },
];
pdcaItems.forEach((p, i) => {
  const px = 1.0 + i * 1.75;
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: px, y: 1.6, w: 1.3, h: 0.38,
    fill: { color: p.color, transparency: 80 },
    line: { color: p.color, width: 0.5, transparency: 60 },
    rectRadius: 0.15,
  });
  s9.addText(p.label, {
    x: px, y: 1.6, w: 1.3, h: 0.38,
    fontSize: 11, fontFace: FONT_H, color: p.color, align: "center", valign: "middle", margin: 0,
  });
  if (i < 4) {
    s9.addText("→", {
      x: px + 1.3, y: 1.6, w: 0.45, h: 0.38,
      fontSize: 12, color: C.textDim, align: "center", valign: "middle", margin: 0,
    });
  }
});

// Details grid
const pdcaDetails = [
  { title: "Plan — 시즌 기획", desc: "전략기획실: 트렌드→테마→MD→라인시트", color: C.blue },
  { title: "Design — 크리에이티브", desc: "크리에이티브 스튜디오 + 프로덕트 랩", color: C.purple },
  { title: "Do — 상품화 & 런칭", desc: "프로덕트 랩 + 마케팅 쇼룸", color: C.orange },
];
pdcaDetails.forEach((d, i) => {
  const cx = 0.6 + i * 3.1;
  addCard(s9, cx, 2.3, 2.85, 1.1, { topBorder: d.color });
  s9.addText(d.title, {
    x: cx + 0.15, y: 2.45, w: 2.55, h: 0.3,
    fontSize: 10, fontFace: FONT_H, color: d.color, margin: 0,
  });
  s9.addText(d.desc, {
    x: cx + 0.15, y: 2.8, w: 2.55, h: 0.4,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});

// Bottom row
const pdcaBottom = [
  { title: "Check — 성과 분석", desc: "데이터 인텔리전스 + QC 본부", color: C.cyan },
  { title: "Act — 개선 반복", desc: "QC 본부 PDCA 이터레이터", color: C.pink },
];
pdcaBottom.forEach((d, i) => {
  const cx = 2.0 + i * 3.3;
  addCard(s9, cx, 3.65, 2.85, 1.1, { topBorder: d.color });
  s9.addText(d.title, {
    x: cx + 0.15, y: 3.8, w: 2.55, h: 0.3,
    fontSize: 10, fontFace: FONT_H, color: d.color, margin: 0,
  });
  s9.addText(d.desc, {
    x: cx + 0.15, y: 4.15, w: 2.55, h: 0.4,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s9, 9);

// =========================================
// SLIDE 10: PLAN STAGE OVERVIEW
// =========================================
let s10 = darkSlide(C.blue);
addTag(s10, "Plan", C.blue);
s10.addText("전략기획실", {
  x: 1.6, y: 0.38, w: 2, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.blue, margin: 0,
});
s10.addText("Plan 단계: 시즌 기획", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const planSteps = [
  { n: 1, title: "트렌드 분석", desc: '"26SS 트렌드 분석해줘" → Macro/Micro 트렌드, 경쟁사 동향' },
  { n: 2, title: "시즌 테마 수립", desc: '"26SS 시즌 테마 제안해줘" → 비주얼 톤, 경영목표 연결' },
  { n: 3, title: "MD 전략", desc: '"카테고리 믹스랑 챔피언 상품 전략 짜줘" → 가격대, SKU' },
  { n: 4, title: "라인시트", desc: '"라인시트 만들어줘" → SKU 목록, OTB, 사이즈/컬러' },
  { n: 5, title: "검수 & 전환", desc: '"Plan 단계 검수해줘" → QG1 PASS → Design 단계로' },
];

planSteps.forEach((step, i) => {
  const sy = 1.55 + i * 0.75;
  addStepCircle(s10, 0.7, sy + 0.05, step.n, C.blue);
  s10.addText(step.title, {
    x: 1.15, y: sy, w: 2, h: 0.3,
    fontSize: 12, fontFace: FONT_H, color: C.text, margin: 0,
  });
  s10.addText(step.desc, {
    x: 1.15, y: sy + 0.3, w: 8.2, h: 0.3,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s10, 10);

// =========================================
// SLIDE 11: PLAN - TREND EXAMPLE
// =========================================
let s11 = darkSlide();
addTag(s11, "Plan", C.blue);
s11.addText("Step 1: 트렌드 분석", {
  x: 1.4, y: 0.38, w: 3, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
s11.addText("AI 응답 예시", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s11, 0.6, 1.5, 8.8, 3.3, { leftBorder: C.blue });
s11.addText("[AI: 시장 리서처가 작업을 시작합니다...]", {
  x: 0.9, y: 1.6, w: 8.2, h: 0.3,
  fontSize: 9, fontFace: FONT_B, color: C.blue, margin: 0,
});

const trendCols = [
  { title: "🌍 Macro Trend", items: "Y2K Renaissance\nGenderless Fashion\nDigital Nomad", color: C.orange },
  { title: "📱 Micro Trend", items: "TikTok Cottagecore\nInstagram Barbiecore\nYouTube Y2K Haul", color: C.purple },
  { title: "🔍 경쟁사 분석", items: "Brand A: Y2K +20%\nBrand B: Genderless\nBrand C: 디지털 노마드", color: C.cyan },
];

trendCols.forEach((col, i) => {
  const cx = 1.0 + i * 2.9;
  s11.addText(col.title, {
    x: cx, y: 2.1, w: 2.6, h: 0.3,
    fontSize: 10, fontFace: FONT_H, color: col.color, margin: 0,
  });
  s11.addText(col.items, {
    x: cx, y: 2.5, w: 2.6, h: 1.2,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});

s11.addText("📁 output/26SS/season-strategy/plan_trend-brief.md", {
  x: 0.9, y: 4.2, w: 8.2, h: 0.3,
  fontSize: 8, fontFace: FONT_B, color: C.textDim, margin: 0,
});
addSlideNum(s11, 11);

// =========================================
// SLIDE 12: PLAN - MD STRATEGY
// =========================================
let s12 = darkSlide(C.purple);
addTag(s12, "Plan", C.blue);
s12.addText("Step 3: MD 전략", {
  x: 1.4, y: 0.38, w: 3, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
s12.addText("카테고리 믹스 & 챔피언 상품", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

// Category mix
addCard(s12, 0.6, 1.55, 4.2, 2.8, { topBorder: C.blue });
s12.addText("📊 카테고리 믹스", {
  x: 0.8, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.blue, margin: 0,
});
const cats = [
  { label: "유니섹스", pct: 50, color: C.blue, y: 2.2 },
  { label: "우먼스", pct: 30, color: C.purple, y: 2.7 },
  { label: "용품", pct: 20, color: C.orange, y: 3.2 },
];
cats.forEach(c => {
  addProgressBar(s12, 0.8, c.y + 0.15, 2.5, c.pct, c.color);
  s12.addText(`${c.label} ${c.pct}%`, {
    x: 3.5, y: c.y, w: 1.2, h: 0.3,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});

// Champion products
addCard(s12, 5.2, 1.55, 4.2, 2.8, { topBorder: C.orange });
s12.addText("🏆 챔피언 상품", {
  x: 5.4, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
const champs = [
  { num: "1", name: "키키 그래픽 티 (Carry-over)" },
  { num: "2", name: "오버핏 후디 (Carry-over)" },
  { num: "3", name: "크로스백 (New)" },
];
champs.forEach((ch, i) => {
  const cy = 2.2 + i * 0.5;
  s12.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: cy, w: 3.8, h: 0.35,
    fill: { color: "FFFFFF", transparency: 97 },
  });
  s12.addText(ch.num, {
    x: 5.5, y: cy, w: 0.4, h: 0.35,
    fontSize: 10, fontFace: "Courier New", color: C.cyan, align: "center", valign: "middle", margin: 0,
  });
  s12.addText(ch.name, {
    x: 6.0, y: cy, w: 3.0, h: 0.35,
    fontSize: 10, fontFace: FONT_B, color: C.textMuted, valign: "middle", margin: 0,
  });
});
s12.addText("Core: 39K~79K / Premium: 89K~159K", {
  x: 5.4, y: 3.85, w: 3.8, h: 0.3,
  fontSize: 9, fontFace: FONT_B, color: C.textDim, margin: 0,
});
addSlideNum(s12, 12);

// =========================================
// SLIDE 13: DESIGN STAGE
// =========================================
let s13 = darkSlide(C.orange);
addTag(s13, "Design", C.purple);
s13.addText("크리에이티브 스튜디오 + 프로덕트 랩", {
  x: 1.9, y: 0.38, w: 5, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.purple, margin: 0,
});
s13.addText("Design 단계: 크리에이티브 개발", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const designCards = [
  { icon: "🎨", title: "무드보드", desc: "비주얼 톤,\n컬러 팔레트,\n레퍼런스", color: C.purple },
  { icon: "📐", title: "디자인 스펙", desc: "실루엣, 소재,\n그래픽, 사이즈", color: C.blue },
  { icon: "🖼️", title: "비주얼 생성", desc: "플랫/디테일/\n스타일링 이미지", color: C.orange },
  { icon: "💰", title: "원가 검증", desc: "BOM 산출,\nVE 제안", color: C.cyan },
];

designCards.forEach((dc, i) => {
  const cx = 0.6 + i * 2.35;
  addCard(s13, cx, 1.6, 2.1, 2.3, { topBorder: dc.color });
  s13.addText(dc.icon, {
    x: cx, y: 1.8, w: 2.1, h: 0.45,
    fontSize: 24, align: "center", margin: 0,
  });
  s13.addText(dc.title, {
    x: cx + 0.15, y: 2.3, w: 1.8, h: 0.3,
    fontSize: 12, fontFace: FONT_H, color: dc.color, align: "center", margin: 0,
  });
  s13.addText(dc.desc, {
    x: cx + 0.15, y: 2.7, w: 1.8, h: 0.9,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, align: "center", margin: 0,
  });
});
addSlideNum(s13, 13);

// =========================================
// SLIDE 14: DESIGN - MOODBOARD & COSTING
// =========================================
let s14 = darkSlide();
addTag(s14, "Design", C.purple);
s14.addText("무드보드 & 원가 검증", {
  x: 1.9, y: 0.38, w: 4, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
s14.addText("AI 응답 예시", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

// Moodboard card
addCard(s14, 0.6, 1.5, 4.2, 3.0, { leftBorder: C.purple });
s14.addText("📋 무드보드: 키키 그래픽 티", {
  x: 0.85, y: 1.6, w: 3.7, h: 0.3,
  fontSize: 10, fontFace: FONT_H, color: C.purple, margin: 0,
});
s14.addText("🎨 비주얼 톤", {
  x: 0.85, y: 2.1, w: 3.7, h: 0.25,
  fontSize: 9, fontFace: FONT_B, color: C.cyan, margin: 0,
});
s14.addText("Street Grunge · Y2K Aesthetic", {
  x: 0.85, y: 2.35, w: 3.7, h: 0.25,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
s14.addText("🌈 컬러 팔레트", {
  x: 0.85, y: 2.8, w: 3.7, h: 0.25,
  fontSize: 9, fontFace: FONT_B, color: C.orange, margin: 0,
});
// Color swatches
[{ c: "FF6B35", x: 0.85 }, { c: "0066FF", x: 1.2 }, { c: "000000", x: 1.55 }].forEach(sw => {
  s14.addShape(pres.shapes.RECTANGLE, {
    x: sw.x, y: 3.1, w: 0.25, h: 0.25,
    fill: { color: sw.c },
    line: { color: "FFFFFF", width: 0.3, transparency: 90 },
  });
});

// Costing card
addCard(s14, 5.2, 1.5, 4.2, 3.0, { leftBorder: C.cyan });
s14.addText("💰 원가 계산 결과", {
  x: 5.45, y: 1.6, w: 3.7, h: 0.3,
  fontSize: 10, fontFace: FONT_H, color: C.cyan, margin: 0,
});
const costItems = [
  { label: "메인 원단", value: "8,500원" },
  { label: "프린트", value: "3,000원" },
  { label: "부자재", value: "2,000원" },
  { label: "봉제", value: "4,000원" },
];
costItems.forEach((ci, i) => {
  const cy = 2.1 + i * 0.35;
  s14.addShape(pres.shapes.RECTANGLE, { x: 5.45, y: cy + 0.3, w: 3.7, h: 0.005, fill: { color: "FFFFFF", transparency: 95 } });
  s14.addText(ci.label, {
    x: 5.45, y: cy, w: 2, h: 0.3,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
  s14.addText(ci.value, {
    x: 7.45, y: cy, w: 1.7, h: 0.3,
    fontSize: 9, fontFace: "Courier New", color: C.cyan, align: "right", margin: 0,
  });
});

// Total
s14.addShape(pres.shapes.RECTANGLE, { x: 5.45, y: 3.65, w: 3.7, h: 0.02, fill: { color: C.cyan, transparency: 70 } });
s14.addText("총 원가", {
  x: 5.45, y: 3.75, w: 2, h: 0.3,
  fontSize: 11, fontFace: FONT_H, color: C.cyan, margin: 0,
});
s14.addText("17,500원 ✅", {
  x: 7.45, y: 3.75, w: 1.7, h: 0.3,
  fontSize: 11, fontFace: FONT_H, color: C.cyan, align: "right", margin: 0,
});
addSlideNum(s14, 14);

// =========================================
// SLIDE 15: DO STAGE
// =========================================
let s15 = darkSlide(C.orange);
addTag(s15, "Do", C.orange);
s15.addText("프로덕트 랩 + 마케팅 쇼룸", {
  x: 1.2, y: 0.38, w: 4, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.orange, margin: 0,
});
s15.addText("Do 단계: 상품화 & 런칭", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const doCards = [
  { icon: "📋", title: "테크팩", desc: "디자인/소재/패턴/봉제 스펙", color: C.orange },
  { icon: "📢", title: "IMC 전략", desc: "캠페인 타임라인, 채널 믹스", color: C.purple },
  { icon: "📝", title: "카피라이팅", desc: "헤드라인, 상품 설명, 특징", color: C.blue },
];
doCards.forEach((dc, i) => {
  const cx = 0.6 + i * 3.1;
  addCard(s15, cx, 1.55, 2.85, 1.6, { topBorder: dc.color });
  s15.addText(dc.icon, {
    x: cx, y: 1.7, w: 2.85, h: 0.4,
    fontSize: 22, align: "center", margin: 0,
  });
  s15.addText(dc.title, {
    x: cx + 0.2, y: 2.1, w: 2.45, h: 0.3,
    fontSize: 12, fontFace: FONT_H, color: dc.color, align: "center", margin: 0,
  });
  s15.addText(dc.desc, {
    x: cx + 0.2, y: 2.45, w: 2.45, h: 0.4,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, align: "center", margin: 0,
  });
});

const doCards2 = [
  { icon: "📸", title: "콘텐츠 기획", desc: "촬영 콘셉트, 모델, 샷 리스트", color: C.cyan },
  { icon: "🌐", title: "소셜 전략", desc: "인플루언서 타겟팅, 협업, 예산", color: C.pink },
];
doCards2.forEach((dc, i) => {
  const cx = 2.0 + i * 3.4;
  addCard(s15, cx, 3.4, 2.85, 1.35, { topBorder: dc.color });
  s15.addText(dc.icon, {
    x: cx, y: 3.5, w: 2.85, h: 0.35,
    fontSize: 20, align: "center", margin: 0,
  });
  s15.addText(dc.title, {
    x: cx + 0.2, y: 3.85, w: 2.45, h: 0.25,
    fontSize: 11, fontFace: FONT_H, color: dc.color, align: "center", margin: 0,
  });
  s15.addText(dc.desc, {
    x: cx + 0.2, y: 4.15, w: 2.45, h: 0.35,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, align: "center", margin: 0,
  });
});
addSlideNum(s15, 15);

// =========================================
// SLIDE 16: DO - IMC EXAMPLE
// =========================================
let s16 = darkSlide(C.orange);
addTag(s16, "Do", C.orange);
s16.addText("IMC 전략 예시", {
  x: 1.2, y: 0.38, w: 3, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
s16.addText("캠페인 타임라인 & 채널 믹스", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s16, 0.6, 1.55, 4.2, 2.8, { topBorder: C.orange });
s16.addText("📅 캠페인 타임라인", {
  x: 0.8, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
const timeline = [
  { week: "W1-2", act: "Teasing (유튜브 쇼츠)" },
  { week: "W3-4", act: "Main Launch (인스타+틱톡)" },
  { week: "W5-8", act: "Sustain (유튜브 롱폼)" },
];
timeline.forEach((t, i) => {
  const ty = 2.2 + i * 0.5;
  s16.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: ty + 0.38, w: 3.8, h: 0.005, fill: { color: "FFFFFF", transparency: 95 } });
  s16.addText(t.week, {
    x: 0.8, y: ty, w: 0.7, h: 0.35,
    fontSize: 9, fontFace: "Courier New", color: C.cyan, margin: 0,
  });
  s16.addText(t.act, {
    x: 1.6, y: ty, w: 2.8, h: 0.35,
    fontSize: 10, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});

addCard(s16, 5.2, 1.55, 4.2, 2.8, { topBorder: C.purple });
s16.addText("📱 채널 믹스", {
  x: 5.4, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.purple, margin: 0,
});
const channels = [
  { name: "YouTube", pct: 40, color: C.orange },
  { name: "Instagram", pct: 30, color: C.purple },
  { name: "TikTok", pct: 30, color: C.cyan },
];
channels.forEach((ch, i) => {
  const cy = 2.2 + i * 0.55;
  addProgressBar(s16, 5.4, cy + 0.15, 2.5, ch.pct, ch.color);
  s16.addText(`${ch.name} ${ch.pct}%`, {
    x: 8.0, y: cy, w: 1.3, h: 0.3,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
s16.addText("💰 총 예산: 5억원", {
  x: 5.4, y: 3.85, w: 3.8, h: 0.3,
  fontSize: 9, fontFace: FONT_B, color: C.textDim, margin: 0,
});
addSlideNum(s16, 16);

// =========================================
// SLIDE 17: CHECK STAGE
// =========================================
let s17 = darkSlide(C.cyan);
addTag(s17, "Check", C.cyan);
s17.addText("데이터 인텔리전스 + QC 본부", {
  x: 1.7, y: 0.38, w: 5, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.cyan, margin: 0,
});
s17.addText("Check 단계: 성과 분석", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const checkCards = [
  { icon: "📊", title: "매출 분석", desc: "채널별/카테고리별 매출\nTOP 상품", color: C.cyan },
  { icon: "💡", title: "인사이트 도출", desc: "성공/실패 요인\n플레이북", color: C.purple },
  { icon: "📉", title: "갭 분석", desc: "기획 vs 실적\nMatch Rate", color: C.orange },
];
checkCards.forEach((cc, i) => {
  const cx = 0.6 + i * 3.1;
  addCard(s17, cx, 1.55, 2.85, 1.8, { topBorder: cc.color });
  s17.addText(cc.icon, { x: cx, y: 1.7, w: 2.85, h: 0.4, fontSize: 22, align: "center", margin: 0 });
  s17.addText(cc.title, { x: cx + 0.2, y: 2.1, w: 2.45, h: 0.3, fontSize: 12, fontFace: FONT_H, color: cc.color, align: "center", margin: 0 });
  s17.addText(cc.desc, { x: cx + 0.2, y: 2.45, w: 2.45, h: 0.6, fontSize: 9, fontFace: FONT_B, color: C.textMuted, align: "center", margin: 0 });
});

addCard(s17, 0.6, 3.6, 8.8, 0.8, { leftBorder: C.cyan });
s17.addText([
  { text: 'Match Rate', options: { bold: true, color: C.cyan } },
  { text: ': 기획 대비 실행 정합도. ', options: { color: C.textMuted } },
  { text: '90% 이상', options: { bold: true, color: C.text } },
  { text: '이면 시즌 완료, 미달 시 → Act 단계에서 자동 개선 루프', options: { color: C.textMuted } },
], {
  x: 0.85, y: 3.7, w: 8.3, h: 0.6,
  fontSize: 10, fontFace: FONT_B, valign: "middle", margin: 0,
});
addSlideNum(s17, 17);

// =========================================
// SLIDE 18: CHECK - SALES EXAMPLE
// =========================================
let s18 = darkSlide();
addTag(s18, "Check", C.cyan);
s18.addText("매출 분석 예시", {
  x: 1.7, y: 0.38, w: 3, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
s18.addText("26SS 매출 분석", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s18, 0.6, 1.55, 4.2, 2.8, { topBorder: C.cyan });
s18.addText("총 매출", {
  x: 0.8, y: 1.7, w: 2, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.cyan, margin: 0,
});
s18.addText("8.5억", {
  x: 3.0, y: 1.6, w: 1.6, h: 0.5,
  fontSize: 24, fontFace: FONT_H, color: C.text, align: "right", margin: 0,
});
s18.addText("목표 대비 85% 달성", {
  x: 0.8, y: 2.1, w: 3.8, h: 0.25,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
const salesChannels = [
  { name: "온라인 스토어", pct: "53%" },
  { name: "오프라인 매장", pct: "35%" },
  { name: "글로벌", pct: "12%" },
];
salesChannels.forEach((sc, i) => {
  const sy = 2.55 + i * 0.4;
  s18.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: sy + 0.33, w: 3.8, h: 0.005, fill: { color: "FFFFFF", transparency: 95 } });
  s18.addText(sc.name, { x: 0.8, y: sy, w: 2.5, h: 0.3, fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0 });
  s18.addText(sc.pct, { x: 3.6, y: sy, w: 1.0, h: 0.3, fontSize: 9, fontFace: "Courier New", color: C.cyan, align: "right", margin: 0 });
});

addCard(s18, 5.2, 1.55, 4.2, 2.8, { topBorder: C.orange });
s18.addText("🏆 TOP 상품", {
  x: 5.4, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
const topProducts = [
  { num: "1", name: "키키 그래픽 티", val: "1.5억 (18%)" },
  { num: "2", name: "오버핏 후디", val: "1.2억 (14%)" },
  { num: "3", name: "크로스백", val: "0.8억 (9%)" },
];
topProducts.forEach((tp, i) => {
  const ty = 2.2 + i * 0.5;
  s18.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: ty + 0.38, w: 3.8, h: 0.005, fill: { color: "FFFFFF", transparency: 95 } });
  s18.addText(tp.num, { x: 5.5, y: ty, w: 0.4, h: 0.35, fontSize: 10, fontFace: "Courier New", color: C.cyan, align: "center", valign: "middle", margin: 0 });
  s18.addText(tp.name, { x: 6.0, y: ty, w: 1.8, h: 0.35, fontSize: 10, fontFace: FONT_B, color: C.textMuted, valign: "middle", margin: 0 });
  s18.addText(tp.val, { x: 7.8, y: ty, w: 1.3, h: 0.35, fontSize: 9, fontFace: FONT_B, color: C.textDim, align: "right", valign: "middle", margin: 0 });
});
addSlideNum(s18, 18);

// =========================================
// SLIDE 19: ACT STAGE
// =========================================
let s19 = darkSlide(C.pink);
addTag(s19, "Act", C.pink);
s19.addText("QC 본부 — PDCA 이터레이터", {
  x: 1.2, y: 0.38, w: 5, h: 0.32,
  fontSize: 9, fontFace: FONT_B, color: C.pink, margin: 0,
});
s19.addText("Act 단계: 자동 개선 루프", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s19, 0.6, 1.5, 8.8, 3.2, { leftBorder: C.pink });
s19.addText("Match Rate < 90% → 자동 개선 실행", {
  x: 0.85, y: 1.6, w: 8.3, h: 0.3,
  fontSize: 10, fontFace: FONT_B, color: C.pink, margin: 0,
});

const iterations = [
  { n: 1, label: "1회차 개선", from: "78%", to: "82%", pct: 82, color: C.orange },
  { n: 2, label: "2회차 개선", from: "82%", to: "88%", pct: 88, color: C.purple },
  { n: 3, label: "3회차 개선", from: "88%", to: "91% ✅", pct: 91, color: C.cyan },
];
iterations.forEach((it, i) => {
  const iy = 2.15 + i * 0.85;
  addStepCircle(s19, 1.0, iy + 0.05, it.n, C.pink);
  s19.addText(it.label, {
    x: 1.5, y: iy, w: 2, h: 0.3,
    fontSize: 11, fontFace: FONT_H, color: C.text, margin: 0,
  });
  s19.addText(`${it.from} → ${it.to}`, {
    x: 7.5, y: iy, w: 1.8, h: 0.3,
    fontSize: 11, fontFace: FONT_B, color: it.color, align: "right", margin: 0,
  });
  addProgressBar(s19, 1.5, iy + 0.4, 6, it.pct, it.color);
});
addSlideNum(s19, 19);

// =========================================
// SLIDE 20: SLASH COMMANDS - STATUS
// =========================================
let s20 = darkSlide(C.cyan);
addTag(s20, "4장 — 슬래시 명령어", C.cyan);
s20.addText("상태 관리 명령어", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const statusCmds = [
  { cmd: "/status", title: "현재 상태 확인", desc: "시즌, PDCA 단계, 진행률, 완료/진행중 산출물", color: C.cyan },
  { cmd: "/next", title: "다음 단계 전환", desc: "QG 자동 실행 → PASS 시 다음 단계로 전환", color: C.purple },
  { cmd: "/team", title: "팀 현황 조회", desc: "6개 에이전시, 20명 전문가 현황", color: C.orange },
];
statusCmds.forEach((sc, i) => {
  const cx = 0.6 + i * 3.1;
  addCard(s20, cx, 1.55, 2.85, 2.5, { topBorder: sc.color });
  addCard(s20, cx + 0.3, 1.85, 2.25, 0.5, { color: "000000" });
  s20.addText(sc.cmd, {
    x: cx + 0.3, y: 1.85, w: 2.25, h: 0.5,
    fontSize: 14, fontFace: "Courier New", color: sc.color, align: "center", valign: "middle", margin: 0,
  });
  s20.addText(sc.title, {
    x: cx + 0.2, y: 2.55, w: 2.45, h: 0.3,
    fontSize: 12, fontFace: FONT_H, color: C.text, margin: 0,
  });
  s20.addText(sc.desc, {
    x: cx + 0.2, y: 2.9, w: 2.45, h: 0.7,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s20, 20);

// =========================================
// SLIDE 21: SLASH COMMANDS - OUTPUT
// =========================================
let s21 = darkSlide();
addTag(s21, "4장 — 슬래시 명령어", C.cyan);
s21.addText("산출물 생성 명령어", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const outputCmds = [
  { cmd: "/brief [유형]", desc: "산출물 문서 작성\ntrend-brief, moodboard, techpack", color: C.blue },
  { cmd: "/deck [유형]", desc: "프레젠테이션 PPTX 생성\ntrend, lookbook, buyer", color: C.purple },
  { cmd: "/pdf [유형]", desc: "PDF 보고서 생성\nseason-book, techpack", color: C.orange },
  { cmd: "/sheet [유형]", desc: "엑셀 시트 생성\nline-sheet, otb, kpi", color: C.cyan },
];
outputCmds.forEach((oc, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const cx = 0.6 + col * 4.6;
  const cy = 1.55 + row * 1.5;
  addCard(s21, cx, cy, 4.3, 1.25, { topBorder: oc.color });
  s21.addText(oc.cmd, {
    x: cx + 0.2, y: cy + 0.1, w: 3.9, h: 0.35,
    fontSize: 12, fontFace: "Courier New", color: oc.color, margin: 0,
  });
  s21.addText(oc.desc, {
    x: cx + 0.2, y: cy + 0.5, w: 3.9, h: 0.6,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});

// Extra commands row
addCard(s21, 0.6, 4.65, 8.8, 0.6);
s21.addText([
  { text: '/doc ', options: { color: C.pink, fontFace: "Courier New" } },
  { text: '워드 문서    ', options: { color: C.textMuted } },
  { text: '/review ', options: { color: C.cyan, fontFace: "Courier New" } },
  { text: '품질 검수    ', options: { color: C.textMuted } },
  { text: '/export ', options: { color: C.purple, fontFace: "Courier New" } },
  { text: '산출물 정리', options: { color: C.textMuted } },
], {
  x: 0.8, y: 4.65, w: 8.4, h: 0.6,
  fontSize: 11, fontFace: FONT_B, valign: "middle", margin: 0,
});
addSlideNum(s21, 21);

// =========================================
// SLIDE 22: TEAM OVERVIEW
// =========================================
let s22 = darkSlide(C.purple);
addTag(s22, "팀 현황", C.purple);
s22.addText("6개 에이전시 · 20명의 AI 전문가", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const teams = [
  { icon: "🏢", name: "전략기획실", members: "시장 리서처 · 브랜드 전략가\n수석 MD · 컬렉션 플래너", color: C.blue },
  { icon: "🎨", name: "크리에이티브 스튜디오", members: "크리에이티브 디렉터\n패션 디자이너 · 아트 디렉터", color: C.purple },
  { icon: "🔧", name: "프로덕트 랩", members: "프로덕션 매니저 x3\n(테크팩 · 원가 · QR)", color: C.orange },
  { icon: "📢", name: "마케팅 쇼룸", members: "마케팅 디렉터 · 콘텐츠 디렉터\n패션 에디터 · 소셜 전략가", color: C.pink },
  { icon: "📊", name: "데이터 인텔리전스", members: "트렌드 애널리스트\n인사이트 아키텍트", color: C.cyan },
  { icon: "✅", name: "QC 본부", members: "품질 검증관 · 갭 디텍터\n리포트 제너레이터 · 이터레이터", color: C.textMuted },
];
teams.forEach((t, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const cx = 0.6 + col * 3.1;
  const cy = 1.55 + row * 1.75;
  addCard(s22, cx, cy, 2.85, 1.5, { topBorder: t.color });
  s22.addText(`${t.icon} ${t.name}`, {
    x: cx + 0.15, y: cy + 0.15, w: 2.55, h: 0.3,
    fontSize: 10, fontFace: FONT_H, color: t.color, margin: 0,
  });
  s22.addText(t.members, {
    x: cx + 0.15, y: cy + 0.55, w: 2.55, h: 0.7,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s22, 22);

// =========================================
// SLIDE 23: SCENARIO 1
// =========================================
let s23 = darkSlide(C.orange);
addTag(s23, "5장 — 실전 시나리오", C.pink);
s23.addText("시나리오 1: 26SS 시즌 기획 전체", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 24, fontFace: FONT_H, color: C.text, margin: 0,
});
addGradientBar(s23, 0.6, 1.4, 1.5);

const scenario1Steps = [
  { n: 1, text: '/status 로 현재 상태 확인' },
  { n: 2, text: '"26SS 트렌드 분석해줘" → plan_trend-brief.md' },
  { n: 3, text: '"26SS 시즌 테마 제안해줘" → plan_brand-strategy.md' },
  { n: 4, text: '"카테고리 믹스랑 챔피언 상품 전략 짜줘" → plan_md-plan.md' },
  { n: 5, text: '"라인시트 만들어줘" → plan_line-sheet.xlsx' },
  { n: 6, text: '"Plan 단계 검수해줘" → QG1 PASS → /next' },
];
scenario1Steps.forEach((step, i) => {
  const sy = 1.7 + i * 0.6;
  addStepCircle(s23, 0.7, sy + 0.03, step.n, C.pink);
  s23.addText(step.text, {
    x: 1.15, y: sy, w: 8.3, h: 0.35,
    fontSize: 11, fontFace: FONT_B, color: C.text, valign: "middle", margin: 0,
  });
});
addSlideNum(s23, 23);

// =========================================
// SLIDE 24: SCENARIO 2
// =========================================
let s24 = darkSlide();
addTag(s24, "5장 — 실전 시나리오", C.pink);
s24.addText("시나리오 2: 히트상품 개발 → 런칭", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 24, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s24, 0.6, 1.55, 4.2, 2.2, { topBorder: C.purple });
s24.addText("Design 단계", {
  x: 0.8, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.purple, margin: 0,
});
s24.addText([
  { text: "1. 무드보드 → design_moodboard.md", options: { breakLine: true } },
  { text: "2. 디자인 스펙 → design_spec.md", options: { breakLine: true } },
  { text: "3. 비주얼 생성 → design_visual/", options: { breakLine: true } },
  { text: "4. 원가 검증 → design_costing.md", options: {} },
], {
  x: 0.8, y: 2.1, w: 3.8, h: 1.3,
  fontSize: 10, fontFace: FONT_B, color: C.textMuted, margin: 0,
});

addCard(s24, 5.2, 1.55, 4.2, 2.2, { topBorder: C.orange });
s24.addText("Do 단계", {
  x: 5.4, y: 1.7, w: 3.8, h: 0.3,
  fontSize: 12, fontFace: FONT_H, color: C.orange, margin: 0,
});
s24.addText([
  { text: "5. 테크팩 → do_techpack.md", options: { breakLine: true } },
  { text: "6. IMC 전략 → do_imc-strategy.md", options: { breakLine: true } },
  { text: "7. PDP 카피 → do_pdp-copy.md", options: { breakLine: true } },
  { text: "8. 소셜 전략 → do_social-strategy.md", options: {} },
], {
  x: 5.4, y: 2.1, w: 3.8, h: 1.3,
  fontSize: 10, fontFace: FONT_B, color: C.textMuted, margin: 0,
});

addCard(s24, 2.0, 4.0, 6.0, 0.6);
s24.addText("QG2 PASS → QG3 PASS → 런칭 준비 완료! 🚀", {
  x: 2.0, y: 4.0, w: 6.0, h: 0.6,
  fontSize: 12, fontFace: FONT_B, color: C.cyan, align: "center", valign: "middle", margin: 0,
});
addSlideNum(s24, 24);

// =========================================
// SLIDE 25: SCENARIO 3
// =========================================
let s25 = darkSlide(C.pink);
addTag(s25, "5장 — 실전 시나리오", C.pink);
s25.addText("시나리오 3: 실패 분석 & 개선", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 24, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s25, 0.6, 1.5, 8.8, 1.6, { leftBorder: C.red });
s25.addText("❌ 실패 요인: 오버핏 후디", {
  x: 0.85, y: 1.6, w: 8.3, h: 0.3,
  fontSize: 11, fontFace: FONT_H, color: C.red, margin: 0,
});
const failReasons = [
  { title: "트렌드 부합성", desc: "Oversized→Slim Fit\n\"너무 커서 입기 애매\"", color: C.orange },
  { title: "컬러 비충족", desc: "Pastel 트렌드 vs Black만\n\"색상이 너무 진해\"", color: C.purple },
  { title: "가격 민감도", desc: "경쟁사 49K vs 우리 69K\n\"비싸다\"", color: C.cyan },
];
failReasons.forEach((fr, i) => {
  const fx = 1.0 + i * 2.9;
  s25.addText(fr.title, { x: fx, y: 2.0, w: 2.5, h: 0.25, fontSize: 9, fontFace: FONT_H, color: fr.color, margin: 0 });
  s25.addText(fr.desc, { x: fx, y: 2.3, w: 2.5, h: 0.55, fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0 });
});

addCard(s25, 0.6, 3.35, 8.8, 1.1, { leftBorder: C.cyan });
s25.addText("🔧 개선안", {
  x: 0.85, y: 3.45, w: 8.3, h: 0.3,
  fontSize: 11, fontFace: FONT_H, color: C.cyan, margin: 0,
});
s25.addText("실루엣 조정 (10cm→5cm 오버핏) · Pastel 컬러 추가 (Lilac, Mint) · 가격 조정 (69K→59K)", {
  x: 0.85, y: 3.8, w: 8.3, h: 0.4,
  fontSize: 10, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
addSlideNum(s25, 25);

// =========================================
// SLIDE 26: FAQ
// =========================================
let s26 = darkSlide(C.orange);
addTag(s26, "6장 — FAQ", C.textMuted);
s26.addText("자주 묻는 질문", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const faqs = [
  { q: "브랜드와 안 맞는 결과?", a: "더 구체적인 프롬프트 사용.\n\"와키윌리의 Kitsch Street 감성으로\n무드보드 만들어줘\"", color: C.orange },
  { q: "단계를 건너뛰고 싶어요", a: "\"강제 통과해줘\"로 가능하지만\n권장하지 않음. 빠진 부분 보완 필요", color: C.blue },
  { q: "산출물이 마음에 안 들어요", a: "바로 수정 요청.\n\"여기 수정해줘: 컬러를 Blue로 바꿔\"", color: C.purple },
  { q: "QG에서 계속 FAIL", a: "누락된 항목 확인 →\n해당 항목 생성 요청 → 재검수", color: C.cyan },
];
faqs.forEach((f, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const cx = 0.6 + col * 4.6;
  const cy = 1.55 + row * 1.6;
  addCard(s26, cx, cy, 4.3, 1.35, { topBorder: f.color });
  s26.addText(f.q, {
    x: cx + 0.2, y: cy + 0.1, w: 3.9, h: 0.3,
    fontSize: 11, fontFace: FONT_H, color: f.color, margin: 0,
  });
  s26.addText(f.a, {
    x: cx + 0.2, y: cy + 0.45, w: 3.9, h: 0.7,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s26, 26);

// =========================================
// SLIDE 27: QUICK REF - TOP REQUESTS
// =========================================
let s27 = darkSlide();
addTag(s27, "퀵 레퍼런스", C.purple);
s27.addText("자주 쓰는 요청 TOP 20", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

addCard(s27, 0.6, 1.55, 4.2, 3.2, { topBorder: C.blue });
s27.addText("기획 & 디자인", {
  x: 0.8, y: 1.65, w: 3.8, h: 0.3,
  fontSize: 10, fontFace: FONT_H, color: C.blue, margin: 0,
});
const leftReqs = [
  '"26SS 트렌드 분석해줘"',
  '"이번 시즌 테마 제안해줘"',
  '"카테고리 믹스 짜줘"',
  '"라인시트 만들어줘"',
  '"그래픽 티 무드보드 만들어줘"',
  '"디자인 스펙 작성해줘"',
  '"룩북 이미지 생성해줘"',
];
s27.addText(leftReqs.map((r, i) => ({ text: r, options: { breakLine: i < leftReqs.length - 1 } })), {
  x: 0.8, y: 2.05, w: 3.8, h: 2.5,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});

addCard(s27, 5.2, 1.55, 4.2, 3.2, { topBorder: C.orange });
s27.addText("생산 & 마케팅 & 분석", {
  x: 5.4, y: 1.65, w: 3.8, h: 0.3,
  fontSize: 10, fontFace: FONT_H, color: C.orange, margin: 0,
});
const rightReqs = [
  '"원가 계산해줘"',
  '"테크팩 만들어줘"',
  '"IMC 전략 짜줘"',
  '"인스타용 카피 써줘"',
  '"인플루언서 매핑해줘"',
  '"매출 분석해줘"',
  '"왜 이 상품이 잘 팔렸어?"',
];
s27.addText(rightReqs.map((r, i) => ({ text: r, options: { breakLine: i < rightReqs.length - 1 } })), {
  x: 5.4, y: 2.05, w: 3.8, h: 2.5,
  fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
});
addSlideNum(s27, 27);

// =========================================
// SLIDE 28: QUICK REF - COMMANDS
// =========================================
let s28 = darkSlide(C.blue);
addTag(s28, "퀵 레퍼런스", C.purple);
s28.addText("슬래시 명령어 총정리", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const allCmds = [
  { cmd: "/status", desc: "상태 확인" },
  { cmd: "/brief [유형]", desc: "산출물 문서 작성" },
  { cmd: "/review", desc: "품질 검수" },
  { cmd: "/next", desc: "다음 단계 전환" },
  { cmd: "/team", desc: "팀 현황 조회" },
  { cmd: "/export", desc: "산출물 정리" },
  { cmd: "/deck [유형]", desc: "프레젠테이션 생성" },
  { cmd: "/pdf [유형]", desc: "PDF 보고서 생성" },
  { cmd: "/sheet [유형]", desc: "엑셀 시트 생성" },
  { cmd: "/doc [유형]", desc: "워드 문서 생성" },
];
allCmds.forEach((ac, i) => {
  const col = i < 5 ? 0 : 1;
  const row = i < 5 ? i : i - 5;
  const cx = 0.6 + col * 4.6;
  const cy = 1.55 + row * 0.65;
  s28.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy + 0.5, w: 4.3, h: 0.005, fill: { color: "FFFFFF", transparency: 95 } });
  s28.addText(ac.cmd, {
    x: cx, y: cy, w: 2.0, h: 0.5,
    fontSize: 11, fontFace: "Courier New", color: C.cyan, valign: "middle", margin: 0,
  });
  s28.addText(ac.desc, {
    x: cx + 2.0, y: cy, w: 2.3, h: 0.5,
    fontSize: 10, fontFace: FONT_B, color: C.textMuted, valign: "middle", margin: 0,
  });
});
addSlideNum(s28, 28);

// =========================================
// SLIDE 29: GLOSSARY
// =========================================
let s29 = darkSlide();
addTag(s29, "부록", C.textMuted);
s29.addText("용어 사전", {
  x: 0.6, y: 0.85, w: 8.8, h: 0.5,
  fontSize: 28, fontFace: FONT_H, color: C.text, margin: 0,
});

const glossary = [
  { term: "FPOF", def: "Fashion PDCA Orchestration Framework", color: C.purple },
  { term: "PDCA", def: "Plan → Design → Do → Check → Act", color: C.blue },
  { term: "Quality Gate", def: "단계 전환 시 자동 품질 검증", color: C.cyan },
  { term: "Match Rate", def: "기획 vs 실행 정합도 (목표 90%+)", color: C.orange },
  { term: "OTB", def: "Open-to-Buy: 총 구매 가능 예산", color: C.pink },
  { term: "VE", def: "Value Engineering: 품질 유지 비용 절감", color: C.textMuted },
];
glossary.forEach((g, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const cx = 0.6 + col * 3.1;
  const cy = 1.55 + row * 1.5;
  addCard(s29, cx, cy, 2.85, 1.2, { topBorder: g.color });
  s29.addText(g.term, {
    x: cx + 0.15, y: cy + 0.15, w: 2.55, h: 0.35,
    fontSize: 12, fontFace: FONT_H, color: g.color, margin: 0,
  });
  s29.addText(g.def, {
    x: cx + 0.15, y: cy + 0.55, w: 2.55, h: 0.5,
    fontSize: 9, fontFace: FONT_B, color: C.textMuted, margin: 0,
  });
});
addSlideNum(s29, 29);

// =========================================
// SLIDE 30: CLOSING
// =========================================
let s30 = darkSlide(C.purple);
s30.addText("와키윌리 FPOF", {
  x: 0.5, y: 1.3, w: 9, h: 0.7,
  fontSize: 32, fontFace: FONT_H, color: C.orange, align: "center", valign: "middle", margin: 0,
});
s30.addText("와 함께 성공적인 시즌을 보내세요!", {
  x: 0.5, y: 1.95, w: 9, h: 0.5,
  fontSize: 22, fontFace: FONT_H, color: C.text, align: "center", valign: "middle", margin: 0,
});
addGradientBar(s30, 4, 2.6, 2);

const closingCards = [
  { icon: "💬", title: "자연어로 말하기", desc: "평소 말하듯 AI에게 요청" },
  { icon: "📊", title: "체계적 진행", desc: "PDCA 사이클로 관리" },
  { icon: "✅", title: "품질 보장", desc: "검수와 갭 분석으로 완성도 확보" },
];
closingCards.forEach((cc, i) => {
  const cx = 1.2 + i * 2.8;
  addCard(s30, cx, 3.0, 2.5, 1.5);
  s30.addText(cc.icon, { x: cx, y: 3.1, w: 2.5, h: 0.45, fontSize: 24, align: "center", margin: 0 });
  s30.addText(cc.title, { x: cx + 0.15, y: 3.55, w: 2.2, h: 0.3, fontSize: 11, fontFace: FONT_H, color: C.text, align: "center", margin: 0 });
  s30.addText(cc.desc, { x: cx + 0.15, y: 3.9, w: 2.2, h: 0.4, fontSize: 9, fontFace: FONT_B, color: C.textMuted, align: "center", margin: 0 });
});

s30.addText("Wacky Willy Fashion House — Kitsch Street & IP Universe", {
  x: 0.5, y: 4.8, w: 9, h: 0.35,
  fontSize: 8, fontFace: FONT_B, color: C.textDim, align: "center", margin: 0,
});
addSlideNum(s30, 30);

// =========================================
// WRITE FILE
// =========================================
pres.writeFile({ fileName: "/Users/sherman/07. FPOF V2.2 Claude/docs/wacky-willy-user-manual.pptx" })
  .then(() => console.log("PPTX created successfully!"))
  .catch(err => console.error("Error:", err));
