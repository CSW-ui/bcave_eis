const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Wacky Willy";
pres.title = "Wacky Willy Weekly Sales Report";

const C = {
  black: "111111",
  white: "FFFFFF",
  yellow: "FEF200",
  blue: "68A8DB",
  gray900: "1F2937",
  gray700: "374151",
  gray500: "6B7280",
  gray200: "E5E7EB",
  gray100: "F3F4F6",
  green: "10B981",
  red: "EF4444",
  amber: "F59E0B"
};

const shadow = () => ({ type: "outer", color: "000000", blur: 6, offset: 2, opacity: 0.12 });

const titleBlock = (slide, title, subtitle) => {
  slide.addText(title, {
    x: 0.7,
    y: 0.45,
    w: 8.6,
    h: 0.45,
    fontFace: "Arial",
    fontSize: 30,
    bold: true,
    color: C.black
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.7,
    y: 0.95,
    w: 1.5,
    h: 0.06,
    fill: { color: C.yellow },
    line: { color: C.yellow, pt: 0 }
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.7,
      y: 1.1,
      w: 8.9,
      h: 0.25,
      fontFace: "Arial",
      fontSize: 12,
      color: C.gray500
    });
  }
};

const metricCard = (slide, x, y, w, h, label, value, note, noteColor) => {
  slide.addShape(pres.shapes.RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: C.white },
    line: { color: C.gray200, pt: 1 },
    shadow: shadow()
  });
  slide.addText(label, {
    x: x + 0.2,
    y: y + 0.14,
    w: w - 0.4,
    h: 0.2,
    fontFace: "Arial",
    fontSize: 11,
    color: C.gray500
  });
  slide.addText(value, {
    x: x + 0.2,
    y: y + 0.42,
    w: w - 0.4,
    h: 0.35,
    fontFace: "Arial",
    fontSize: 24,
    bold: true,
    color: C.black
  });
  if (note) {
    slide.addText(note, {
      x: x + 0.2,
      y: y + h - 0.28,
      w: w - 0.4,
      h: 0.18,
      fontFace: "Arial",
      fontSize: 11,
      color: noteColor || C.gray500
    });
  }
};

const cover = pres.addSlide();
cover.background = { color: C.black };
cover.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.14,
  fill: { color: C.yellow },
  line: { color: C.yellow, pt: 0 }
});
cover.addText("Wacky Willy Weekly Sales Report", {
  x: 0.75,
  y: 1.2,
  w: 8.9,
  h: 0.7,
  fontFace: "Arial",
  fontSize: 38,
  bold: true,
  color: C.white
});
cover.addText("2026-03-05 | 2026년 2월 4주차", {
  x: 0.75,
  y: 2.0,
  w: 8.5,
  h: 0.28,
  fontFace: "Arial",
  fontSize: 14,
  color: "A3A3A3"
});
metricCard(cover, 0.75, 3.0, 2.8, 1.7, "전체 영업", "195억", "목표 207억 대비 94%", C.amber);
metricCard(cover, 3.65, 3.0, 2.8, 1.7, "와키윌리", "43억", "목표 45억 대비 95%", C.amber);
metricCard(cover, 6.55, 3.0, 2.7, 1.7, "전년비", "-4%", "할인율 누계 32.4%", C.red);

const s2 = pres.addSlide();
s2.background = { color: C.gray100 };
titleBlock(s2, "Executive Snapshot", "매출, 달성률, 성장률 핵심 지표");
metricCard(s2, 0.7, 1.55, 2.8, 1.55, "국내 영업", "195억", "YoY +1%", C.green);
metricCard(s2, 3.6, 1.55, 2.8, 1.55, "와키윌리", "43억", "YoY -4%", C.red);
metricCard(s2, 6.5, 1.55, 2.8, 1.55, "주간 실적", "11억", "WoW -14%", C.red);
metricCard(s2, 0.7, 3.25, 4.25, 1.75, "무신사 2월 마감", "3.5억", "목표 대비 110% | YoY +19%", C.green);
metricCard(s2, 5.05, 3.25, 4.25, 1.75, "아울렛 2월 마감", "10.38억", "목표 대비 115% | YoY +24%", C.green);

