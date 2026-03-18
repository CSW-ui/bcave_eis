const pptxgen = require("pptxgenjs");
const fs = require("fs");

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = '와키윌리 패션 하우스';
pres.title = '와키윌리 시즌 전략 보고서';

const colors = {
  primary: "FEF200",
  black: "000000",
  white: "FFFFFF",
  accent: "68A8DB",
  gray: "6B7280",
  lightGray: "F3F4F6"
};

const makeShadow = () => ({
  type: "outer",
  color: "000000",
  blur: 6,
  offset: 2,
  opacity: 0.15
});

const makeCardShadow = () => ({
  type: "outer",
  color: "000000",
  blur: 8,
  offset: 3,
  opacity: 0.1
});

let slide1 = pres.addSlide();
slide1.background = { color: colors.black };

slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.15,
  fill: { color: colors.primary }
});

slide1.addText("와키윌리 시즌 전략", {
  x: 0.8, y: 1.5, w: 8.4, h: 0.8,
  fontSize: 48, fontFace: "Arial", bold: true,
  color: colors.white, align: "left"
});

slide1.addText("26SS Strategic Review", {
  x: 0.8, y: 2.3, w: 8.4, h: 0.5,
  fontSize: 24, fontFace: "Arial",
  color: colors.gray, align: "left"
});

slide1.addText("2026년 3월 5일", {
  x: 0.8, y: 3.2, w: 8.4, h: 0.4,
  fontSize: 16, fontFace: "Arial",
  color: colors.gray, align: "left"
});

const highlights = [
  { title: "재고 정리", value: "6월 목표", icon: "📦" },
  { title: "글로벌 진출", value: "K-트렌드", icon: "🌏" },
  { title: "시스템 개혁", value: "3월 완료", icon: "⚙️" }
];

const cardX = 0.8;
const cardW = 2.8;
const cardH = 1.5;
const cardGap = 0.2;

highlights.forEach((item, idx) => {
  const x = cardX + idx * (cardW + cardGap);

  slide1.addShape(pres.shapes.RECTANGLE, {
    x: x, y: 3.8, w: cardW, h: cardH,
    fill: { color: "1F2937" },
    shadow: makeCardShadow()
  });

  slide1.addShape(pres.shapes.OVAL, {
    x: x + 0.2, y: 4.0, w: 0.5, h: 0.5,
    fill: { color: colors.accent }
  });

  slide1.addText(item.title, {
    x: x + 0.9, y: 4.0, w: cardW - 1.1, h: 0.3,
    fontSize: 14, fontFace: "Arial", bold: true,
    color: colors.white, align: "left"
  });

  slide1.addText(item.value, {
    x: x + 0.9, y: 4.4, w: cardW - 1.1, h: 0.3,
    fontSize: 18, fontFace: "Arial",
    color: colors.primary, align: "left"
  });
});

let slide2 = pres.addSlide();
slide2.background = { color: colors.white };

slide2.addText("전략적 방향성", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

slide2.addText([
  { text: "핵심 목표: ", options: { bold: true, fontSize: 18, color: colors.black, breakLine: true } },
  { text: "FW 시즌을 기점으로 기존 재고 정리, K-트렌드 활용 글로벌 진출, 채널 전략 재정비", options: { fontSize: 18, color: colors.gray } }
], {
  x: 0.8, y: 1.5, w: 8.4, h: 0.8
});

const pillars = [
  { title: "재고 관리", desc: "기본물 정리 및 채널 구분" },
  { title: "글로벌 진출", desc: "해외 인플루언서 시딩" },
  { title: "채널 전략", desc: "옴니 활성화 및 상품 구분" },
  { title: "조직 개혁", desc: "시스템 및 교육 강화" }
];

const pillarW = 4.3;
const pillarH = 1.2;
const pillarX = 0.8;
const pillarY = 2.6;

pillars.forEach((pillar, idx) => {
  const x = pillarX + (idx % 2) * (pillarW + 0.2);
  const y = pillarY + Math.floor(idx / 2) * (pillarH + 0.2);

  slide2.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: pillarW, h: pillarH,
    fill: { color: colors.lightGray },
    shadow: makeCardShadow()
  });

  slide2.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: 0.08, h: pillarH,
    fill: { color: colors.accent }
  });

  slide2.addText(pillar.title, {
    x: x + 0.25, y: y + 0.15, w: pillarW - 0.35, h: 0.4,
    fontSize: 18, fontFace: "Arial", bold: true,
    color: colors.black, align: "left"
  });

  slide2.addText(pillar.desc, {
    x: x + 0.25, y: y + 0.55, w: pillarW - 0.35, h: 0.5,
    fontSize: 14, fontFace: "Arial",
    color: colors.gray, align: "left"
  });
});

