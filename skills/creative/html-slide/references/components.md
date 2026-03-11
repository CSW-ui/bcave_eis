# HTML Slide Components

슬라이드 내부에 사용하는 7가지 컴포넌트의 CSS와 HTML 구조.

---

## 1. Stat Cards — 3열 핵심 지표

```html
<div class="stats-row">
  <div class="stat-card fragment" data-fragment="0">
    <div class="num">50%</div>
    <div class="lbl">히트상품 매출 기여</div>
  </div>
  <div class="stat-card fragment" data-fragment="1">
    <div class="num">30%</div>
    <div class="lbl">QR 매출 비중</div>
  </div>
  <div class="stat-card fragment" data-fragment="2">
    <div class="num">NO.1</div>
    <div class="lbl">K-Lifestyle 2029</div>
  </div>
</div>
```

```css
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--gap);
}

.stat-card {
  background: var(--c-surface);
  border-radius: 10px;
  padding: 1.2rem 1rem;
  text-align: center;
  border-left: 3px solid var(--c-accent);
}

.stat-card .num {
  font-family: var(--font-en);
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 700;
  color: var(--c-accent);
  line-height: 1;
}

.stat-card .lbl {
  font-size: var(--fs-tiny);
  color: var(--c-slate);
  margin-top: 0.35rem;
  line-height: 1.35;
}

/* Dark slide variant */
.slide--dark .stat-card {
  background: rgba(255,255,255,0.05);
  border-left-color: var(--c-teal);
}
.slide--dark .stat-card .num { color: var(--c-teal); }
.slide--dark .stat-card .lbl { color: var(--c-muted); }
```

---

## 2. Bar Chart — CSS-only 수평 바

```html
<div class="bar-chart">
  <div class="bar-row fragment" data-fragment="0">
    <span class="bar-label">자사몰</span>
    <div class="bar-track">
      <div class="bar-fill" style="width:72%; background:var(--chart-1);"></div>
    </div>
    <span class="bar-value">36%</span>
  </div>
  <!-- 더 많은 bar-row ... -->
</div>
```

`bar-fill`의 `width`는 최대값 대비 비율로 계산한다.
예: 최대 36%일 때 → 36%=72%(width), 26%=52%, 15%=30% 등.
`background`에 `--chart-1` ~ `--chart-6` 순환 사용.

```css
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 90px 1fr 42px;
  align-items: center;
  gap: 0.6rem;
  font-size: var(--fs-small);
}

.bar-row .bar-label {
  text-align: right;
  color: var(--c-slate);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-row .bar-track {
  height: 22px;
  background: var(--c-surface);
  border-radius: 4px;
  overflow: hidden;
}

.bar-row .bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s var(--t-ease);
}

.bar-row .bar-value {
  font-family: var(--font-en);
  font-weight: 600;
  font-size: var(--fs-tiny);
  color: var(--c-ink);
}

/* Dark variant */
.slide--dark .bar-row .bar-label { color: var(--c-muted); }
.slide--dark .bar-row .bar-track { background: rgba(255,255,255,0.06); }
.slide--dark .bar-row .bar-value { color: rgba(255,255,255,0.7); }
```

---

## 3. Donut Chart — SVG

```html
<div class="donut-chart fragment" data-fragment="0">
  <svg viewBox="0 0 200 200">
    <!-- Background -->
    <circle cx="100" cy="100" r="70" stroke="rgba(255,255,255,0.06)" fill="none" stroke-width="24" />
    <!-- Segments: circumference = 2 * PI * 70 ≈ 440 -->
    <!-- stroke-dasharray = 440 * percentage, 440 - (440 * percentage) -->
    <!-- stroke-dashoffset = -(누적 길이) -->
    <circle cx="100" cy="100" r="70" stroke="var(--chart-1)"
      fill="none" stroke-width="24" stroke-linecap="round"
      stroke-dasharray="154 286" stroke-dashoffset="0"
      transform="rotate(-90 100 100)" />
    <circle cx="100" cy="100" r="70" stroke="var(--chart-2)"
      fill="none" stroke-width="24" stroke-linecap="round"
      stroke-dasharray="110 330" stroke-dashoffset="-154"
      transform="rotate(-90 100 100)" />
    <!-- Center text -->
    <text x="100" y="95" text-anchor="middle" fill="white"
      font-family="Inter" font-size="22" font-weight="700">26SS</text>
    <text x="100" y="115" text-anchor="middle" fill="rgba(255,255,255,0.4)"
      font-family="Noto Sans KR" font-size="10">카테고리 비중</text>
  </svg>
  <div class="donut-legend">
    <div class="donut-legend-item">
      <span class="dot" style="background: var(--chart-1)"></span>
      <span>유니 의류</span>
      <span class="pct">35%</span>
    </div>
    <!-- 더 많은 legend items -->
  </div>
</div>
```

도넛 세그먼트 계산법:
- 원 둘레 = `2 * PI * r` = `2 * 3.14159 * 70` ≈ `440`
- 각 세그먼트: `stroke-dasharray = "세그먼트길이 나머지"` (세그먼트길이 = 440 * 비율)
- `stroke-dashoffset`: 이전 세그먼트들의 누적 길이에 마이너스 부호

