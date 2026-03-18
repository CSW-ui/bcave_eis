const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = '와키윌리 사업부';
pres.title = '26SS 주간 보고서';

const colors = {
  primary: "FEF200",
  black: "000000",
  white: "FFFFFF",
  accent: "68A8DB",
  gray: "6B7280",
  lightGray: "F3F4F6",
  success: "10B981",
  warning: "F59E0B",
  danger: "EF4444"
};

const makeShadow = () => ({
  type: "outer",
  color: "000000",
  blur: 6,
  offset: 2,
  opacity: 0.15
});

// SLIDE 1: Cover
let slide1 = pres.addSlide();
slide1.background = { color: colors.black };

slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.15,
  fill: { color: colors.primary }
});

slide1.addText("와키윌리 사업부 주간 보고서", {
  x: 0.8, y: 1.2, w: 8.4, h: 0.6,
  fontSize: 42, fontFace: "Arial", bold: true,
  color: colors.white, align: "left"
});

slide1.addText("2026년 2월 4주차", {
  x: 0.8, y: 1.9, w: 8.4, h: 0.4,
  fontSize: 24, fontFace: "Arial",
  color: colors.gray, align: "left"
});

slide1.addText("2026년 2월 23일 ~ 3월 1일", {
  x: 0.8, y: 2.4, w: 8.4, h: 0.3,
  fontSize: 16, fontFace: "Arial",
  color: colors.gray, align: "left"
});

const highlights = [
  { title: "전체 영업", value: "195억", change: "+1%", color: colors.success },
  { title: "와키윌리", value: "43억", change: "-4%", color: colors.danger },
  { title: "달성율", value: "94%", change: "목표", color: colors.warning }
];

const cardX = 0.8;
const cardW = 2.8;
const cardH = 1.3;
const cardGap = 0.2;

highlights.forEach((item, idx) => {
  const x = cardX + idx * (cardW + cardGap);

  slide1.addShape(pres.shapes.RECTANGLE, {
    x: x, y: 3.0, w: cardW, h: cardH,
    fill: { color: "1F2937" },
    shadow: makeShadow()
  });

  slide1.addShape(pres.shapes.RECTANGLE, {
    x: x, y: 3.0, w: cardW, h: 0.28,
    fill: { color: item.color }
  });

  slide1.addText(item.title, {
    x: x, y: 3.05, w: cardW, h: 0.16,
    fontSize: 13, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide1.addText(item.value, {
    x: x, y: 3.45, w: cardW, h: 0.4,
    fontSize: 28, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide1.addText(item.change, {
    x: x, y: 3.9, w: cardW, h: 0.22,
    fontSize: 13, fontFace: "Arial",
    color: colors.white, align: "center"
  });
});

// SLIDE 2: Sales Overview
let slide2 = pres.addSlide();
slide2.background = { color: colors.white };

slide2.addText("전체 영업 현황", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const salesData = [
  { label: "국내 영업", total: "195억", target: "207억", rate: "94%", yoy: "+1%" },
  { label: "와키윌리", total: "43억", target: "45억", rate: "95%", yoy: "-4%" }
];

salesData.forEach((data, idx) => {
  const y = 1.5 + idx * 0.9;

  slide2.addText(data.label, {
    x: 0.8, y: y, w: 2.2, h: 0.3,
    fontSize: 14, fontFace: "Arial", bold: true,
    color: colors.black, align: "left"
  });

  slide2.addText("누계: " + data.total, {
    x: 3.2, y: y, w: 1.8, h: 0.3,
    fontSize: 14, fontFace: "Arial",
    color: colors.black, align: "left"
  });

  slide2.addText("목표: " + data.target + " (" + data.rate + ")",
    x: 5.1, y: y, w: 2.5, h: 0.3,
    fontSize: 14, fontFace: "Arial",
    color: colors.black, align: "left"
  });

  const isPositive = data.yoy.includes("+");
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: 7.7, y: y + 0.05, w: 1.3, h: 0.22,
    fill: { color: isPositive ? colors.success : colors.danger }
  });

  slide2.addText(data.yoy, {
    x: 7.7, y: y + 0.05, w: 1.3, h: 0.22,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });
});

slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.4, w: 8.4, h: 0.6,
  fill: { color: "FEF3C7" },
  border: { pt: 1, color: colors.warning }
});

slide2.addText("할인율: 누계 32.4% (목표 27% 초과)", {
  x: 1, y: 3.6, w: 8, h: 0.2,
  fontSize: 13, fontFace: " "Arial",
  color: colors.black, align: "center"
});