const s3 = pres.addSlide();
s3.background = { color: C.white };
titleBlock(s3, "Own Mall KPI", "볼륨 하락, 객단가 상승, 전환율 둔화");
s3.addTable(
  [
    [
      { text: "KPI", options: { bold: true, color: C.white, fill: { color: C.gray900 } } },
      { text: "금주", options: { bold: true, color: C.white, fill: { color: C.gray900 } } },
      { text: "전주", options: { bold: true, color: C.white, fill: { color: C.gray900 } } },
      { text: "증감", options: { bold: true, color: C.white, fill: { color: C.gray900 } } }
    ],
    ["구매자 수", "457", "658", "-30.5%"],
    ["구매 건수", "469", "676", "-30.6%"],
    ["구매 수량", "625", "1,005", "-37.8%"],
    ["AOV", "79,697원", "71,437원", "+11.6%"],
    ["ASP", "59,805원", "48,051원", "+24.5%"],
    ["CVR", "0.9%", "1.0%", "-13.5%"]
  ],
  {
    x: 0.7,
    y: 1.55,
    w: 5.6,
    h: 3.6,
    colW: [1.4, 1.4, 1.4, 1.4],
    border: { color: C.gray200, pt: 1 },
    fontFace: "Arial",
    fontSize: 11,
    color: C.gray700
  }
);
s3.addShape(pres.shapes.RECTANGLE, {
  x: 6.55,
  y: 1.55,
  w: 2.75,
  h: 1.7,
  fill: { color: C.gray100 },
  line: { color: C.gray200, pt: 1 }
});
s3.addText("2월 자사몰 마감", { x: 6.75, y: 1.72, w: 2.3, h: 0.2, fontSize: 11, color: C.gray500, fontFace: "Arial" });
s3.addText("1.73억", { x: 6.75, y: 1.98, w: 2.2, h: 0.35, fontSize: 28, bold: true, color: C.black, fontFace: "Arial" });
s3.addText("목표 2.75억 대비 63%", { x: 6.75, y: 2.36, w: 2.3, h: 0.18, fontSize: 11, color: C.red, fontFace: "Arial" });
s3.addShape(pres.shapes.RECTANGLE, {
  x: 6.55,
  y: 3.45,
  w: 2.75,
  h: 1.7,
  fill: { color: C.gray100 },
  line: { color: C.gray200, pt: 1 }
});
s3.addText("핵심 관찰", { x: 6.75, y: 3.62, w: 2.2, h: 0.2, fontSize: 11, color: C.gray500, fontFace: "Arial" });
s3.addText("볼륨 하락 지속", { x: 6.75, y: 3.9, w: 2.2, h: 0.2, fontSize: 14, bold: true, color: C.black, fontFace: "Arial" });
s3.addText("저할인으로 객단가 상승", { x: 6.75, y: 4.14, w: 2.2, h: 0.18, fontSize: 11, color: C.green, fontFace: "Arial" });
s3.addText("BP04 이후 히트 부재", { x: 6.75, y: 4.38, w: 2.2, h: 0.18, fontSize: 11, color: C.red, fontFace: "Arial" });