```css
.donut-chart {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.donut-chart svg { width: 130px; height: 130px; flex-shrink: 0; }

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.donut-legend-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: var(--fs-small);
  color: var(--c-slate);
}

.donut-legend-item .dot {
  width: 8px; height: 8px;
  border-radius: 50%; flex-shrink: 0;
}

.donut-legend-item .pct {
  font-family: var(--font-en);
  font-weight: 600;
  margin-left: auto;
  color: var(--c-ink);
}
```

---

## 4. Timeline — 로드맵/일정

```html
<div class="timeline">
  <div class="tl-item fragment" data-fragment="0">
    <span class="tl-date">MAR</span>
    <span class="tl-text"><strong>시즌 기획</strong> — 트렌드 리서치, 라인시트</span>
  </div>
  <div class="tl-item fragment" data-fragment="1">
    <span class="tl-date">APR</span>
    <span class="tl-text"><strong>디자인</strong> — 무드보드, 샘플링</span>
  </div>
  <!-- 더 많은 tl-item ... -->
</div>
```

```css
.timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 1.2rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 3px; top: 6px; bottom: 6px;
  width: 1.5px;
  background: var(--c-border);
}

.tl-item {
  display: flex;
  gap: 0.8rem;
  padding: 0.5rem 0;
  position: relative;
}

.tl-item::before {
  content: '';
  position: absolute;
  left: -1.2rem; top: 0.7rem;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--c-accent);
  border: 2px solid var(--c-bg);
  z-index: 1;
}

.tl-item .tl-date {
  font-family: var(--font-en);
  font-size: var(--fs-tiny);
  font-weight: 600;
  color: var(--c-accent);
  min-width: 56px; flex-shrink: 0;
}

.tl-item .tl-text {
  font-size: var(--fs-small);
  color: var(--c-slate);
  line-height: 1.45;
}

.tl-item .tl-text strong {
  color: var(--c-ink);
  font-weight: 700;
}
```

---

## 5. Metric Cards — 2열 지표 (증감 표시)

```html
<div class="metric-row">
  <div class="metric-card">
    <div class="metric-title">코어타겟 매출 비중</div>
    <div class="metric-value">62%</div>
    <div class="metric-delta up">+8% vs 25FW</div>
  </div>
  <div class="metric-card">
    <div class="metric-title">캠페인 ROAS</div>
    <div class="metric-value">4.2x</div>
    <div class="metric-delta up">+1.1x vs 25FW</div>
  </div>
</div>
```

`.metric-delta.up` = 녹색(--c-emerald), `.metric-delta.down` = 빨강(--c-rose).

```css
.metric-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}

.metric-card {
  background: var(--c-surface);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  display: flex; flex-direction: column;
  gap: 0.3rem;
}

.metric-card .metric-title {
  font-size: var(--fs-tiny);
  color: var(--c-muted);
}

.metric-card .metric-value {
  font-family: var(--font-en);
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  font-weight: 700;
  color: var(--c-ink);
}

.metric-card .metric-delta {
  font-family: var(--font-en);
  font-size: var(--fs-tiny);
  font-weight: 600;
}

.metric-delta.up { color: var(--c-emerald); }
.metric-delta.down { color: var(--c-rose); }

/* Dark variant */
.slide--dark .metric-card { background: rgba(255,255,255,0.05); }
.slide--dark .metric-card .metric-title { color: var(--c-muted); }
.slide--dark .metric-card .metric-value { color: var(--c-white); }
```

---

## 6. Two Column — 비교 레이아웃

```html
<div class="two-col">
  <div>
    <span class="col-tag col-tag--a">LABEL A</span>
    <h3>제목 A</h3>
    <ul class="item-list">
      <li class="fragment" data-fragment="0">항목 1</li>
      <li class="fragment" data-fragment="1">항목 2</li>
    </ul>
  </div>
  <div>
    <span class="col-tag col-tag--b">LABEL B</span>
    <h3>제목 B</h3>
    <ul class="item-list">
      <li class="fragment" data-fragment="2">항목 3</li>
      <li class="fragment" data-fragment="3">항목 4</li>
    </ul>
  </div>
</div>
```

```css
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.two-col h3 {
  font-size: var(--fs-h2);
  font-weight: 700;
  margin-bottom: 0.6rem;
}

.two-col .col-tag {
  display: inline-block;
  font-family: var(--font-en);
  font-size: var(--fs-tiny);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2em 0.55em;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.two-col .col-tag--a { background: var(--c-accent-soft); color: var(--c-accent); }
.two-col .col-tag--b { background: var(--c-teal-soft); color: var(--c-teal); }
```

(`--c-teal-soft: rgba(14, 165, 160, 0.08)` 를 Design Tokens에 선언)

---

## 7. Item List — 불릿 리스트

```html
<ul class="item-list">
  <li class="fragment" data-fragment="0"><strong>핵심 포인트</strong> — 설명 텍스트</li>
  <li class="fragment" data-fragment="1">일반 항목</li>
</ul>
```

```css
.item-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.item-list li {
  font-size: var(--fs-body);
  line-height: 1.55;
  padding-left: 1.1rem;
  position: relative;
  color: var(--c-ink);
}

.item-list li::before {
  content: '';
  position: absolute;
  left: 0; top: 0.55em;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--c-accent);
}

/* Dark variant */
.slide--dark .item-list li { color: rgba(255,255,255,0.85); }
.slide--dark .item-list li::before { background: var(--c-teal); }
```
