const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaStore, FaUsers, FaGlobeAsia, FaCameraRetro, FaPrint, FaCalendarAlt,
  FaChartLine, FaBullseye, FaShieldAlt, FaRocket, FaMapMarkerAlt,
  FaPalette, FaGift, FaTshirt, FaMoneyBillWave, FaCheck, FaStar,
  FaHandshake, FaInstagram, FaClock, FaArrowRight, FaLayerGroup,
  FaCompass, FaTag, FaHeart
} = require("react-icons/fa");

// ─── TEAL TRUST PALETTE ───
const C = {
  BLACK:    "1A202C",
  TEAL:     "028090",
  SEAFOAM:  "00A896",
  MINT:     "02C39A",
  WHITE:    "FFFFFF",
  OFF_WHITE:"F8FAFB",
  GRAY_100: "F1F5F9",
  GRAY_200: "E2E8F0",
  GRAY_400: "94A3B8",
  GRAY_600: "64748B",
  GRAY_800: "334155",
  DARK_BG:  "0D1B2A",
  CARD_BG:  "1B2838",
  RED:      "EF4444",
  ORANGE:   "F59E0B",
  GREEN:    "02C39A",
  ACCENT_BLUE: "028090",
};

// ─── ICON HELPER ───
function renderIconSvg(Icon, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(Icon, { color, size: String(size) })
  );
}
async function iconPng(Icon, color, size = 256) {
  const svg = renderIconSvg(Icon, `#${color}`, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ─── REUSABLE HELPERS ───
const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12 });
const makeShadowLight = () => ({ type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.08 });

function addFooter(slide, pageNum, totalPages) {
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: 8.8, y: 5.2, w: 1, h: 0.3, fontSize: 9, color: C.GRAY_400, align: "right", fontFace: "Arial"
  });
  slide.addText("Wacky Willy | Confidential", {
    x: 0.5, y: 5.2, w: 3, h: 0.3, fontSize: 9, color: C.GRAY_400, fontFace: "Arial"
  });
}

function addSectionHeader(slide, number, title) {
  slide.background = { color: C.DARK_BG };
  // Accent bar
  slide.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  // Section number
  slide.addText(number, {
    x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0
  });
  // Title
  slide.addText(title, {
    x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0
  });
}

function addDarkCard(slide, x, y, w, h, opts = {}) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: opts.fill || C.CARD_BG },
    shadow: makeShadowLight(),
    line: opts.border ? { color: opts.border, width: 1 } : undefined
  });
}