let slide3 = pres.addSlide();
slide3.background = { color: colors.white };

slide3.addText("재고 관리 및 채널 전략", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const problems = [
  "기본물 발주 후 수요 50% 감소",
  "채널 간 치킨게임(할인 경쟁)",
  "브랜드 이미지 저하 우려",
  "옴니 채널 활성화 어려움"
];

const solutions = [
  "FW 기점으로 재고 정리",
  "채널별 상품 구분",
  "캡슐 컬렉션 패키징",
  "스팟 상품(100~200장) 투입"
];

slide3.addText("현재 문제", {
  x: 0.8, y: 1.5, w: 4, h: 0.3,
  fontSize: 16, fontFace: "Arial", bold: true,
  color: "EF4444", align: "left"
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.8, w: 4, h: 3,
  fill: { color: "FEF2F2" },
  border: { pt: 1, color: "FECACA" }
});

problems.forEach((problem, idx) => {
  slide3.addText("• " + problem, {
    x: 1, y: 1.9 + idx * 0.65, w: 3.6, h: 0.5,
    fontSize: 13, fontFace: "Arial",
    color: colors.gray, align: "left"
  });
});

slide3.addText("해결 방안", {
  x: 5.2, y: 1.5, w: 4, h: 0.3,
  fontSize: 16, fontFace: "Arial", bold: true,
  color: "10B981", align: "left"
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 1.8, w: 4, h: 3,
  fill: { color: "ECFDF5" },
  border: { pt: 1, color: "6EE7B7" }
});

solutions.forEach((solution, idx) => {
  slide3.addText("• " + solution, {
    x: 5.4, y: 1.9 + idx * 0.65, w: 3.6, h: 0.5,
    fontSize: 13, fontFace: "Arial",
    color: colors.gray, align: "left"
  });
});

slide3.addShape(pres.shapes.RECTANGLE, {
  x: 4.75, y: 3, w: 0.5, h: 0.5,
  fill: { color: colors.primary }
});

slide3.addText("→", {
  x: 4.75, y: 2.9, w: 0.5, h: 0.5,
  fontSize: 32, fontFace: "Arial", bold: true,
  color: colors.white, align: "center"
});

let slide4 = pres.addSlide();
slide4.background = { color: colors.white };

slide4.addText("글로벌 진출 및 K-트렌드 전략", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide4.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const steps = [
  { label: "Step 1", title: "시딩", desc: "해외 인플루언서\n스타일링" },
  { label: "Step 2", title: "홍보", desc: "글로벌 사업부\n비주얼 홍보" },
  { label: "Step 3", title: "판매", desc: "국내 K-콘텐츠로\n매출 연결" }
];

const stepW = 2.8;
const stepH = 1.8;
const stepX = 0.8;
const stepY = 1.6;

steps.forEach((step, idx) => {
  const x = stepX + idx * (stepW + 0.2);

  slide4.addShape(pres.shapes.RECTANGLE, {
    x: x, y: stepY, w: stepW, h: stepH,
    fill: { color: colors.lightGray },
    shadow: makeCardShadow()
  });

  slide4.addShape(pres.shapes.RECTANGLE, {
    x: x, y: stepY, w: stepW, h: 0.4,
    fill: { color: colors.accent }
  });

  slide4.addText(step.label, {
    x: x, y: stepY + 0.08, w: stepW, h: 0.24,
    fontSize: 12, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide4.addText(step.title, {
    x: x + 0.2, y: stepY + 0.6, w: stepW - 0.4, h: 0.3,
    fontSize: 18, fontFace: "Arial", bold: true,
    color: colors.black, align: "center"
  });

  slide4.addText(step.desc, {
    x: x + 0.2, y: stepY + 1.0, w: stepW - 0.4, h: 0.6,
    fontSize: 13, fontFace: "Arial",
    color: colors.gray, align: "center"
  });
});

for (let i = 0; i < 2; i++) {
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: stepX + stepW + 0.15 + i * (stepW + 0.2), y: stepY + 0.9, w: 0.1, h: 0.1,
    fill: { color: colors.primary }
  });

  slide4.addText("→", {
    x: stepX + stepW + 0.1 + i * (stepW + 0.2), y: stepY + 0.85, w: 0.2, h: 0.2,
    fontSize: 14, fontFace: "Arial", bold: true,
    color: colors.primary, align: "center"
  });
}

slide4.addText("타겟 시장", {
  x: 0.8, y: 3.8, w: 1.5, h: 0.3,
  fontSize: 14, fontFace: "Arial", bold: true,
  color: colors.gray, align: "left"
});

const markets = ["일본", "대만", "동남아"];

markets.forEach((market, idx) => {
  slide4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 2.5 + idx * 1.5, y: 3.75, w: 1.3, h: 0.4,
    fill: { color: colors.black },
    rectRadius: 0.1
  });

  slide4.addText(market, {
    x: 2.5 + idx * 1.5, y: 3.82, w: 1.3, h: 0.25,
    fontSize: 14, fontFace: "Arial",
    color: colors.white, align: "center"
  });
});

