# Theme System

5가지 테마 모드를 지원한다. `<body>` 에 테마 클래스를 추가하면 CSS 변수가 일괄 오버라이드된다.
`T` 키로 런타임에 테마를 순환 전환할 수 있다.

---

## 테마 목록

| 테마 | body 클래스 | 특징 |
|------|-----------|------|
| **Default** | (없음) | 프리미엄 미니멀 — 인디고/틸 악센트, 화이트 콘텐츠, 다크 커버 |
| **Dark** | `theme-dark` | 전체 다크 — 딥 네이비 배경, 밝은 텍스트 |
| **Light** | `theme-light` | 올 화이트 — 깨끗한 라이트 톤, 미니멀 |
| **Warm** | `theme-warm` | 웜 톤 — 크림 배경, 앰버/테라코타 악센트 |
| **Noir** | `theme-noir` | 하이 콘트라스트 — 순수 블랙&화이트, 레드 포인트 |

---

## CSS 구현

### @font-face 및 :root 아래에 테마별 오버라이드를 추가한다.

```css
/* ═══════════════════════════════════════════
   THEME: DARK
   ═══════════════════════════════════════════ */
body.theme-dark {
  --c-ink: #0d1117;
  --c-ink-light: #161b22;
  --c-slate: #8b949e;
  --c-muted: #6e7681;
  --c-border: #30363d;
  --c-surface: #161b22;
  --c-bg: #0d1117;
  --c-white: #e6edf3;
  --c-accent: #79c0ff;
  --c-accent-soft: rgba(121, 192, 255, 0.1);
  --c-accent-light: rgba(121, 192, 255, 0.15);
  --c-teal: #3fb950;
  --c-teal-soft: rgba(63, 185, 80, 0.1);
  --c-rose: #f85149;
  --c-amber: #d29922;
  --c-emerald: #3fb950;
}

/* 다크 테마에서는 모든 슬라이드가 어두운 배경 */
body.theme-dark .slide--content {
  background: var(--c-bg);
  color: var(--c-white);
}
body.theme-dark .slide--content h2 { color: var(--c-white); }
body.theme-dark .slide--content .lead { color: var(--c-muted); }

body.theme-dark .slide--section {
  background: var(--c-surface);
}
body.theme-dark .slide--section h2 { color: var(--c-white); }
body.theme-dark .slide--section .section-sub { color: var(--c-muted); }

/* 다크 테마 컴포넌트 적응 */
body.theme-dark .stat-card {
  background: rgba(255,255,255,0.04);
  border-left-color: var(--c-accent);
}
body.theme-dark .stat-card .lbl { color: var(--c-muted); }

body.theme-dark .bar-row .bar-label { color: var(--c-muted); }
body.theme-dark .bar-row .bar-track { background: rgba(255,255,255,0.06); }
body.theme-dark .bar-row .bar-value { color: var(--c-slate); }

body.theme-dark .metric-card {
  background: rgba(255,255,255,0.04);
}
body.theme-dark .metric-card .metric-title { color: var(--c-muted); }
body.theme-dark .metric-card .metric-value { color: var(--c-white); }

body.theme-dark .item-list li { color: rgba(255,255,255,0.85); }
body.theme-dark .item-list li::before { background: var(--c-accent); }

body.theme-dark .two-col h3 { color: var(--c-white); }
body.theme-dark .donut-legend-item { color: var(--c-slate); }
body.theme-dark .donut-legend-item .pct { color: var(--c-white); }

body.theme-dark .timeline::before { background: var(--c-border); }
body.theme-dark .tl-item::before { border-color: var(--c-bg); }
body.theme-dark .tl-item .tl-text { color: var(--c-slate); }
body.theme-dark .tl-item .tl-text strong { color: var(--c-white); }


/* ═══════════════════════════════════════════
   THEME: LIGHT
   ═══════════════════════════════════════════ */
body.theme-light {
  --c-ink: #1f2328;
  --c-ink-light: #2c3e50;
  --c-slate: #57606a;
  --c-muted: #8c959f;
  --c-border: #d8dee4;
  --c-surface: #f6f8fa;
  --c-bg: #ffffff;
  --c-white: #ffffff;
  --c-accent: #0969da;
  --c-accent-soft: rgba(9, 105, 218, 0.06);
  --c-accent-light: rgba(9, 105, 218, 0.12);
  --c-teal: #0ea5a0;
  --c-teal-soft: rgba(14, 165, 160, 0.06);
  --c-rose: #cf222e;
  --c-amber: #bf8700;
  --c-emerald: #1a7f37;
}

/* 라이트 테마에서는 커버/엔드도 밝게 */
body.theme-light .slide--cover {
  background: linear-gradient(145deg, var(--c-surface) 0%, #edf2f7 100%);
  color: var(--c-ink);
}
body.theme-light .slide--cover .tag {
  color: var(--c-accent);
  background: var(--c-accent-soft);
}
body.theme-light .slide--cover h1 { color: var(--c-ink); }
body.theme-light .slide--cover .subtitle { color: var(--c-slate); }
body.theme-light .slide--cover .divider { background: var(--c-accent); }

body.theme-light .slide--end {
  background: linear-gradient(145deg, var(--c-surface) 0%, #edf2f7 100%);
  color: var(--c-ink);
}
body.theme-light .slide--end h2 { color: var(--c-ink); }
body.theme-light .slide--end .contact { color: var(--c-slate); }

body.theme-light .slide--dark {
  background: var(--c-surface);
  color: var(--c-ink);
}
body.theme-light .slide--dark h2 { color: var(--c-ink); }
body.theme-light .slide--dark .lead { color: var(--c-muted); }
body.theme-light .slide--dark .stat-card {
  background: var(--c-bg);
  border-left-color: var(--c-teal);
}
body.theme-light .slide--dark .stat-card .num { color: var(--c-teal); }
body.theme-light .slide--dark .stat-card .lbl { color: var(--c-slate); }
body.theme-light .slide--dark .item-list li { color: var(--c-ink); }
body.theme-light .slide--dark .item-list li::before { background: var(--c-teal); }
body.theme-light .slide--dark .bar-row .bar-label { color: var(--c-slate); }
body.theme-light .slide--dark .bar-row .bar-track { background: var(--c-border); }
body.theme-light .slide--dark .bar-row .bar-value { color: var(--c-ink); }
body.theme-light .slide--dark .metric-card { background: var(--c-bg); }
body.theme-light .slide--dark .metric-card .metric-value { color: var(--c-ink); }


/* ═══════════════════════════════════════════
   THEME: WARM
   ═══════════════════════════════════════════ */
body.theme-warm {
  --c-ink: #3d2c1e;
  --c-ink-light: #4a3728;
  --c-slate: #6b5744;
  --c-muted: #9c8b7a;
  --c-border: #e5dcd3;
  --c-surface: #faf6f1;
  --c-bg: #fefcf9;
  --c-white: #fefcf9;
  --c-accent: #c2703a;
  --c-accent-soft: rgba(194, 112, 58, 0.08);
  --c-accent-light: rgba(194, 112, 58, 0.15);
  --c-teal: #5a8a6c;
  --c-teal-soft: rgba(90, 138, 108, 0.08);
  --c-rose: #b5485a;
  --c-amber: #c2963a;
  --c-emerald: #5a8a6c;
}

body.theme-warm .slide--cover {
  background: linear-gradient(145deg, #3d2c1e 0%, #4a3728 100%);
  color: var(--c-white);
}

body.theme-warm .slide--end {
  background: linear-gradient(145deg, #3d2c1e 0%, #4a3728 100%);
  color: var(--c-white);
}

body.theme-warm .slide--dark {
  background: #3d2c1e;
  color: var(--c-white);
}


/* ═══════════════════════════════════════════
   THEME: NOIR
   ═══════════════════════════════════════════ */
body.theme-noir {
  --c-ink: #000000;
  --c-ink-light: #111111;
  --c-slate: #555555;
  --c-muted: #777777;
  --c-border: #333333;
  --c-surface: #f5f5f5;
  --c-bg: #ffffff;
  --c-white: #ffffff;
  --c-accent: #e63946;
  --c-accent-soft: rgba(230, 57, 70, 0.06);
  --c-accent-light: rgba(230, 57, 70, 0.12);
  --c-teal: #000000;
  --c-teal-soft: rgba(0, 0, 0, 0.04);
  --c-rose: #e63946;
  --c-amber: #e63946;
  --c-emerald: #2d6a4f;
}

body.theme-noir .slide--cover {
  background: #000000;
  color: #ffffff;
}

body.theme-noir .slide--cover .divider { background: var(--c-accent); }

body.theme-noir .slide--end {
  background: #000000;
  color: #ffffff;
}

body.theme-noir .slide--dark {
  background: #000000;
  color: #ffffff;
}

body.theme-noir .slide--section {
  background: #f5f5f5;
}

body.theme-noir .stat-card { border-left-color: var(--c-accent); }
body.theme-noir .stat-card .num { color: #000000; }

body.theme-noir .slide--dark .stat-card {
  background: rgba(255,255,255,0.05);
  border-left-color: var(--c-accent);
}
body.theme-noir .slide--dark .stat-card .num { color: var(--c-accent); }
body.theme-noir .slide--dark .stat-card .lbl { color: #999999; }


/* ═══════════════════════════════════════════
   THEME INDICATOR (Toast)
   ═══════════════════════════════════════════ */
.theme-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  font-family: var(--font-en);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-white);
  background: rgba(0,0,0,0.7);
  padding: 0.6em 1.4em;
  border-radius: 8px;
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.theme-toast.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
```