// SLIDE 3: Online KPI
let slide3 = pres.addSlide();
slide3.background = { color: colors.white };

slide3.addText("온라인 KPI 및 프로모션 성과", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const kpiMetrics = [
  { metric: "구매자 수", thisWeek: "457명", lastWeek: "658명", change: "▼30.5%" },
  { metric: "AOV", thisWeek: "79,697원", lastWeek: "71,437원", change: "▲11.6%" },
  { metric: "CVR", thisWeek: "0.9%", lastWeek: "1.0%", change: "▼13.5%" }
];

kpiMetrics.forEach((metric, idx) => {
  const y = 1.5 + idx * 0.45;

  slide3.addText(metric.metric, {
    x: 0.8, y: y, w: 2.5, h: 0.25,
    fontSize: 12, fontFace: "Arial",
    color: colors.gray, align: "left"
  });

  slide3.addText(metric.thisWeek + " (" + metric.lastWeek + ")",
    x: 3.5, y: y, w: 3.5, h: 0.25,
    fontSize: 12, fontFace: "Arial",
    color: colors.black, align: "left"
  });

  const isPositive = metric.change.includes("▲");
  slide3.addText(metric.change, {
    x: 7.2, y: y, w: 1.8, h: 0.25,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: isPositive ? colors.success : colors.danger, align: "right"
  });
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.0, w: 8.4, h: 2.0,
  fill: { color: colors.lightGray },
  border: { pt: 1, color: colors.gray }
});