slide4.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.4, w: 8.4, h: 1,
  fill: { color: "FEF9C3" },
  border: { pt: 1, color: colors.primary }
});

slide4.addText("효과: K-패션 포지셔닝 강화 → 국내 브랜드 이미지 상승 → 선순환 구조", {
  x: 1, y: 4.6, w: 8, h: 0.6,
  fontSize: 16, fontFace: "Arial",
  color: colors.black, align: "center"
});

let slide5 = pres.addSlide();
slide5.background = { color: colors.white };

slide5.addText("조직 문화 및 시스템 개혁", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide5.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const issues = [
  {
    title: "의사결정 속도",
    problem: "디테일한 결정 지연",
    solution: "작게 빠르게 실행",
    color: "EF4444"
  },
  {
    title: "교육 시스템",
    problem: "입사자 교육 부재",
    solution: "팀장 교육 프로그램",
    color: "F59E0B"
  },
  {
    title: "무신사 전략",
    problem: "특별 혜택 없음",
    solution: "자사몰 중심 전환",
    color: "10B981"
  },
  {
    title: "VIP 비중",
    problem: "과도한 의존도(80%)",
    solution: "일반 고객 유입",
    color: "8B5CF6"
  }
];

const cellW = 4.3;
const cellH = 1.5;
const cellX = 0.8;
const cellY = 1.6;

issues.forEach((issue, idx) => {
  const x = cellX + (idx % 2) * (cellW + 0.2);
  const y = cellY + Math.floor(idx / 2) * (cellH + 0.2);

  slide5.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: cellW, h: cellH,
    fill: { color: colors.lightGray },
    shadow: makeCardShadow()
  });

  slide5.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: cellW, h: 0.35,
    fill: { color: issue.color }
  });

  slide5.addText(issue.title, {
    x: x, y: y + 0.08, w: cellW, h: 0.19,
    fontSize: 14, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide5.addText([
    { text: "문제: ", options: { bold: true, fontSize: 12, color: "EF4444" } },
    { text: issue.problem, options: { fontSize: 12, color: colors.gray } }
  ], {
    x: x + 0.2, y: y + 0.5, w: cellW - 0.4, h: 0.4
  });

  slide5.addText([
    { text: "해결: ", options: { bold: true, fontSize: 12, color: "10B981" } },
    { text: issue.solution, options: { fontSize: 12, color: colors.gray } }
  ], {
    x: x + 0.2, y: y + 0.95, w: cellW - 0.4, h: 0.4
  });
});

slide5.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.8, w: 8.4, h: 0.6,
  fill: { color: colors.black }
});

slide5.addText("📅 3월까지 시스템 개혁 및 리더십 교육 완료", {
  x: 1, y: 4.95, w: 8, h: 0.3,
  fontSize: 16, fontFace: "Arial", bold: true,
  color: colors.white, align: "center"
});