---

## HTML 구조

슬라이드 컨테이너 바깥에 테마 토스트 요소를 추가한다:

```html
<!-- Theme Toast -->
<div class="theme-toast" id="theme-toast"></div>
```

---

## JavaScript — 테마 전환 로직

엔진의 `setupKeyboard()` 맵에 `'t': cycleTheme` 을 추가하고,
아래 함수를 엔진 IIFE 내부에 추가한다:

```javascript
// ── Theme ──
const THEMES = ['', 'theme-dark', 'theme-light', 'theme-warm', 'theme-noir'];
const THEME_LABELS = ['Default', 'Dark', 'Light', 'Warm', 'Noir'];
let currentTheme = 0;

function cycleTheme() {
  // 이전 테마 제거
  if (THEMES[currentTheme]) document.body.classList.remove(THEMES[currentTheme]);
  // 다음 테마
  currentTheme = (currentTheme + 1) % THEMES.length;
  // 새 테마 적용
  if (THEMES[currentTheme]) document.body.classList.add(THEMES[currentTheme]);
  // 토스트 표시
  showThemeToast(THEME_LABELS[currentTheme]);
  // 카운터 색상 업데이트
  updateCounterColor();
}

function showThemeToast(label) {
  const toast = document.getElementById('theme-toast');
  toast.textContent = label;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 1200);
}
```