slide3.addText("봄맞이 프로모션 (2/27~3/8)", {
  x: 1, y: 3.2, w: 7.8, h: 0.2,
  fontSize: 13, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide3.addText([
  { text: "실적: 31pcs / 2,230,646원 (비중 6%), ", options: { fontSize: 12, color: colors.black } },
  { text: "쿠폰 사용률 5%", options: { fontSize: 12, color: colors.warning } }
], {
  x: 1, y: 3.5, w: 7.8, h: 0.25
});

slide3.addText("지젤 스포츠룩북 프로모션 (2/9~3/8)", {
  x: 1, y: 4.1, w: 7.8, h: 0.2,
  fontSize: 13, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide3.addText([
  { text: "실적: 114pcs / 8,913,387원 (목표 128% 달성)", options: { fontSize: 12, color: colors.black } },
  { text: "사은품 판매: 1,050pcs", options: { fontSize: 12, color: colors.success } }
], {
  x: 1, y: 4.4, w: 7.8, h: 0.25
});

// SLIDE 4: Performance Marketing
let slide4 = pres.addSlide();
slide4.background = { color: colors.white };

slide4.addText("퍼포먼스 마케팅 성과", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide4.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

slide4.addTable([
  [
    { text: "구분", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "광고비", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "매출", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "ROAS", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } }
  ],
  [
    { text: "자사몰", options: { fontSize: 12 } },
    { text: "3,474만", options: { fontSize: 12 } },
    { text: "7,299만", options: { fontSize: 12 } },
    { text: "210%", options: { fontSize: 12, bold: true, color: colors.success } }
  ],
  [
    { text: "무신사", options: { fontSize: 12 } },
    { text: "3,131만", options: { fontSize: 12 } },
    { text: "3,631만", options: { fontSize: 12 } },
    { text: "326%", options: { fontSize: 12, bold: true, color: colors.success } }
  ],
  [
    { text: "TOTAL", options: { fontSize: 12, bold: true } },
    { text: "6,605만", options: { fontSize: 12, bold: true } },
    { text: "10,930만", options: { fontSize: 12, bold: true } },
    { text: "196%", options: { fontSize: 12, bold: true, color: colors.success } }
  ]
], {
  x: 0.8, y: 1.4, w: 8.4, h: 1.3,
  border: { pt: 1, color: colors.gray },
  colW: [2.5, 2, 2, 1.9]
});

slide4.addText("2월 실적: 총매출 1.09억 (목표 대비 63% 달성)", {
  x: 0.8, y: 2.9, w: 8.4, h: 0.25,
  fontSize: 13, fontFace: "Arial",
  color: colors.warning, align: "center"
});

const performanceData = [
  { channel: "파워링", ctr: "0.65%", roas: "332%" },
  { channel: "검색광고", ctr: "14.56%", roas: "207%" },
  { channel: "페이스북", ctr: "0.31%", roas: "343%" }
];

const metricW = 2.8;
const metricH = 0.9;
const metricX = 0.8;
const metricY = 3.4;

performanceData.forEach((data, idx) => {
  const x = metricX + idx * (metricW + 0.15);

  slide4.addShape(pres.shapes.RECTANGLE, {
    x: x, y: metricY, w: metricW, h: metricH,
    fill: { color: colors.lightGray },
    border: { pt: 1, color: colors.gray }
  });

  slide4.addText(data.channel, {
    x: x, y: metricY + 0.1, w: metricW, h: 0.2,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: colors.black, align: "center"
  });

  slide4.addText("CTR: " + data.ctr, {
    x: x, y: metricY + 0.35, w: metricW, h: 0.2,
    fontSize: 11, fontFace: "Arial",
    color: colors.gray, align: "center"
  });

  slide4.addText("ROAS: " + data.roas, {
    x: x, y: metricY + 0.6, w: metricW, h: 0.2,
    fontSize: 11, fontFace: "Arial", bold: true,
    color: colors.success, align: "center"
  });
});

// SLIDE 5: Musinsa & 29CM
let slide5 = pres.addSlide();
slide5.background = { color: colors.white };

slide5.addText("무신사 및 29CM 채널 성과", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide5.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

slide5.addTable([
  [
    { text: "채널", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "2월 실적", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "달성율", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "전년비", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } }
  ],
  [
    { text: "무신사", options: { fontSize: 12 } },
    { text: "3.5억", options: { fontSize: 12, bold: true } },
    { text: "110%", options: { fontSize: 12, bold: true, color: colors.success } },
    { text: "▲19%", options: { fontSize: 12, bold: true, color: colors.success } }
  ],
  [
    { text: "29CM", options: { fontSize: 12 } },
    { text: "0.4억", options: { fontSize: 12, bold: true } },
    { text: "66%", options: { fontSize: 12, bold: true, color: colors.danger } },
    { text: "▲123%", options: { fontSize: 12, bold: true, color: colors.success } }
  ]
], {
  x: 0.8, y: 1.4, w: 8.4, h: 1.0,
  border: { pt: 1, color: colors.gray },
  colW: [2.5, 2, 2, 1.9]
});

slide5.addText("무신사 설 빅세일 호조로 목표 110% 달성", {
  x: 0.8, y: 2.6, w: 8.4, h: 0.25,
  fontSize: 13, fontFace: "Arial",
  color: colors.success, align: "center"
});

slide5.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.0, w: 8.4, h: 1.8,
  fill: { color: colors.lightGray },
  border: { pt: 1, color: colors.gray }
});

slide5.addText("지젤 스포츠룩북 기획전 (2/9~2/25)", {
  x: 1, y: 3.2, w: 7.8, h: 0.2,
  fontSize: 12, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide5.addText("실적: 128pcs / 약 9억 (목표 2.1억 대비 128% 달성)", {
  x: 1, y: 3.5, w: 7.8, h: 0.25,
  fontSize: 11, fontFace: "Arial",
  color: colors.black, align: "left"
});

slide5.addText("BEST 3", {
  x: 1, y: 3.9, w: 7.8, h: 0.18,
  fontSize: 11, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide5.addText("① 베이직 로고 후드집업 (44.4억) ② 그래픽 키치 와이퍼 후드집업 (13.8억) ③ 케이브 백팩 블랙 (12.9억)", {
  x: 1, y: 4.1, w: 7.8, h: 0.4,
  fontSize: 10, fontFace: "Arial",
  color: colors.gray, align: "left"
});

// SLIDE 6: Department Store & Outlet
let slide6 = pres.addSlide();
slide6.background = { color: colors.white };

slide6.addText("백화점 및 아울렛 성과", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide6.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

slide6.addTable([
  [
    { text: "구분", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "목표", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "실적", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "달성율", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } },
    { text: "전년비", options: { fill: { color: "1F2937" }, color: "FFFFFF", bold: true } }
  ],
  [
    { text: "백화점", options: { fontSize: 11 } },
    { text: "13.98억", options: { fontSize: 11 } },
    { text: "12.56억", options: { fontSize: 11, bold: true } },
    { text: "90%", options: { fontSize: 11, bold: true, color: colors.danger } },
    { text: "▼15%", options: { fontSize: 11, bold: true, color: colors.danger } }
  ],
  [
    { text: "아울렛", options: { fontSize: 11 } },
    { text: "9.04억", options: { fontSize: 11 } },
    { text: "10.38억", options: { fontSize: 11, bold: true } },
    { text: "115%", options: { fontSize: 11, bold: true, color: colors.success } },
    { text: "▲24%", options: { fontSize: 11, bold: true, color: colors.success } }
  ]
], {
  x: 0.8, y: 1.4, w: 8.4, h: 1.0,
  border: { pt: 1, color: colors.gray },
  colW: [2, 1.8, 1.8, 1.8, 1.4]
});

slide6.addText("아울렛: 목표 115% 달성, 전년비 +24% 신장", {
  x: 0.8, y: 2.6, w: 8.4, h: 0.25,
  fontSize: 13, fontFace: "Arial",
  color: colors.success, align: "center"
});

slide6.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.0, w: 8.4, h: 1.6,
  fill: { color: colors.lightGray },
  border: { pt: 1, color: colors.gray }
});

slide6.addText("특이사항", {
  x: 1, y: 3.2, w: 7.8, h: 0.18,
  fontSize: 12, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide6.addText("25FW 시즌오프 연장 (~2/26까지), 신학기 가방 프로모션 진행", {
  x: 1, y: 3.5, w: 7.8, h: 0.2,
  fontSize: 11, fontFace: "Arial",
  color: colors.black, align: "left"
});

slide6.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 3.8, w: 0.1, h: 0.1,
  fill: { color: colors.danger }
});

slide6.addText("부진: 폐점매장 5개점 140억, 신상품 BP -20%", {
  x: 1.15, y: 3.77, w: 7.65, h: 0.18,
  fontSize: 11, fontFace: "Arial",
  color: colors.danger, align: "left"
});

slide6.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 4.1, w: 0.1, h: 0.1,
  fill: { color: colors.success }
});

slide6.addText("호조: 여성 매출 신장, 가디건 +11%", {
  x: 1.15, y: 4.07, w: 7.65, h: 0.18,
  fontSize: 11, fontFace: "Arial",
  color: colors.success, align: "left"
});

// SLIDE 7: Issues
let slide7 = pres.addSlide();
slide7.background = { color: colors.white };

slide7.addText("주요 이슈 및 개선 방안", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide7.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const issues = [
  {
    title: "매출",
    issue: "전체 매출 감소 (전주 -2%)",
    solution: "신상품 집중 프로모션",
    icon: "📊"
  },
  {
    title: "할인율",
    issue: "누계 32.4% (목표 초과)",
    solution: "할인율 체계적 관리",
    icon: "⚠️"
  },
  {
    title: "자사몰",
    issue: "목표 대비 63% 달성",
    solution: "매출 갱신 상품 확보",
    icon: "🏪"
  },
  {
    title: "신상품",
    issue: "우먼스 발매 지연 등",
    solution: "상품 유입 증대",
    icon: "📦"
  }
];

const issueW = 4.6;
const issueH = 1.4;
const issueX = 0.8;
const issueY = 1.5;

issues.forEach((issue, idx) => {
  const x = issueX + idx * (issueW + 0.15);
  const y = issueY + Math.floor(idx / 2) * (issueH + 0.2);

  slide7.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: issueW, h: issueH,
    fill: { color: colors.lightGray },
    border: { pt: 1, color: colors.gray }
  });

  slide7.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: issueW, h: 0.28,
    fill: { color: colors.warning }
  });

  slide7.addText(issue.icon + " " + issue.title, {
    x: x, y: y + 0.08, w: issueW, h: 0.16,
    fontSize: 11, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide7.addText([
    { text: "문제: ", options: { bold: true, fontSize: 10, color: colors.danger } },
    { text: issue.issue, options: { fontSize: 10, color: colors.black } }
  ], {
    x: x + 0.15, y: y + 0.42, w: issueW - 0.3, h: 0.35
  });

  slide7.addText([
    { text: "해결: ", options: { bold: true, fontSize: 10, color: colors.success } },
    { text: issue.solution, options: { fontSize: 10, color: colors.black } }
  ], {
    x: x + 0.15, y: y + 0.85, w: issueW - 0.3, h: 0.35
  });
});

// SLIDE 8: Strategy
let slide8 = pres.addSlide();
slide8.background = { color: colors.white };

slide8.addText("3월 성공 전략", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide8.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h:  0.08,
  fill: { color: colors.primary }
});