const s4 = pres.addSlide();
s4.background = { color: C.gray100 };
titleBlock(s4, "Channel Performance", "무신사/29CM/오프라인 성과 비교");
s4.addTable(
  [
    [
      { text: "채널", options: { bold: true, color: C.white, fill: { color: C.gray900 } } },
      { text: "2월 실적", options: { bold: true, color: C.white, fill: { color: C.gray900 } } },
      { text: "달성률", options: { bold: true, color: C.white, fill: { color: C.gray900 } } },
      { text: "전년비", options: { bold: true, color: C.white, fill: { color: C.gray900 } } }
    ],
    ["무신사", "3.5억", "110%", "+19%"],
    ["29CM", "0.4억", "66%", "+123%"],
    ["백화점", "12.56억", "90%", "-15%"],
    ["아울렛", "10.38억", "115%", "+24%"]
  ],
  {
    x: 0.7,
    y: 1.55,
    w: 4.8,
    h: 2.45,
    colW: [1.2, 1.2, 1.2, 1.2],
    border: { color: C.gray200, pt: 1 },
    fontFace: "Arial",
    fontSize: 11,
    color: C.gray700
  }
);
metricCard(s4, 5.7, 1.55, 3.6, 1.18, "무신사 하이라이트", "설 빅세일 128% 달성", "2/9~2/25 누적 2.7억", C.green);
metricCard(s4, 5.7, 2.88, 3.6, 1.18, "29CM 이슈", "목표 66%", "신상 볼륨 및 노출 구좌 부족", C.red);
metricCard(s4, 0.7, 4.2, 4.35, 0.95, "오프라인 인사이트", "아울렛이 방어, 백화점이 부담", "행사형 매출 의존도 상승", C.amber);
metricCard(s4, 5.0, 4.2, 4.3, 0.95, "액션 포인트", "채널별 역할 재정의", "무신사 이벤트 + 자사몰 신상품 강화", C.blue);

const s5 = pres.addSlide();
s5.background = { color: C.white };
titleBlock(s5, "Key Issues and Actions", "즉시 대응안 + 3월 실행 캘린더");
s5.addShape(pres.shapes.RECTANGLE, {
  x: 0.7,
  y: 1.55,
  w: 4.35,
  h: 3.55,
  fill: { color: C.gray100 },
  line: { color: C.gray200, pt: 1 }
});
s5.addText("핵심 이슈", { x: 0.95, y: 1.75, w: 3.9, h: 0.22, fontFace: "Arial", fontSize: 14, bold: true, color: C.black });
s5.addText("1) 매출 둔화: WoW -2%", { x: 0.95, y: 2.1, w: 3.9, h: 0.18, fontFace: "Arial", fontSize: 11, color: C.red });
s5.addText("2) 할인율 상승: 누계 32.4%", { x: 0.95, y: 2.4, w: 3.9, h: 0.18, fontFace: "Arial", fontSize: 11, color: C.red });
s5.addText("3) 히트상품 공백: BP04 이후 부재", { x: 0.95, y: 2.7, w: 3.9, h: 0.18, fontFace: "Arial", fontSize: 11, color: C.red });
s5.addText("4) CRM 미집행 구간 존재", { x: 0.95, y: 3.0, w: 3.9, h: 0.18, fontFace: "Arial", fontSize: 11, color: C.red });
s5.addText("즉시 대응", { x: 0.95, y: 3.42, w: 3.9, h: 0.2, fontFace: "Arial", fontSize: 13, bold: true, color: C.black });
s5.addText("- 26SS 신상품 푸시 강화", { x: 0.95, y: 3.72, w: 3.9, h: 0.16, fontFace: "Arial", fontSize: 11, color: C.green });
s5.addText("- CRM 알림톡/LMS 세분화 집행", { x: 0.95, y: 3.98, w: 3.9, h: 0.16, fontFace: "Arial", fontSize: 11, color: C.green });
s5.addText("- 무신사 패션위크/브랜드데이 집중", { x: 0.95, y: 4.24, w: 3.9, h: 0.16, fontFace: "Arial", fontSize: 11, color: C.green });