let slide6 = pres.addSlide();
slide6.background = { color: colors.white };

slide6.addText("핵심 성과지표 (KPI)", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide6.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const metricsData = [
  { metric: "기본물 발주 감소율", value: "30%", change: "-50%", color: "EF4444" },
  { metric: "재고 정리 목표 기간", value: "6월", change: "", color: "F59E0B" },
  { metric: "VIP 매출 비중", value: "80%→감소", change: "추세", color: "10B981" },
  { metric: "무신사 매출", value: "3천만원/월", change: "타겟팅", color: "8B5CF6" }
];

const metricW = 4.3;
const metricH = 1.4;
const metricX = 0.8;
const metricY = 1.4;

metricsData.forEach((m, idx) => {
  const x = metricX + (idx % 2) * (metricW + 0.2);
  const y = metricY + Math.floor(idx / 2) * (metricH + 0.2);

  slide6.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: metricW, h: metricH,
    fill: { color: colors.lightGray },
    shadow: makeCardShadow()
  });

  slide6.addShape(pres.shapes.RECTANGLE, {
    x: x, y: y, w: 0.1, h: metricH,
    fill: { color: m.color }
  });

  slide6.addText(m.metric, {
    x: x + 0.25, y: y + 0.15, w: metricW - 0.35, h: 0.35,
    fontSize: 13, fontFace: "Arial",
    color: colors.gray, align: "left"
  });

  slide6.addText(m.value, {
    x: x + 0.25, y: y + 0.55, w: metricW - 0.35, h: 0.35,
    fontSize: 28, fontFace: "Arial", bold: true,
    color: colors.black, align: "left"
  });

  if (m.change) {
    slide6.addText(m.change, {
      x: x + 0.25, y: y + 0.95, w: metricW - 0.35, h: 0.3,
      fontSize: 14, fontFace: "Arial",
      color: m.change === "-50%" ? "EF4444" : "10B981", align: "left"
    });
  }
});

slide6.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.6, w: 8.4, h: 0.8,
  fill: { color: "FEF3C7" },
  border: { pt: 1, color: "F59E0B" }
});

slide6.addText([
  { text: "⚠️ ", options: { fontSize: 18, color: "F59E0B" } },
  { text: "리오더 대응 속도 개선 필요 - 생산 시스템 개선으로 빠른 대응력 확보", options: { fontSize: 14, color: colors.black, bold: true } }
], {
  x: 1, y: 4.85, w: 8, h: 0.3,
  align: "center"
});

let slide7 = pres.addSlide();
slide7.background = { color: colors.white };

slide7.addText("실행 계획", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide7.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const actions = {
  "3월": [
    "시스템 개혁 및 리더십 교육",
    "팀장 교육 프로그램 도입"
  ],
  "4월": [
    "해외 인플루언서 시딩 대상 수립",
    "온라인 전용 캡슐 컬렉션 기획",
    "옴니 채널 활성화 시스템 개선",
    "지젤 컨텐츠 완판 기사"
  ],
  "5월": [
    "VIP 고객 비중 축소 전략",
    "스팟 상품 생산 계획",
    "리오더 시스템 개선"
  ],
  "6월": [
    "기본물 재고 정리 완료"
  ]
};

const months = Object.keys(actions);
const actionW = 2.2;
const actionH = 2.8;
const actionX = 0.6;

months.forEach((month, idx) => {
  const x = actionX + idx * (actionW + 0.15);

  slide7.addShape(pres.shapes.RECTANGLE, {
    x: x, y: 1.4, w: actionW, h: 0.4,
    fill: { color: colors.black }
  });

  slide7.addText(month, {
    x: x, y: 1.48, w: actionW, h: 0.24,
    fontSize: 16, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide7.addShape(pres.shapes.RECTANGLE, {
    x: x, y: 1.8, w: actionW, h: 2.4,
    fill: { color: colors.lightGray },
    border: { pt: 1, color: "D1D5DB" }
  });

  actions[month].forEach((action, actionIdx) => {
    slide7.addText([
      { text: "• ", options: { fontSize: 12, color: colors.accent } },
      { text: action, options: { fontSize: 11, color: colors.gray } }
    ], {
      x: x + 0.15, y: 1.9 + actionIdx * 0.55, w: actionW - 0.3, h: 0.4,
      align: "left"
    });
  });
});

slide7.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.6, w: 8.4, h: 0.6,
  fill: { color: "DBEAFE" },
  border: { pt: 1, color: colors.accent }
});

slide7.addText("⚡ 우선순위: 1) 재고 정리 → 2) 생산 시스템 개선 → 3) 글로벌 진출 → 4) 조직 문화 개선", {
  x: 1, y: 4.75, w: 8, h: 0.3,
  fontSize: 14, fontFace: "Arial", bold: true,
  color: colors.black, align: "center"
});

let slide8 = pres.addSlide();
slide8.background = { color: colors.black };

slide8.addText("요약 및 다음 단계", {
  x: 0.8, y: 0.6, w: 8.4, h: 0.5,
  fontSize: 36, fontFace: "Arial", bold: true,
  color: colors.white, align: "left"
});

slide8.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.1, w: 2, h: 0.08,
  fill: { color: colors.primary }
});