const strategies = [
  { icon: "🎯", title: "26SS 신상품 집중", desc: "신학기 필수템 프로모션" },
  { icon: "📧", title: "CRM 강화", desc: "알림톡/LMS 발송 세분화" },
  { icon: "🚀", title: "시즌 전환 안정화", desc: "26SS 판매 비중 50% 유지" },
  { icon: "💰", title: "이월 재고 최적화", desc: "적절한 프로모션으로 매출 개선" }
];

const stratW = 4.5;
const stratH = 1.3;
const stratX = 0.8;
const stratY = 1.5;

strategies.forEach((strat, idx) => {
  const x = stratX + idx * (stratW + 0.15);

  slide8.addShape(pres.shapes.RECTANGLE, {
    x: x, y: stratY, w: stratW, h: stratH,
    fill: { color: colors.lightGray },
    border: { pt: 1, color: colors.gray }
  });

  slide8.addShape(pres.shapes.RECTANGLE, {
    x: x, y: stratY, w: stratW, h: 0.28,
    fill: { color: colors.accent }
  });

  slide8.addText(strat.icon + " " + strat.title, {
    x: x, y: stratY + 0.08, w: stratW, h: 0.16,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide8.addText(strat.desc, {
    x: x, y: stratY + 0.4, w: stratW, h: 0.7,
    fontSize: 11, fontFace: "Arial",
    color: colors.black, align: "center"
  });
});

slide8.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.4, w: 8.4, h: 0.5,
  fill: { color: colors.black }
});