s5.addShape(pres.shapes.RECTANGLE, {
  x: 5.25,
  y: 1.55,
  w: 4.05,
  h: 3.55,
  fill: { color: C.gray100 },
  line: { color: C.gray200, pt: 1 }
});
s5.addText("3월 실행 캘린더", { x: 5.45, y: 1.75, w: 3.7, h: 0.22, fontFace: "Arial", fontSize: 14, bold: true, color: C.black });
s5.addText("2/27~3/8  신학기 필수템", { x: 5.45, y: 2.1, w: 3.7, h: 0.16, fontSize: 11, color: C.gray700, fontFace: "Arial" });
s5.addText("3/4~3/14  무신사 패션위크", { x: 5.45, y: 2.4, w: 3.7, h: 0.16, fontSize: 11, color: C.gray700, fontFace: "Arial" });
s5.addText("3/9~3/22  봄 룩북/신상 캠페인", { x: 5.45, y: 2.7, w: 3.7, h: 0.16, fontSize: 11, color: C.gray700, fontFace: "Arial" });
s5.addText("3/19~3/22 브랜드위크", { x: 5.45, y: 3.0, w: 3.7, h: 0.16, fontSize: 11, color: C.gray700, fontFace: "Arial" });
s5.addShape(pres.shapes.RECTANGLE, {
  x: 5.45,
  y: 3.45,
  w: 3.65,
  h: 1.2,
  fill: { color: C.white },
  line: { color: C.gray200, pt: 1 }
});
s5.addText("대표님 의사결정 포인트", { x: 5.62, y: 3.6, w: 3.3, h: 0.16, fontFace: "Arial", fontSize: 11, bold: true, color: C.black });
s5.addText("- 할인율 가이드 상한 합의", { x: 5.62, y: 3.86, w: 3.3, h: 0.14, fontFace: "Arial", fontSize: 10, color: C.gray700 });
s5.addText("- 26SS 히어로 SKU 집중 투자", { x: 5.62, y: 4.08, w: 3.3, h: 0.14, fontFace: "Arial", fontSize: 10, color: C.gray700 });
s5.addText("- CRM 예산/빈도 승인", { x: 5.62, y: 4.3, w: 3.3, h: 0.14, fontFace: "Arial", fontSize: 10, color: C.gray700 });

const s6 = pres.addSlide();
s6.background = { color: C.black };
s6.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: 10,
  h: 0.14,
  fill: { color: C.yellow },
  line: { color: C.yellow, pt: 0 }
});
s6.addText("Conclusion", {
  x: 0.75,
  y: 0.95,
  w: 8.6,
  h: 0.45,
  fontFace: "Arial",
  fontSize: 30,
  bold: true,
  color: C.white
});
s6.addText("2월은 채널별 성과 편차가 컸고, 3월은 신상품/CRM/할인율 통제가 핵심입니다.", {
  x: 0.75,
  y: 1.55,
  w: 8.9,
  h: 0.24,
  fontFace: "Arial",
  fontSize: 12,
  color: "CFCFCF"
});
metricCard(s6, 0.75, 2.2, 2.8, 1.55, "우선순위 1", "신상품 볼륨", "26SS 히어로 SKU 강화", C.blue);
metricCard(s6, 3.65, 2.2, 2.8, 1.55, "우선순위 2", "CRM 실행", "알림톡/LMS 정교화", C.blue);
metricCard(s6, 6.55, 2.2, 2.7, 1.55, "우선순위 3", "할인율 통제", "누계 32.4% 관리", C.amber);
s6.addShape(pres.shapes.RECTANGLE, {
  x: 0.75,
  y: 4.05,
  w: 8.5,
  h: 1.15,
  fill: { color: "1F2937" },
  line: { color: "2A3340", pt: 1 }
});
s6.addText("Next Week KPI Target", { x: 1.0, y: 4.28, w: 2.8, h: 0.2, fontSize: 12, bold: true, color: C.white, fontFace: "Arial" });
s6.addText("- Own Mall CVR 1.0% 회복", { x: 1.0, y: 4.56, w: 2.8, h: 0.16, fontSize: 10, color: "D1D5DB", fontFace: "Arial" });
s6.addText("- 쿠폰 사용률 10% 달성", { x: 1.0, y: 4.78, w: 2.8, h: 0.16, fontSize: 10, color: "D1D5DB", fontFace: "Arial" });
s6.addText("- 무신사 이벤트 매출 효율 개선", { x: 4.0, y: 4.56, w: 2.8, h: 0.16, fontSize: 10, color: "D1D5DB", fontFace: "Arial" });
s6.addText("- 오프라인 행사 ROI 추적 강화", { x: 4.0, y: 4.78, w: 2.8, h: 0.16, fontSize: 10, color: "D1D5DB", fontFace: "Arial" });

pres
  .writeFile({ fileName: "output/weekly review/weekly-sales-report-2026.03.05.pptx" })
  .then((f) => {
    console.log(`Presentation created: ${f}`);
  })
  .catch((e) => {
    console.error(e);
  });