const takeaways = [
  {
    title: "재고 관리",
    desc: "FW 기점으로 기본물 정리, 채널별 구분으로 치킨게임 방지"
  },
  {
    title: "글로벌 전략",
    desc: "K-트렌드 활용, 해외 시딩 후 국내 재도입으로 선순환"
  },
  {
    title: "시스템 개혁",
    desc: "3월까지 교육 및 프로세스 개선으로 속도 향상"
  }
];

const takeawayW = 2.6;
const takeawayH = 1.8;
const takeawayX = 0.8;
const takeawayY = 1.5;

takeaways.forEach((item, idx) => {
  const x = takeawayX + idx * (takeawayW + 0.2);

  slide8.addShape(pres.shapes.RECTANGLE, {
    x: x, y: takeawayY, w: takeawayW, h: takeawayH,
    fill: { color: "1F2937" },
    shadow: makeCardShadow()
  });

  slide8.addShape(pres.shapes.RECTANGLE, {
    x: x, y: takeawayY, w: takeawayW, h: 0.35,
    fill: { color: colors.accent }
  });

  slide8.addText(item.title, {
    x: x, y: takeawayY + 0.08, w: takeawayW, h: 0.19,
    fontSize: 14, fontFace: "Arial", bold: true,
    color: colors.white, align: "center"
  });

  slide8.addText(item.desc, {
    x: x + 0.15, y: takeawayY + 0.55, w: takeawayW - 0.3, h: 1.1,
    fontSize: 12, fontFace: "Arial",
    color: colors.gray, align: "center"
  });
});

slide8.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.7, w: 8.4, h: 1.4,
  fill: { color: colors.primary }
});

slide8.addText("다음 단계", {
  x: 1, y: 3.9, w: 8, h: 0.3,
  fontSize: 18, fontFace: "Arial", bold: true,
  color: colors.black, align: "left"
});

slide8.addText([
  { text: "1. 담당자별 구체 일정 확정", options: { fontSize: 14, color: colors.black, breakLine: true } },
  { text: "2. 해외 시딩 예산 및 대상 국가 선정", options: { fontSize: 14, color: colors.black, breakLine: true } },
  { text: "3. 생산 시스템 개선 방안 수립", options: { fontSize: 14, color: colors.black, breakLine: true } },
  { text: "4. 무신사 전략 재고 후 자사몰 중심 전환", options: { fontSize: 14, color: colors.black } }
], {
  x: 1, y: 4.25, w: 8, h: 0.7
});

slide8.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 5.3, w: 10, h: 0.325,
  fill: { color: colors.gray }
});

slide8.addText("Wacky Willy Fashion House © 2026 | 와키윌리 패션 하우스", {
  x: 0.8, y: 5.35, w: 8.4, h: 0.2,
  fontSize: 11, fontFace: "Arial",
  color: colors.white, align: "center"
});

pres.writeFile({ fileName: "output/26SS/_season/strategy-summary-presentation.pptx" })
  .then(fileName => {
    console.log(`Presentation created: ${fileName}`);
  })
  .catch(err => {
    console.error(err);
  });