slide8.addText("📅 3월 주요 행사: 패션위크(3/4), 브랜드데이(3/16~3/25)", {
  x: 1, y: 3.55, w: 8, h: 0.2,
  fontSize: 13, fontFace: "Arial", bold: true,
  color: colors.white, align: "center"
});

slide8.addText("온라인 전용 HZ, PT 상품 판매 호조 및 신학기 가방 기획전 참여", {
  x: 1, y: 3.85, w: 8, h: 0.15,
  fontSize: 12, fontFace: "Arial",
  color: colors.white, align: "center"
});

// SLIDE 9: Summary
let slide9 = pres.addSlide();
slide9.background = { color: colors.black };

slide9.addText("요약 및 다음 단계", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.white, align: "left"
});

slide9.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

slide9.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.5, w: 8.4, h: 2.8,
  fill: { color: colors.primary }
});

slide9.addText("2월 성과 요약", {
  x: 1, y: 1.6, w: 8, h: 0.22,
  fontSize: 18, fontFace: "Arial", bold: true,
  color: colors.black, align: "center"
});

summaryData.forEach((data, idx) => {
  const y = 2.0 + idx * 0.45;

  slide9.addText(data.label, {
    x: 1, y: y, w: 2.5, h: 0.25,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: colors.black, align: "left"
  });

  slide9.addText(data.value + " (" + data.rate + ")",
    x: 3.7, y: y, w: 2.5, h: 0.25,
    fontSize: 12, fontFace: "Arial",
    color: colors.black, align: "left"
  });

  const isPositive = data.yoy.includes("+");
  slide9.addShape(pres.shapes.RECTANGLE, {
    x: 6.4, y: y, w: 2.4, h: 0.25,
    fill: { color: isPositive ? colors.success : colors.danger }
  });

  slide9.addText(data.yoy, {
    x: 6.4, y: y, w: 2.4, h: 0.25,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });
});

slide9.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.5, w: 8.4, h: 0.5,
  fill: { color: "1F2937" }
});

slide9.addText("다음 단계", {
  x: 1, y: 4.65, w: 2, h: 0.2,
  fontSize: 14, fontFace: "Arial", bold: true,
  color: colors.white, align: "left"
});

slide9.addText([
  { text: "1. 신상품 집중 프로모션 진행", options: { fontSize: 12, color: colors.white, breakLine: true } },
  { text: "2. CRM 전략 강화 및 타겟팅 세분화", options: { fontSize: 12, color: colors.white, breakLine: true } },
  { text: "3. 노출 확보를 위한 29CM 기획전 참여", options: { fontSize: 12, color: colors.white, breakLine: true } },
  { text: "4. 적절한 할인율 관리로 매출 개선", options: { fontSize: 12, color: colors.white } }
], {
  x: 3.2, y: 4.7, w: 6, h: 0.25
});

// Save presentation
pres.writeFile({ fileName: "output/weekly review/weekly-report-2026.03.05.pptx" })
  .then(fileName => {
    console.log(`Presentation created: ${fileName}`);
  })
  .catch(err => {
    console.error(err);
  });