키보드 힌트에도 `T Theme` 를 추가한다:

```html
<div class="keyboard-hint" id="keyboard-hint">
  ← → Arrow Keys · Space Next · F Fullscreen · O Overview · T Theme
</div>
```

---

## 사용자에게 테마 지정받기

사용자가 요청 시 테마를 명시하면, HTML의 `<body>`에 해당 클래스를 기본으로 설정한다:

| 사용자가 말하면 | body 클래스 |
|---------------|-----------|
| "다크 모드로", "dark theme" | `<body class="theme-dark">` |
| "밝은 톤으로", "light theme" | `<body class="theme-light">` |
| "따뜻한 느낌으로", "warm" | `<body class="theme-warm">` |
| "흑백으로", "모노톤", "noir" | `<body class="theme-noir">` |
| (미지정) | `<body>` (default) |

어떤 테마로 시작하든 `T` 키로 다른 테마로 전환할 수 있다.

---

## updateCounterColor 수정

테마에 따라 카운터 색상 판단이 달라져야 한다. 다크 테마에서는 모든 슬라이드가 다크이므로:

```javascript
function updateCounterColor() {
  const slide = state.slides[state.currentSlide];
  const isBodyDark = document.body.classList.contains('theme-dark') ||
                     document.body.classList.contains('theme-noir');
  const isSlideDark = slide.classList.contains('slide--cover') ||
                      slide.classList.contains('slide--dark') ||
                      slide.classList.contains('slide--end');

  // 라이트 테마에서는 모든 슬라이드가 밝음
  const isLight = document.body.classList.contains('theme-light');

  const isDark = isLight ? false : (isBodyDark || isSlideDark);

  const counter = document.querySelector('.slide-counter');
  const hint = document.getElementById('keyboard-hint');
  counter.style.color = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
  hint.style.color = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
}
```