function addStatBox(slide, x, y, w, number, label, numColor = C.TEAL) {
  slide.addShape("rect", { x, y, w, h: 1.1, fill: { color: C.GRAY_100 }, shadow: makeShadowLight() });
  slide.addText(number, { x, y: y + 0.08, w, h: 0.6, fontSize: 32, fontFace: "Georgia", color: numColor, align: "center", bold: true, margin: 0 });
  slide.addText(label, { x, y: y + 0.65, w, h: 0.35, fontSize: 11, fontFace: "Arial", color: C.GRAY_600, align: "center", margin: 0 });
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Wacky Willy Marketing";
  pres.title = "성수 플래그십 수버니어 존 — 연간 운영 기획서";
  const TOTAL = 24;

  // Pre-render icons
  const icons = {};
  const iconList = [
    ["store", FaStore, C.TEAL], ["users", FaUsers, C.SEAFOAM], ["globe", FaGlobeAsia, C.TEAL],
    ["camera", FaCameraRetro, C.TEAL], ["print", FaPrint, C.SEAFOAM], ["calendar", FaCalendarAlt, C.TEAL],
    ["chart", FaChartLine, C.SEAFOAM], ["target", FaBullseye, C.TEAL], ["shield", FaShieldAlt, C.SEAFOAM],
    ["rocket", FaRocket, C.TEAL], ["map", FaMapMarkerAlt, C.TEAL], ["palette", FaPalette, C.TEAL],
    ["gift", FaGift, C.TEAL], ["tshirt", FaTshirt, C.SEAFOAM], ["money", FaMoneyBillWave, C.GREEN],
    ["check", FaCheck, C.GREEN], ["star", FaStar, C.TEAL], ["handshake", FaHandshake, C.TEAL],
    ["instagram", FaInstagram, C.SEAFOAM], ["clock", FaClock, C.GRAY_400], ["arrow", FaArrowRight, C.TEAL],
    ["layer", FaLayerGroup, C.SEAFOAM], ["compass", FaCompass, C.TEAL], ["tag", FaTag, C.TEAL],
    ["heart", FaHeart, C.RED],
    // Dark versions for light backgrounds
    ["store_d", FaStore, C.BLACK], ["users_d", FaUsers, C.GRAY_800], ["globe_d", FaGlobeAsia, C.GRAY_800],
    ["camera_d", FaCameraRetro, C.GRAY_800], ["print_d", FaPrint, C.GRAY_800], ["calendar_d", FaCalendarAlt, C.GRAY_800],
    ["chart_d", FaChartLine, C.GRAY_800], ["target_d", FaBullseye, C.GRAY_800], ["shield_d", FaShieldAlt, C.GRAY_800],
    ["rocket_d", FaRocket, C.GRAY_800], ["map_d", FaMapMarkerAlt, C.GRAY_800], ["palette_d", FaPalette, C.GRAY_800],
    ["gift_d", FaGift, C.GRAY_800], ["tshirt_d", FaTshirt, C.GRAY_800], ["money_d", FaMoneyBillWave, C.GRAY_800],
    ["check_d", FaCheck, "22C55E"], ["star_d", FaStar, "F59E0B"], ["handshake_d", FaHandshake, C.GRAY_800],
    ["compass_d", FaCompass, C.GRAY_800], ["tag_d", FaTag, C.GRAY_800], ["heart_d", FaHeart, C.RED],
    ["layer_d", FaLayerGroup, C.GRAY_800], ["arrow_d", FaArrowRight, C.GRAY_800],
  ];
  for (const [name, icon, color] of iconList) {
    icons[name] = await iconPng(icon, color);
  }

  // ═══════════════════════════════════════
  // SLIDE 1: TITLE
  // ═══════════════════════════════════════
  let s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  // Accent line
  s.addShape("rect", { x: 0.5, y: 1.5, w: 1.2, h: 0.06, fill: { color: C.MINT } });
  // Main title
  s.addText("성수 플래그십\n수버니어 존", {
    x: 0.5, y: 1.7, w: 7, h: 2.0, fontSize: 44, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0
  });
  // Subtitle
  s.addText("연간 운영 기획서 2026-2027", {
    x: 0.5, y: 3.6, w: 6, h: 0.5, fontSize: 20, fontFace: "Arial", color: C.MINT, margin: 0
  });
  // Meta info
  s.addText([
    { text: "보고 대상: 경영진", options: { breakLine: true, fontSize: 12, color: C.GRAY_400 } },
    { text: "작성: 마케팅 쇼룸 | 2026.03.10", options: { breakLine: true, fontSize: 12, color: C.GRAY_400 } },
    { text: "마감: 2026.03.14", options: { fontSize: 12, color: C.GRAY_400 } },
  ], { x: 0.5, y: 4.3, w: 5, h: 1.0, fontFace: "Arial", margin: 0 });
  // Brand mark
  s.addText("WACKY WILLY", {
    x: 7.0, y: 4.8, w: 2.8, h: 0.5, fontSize: 14, fontFace: "Georgia", color: C.MINT, align: "right", charSpacing: 4, margin: 0
  });
  addFooter(s, 1, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 2: EXECUTIVE SUMMARY
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("Executive Summary", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.9, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Concept quote
  s.addShape("rect", { x: 0.5, y: 1.15, w: 9, h: 0.75, fill: { color: C.BLACK } });
  s.addText('"와키 유니버스의 12캐릭터가 격월로 펼치는 거리 놀이터 — 구경하고, 만들고, 가져가는 성수 유일 커스텀 수버니어 존"', {
    x: 0.7, y: 1.2, w: 8.6, h: 0.65, fontSize: 13, fontFace: "Arial", color: C.MINT, italic: true, margin: 0
  });

  // 4 key stats
  addStatBox(s, 0.5, 2.15, 2.05, "3,400명", "오픈 5일 방문객");
  addStatBox(s, 2.75, 2.15, 2.05, "6테마/년", "격월 교체 운영");
  addStatBox(s, 5.0, 2.15, 2.05, "1.23억~", "연간 예산 (보수적)");
  addStatBox(s, 7.25, 2.15, 2.05, "1.3억+", "연 매출 기대 (기본)");

  // Key points
  const summaryPoints = [
    ["경영진 지시", "3/9 통합회의 결정 — 매장 앞 빈 공간 활용, 수버니어 존 제안, 3/14 보고"],
    ["핵심 콘셉트", "상설 키키 구조물 랜드마크 + 격월 테마 교체 + 커스텀 프린트 + 한정 굿즈"],
    ["차별화", "주문형 프린팅(재고 0) + IP 캐릭터 세계관 체험 + K콜라보/인플루언서 협업"],
    ["ROI", "보수적 비용 기준 약 11개월 손익분기 + 본매장 유입 효과 별도"],
  ];
  summaryPoints.forEach((p, i) => {
    const yy = 3.40 + i * 0.38;
    s.addShape("rect", { x: 0.5, y: yy, w: 0.06, h: 0.30, fill: { color: C.TEAL } });
    s.addText(p[0], { x: 0.7, y: yy, w: 1.5, h: 0.30, fontSize: 11, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
    s.addText(p[1], { x: 2.2, y: yy, w: 7.3, h: 0.30, fontSize: 11, fontFace: "Arial", color: C.GRAY_800, margin: 0 });
  });
  addFooter(s, 2, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 3: SECTION DIVIDER — 기획 배경
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  s.addText("01", { x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("기획 배경 &\n전략적 맥락", { x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  s.addText("경영진 지시 · 성수 상권 데이터 · 벤치마크", { x: 0.5, y: 3.4, w: 7, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 3, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 4: 경영진 5대 메시지 연결
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("경영진 5대 메시지 × 수버니어 존", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });
  s.addText("3/9 경영진 통합회의 결정: \"성수 매장 앞 빈 공간 활용 → 수버니어 존 제안, 3/14 보고\"", {
    x: 0.5, y: 1.05, w: 9, h: 0.35, fontSize: 11, fontFace: "Arial", color: C.GRAY_600, italic: true, margin: 0
  });

  const msgs = [
    ["① SKU 과감히 축소", "소량 한정 굿즈(300~500개) → 최소 SKU로 최대 임팩트"],
    ["② 히어로 상품 육성", "커스텀 프린트 = \"씨앗 아이템\" → 인기 디자인 본생산 확장"],
    ["③ 뉴베이직 경쟁력 강화", "무지 티셔츠 + 커스텀 = 베이직의 재발명"],
    ["④ 브랜드 정체성 선명화", "IP 유니버스를 가장 직접적으로 체험하는 공간"],
    ["⑤ 재고 축소", "주문형 프린팅 = 재고 리스크 제로"],
  ];
  msgs.forEach((m, i) => {
    const yy = 1.55 + i * 0.66;
    s.addShape("rect", { x: 0.5, y: yy, w: 9, h: 0.56, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addShape("rect", { x: 0.5, y: yy, w: 0.07, h: 0.56, fill: { color: C.TEAL } });
    s.addImage({ data: icons.check_d, x: 9.05, y: yy + 0.13, w: 0.3, h: 0.3 });
    s.addText(m[0], { x: 0.75, y: yy + 0.04, w: 3.0, h: 0.26, fontSize: 12, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
    s.addText(m[1], { x: 0.75, y: yy + 0.29, w: 8.0, h: 0.24, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
  });
  addFooter(s, 4, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 5: 성수 상권 데이터 + 오픈 실적
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("성수 상권 데이터 & 오픈 실적", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Big stats row
  addStatBox(s, 0.5, 1.15, 2.05, "13.5배", "외국인 방문객 증가", C.BLACK);
  addStatBox(s, 2.75, 1.15, 2.05, "+2,000만", "연간 유동인구 증가", C.BLACK);
  addStatBox(s, 5.0, 1.15, 2.05, "+4,900억", "카드 결제액 증가", C.BLACK);
  addStatBox(s, 7.25, 1.15, 2.05, "80+개", "패션 플래그십 경쟁", C.RED);

  // Opening performance
  s.addShape("rect", { x: 0.5, y: 2.55, w: 9, h: 1.3, fill: { color: C.BLACK } });
  s.addText("오픈 실적", { x: 0.7, y: 2.6, w: 2, h: 0.4, fontSize: 14, fontFace: "Arial", color: C.MINT, bold: true, margin: 0 });
  s.addText("3,400명", { x: 0.7, y: 2.95, w: 3, h: 0.7, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("5일간 커버나시 (일평균 680명)", { x: 3.5, y: 3.15, w: 4, h: 0.4, fontSize: 14, fontFace: "Arial", color: C.WHITE, margin: 0 });
  s.addImage({ data: icons.arrow, x: 7.6, y: 3.0, w: 0.35, h: 0.35 });
  s.addText("이 유동인구를\n매장 밖에서 먼저 잡는다", { x: 8.0, y: 2.85, w: 1.4, h: 0.7, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0 });

  // Benchmark
  s.addText("벤치마크", { x: 0.5, y: 4.0, w: 2, h: 0.3, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });

  const benchmarks = [
    ["TETO 성수", "대형 구조물 = 랜드마크 → 시선 포착", "★★★"],
    ["뉴발란스 명동", "서울기념 티셔츠 1만원 + 한복포장 → 관광객 구매 트리거", "★★★"],
    ["마뗑킴 성수", "닝닝 홀로그램 + K-패션 체험 → 포토존 바이럴", "★★☆"],
  ];
  benchmarks.forEach((b, i) => {
    const xx = 0.5 + i * 3.0;
    s.addShape("rect", { x: xx, y: 4.3, w: 2.8, h: 0.55, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addText(b[0], { x: xx + 0.1, y: 4.32, w: 2.1, h: 0.25, fontSize: 11, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
    s.addText(b[1], { x: xx + 0.1, y: 4.55, w: 2.6, h: 0.25, fontSize: 9, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
    s.addText(b[2], { x: xx + 2.2, y: 4.32, w: 0.5, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.ORANGE, align: "right", margin: 0 });
  });
  addFooter(s, 5, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 6: SECTION DIVIDER — 콘셉트
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  s.addText("02", { x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("Wacky Playground\n콘셉트 & 타겟", { x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  s.addText("세계관 체험 · 커스텀 기념품 · IP 포토존", { x: 0.5, y: 3.4, w: 7, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 6, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 7: 콘셉트 + 타겟
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("콘셉트 & 타겟 세그먼트", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Target segments - 3 columns
  const targets = [
    [icons.globe_d, "외국인 관광객", "20~30%", "K-패션 기념품\nInstagrammable 경험\n커스텀 프린트 + 선물 포장"],
    [icons.heart_d, "코어 타겟 18~25세", "40~50%", "한정판 굿즈 수집\n캐릭터 팬덤\n나노 커뮤니티 이벤트"],
    [icons.users_d, "성수 유동인구", "20~30%", "호기심, 포토존\n충동구매\n저단가 굿즈 5천~1만원"],
  ];
  targets.forEach((t, i) => {
    const xx = 0.5 + i * 3.1;
    s.addShape("rect", { x: xx, y: 1.15, w: 2.9, h: 2.35, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addImage({ data: t[0], x: xx + 0.15, y: 1.3, w: 0.35, h: 0.35 });
    s.addText(t[1], { x: xx + 0.55, y: 1.3, w: 2.2, h: 0.35, fontSize: 13, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0, valign: "middle" });
    s.addText(t[2], { x: xx + 0.15, y: 1.75, w: 1.2, h: 0.35, fontSize: 20, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0 });
    s.addShape("rect", { x: xx + 0.15, y: 2.15, w: 2.6, h: 0.03, fill: { color: C.GRAY_200 } });
    s.addText(t[3], { x: xx + 0.15, y: 2.25, w: 2.6, h: 1.1, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
  });

  // Consumer keywords
  s.addText("소비 키워드 5축 매핑", { x: 0.5, y: 3.7, w: 4, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const keywords = [
    ["추구미", "포토존 + SNS 공유"],
    ["필코노미", "도파민 컬러 굿즈"],
    ["나노커뮤니티", "캐릭터 편애 + 수집"],
    ["미코노미", "커스텀 프린트"],
    ["그래픽르네상스", "IP 그래픽 체험"],
  ];
  keywords.forEach((k, i) => {
    const xx = 0.5 + i * 1.85;
    s.addShape("rect", { x: xx, y: 4.15, w: 1.7, h: 0.9, fill: { color: i === 3 ? C.BLACK : C.WHITE }, shadow: makeShadowLight() });
    s.addText(k[0], { x: xx, y: 4.2, w: 1.7, h: 0.35, fontSize: 12, fontFace: "Arial", color: i === 3 ? C.TEAL : C.BLACK, bold: true, align: "center", margin: 0 });
    s.addText(k[1], { x: xx, y: 4.55, w: 1.7, h: 0.4, fontSize: 9, fontFace: "Arial", color: i === 3 ? C.GRAY_400 : C.GRAY_600, align: "center", margin: 0 });
  });
  addFooter(s, 7, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 8: 공간 레이아웃 + 상설 구조물
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("공간 레이아웃 5~10평", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Principle
  s.addShape("rect", { x: 0.5, y: 1.1, w: 9, h: 0.55, fill: { color: C.BLACK } });
  s.addText("\"하나의 랜드마크, 변하는 무대\" — 키키 상설 구조물 1기 + 주변 소품/배경 격월 교체", {
    x: 0.7, y: 1.15, w: 8.6, h: 0.45, fontSize: 12, fontFace: "Arial", color: C.MINT, margin: 0, valign: "middle"
  });

  // 3 zones
  const zones = [
    [icons.camera_d, "Zone A", "키키 구조물 + 포토존", "~3평", "상설 키키 FRP 2.5m\n테마별 소품/배경 교체\n시선 스토퍼 + 랜드마크", C.TEAL],
    [icons.print_d, "Zone B", "커스텀 체험대", "~3평", "DTF 프린터 1대\n열프레스 1~2대\n태블릿 2대 (다국어)", C.SEAFOAM],
    [icons.tag_d, "Zone C", "한정 굿즈 판매", "~3평", "테마별 진열대\nPOS + 브랜딩 포장\n5천~3만원 라인업", C.GREEN],
  ];
  zones.forEach((z, i) => {
    const xx = 0.5 + i * 3.1;
    s.addShape("rect", { x: xx, y: 1.85, w: 2.9, h: 2.4, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addShape("rect", { x: xx, y: 1.85, w: 2.9, h: 0.06, fill: { color: z[5] } });
    s.addImage({ data: z[0], x: xx + 0.15, y: 2.05, w: 0.3, h: 0.3 });
    s.addText(z[1], { x: xx + 0.5, y: 2.05, w: 1.5, h: 0.3, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0, valign: "middle" });
    s.addText(z[3], { x: xx + 2.1, y: 2.05, w: 0.7, h: 0.3, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, align: "right", margin: 0, valign: "middle" });
    s.addText(z[2], { x: xx + 0.15, y: 2.4, w: 2.6, h: 0.3, fontSize: 11, fontFace: "Arial", color: C.GRAY_800, margin: 0 });
    s.addShape("rect", { x: xx + 0.15, y: 2.75, w: 2.6, h: 0.02, fill: { color: C.GRAY_200 } });
    s.addText(z[4], { x: xx + 0.15, y: 2.85, w: 2.6, h: 1.2, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
  });

  // Customer flow
  s.addText("고객 동선", { x: 0.5, y: 4.45, w: 2, h: 0.3, fontSize: 13, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const flow = ["시선 멈춤", "사진 촬영", "커스텀 체험", "굿즈 구매", "SNS 공유", "본매장 유입"];
  flow.forEach((f, i) => {
    const xx = 0.5 + i * 1.55;
    s.addShape("rect", { x: xx, y: 4.75, w: 1.3, h: 0.35, fill: { color: i === 5 ? C.BLACK : C.WHITE }, shadow: makeShadowLight() });
    s.addText(f, { x: xx, y: 4.75, w: 1.3, h: 0.35, fontSize: 10, fontFace: "Arial", color: i === 5 ? C.TEAL : C.BLACK, align: "center", margin: 0, valign: "middle" });
    if (i < 5) s.addText("→", { x: xx + 1.3, y: 4.75, w: 0.25, h: 0.35, fontSize: 12, color: C.GRAY_400, align: "center", margin: 0, valign: "middle" });
  });
  addFooter(s, 8, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 9: SECTION DIVIDER — 6테마
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  s.addText("03", { x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("연간 6테마\n캘린더", { x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  s.addText("IP 캐릭터 로테이션 · 시즌 연동 · K컬처 콜라보", { x: 0.5, y: 3.4, w: 7, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 9, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 10: 6테마 캘린더 Overview
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("연간 6테마 캘린더", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  const themes = [
    ["T1", "3~4월", "Grand Opening\nWacky Universe", "키키 + 전체", "자체 브랜딩", C.TEAL],
    ["T2", "5~6월", "Summer\nPlayground", "쿼바오 + 키키", "테라 맥주", "68A8DB"],
    ["T3", "7~8월", "Lilly's\nGarden Party", "릴리 + 망고", "서울 해치", "F472B6"],
    ["T4", "9~10월", "Street Art\nFestival", "위자드 + 피시식", "진로 두꺼비", "8B5CF6"],
    ["T5", "11~12월", "Holiday\nUniverse", "하운드 + 해삐", "빼빼로/초코파이", "EF4444"],
    ["T6", "1~2월", "New Year\nWacky Run", "로또 + 레이너", "삼양 불닭", "22C55E"],
  ];
  themes.forEach((t, i) => {
    const xx = 0.5 + (i % 3) * 3.1;
    const yy = 1.15 + Math.floor(i / 3) * 2.15;
    s.addShape("rect", { x: xx, y: yy, w: 2.9, h: 1.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addShape("rect", { x: xx, y: yy, w: 2.9, h: 0.06, fill: { color: t[5] } });
    // T number + period
    s.addText(t[0], { x: xx + 0.15, y: yy + 0.15, w: 0.5, h: 0.3, fontSize: 14, fontFace: "Georgia", color: t[5], bold: true, margin: 0 });
    s.addText(t[1], { x: xx + 0.6, y: yy + 0.15, w: 1.5, h: 0.3, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0, valign: "middle" });
    // Theme name
    s.addText(t[2], { x: xx + 0.15, y: yy + 0.5, w: 2.6, h: 0.55, fontSize: 13, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
    // Character + collab
    s.addShape("rect", { x: xx + 0.15, y: yy + 1.1, w: 2.6, h: 0.02, fill: { color: C.GRAY_200 } });
    s.addText("캐릭터: " + t[3], { x: xx + 0.15, y: yy + 1.2, w: 2.6, h: 0.28, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
    s.addText("K콜라보: " + t[4], { x: xx + 0.15, y: yy + 1.5, w: 2.6, h: 0.28, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
  });
  addFooter(s, 10, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 11: T1 + T2 상세
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("T1 Grand Opening + T2 Summer Playground", {
    x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 20, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.78, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // T1
  s.addShape("rect", { x: 0.5, y: 1.0, w: 4.3, h: 3.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addShape("rect", { x: 0.5, y: 1.0, w: 4.3, h: 0.55, fill: { color: C.TEAL } });
  s.addText("T1  Grand Opening: Wacky Universe  (3~4월)", { x: 0.65, y: 1.05, w: 4.0, h: 0.45, fontSize: 13, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0, valign: "middle" });
  const t1Items = [
    "주인공: 키키 + 전체 12캐릭터 총출동",
    "구조물: 키키 조형물 + 12캐릭터 소개 배너 + 옐로 풍선 아치",
    "포토존: \"키키와 같은 포즈\" 바닥 가이드 스티커",
    "커스텀: 12캐릭터 전체 셀렉 + SEONGSU 2026 배경",
    "한정 굿즈: 오프닝 키링 세트(3종), 성수 한정 그래픽티",
    "이벤트: 오프닝 1주차 커스텀 프린트 50% 할인",
    "인플루언서: 이사배 × 키키 \"변신 메이크업\" 콜라보",
    "KPI: SNS 멘션 수, 포토 촬영 수 (인지도 확산)",
  ];
  t1Items.forEach((item, i) => {
    s.addText(item, { x: 0.7, y: 1.65 + i * 0.38, w: 3.9, h: 0.34, fontSize: 10, fontFace: "Arial", color: i === 6 ? C.ACCENT_BLUE : C.GRAY_800, margin: 0, bullet: true });
  });

  // T2
  s.addShape("rect", { x: 5.2, y: 1.0, w: 4.3, h: 3.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addShape("rect", { x: 5.2, y: 1.0, w: 4.3, h: 0.55, fill: { color: "68A8DB" } });
  s.addText("T2  Summer Playground  (5~6월)", { x: 5.35, y: 1.05, w: 4.0, h: 0.45, fontSize: 13, fontFace: "Arial", color: C.WHITE, bold: true, margin: 0, valign: "middle" });
  const t2Items = [
    "주인공: 쿼바오(여행 메이트) + 키키",
    "구조물: 서핑보드·야자수·여행 트렁크 소품 + 블루톤 조명",
    "포토존: \"나도 여행 중\" 콘셉트, 선글라스/모자 소품 대여",
    "커스텀: 서머 한정 배경(야자수/파도), 쿼바오 포즈 5종",
    "한정 굿즈: 쿼바오 비치 키링, 미니 부채, 여름 에코백",
    "K콜라보: 테라 맥주 or 참이슬 콜라보 프린트",
    "인플루언서: 빠니보틀 × 쿼바오 \"여행 키트\" 콜라보",
    "KPI: 매출 전환율, K콜라보 반응도, 외국인 비중",
  ];
  t2Items.forEach((item, i) => {
    s.addText(item, { x: 5.4, y: 1.65 + i * 0.38, w: 3.9, h: 0.34, fontSize: 10, fontFace: "Arial", color: i === 6 ? C.ACCENT_BLUE : C.GRAY_800, margin: 0, bullet: true });
  });
  addFooter(s, 11, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 12: T3 + T4 상세
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("T3 Lilly's Garden + T4 Street Art Festival", {
    x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 20, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.78, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // T3
  s.addShape("rect", { x: 0.5, y: 1.0, w: 4.3, h: 3.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addShape("rect", { x: 0.5, y: 1.0, w: 4.3, h: 0.55, fill: { color: "F472B6" } });
  s.addText("T3  Lilly's Garden Party  (7~8월)", { x: 0.65, y: 1.05, w: 4.0, h: 0.45, fontSize: 13, fontFace: "Arial", color: C.WHITE, bold: true, margin: 0, valign: "middle" });
  const t3Items = [
    "주인공: 릴리(순수 4차원) + 망고(취미 친구)",
    "구조물: 조화 플라워 아치 + 핑크톤 조명 + 홀로그램 리본",
    "포토존: 플라워로 둘러싸인 키키와 함께 \"정원 파티\" 촬영",
    "커스텀: 릴리 플라워 시리즈 6종, 핑크 무지 티셔츠 추가",
    "한정 굿즈: 릴리 미러 키링, 플라워 헤어핀, 우정 스티커팩",
    "K콜라보: 서울 해치 \"해치와 릴리의 서울 산책\" 한정 프린트",
    "인플루언서: 에스더버니 × 릴리 콜라보 파우치/키링 세트",
    "KPI: 여성 구매 비중, 우먼스 매장 연계 매출",
  ];
  t3Items.forEach((item, i) => {
    s.addText(item, { x: 0.7, y: 1.65 + i * 0.38, w: 3.9, h: 0.34, fontSize: 10, fontFace: "Arial", color: i === 6 ? C.ACCENT_BLUE : C.GRAY_800, margin: 0, bullet: true });
  });

  // T4
  s.addShape("rect", { x: 5.2, y: 1.0, w: 4.3, h: 3.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addShape("rect", { x: 5.2, y: 1.0, w: 4.3, h: 0.55, fill: { color: "8B5CF6" } });
  s.addText("T4  Street Art Festival  (9~10월)", { x: 5.35, y: 1.05, w: 4.0, h: 0.45, fontSize: 13, fontFace: "Arial", color: C.WHITE, bold: true, margin: 0, valign: "middle" });
  const t4Items = [
    "주인공: 위자드(그래피티 빌런) + 피시식(소환수)",
    "구조물: 그래피티 배경 패널 + 위자드 네온사인 + UV 조명",
    "포토존: 그래피티 배경 + \"스트릿 아티스트\" 콘셉트",
    "커스텀: 그래피티 스타일 8종, 블랙 티셔츠, \"어둠의 컬렉션\"",
    "한정 굿즈: 스프레이캔 키링, 번개 패치, 그래피티 에코백",
    "K콜라보: 진로 두꺼비 \"위자드×두꺼비 밤의 성수\" 프린트",
    "인플루언서: 무직타이거×레오 + 송민호(MINO)×위자드",
    "KPI: FW 시즌 매장 유입률, 야간 매출 비중",
  ];
  t4Items.forEach((item, i) => {
    s.addText(item, { x: 5.4, y: 1.65 + i * 0.38, w: 3.9, h: 0.34, fontSize: 10, fontFace: "Arial", color: i === 6 ? C.ACCENT_BLUE : C.GRAY_800, margin: 0, bullet: true });
  });
  addFooter(s, 12, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 13: T5 + T6 상세
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("T5 Holiday Universe + T6 New Year Wacky Run", {
    x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 20, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.78, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // T5
  s.addShape("rect", { x: 0.5, y: 1.0, w: 4.3, h: 3.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addShape("rect", { x: 0.5, y: 1.0, w: 4.3, h: 0.55, fill: { color: "EF4444" } });
  s.addText("T5  Holiday Universe  (11~12월)", { x: 0.65, y: 1.05, w: 4.0, h: 0.45, fontSize: 13, fontFace: "Arial", color: C.WHITE, bold: true, margin: 0, valign: "middle" });
  const t5Items = [
    "주인공: 하운드(리치보이) + 해삐(쌍둥이)",
    "구조물: 산타 모자 소품 + 미니 트리·선물상자 + 골드 조명",
    "포토존: 크리스마스 분위기 키키, 산타 모자/루돌프 머리띠 대여",
    "커스텀: 홀리데이 한정 배경(눈/별/선물), 골드 프린트 옵션",
    "한정 굿즈: 기프트 패키지 세트, 하운드 카드지갑, 해삐 북마크",
    "K콜라보: 빼빼로 or 초코파이 한정 패키지 디자인",
    "인플루언서: 최고심 × 해삐 \"오늘도 해삐\" 프린트/다이어리",
    "KPI: 객단가, 기프트 세트 판매량, 외국인 연말 매출",
  ];
  t5Items.forEach((item, i) => {
    s.addText(item, { x: 0.7, y: 1.65 + i * 0.38, w: 3.9, h: 0.34, fontSize: 10, fontFace: "Arial", color: i === 6 ? C.ACCENT_BLUE : C.GRAY_800, margin: 0, bullet: true });
  });

  // T6
  s.addShape("rect", { x: 5.2, y: 1.0, w: 4.3, h: 3.95, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addShape("rect", { x: 5.2, y: 1.0, w: 4.3, h: 0.55, fill: { color: "22C55E" } });
  s.addText("T6  New Year Wacky Run  (1~2월)", { x: 5.35, y: 1.05, w: 4.0, h: 0.45, fontSize: 13, fontFace: "Arial", color: C.WHITE, bold: true, margin: 0, valign: "middle" });
  const t6Items = [
    "주인공: 로또(바운티 헌터) + 레이너 + 에이스",
    "구조물: 러닝 빕+운동화 소품 + 로또 미니 피규어 + 트랙 스티커",
    "포토존: 키키와 나란히 러닝 포즈, 넘버링 빕 대여",
    "커스텀: 러닝 모티프 프린트 6종, 네온 컬러 추가",
    "한정 굿즈: 러닝 볼캡(에이스 자수), 로또 키링, 뉴이어 스티커",
    "K콜라보: 삼양 불닭 \"새해엔 와키하게 불태우자!\" 콜라보",
    "인플루언서: 하하(런닝맨) × 로또 \"러닝 키트\" 콜라보",
    "KPI: 27SS 프리뷰 반응, 러닝코어 라인 인지도",
  ];
  t6Items.forEach((item, i) => {
    s.addText(item, { x: 5.4, y: 1.65 + i * 0.38, w: 3.9, h: 0.34, fontSize: 10, fontFace: "Arial", color: i === 6 ? C.ACCENT_BLUE : C.GRAY_800, margin: 0, bullet: true });
  });
  addFooter(s, 13, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 14: SECTION DIVIDER — 서비스 & 상품
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  s.addText("04", { x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("커스텀 프린트 &\n한정 굿즈", { x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  s.addText("주문형 프린팅 · 가격 전략 · 수집 시스템", { x: 0.5, y: 3.4, w: 7, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 14, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 15: 커스텀 프린트 서비스
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("커스텀 프린트 서비스", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Service flow
  const steps = ["바디 선택\n(3색)", "캐릭터 선택\n(4~6종)", "배경 선택\n(시즌 한정)", "프린팅\n(3분)", "포장\n(2분)"];
  steps.forEach((st, i) => {
    const xx = 0.5 + i * 1.85;
    s.addShape("rect", { x: xx, y: 1.1, w: 1.6, h: 0.8, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addShape("rect", { x: xx, y: 1.1, w: 1.6, h: 0.05, fill: { color: C.TEAL } });
    s.addText(st, { x: xx, y: 1.2, w: 1.6, h: 0.65, fontSize: 10, fontFace: "Arial", color: C.GRAY_800, align: "center", margin: 0, valign: "middle" });
    if (i < 4) s.addText("→", { x: xx + 1.6, y: 1.25, w: 0.25, h: 0.5, fontSize: 14, color: C.GRAY_400, align: "center", margin: 0, valign: "middle" });
  });
  s.addText("총 소요시간: 5~7분", { x: 7.0, y: 1.95, w: 2.5, h: 0.3, fontSize: 11, fontFace: "Arial", color: C.GRAY_600, align: "right", margin: 0 });

  // Price table
  s.addText("가격 구조", { x: 0.5, y: 2.35, w: 3, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const priceHeader = [
    [
      { text: "상품", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
      { text: "가격", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
      { text: "포지셔닝", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
    ],
    [
      { text: "커스텀 프린트 (기본)", options: { fontSize: 11, fontFace: "Arial" } },
      { text: "19,900원", options: { fontSize: 11, fontFace: "Arial", bold: true } },
      { text: "뉴발란스 1만원 대비 체험 가치 포함", options: { fontSize: 10, fontFace: "Arial", color: C.GRAY_600 } },
    ],
    [
      { text: "프리미엄 프린트 (골드/야광)", options: { fontSize: 11, fontFace: "Arial" } },
      { text: "29,900원", options: { fontSize: 11, fontFace: "Arial", bold: true } },
      { text: "테마별 스페셜 옵션", options: { fontSize: 10, fontFace: "Arial", color: C.GRAY_600 } },
    ],
    [
      { text: "선물 포장 추가", options: { fontSize: 11, fontFace: "Arial" } },
      { text: "3,000원", options: { fontSize: 11, fontFace: "Arial", bold: true } },
      { text: "와키윌리 브랜딩 박스 + 리본", options: { fontSize: 10, fontFace: "Arial", color: C.GRAY_600 } },
    ],
  ];
  s.addTable(priceHeader, { x: 0.5, y: 2.7, w: 9, colW: [3, 1.5, 4.5], border: { pt: 0.5, color: C.GRAY_200 } });

  // Goods lineup summary
  s.addText("한정 굿즈 라인업", { x: 0.5, y: 3.95, w: 3, h: 0.3, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const goodsData = [
    ["5천~1만원", "키링, 스티커, 뱃지, 패치", "300~500개/테마"],
    ["1만~2만원", "에코백, 양말, 미러, 카드지갑", "200~300개/테마"],
    ["2만~3만원", "볼캡, 파우치, 미니백", "100~200개/테마"],
  ];
  goodsData.forEach((g, i) => {
    const xx = 0.5 + i * 3.1;
    s.addShape("rect", { x: xx, y: 4.25, w: 2.9, h: 0.6, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addText(g[0], { x: xx + 0.1, y: 4.27, w: 1.3, h: 0.28, fontSize: 13, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0 });
    s.addText(g[2], { x: xx + 1.5, y: 4.27, w: 1.3, h: 0.28, fontSize: 9, fontFace: "Arial", color: C.GRAY_400, align: "right", margin: 0, valign: "middle" });
    s.addText(g[1], { x: xx + 0.1, y: 4.55, w: 2.7, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
  });
  addFooter(s, 15, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 16: SECTION DIVIDER — 콜라보
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  s.addText("05", { x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("K콜라보 &\n인플루언서 전략", { x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  s.addText("K-브랜드 협업 · 캐릭터 페어링 · 아시아 관광객 타겟", { x: 0.5, y: 3.4, w: 7, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 16, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 17: K콜라보 리스트
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("K콘텐츠 콜라보 후보 리스트", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  const collabHeader = [
    [
      { text: "브랜드/IP", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "카테고리", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "와키윌리 연결", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "적합 테마", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "우선순위", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
    ],
  ];
  const collabRows = [
    ["테라 맥주", "주류", "여름+청춘 이미지", "T2", "★★★"],
    ["진로 두꺼비", "주류/캐릭터", "캐릭터 IP × IP 콜라보", "T4", "★★★"],
    ["한국관광공사", "관광", "외국인 관광객 공동 마케팅", "전체", "★★★"],
    ["삼양 불닭", "K-푸드", "틱톡 글로벌 바이럴, 전 아시아 인지도", "T6", "★★★"],
    ["올리브영", "K-뷰티", "외국인 필수 코스, 성수 인접", "T3", "★★★"],
    ["빙그레", "K-푸드", "일·중·동남아 필수 구매템", "T2", "★★★"],
    ["서울 해치", "도시 캐릭터", "K-컬처 + 관광객", "T3", "★★☆"],
    ["빼빼로/초코파이", "식품", "연말 기프트 시즌", "T5", "★★☆"],
    ["모나미", "K-문구", "153볼펜 레트로 아이콘", "T6", "★★☆"],
    ["농심 (신라면)", "K-푸드", "K-food 글로벌 상징", "T4", "★★☆"],
    ["곰표", "K-레트로", "MZ 레트로 콜라보 아이콘", "스페셜", "★★☆"],
    ["카카오프렌즈", "캐릭터", "IP × IP 대형 콜라보", "스페셜", "★★☆"],
  ];
  collabRows.forEach(r => {
    collabHeader.push(r.map((cell, ci) => ({
      text: cell,
      options: { fontSize: 9, fontFace: "Arial", color: ci === 0 ? C.BLACK : C.GRAY_800, bold: ci === 0 }
    })));
  });
  s.addTable(collabHeader, {
    x: 0.5, y: 1.1, w: 9, colW: [1.8, 1.2, 3.0, 1.2, 1.0],
    border: { pt: 0.5, color: C.GRAY_200 },
    rowH: [0.3, ...Array(12).fill(0.28)]
  });
  addFooter(s, 17, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 18: 인플루언서 콜라보 전략
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("인플루언서 콜라보 — 캐릭터 페어링", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Principle box
  s.addShape("rect", { x: 0.5, y: 1.05, w: 9, h: 0.5, fill: { color: C.BLACK } });
  s.addText("\"세계관에 초대하기\" — 인플루언서가 와키 유니버스의 일원이 되는 구조: 캐릭터 짝꿍 배정 → 콜라보 디자인 → 한정 굿즈 → 방문 콘텐츠 → FOMO", {
    x: 0.7, y: 1.1, w: 8.6, h: 0.4, fontSize: 11, fontFace: "Arial", color: C.MINT, margin: 0, valign: "middle"
  });

  const influencers = [
    ["이사배", "키키 (변신)", "변신 키트, 오프닝 프린트", "T1", "일·중·동남아 ★★★", "Tier 2"],
    ["빠니보틀", "쿼바오 (여행)", "여행 키트, 모험 프린트", "T2", "동남아 ★★★", "Tier 2"],
    ["에스더버니", "릴리 (팝/키치)", "콜라보 파우치, 키링 세트", "T3", "글로벌 ★★★", "Tier 1"],
    ["무직타이거+송민호", "레오+위자드 (아트)", "크로스오버 프린트, 토트백", "T4", "아시아 ★★★", "Tier 1+3"],
    ["최고심", "해삐 (감성)", "감성 프린트, 다이어리", "T5", "한·일·중 ★★☆", "Tier 1"],
    ["하하 (런닝맨)", "로또 (러닝)", "러닝 키트, 네임택 프린트", "T6", "전 아시아 ★★★", "Tier 3"],
  ];
  const infHeader = [
    [
      { text: "인플루언서", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "캐릭터 페어링", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "콜라보 제품", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "테마", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "아시아 영향력", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "Tier", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
    ],
  ];
  influencers.forEach(r => {
    infHeader.push(r.map((cell, ci) => ({
      text: cell,
      options: { fontSize: 9.5, fontFace: "Arial", color: ci === 0 ? C.BLACK : C.GRAY_800, bold: ci === 0 }
    })));
  });
  s.addTable(infHeader, {
    x: 0.5, y: 1.75, w: 9, colW: [1.8, 1.5, 2.2, 0.6, 1.5, 0.8],
    border: { pt: 0.5, color: C.GRAY_200 },
    rowH: [0.30, ...Array(6).fill(0.34)]
  });

  // Price & ROI box
  s.addText("콜라보 제품 가격대", { x: 0.5, y: 4.2, w: 3, h: 0.28, fontSize: 12, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const collabPrices = [
    ["콜라보 한정 프린트", "24,900~34,900원"],
    ["콜라보 굿즈 (키링/스티커)", "9,900~14,900원"],
    ["스페셜 키트 (파우치/세트)", "29,900~49,900원"],
  ];
  collabPrices.forEach((p, i) => {
    const xx = 0.5 + i * 3.1;
    s.addShape("rect", { x: xx, y: 4.48, w: 2.9, h: 0.38, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addText(p[0], { x: xx + 0.1, y: 4.49, w: 2.7, h: 0.18, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
    s.addText(p[1], { x: xx + 0.1, y: 4.66, w: 2.7, h: 0.18, fontSize: 12, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  });
  addFooter(s, 18, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 19: SECTION DIVIDER — 예산
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addShape("rect", { x: 0.5, y: 1.8, w: 0.8, h: 0.06, fill: { color: C.MINT } });
  s.addText("06", { x: 0.5, y: 1.0, w: 2, h: 0.8, fontSize: 48, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("예산 &\nROI 분석", { x: 0.5, y: 2.1, w: 9, h: 1.2, fontSize: 36, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  s.addText("투자 비용 · 매출 시뮬레이션 · 손익분기", { x: 0.5, y: 3.4, w: 7, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 19, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 20: 예산 프레임워크
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("예산 프레임워크", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Initial setup
  s.addText("초기 세팅 (1회)", { x: 0.5, y: 1.05, w: 3, h: 0.28, fontSize: 13, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const setupItems = [
    ["키키 상설 구조물", "500~800만", C.TEAL],
    ["기본 인테리어/캐노피", "500~800만", C.GRAY_200],
    ["프린팅 장비 일체", "500~800만", C.GRAY_200],
    ["첫 테마 데코", "200~300만", C.GRAY_200],
  ];
  setupItems.forEach((si, i) => {
    const xx = 0.5 + i * 2.25;
    s.addShape("rect", { x: xx, y: 1.35, w: 2.05, h: 0.6, fill: { color: C.WHITE }, shadow: makeShadowLight() });
    s.addShape("rect", { x: xx, y: 1.35, w: 2.05, h: 0.05, fill: { color: si[2] } });
    s.addText(si[0], { x: xx + 0.1, y: 1.42, w: 1.85, h: 0.22, fontSize: 10, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
    s.addText(si[1], { x: xx + 0.1, y: 1.64, w: 1.85, h: 0.28, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  });
  s.addShape("rect", { x: 0.5, y: 2.05, w: 9, h: 0.30, fill: { color: C.BLACK } });
  s.addText("초기 합계: 1,700~2,700만원", { x: 0.7, y: 2.05, w: 6, h: 0.30, fontSize: 13, fontFace: "Arial", color: C.MINT, bold: true, margin: 0, valign: "middle" });

  // Monthly breakdown
  s.addText("월간 운영비", { x: 0.5, y: 2.50, w: 3, h: 0.28, fontSize: 13, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });

  const monthlyHeader = [
    [
      { text: "항목", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "일반월", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "교체월", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
    ],
    ["인건비 (파트타임 2명)", "300~400만", "300~400만"],
    ["굿즈 제작", "200~400만", "300~500만"],
    ["무지 티셔츠 + 소모품", "130~200만", "130~200만"],
    ["마케팅/콘텐츠", "100~200만", "200~400만"],
    ["인플루언서 콜라보", "—", "100~300만"],
    ["테마 교체 (소품+시공)", "—", "100~250만"],
    ["기타", "50~100만", "50~100만"],
  ].map((r, ri) => ri === 0 ? r : r.map((c, ci) => ({ text: c, options: { fontSize: 10, fontFace: "Arial", color: ci === 0 ? C.BLACK : C.GRAY_800, bold: ci === 0 } })));
  // Add total row
  monthlyHeader.push([
    { text: "월 합계", options: { fontSize: 11, fontFace: "Arial", color: C.BLACK, bold: true, fill: { color: C.GRAY_100 } } },
    { text: "780~1,300만", options: { fontSize: 11, fontFace: "Arial", color: C.BLACK, bold: true, fill: { color: C.GRAY_100 } } },
    { text: "980~1,850만", options: { fontSize: 11, fontFace: "Arial", color: C.BLACK, bold: true, fill: { color: C.GRAY_100 } } },
  ]);
  s.addTable(monthlyHeader, { x: 0.5, y: 2.78, w: 5.5, colW: [2.5, 1.5, 1.5], border: { pt: 0.5, color: C.GRAY_200 }, rowH: Array(9).fill(0.22) });

  // Annual total - right side
  s.addShape("rect", { x: 6.3, y: 2.50, w: 3.2, h: 2.35, fill: { color: C.BLACK } });
  s.addText("연간 총 예산", { x: 6.5, y: 2.58, w: 2.8, h: 0.3, fontSize: 14, fontFace: "Arial", color: C.MINT, bold: true, margin: 0 });

  s.addText("보수적", { x: 6.5, y: 2.95, w: 1.3, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  s.addText("약 1.23억", { x: 6.5, y: 3.18, w: 2.8, h: 0.50, fontSize: 28, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("월 평균 약 1,020만", { x: 6.5, y: 3.65, w: 2.8, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0 });

  s.addShape("rect", { x: 6.5, y: 3.98, w: 2.8, h: 0.02, fill: { color: C.GRAY_600 } });

  s.addText("적극적", { x: 6.5, y: 4.08, w: 1.3, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  s.addText("약 2.18억", { x: 6.5, y: 4.32, w: 2.8, h: 0.45, fontSize: 22, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0 });
  addFooter(s, 20, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 21: ROI 분석
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("매출 시뮬레이션 & ROI", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // 3 scenarios
  const scenarios = [
    ["보수적", "100명", "10%", "20만", "600만", "7,200만", C.GRAY_400],
    ["기본", "150명", "12%", "36만", "1,080만", "1.3억", C.TEAL],
    ["적극적", "200명", "15%", "60만", "1,800만", "2.16억", C.GREEN],
  ];
  scenarios.forEach((sc, i) => {
    const xx = 0.5 + i * 3.1;
    const isMain = i === 1;
    s.addShape("rect", { x: xx, y: 1.1, w: 2.9, h: 2.7, fill: { color: isMain ? C.BLACK : C.WHITE }, shadow: makeShadow() });
    if (isMain) s.addShape("rect", { x: xx, y: 1.1, w: 2.9, h: 0.06, fill: { color: C.TEAL } });
    const tc = isMain ? C.TEAL : C.BLACK;
    const tc2 = isMain ? C.GRAY_400 : C.GRAY_600;
    const tc3 = isMain ? C.WHITE : C.GRAY_800;
    s.addText(sc[0] + " 시나리오", { x: xx + 0.15, y: 1.2, w: 2.6, h: 0.35, fontSize: 14, fontFace: "Arial", color: tc, bold: true, margin: 0 });
    const labels = ["일 방문객", "전환율", "일 매출", "월 매출", "연 매출"];
    const values = [sc[1], sc[2], sc[3], sc[4], sc[5]];
    labels.forEach((l, li) => {
      const ly = 1.65 + li * 0.4;
      s.addText(l, { x: xx + 0.15, y: ly, w: 1.3, h: 0.3, fontSize: 10, fontFace: "Arial", color: tc2, margin: 0 });
      s.addText(values[li], { x: xx + 1.5, y: ly, w: 1.3, h: 0.3, fontSize: li === 4 ? 16 : 12, fontFace: "Arial", color: li === 4 ? tc : tc3, bold: li === 4, align: "right", margin: 0 });
    });
  });

  // ROI box
  s.addShape("rect", { x: 0.5, y: 4.05, w: 9, h: 1.0, fill: { color: C.BLACK } });
  s.addText("ROI 분석", { x: 0.7, y: 4.1, w: 2, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.MINT, bold: true, margin: 0 });
  s.addText("기본 시나리오 기준", { x: 0.7, y: 4.45, w: 3, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  s.addText("연 매출 1.3억  vs  연 비용 1.23억(보수적)", {
    x: 0.7, y: 4.7, w: 4, h: 0.25, fontSize: 11, fontFace: "Arial", color: C.WHITE, margin: 0
  });

  s.addText("약 11개월", { x: 5.5, y: 4.2, w: 2.5, h: 0.5, fontSize: 28, fontFace: "Georgia", color: C.MINT, bold: true, margin: 0 });
  s.addText("손익분기 (보수적 비용 기준)", { x: 5.5, y: 4.7, w: 3.5, h: 0.25, fontSize: 10, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  s.addText("+ 본매장 유입 효과 별도", { x: 8.0, y: 4.1, w: 1.5, h: 0.35, fontSize: 9, fontFace: "Arial", color: C.GRAY_400, margin: 0 });
  addFooter(s, 21, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 22: KPI & 성과 측정
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("KPI & 성과 측정", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  const kpiData = [
    ["일 방문객", "100~200명", "카운터/POS", "주간"],
    ["커스텀 프린트 전환율", "10~15%", "POS 데이터", "주간"],
    ["일 매출", "30~60만 원", "POS", "일간"],
    ["월 매출", "900~1,800만 원", "POS 합산", "월간"],
    ["SNS 멘션", "월 500건+", "#와키윌리성수", "주간"],
    ["외국인 비중", "20%+", "결제 통화", "월간"],
    ["수집 카드 발급", "월 300장+", "카드 재고", "월간"],
    ["본매장 연계 구매", "30%+", "POS 연동", "월간"],
  ];
  const kpiHeader = [
    [
      { text: "지표", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
      { text: "목표", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
      { text: "측정 방법", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
      { text: "주기", options: { fill: { color: C.BLACK }, color: C.WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
    ],
    ...kpiData.map(r => r.map((c, ci) => ({
      text: c,
      options: { fontSize: 11, fontFace: "Arial", color: ci === 1 ? C.BLACK : C.GRAY_800, bold: ci === 0 || ci === 1 }
    })))
  ];
  s.addTable(kpiHeader, {
    x: 0.5, y: 1.1, w: 9, colW: [2.5, 2.0, 2.5, 1.2],
    border: { pt: 0.5, color: C.GRAY_200 },
    rowH: [0.35, ...Array(8).fill(0.35)]
  });

  // Review items
  s.addText("테마별 성과 리뷰 항목", { x: 0.5, y: 4.35, w: 4, h: 0.28, fontSize: 12, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const reviewItems = ["매출 달성률", "인기 굿즈 TOP3", "인기 프린트 디자인", "SNS 반응", "K콜라보 성과", "고객 피드백"];
  reviewItems.forEach((ri, i) => {
    const xx = 0.5 + i * 1.5;
    s.addShape("rect", { x: xx, y: 4.6, w: 1.35, h: 0.32, fill: { color: i < 3 ? C.BLACK : C.WHITE }, shadow: makeShadowLight() });
    s.addText(ri, { x: xx, y: 4.6, w: 1.35, h: 0.32, fontSize: 10, fontFace: "Arial", color: i < 3 ? C.MINT : C.BLACK, align: "center", margin: 0, valign: "middle" });
  });
  addFooter(s, 22, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 23: 운영 가이드 & 리스크
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.OFF_WHITE };
  s.addText("운영 가이드 & 리스크 관리", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: "Georgia", color: C.BLACK, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.TEAL } });

  // Left: Operations
  s.addShape("rect", { x: 0.5, y: 1.1, w: 4.3, h: 3.75, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addText("운영 구조", { x: 0.7, y: 1.2, w: 3.5, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const ops = [
    "인력: 파트타임 2명 (프린트 오퍼레이터 + 판매/안내)",
    "근무: 11:00~21:00, 주말 1명 추가",
    "교육: 브랜드 세계관 + 캐릭터 스토리 숙지 필수",
    "유니폼: 와키윌리 시즌 상품 착용",
    "",
    "테마 교체 프로세스:",
    "  교체 4주 전 — 다음 테마 굿즈 발주, 디자인 확정",
    "  교체 2주 전 — 굿즈 입고, 배너/사이니지 제작",
    "  교체 주 월~화 — 소품 교체 시공 (1.5일)",
    "  교체 주 수요일 — 새 테마 오픈 + SNS 콘텐츠",
    "",
    "다국어: 한국어 / English / 日本語 / 中文",
  ];
  ops.forEach((o, i) => {
    if (o === "") return;
    s.addText(o, { x: 0.7, y: 1.55 + i * 0.26, w: 3.9, h: 0.24, fontSize: 9.5, fontFace: "Arial", color: o.startsWith("  ") ? C.GRAY_600 : C.GRAY_800, margin: 0, bullet: !o.startsWith("  ") && !o.endsWith(":") });
  });

  // Right: Risks
  s.addShape("rect", { x: 5.2, y: 1.1, w: 4.3, h: 3.75, fill: { color: C.WHITE }, shadow: makeShadowLight() });
  s.addText("리스크 & 대응", { x: 5.4, y: 1.2, w: 3.5, h: 0.35, fontSize: 14, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
  const risks = [
    ["우천/혹서/혹한", "간이 캐노피 상시 설치\n극단적 날씨 시 실내 축소 운영"],
    ["프린터 고장", "예비 열프레스 1대 확보\n당일 A/S 업체 계약"],
    ["재고 소진", "잔여 30% 도달 시 자동 발주\n인기 굿즈 리오더 트리거"],
    ["안전/소방", "야외 구조물 허가 확인\n소화기 비치, 안전거리 확보"],
    ["임대/허가", "매장 앞 공간 사용 허가\n건물주/구청 사전 협의"],
  ];
  risks.forEach((r, i) => {
    const yy = 1.65 + i * 0.65;
    s.addShape("rect", { x: 5.35, y: yy, w: 0.06, h: 0.55, fill: { color: i < 2 ? C.RED : C.ORANGE } });
    s.addText(r[0], { x: 5.55, y: yy, w: 3.8, h: 0.24, fontSize: 11, fontFace: "Arial", color: C.BLACK, bold: true, margin: 0 });
    s.addText(r[1], { x: 5.55, y: yy + 0.24, w: 3.8, h: 0.3, fontSize: 9, fontFace: "Arial", color: C.GRAY_600, margin: 0 });
  });
  addFooter(s, 23, TOTAL);

  // ═══════════════════════════════════════
  // SLIDE 24: 타임라인 + Next Steps
  // ═══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DARK_BG };
  s.addText("타임라인 & Next Steps", {
    x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: "Georgia", color: C.WHITE, bold: true, margin: 0
  });
  s.addShape("rect", { x: 0.5, y: 0.88, w: 0.8, h: 0.04, fill: { color: C.MINT } });

  // Timeline
  const timeline = [
    ["3/10", "기획서 초안 완성", true],
    ["3/14", "경영진 보고 (마감)", false],
    ["3월 말", "초기 세팅 발주\n(구조물, 장비)", false],
    ["4월 초", "T1 Grand Opening\n런칭", false],
  ];
  timeline.forEach((t, i) => {
    const xx = 0.5 + i * 2.35;
    // Circle
    s.addShape("oval", { x: xx + 0.7, y: 1.25, w: 0.35, h: 0.35, fill: { color: t[2] ? C.MINT : C.CARD_BG }, line: { color: C.MINT, width: 2 } });
    if (i < 3) s.addShape("rect", { x: xx + 1.05, y: 1.38, w: 2.0, h: 0.03, fill: { color: C.GRAY_600 } });
    s.addText(t[0], { x: xx, y: 1.7, w: 1.75, h: 0.3, fontSize: 14, fontFace: "Georgia", color: C.MINT, bold: true, align: "center", margin: 0 });
    s.addText(t[1], { x: xx, y: 2.0, w: 1.75, h: 0.55, fontSize: 11, fontFace: "Arial", color: C.WHITE, align: "center", margin: 0 });
  });

  // Next Steps
  s.addText("승인 요청 사항", { x: 0.5, y: 2.7, w: 4, h: 0.35, fontSize: 16, fontFace: "Arial", color: C.MINT, bold: true, margin: 0 });
  const nextSteps = [
    "수버니어 존 콘셉트 \"Wacky Playground\" 승인",
    "초기 투자 예산 1,700~2,700만 원 승인",
    "상설 키키 구조물 제작 착수 승인",
    "T1 Grand Opening 일정 확정 (4월 초 목표)",
    "K콜라보 1순위 (테라/한국관광공사) 접촉 승인",
    "인플루언서 Tier 1 (아티스트 콜라보) 우선 협의 승인",
  ];
  nextSteps.forEach((ns, i) => {
    s.addShape("rect", { x: 0.5, y: 3.05 + i * 0.30, w: 9, h: 0.26, fill: { color: C.CARD_BG } });
    s.addShape("rect", { x: 0.5, y: 3.05 + i * 0.30, w: 0.06, h: 0.26, fill: { color: C.MINT } });
    s.addText(`${i + 1}. ${ns}`, { x: 0.7, y: 3.05 + i * 0.30, w: 8.6, h: 0.26, fontSize: 11, fontFace: "Arial", color: C.WHITE, margin: 0, valign: "middle" });
  });
  addFooter(s, 24, TOTAL);

  // ═══════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════
  const outPath = "/Users/sherman/07. FPOF V2.2 Claude/output/26SS/_season/do_seongsu-souvenir-zone-annual-plan.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("PPTX saved to:", outPath);
}

main().catch(console.error);
