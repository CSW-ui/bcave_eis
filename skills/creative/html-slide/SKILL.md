---
name: html-slide
description: >
  순수 HTML/CSS/JS 단일 파일로 웹 슬라이드 프레젠테이션을 생성합니다.
  프레젠테이션, 슬라이드, 발표 자료, HTML 슬라이드, 웹 프레젠테이션, 발표용 HTML,
  slide deck, presentation 등의 키워드가 포함된 요청 시 이 스킬을 사용하세요.
  PPTX가 아닌 HTML 기반 발표 자료가 필요하거나, 브라우저에서 바로 발표할 수 있는
  인터랙티브 슬라이드를 만들고 싶을 때 적합합니다.
  외부 라이브러리 없이 단일 HTML 파일로 완결되며, 방향키 내비게이션, 풀스크린,
  프래그먼트(순차 공개), 데이터 시각화, PDF 인쇄를 모두 지원합니다.
---

# HTML Slide Presentation Generator

순수 HTML, CSS, JavaScript만으로 단일 파일 웹 슬라이드 프레젠테이션을 생성하는 스킬.
외부 CDN이나 프레임워크 의존성 없이 브라우저에서 바로 발표 가능한 HTML 파일을 만든다.

## 아키텍처 원칙

이 스킬은 **reveal.js 경량 패턴(JS 클래스 토글)**을 따른다.

1. **단일 파일** — HTML + `<style>` + `<script>` 인라인. 외부 의존성 0.
2. **Fixed + Absolute 엔진** — 슬라이드를 `position: absolute; inset: 0`으로 겹치고, `.active` 클래스로 전환.
3. **CSS Design Tokens** — `:root`에 색상·폰트·간격·전환 속도를 Custom Properties로 선언.
4. **프래그먼트 시스템** — `.fragment` + `data-fragment="N"` → `.visible` 클래스로 순차 공개.
5. **반응형 타이포** — `clamp(min, preferred, max)`로 뷰포트 크기에 따라 유동 스케일.

## 생성 절차

### 1단계: 사용자 의도 파악

슬라이드를 만들기 전에 다음을 파악한다:
- **주제와 목적** — 무엇을 발표하는가? (보고, 제안, 교육, 런칭 등)
- **슬라이드 수** — 미지정 시 8~12장이 적절
- **색상 테마** — 브랜드 컬러가 있으면 적용, 없으면 프리미엄 미니멀 팔레트 사용
- **데이터 시각화** — 차트, 통계, 타임라인 등이 필요한지
- **언어** — 한국어/영어에 따라 폰트 스택 결정

### 2단계: HTML 파일 구조 생성

아래 순서로 단일 HTML 파일을 구성한다.

```
<!DOCTYPE html>
<html lang="ko">  ← 언어에 맞게
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>프레젠테이션 제목</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
  /* Pretendard 로컬 폰트 — @font-face를 <style> 최상단에 선언 */
  @font-face {
    font-family: "Pretendard";
    src: local("Pretendard Variable"), local("Pretendard"), local("PretendardVariable");
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }
  /* 이하 CSS 전체 */
  </style>
</head>
<body>
  <div class="slides-container">
    <section class="slide slide--cover active" data-slide="1">...</section>
    <section class="slide slide--content" data-slide="2">...</section>
    ...
  </div>
  <div class="progress-bar"><div class="progress-fill"></div></div>
  <div class="slide-counter">...</div>
  <div class="keyboard-hint">...</div>
  <script>/* JS 전체 */</script>
</body>
</html>
```

### 3단계: CSS 작성

CSS는 6개 섹션으로 구성한다. 각 섹션의 역할과 핵심 패턴:

#### A. Design Tokens

```css
:root {
  /* 색상 — 프리미엄 미니멀 기본값. 브랜드 컬러가 있으면 대체 */
  --c-ink: #1a1a2e;          /* 메인 텍스트, 다크 배경 */
  --c-ink-light: #2d2d44;
  --c-slate: #4a4a68;
  --c-muted: #8888a4;
  --c-border: #e2e2ee;
  --c-surface: #f5f5fa;      /* 카드/섹션 배경 */
  --c-bg: #ffffff;
  --c-white: #ffffff;

  /* 악센트 — 1~2개 포인트 컬러 */
  --c-accent: #5b5fc7;
  --c-accent-soft: rgba(91, 95, 199, 0.08);
  --c-teal: #0ea5a0;
  --c-rose: #e05278;
  --c-amber: #e09839;
  --c-emerald: #22a06b;

  /* 차트 컬러 — 6색 순환 */
  --chart-1: var(--c-accent);
  --chart-2: var(--c-teal);
  --chart-3: var(--c-rose);
  --chart-4: var(--c-amber);
  --chart-5: var(--c-emerald);
  --chart-6: #8b5cf6;

  /* 타이포 — Pretendard 로컬 우선, 시스템 fallback */
  --font-body: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  --font-heading: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  --font-en: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --fs-display: clamp(2rem, 4.5vw, 3.2rem);
  --fs-h1: clamp(1.6rem, 3vw, 2.2rem);
  --fs-h2: clamp(1.1rem, 2vw, 1.5rem);
  --fs-body: clamp(0.85rem, 1.2vw, 1.05rem);
  --fs-small: clamp(0.7rem, 0.9vw, 0.8rem);
  --fs-tiny: clamp(0.6rem, 0.75vw, 0.7rem);

  /* 레이아웃 */
  --content-max: 680px;
  --slide-px: clamp(2rem, 5vw, 4rem);
  --slide-py: clamp(2rem, 4vh, 3rem);
  --gap: 1.25rem;

  /* 전환 */
  --t-speed: 0.45s;
  --t-ease: cubic-bezier(0.4, 0, 0.15, 1);
}
```

영어 전용이면 `--font-body: 'Inter', sans-serif`로 변경하고 `@font-face` Pretendard 선언 제거.

#### B. Reset + Slide Engine

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; }
body {
  font-family: var(--font-body);
  color: var(--c-ink);
  background: var(--c-ink);
  -webkit-font-smoothing: antialiased;
}

.slides-container { position: fixed; inset: 0; }

section.slide {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  padding: var(--slide-py) var(--slide-px);
  opacity: 0; visibility: hidden;
  transform: translateY(24px);
  transition: opacity var(--t-speed) var(--t-ease),
              transform var(--t-speed) var(--t-ease);
  z-index: 0; overflow: hidden;
}

section.slide.active {
  opacity: 1; visibility: visible;
  transform: translateY(0); z-index: 2;
}

section.slide.prev {
  opacity: 0; visibility: hidden;
  transform: translateY(-24px); z-index: 1;
}

.content { width: 100%; max-width: var(--content-max); }
```

#### C. Slide Variants

5가지 슬라이드 유형. 용도에 맞게 선택:

| 클래스 | 배경 | 용도 |
|--------|------|------|
| `slide--cover` | 다크 그라디언트 | 표지 (첫 장) |
| `slide--section` | `--c-surface` | 섹션 구분 (챕터 시작) |
| `slide--content` | 흰색 | 일반 콘텐츠 |
| `slide--dark` | `--c-ink` | 강조 콘텐츠 (다크 모드) |
| `slide--end` | 다크 그라디언트 | 마지막 장 (Thank You) |

각 variant의 CSS는 `references/slide-variants.md` 참조.

#### D. Components

슬라이드 안에 사용할 수 있는 7가지 컴포넌트:

| 컴포넌트 | 클래스 | 용도 |
|----------|--------|------|
| **Stat Cards** | `.stats-row > .stat-card` | 3열 핵심 지표 |
| **Bar Chart** | `.bar-chart > .bar-row` | CSS-only 수평 바 차트 |
| **Donut Chart** | `.donut-chart` + SVG | SVG 도넛 차트 + 범례 |
| **Timeline** | `.timeline > .tl-item` | 로드맵/일정 타임라인 |
| **Metric Cards** | `.metric-row > .metric-card` | 2열 메트릭 (증감 표시) |
| **Two Column** | `.two-col` | 2열 비교 레이아웃 |
| **Item List** | `.item-list` | 불릿 리스트 |

각 컴포넌트의 CSS와 HTML 구조는 `references/components.md` 참조.

#### E. UI 요소

```css
/* Fragment — 순차 공개 */
.fragment { opacity: 0; transform: translateY(14px); transition: opacity 0.4s ease, transform 0.4s ease; }
.fragment.visible { opacity: 1; transform: translateY(0); }

/* Progress Bar — 상단 2px */
.progress-bar { position: fixed; top: 0; left: 0; width: 100%; height: 2px; z-index: 100; }
.progress-fill { height: 100%; background: var(--c-accent); transition: width 0.3s ease; }

/* Slide Counter — 우하단 */
.slide-counter {
  position: fixed; bottom: 16px; right: 24px;
  font-family: var(--font-en); font-size: 0.65rem;
  font-weight: 600; z-index: 100; pointer-events: none;
  font-variant-numeric: tabular-nums;
}

/* Keyboard Hint — 하단 중앙, 첫 입력 시 페이드아웃 */
.keyboard-hint {
  position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
  font-family: var(--font-en); font-size: 0.6rem;
  z-index: 100; pointer-events: none;
  transition: opacity 2s ease;
}
.keyboard-hint.hidden { opacity: 0; }
```

카운터 색상은 JS에서 슬라이드 배경(다크/라이트)에 따라 동적으로 변경한다.

#### F. Theme System

5가지 테마를 지원한다. `<body>` 클래스로 전환하며, `T` 키로 런타임에 순환 전환할 수 있다.

| 테마 | body 클래스 | 특징 |
|------|-----------|------|
| **Default** | (없음) | 프리미엄 미니멀 — 인디고/틸 악센트, 화이트 콘텐츠, 다크 커버 |
| **Dark** | `theme-dark` | 전체 다크 — 딥 네이비 배경, 밝은 텍스트 |
| **Light** | `theme-light` | 올 화이트 — 깨끗한 라이트 톤, 미니멀 |
| **Warm** | `theme-warm` | 웜 톤 — 크림 배경, 앰버/테라코타 악센트 |
| **Noir** | `theme-noir` | 하이 콘트라스트 — 순수 블랙&화이트, 레드 포인트 |

사용자가 테마를 지정하면 `<body class="theme-dark">` 등으로 기본 테마를 설정한다.
미지정 시 기본 테마(Default)를 사용한다. 어떤 테마든 `T` 키로 다른 테마로 전환 가능.

테마별 CSS는 `:root` 변수를 `body.theme-*` 선택자로 오버라이드한다.
컴포넌트(stat-card, bar-chart 등)의 다크/라이트 적응 CSS도 테마별로 포함해야 한다.

각 테마의 CSS 전체 구현은 `references/themes.md` 참조.

HTML에 테마 토스트 요소도 추가한다:
```html
<div class="theme-toast" id="theme-toast"></div>
```

#### G. Overview + Print

```css
/* Overview Mode — O 키로 토글 */
body.overview .slides-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px; padding: 16px;
  position: fixed; inset: 0; overflow: auto;
  background: var(--c-ink);
}
body.overview section.slide {
  position: relative; opacity: 1; visibility: visible;
  transform: none; height: auto; aspect-ratio: 16/9;
  border-radius: 6px; cursor: pointer; font-size: 0.28rem;
  border: 2px solid transparent;
}
body.overview section.slide:hover { border-color: var(--c-accent); }
body.overview section.slide.active { border-color: var(--c-accent); }
body.overview .progress-bar,
body.overview .slide-counter,
body.overview .keyboard-hint { display: none; }

/* Print/PDF */
@media print {
  @page { size: 254mm 142.9mm; margin: 0; }
  html, body { overflow: visible; background: white; }
  .slides-container { position: static; }
  section.slide {
    position: relative !important; opacity: 1 !important;
    visibility: visible !important; transform: none !important;
    break-before: page; break-inside: avoid;
  }
  section.slide:first-child { break-before: auto; }
  .fragment { opacity: 1 !important; transform: none !important; }
  .progress-bar, .slide-counter, .keyboard-hint { display: none !important; }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  section.slide, .fragment, .progress-fill, .bar-fill {
    transition-duration: 0.01ms !important;
  }
}
```

### 4단계: JavaScript 작성

JS는 IIFE로 감싸고, 다음 모듈을 포함한다:

| 모듈 | 기능 |
|------|------|
| **State** | `{ currentSlide, currentFragment, slides[], totalSlides, isOverview, transitioning }` |
| **init()** | 슬라이드 수집, 해시 파싱, 초기 슬라이드로 이동, 이벤트 셋업 |
| **goToSlide(index, instant)** | `.active`/`.prev` 클래스 토글, 프래그먼트 리셋, UI 업데이트, 해시 갱신, transition lock (480ms) |
| **next() / prev()** | 프래그먼트 우선 처리 → 슬라이드 이동 |
| **Fragment** | `getFragments()`, `nextFragment()`, `prevFragment()`, `resetFragments()` |
| **updateUI()** | 슬라이드 번호 + 프로그레스바 업데이트 |
| **updateCounterColor()** | 슬라이드 배경 다크/라이트 감지 → 카운터 색상 변경 |
| **Theme** | `cycleTheme()`, `showThemeToast()` — 5개 테마 순환 전환 (T 키) |
| **Keyboard** | Arrow keys, Space, PageUp/Down, Home/End, F(fullscreen), T(theme), O(overview), Escape |
| **Touch** | touchstart/touchend 스와이프 감지 (threshold 50px) |
| **Wheel** | `e.preventDefault()` + wheelLock (600ms cooldown) → page-by-page |
| **Fullscreen** | `requestFullscreen` + webkit fallback |
| **Overview** | `body.overview` 토글, 클릭으로 슬라이드 점프 |
| **Hash routing** | `hashchange` + `popstate` 처리 |

JS 전체 구현 패턴은 `references/engine.md` 참조.

### 5단계: 콘텐츠 작성

슬라이드 HTML 구조 규칙:

```html
<!-- 모든 슬라이드는 이 구조를 따른다 -->
<section class="slide slide--{variant}" data-slide="{N}">
  <div class="content">
    <!-- 콘텐츠 -->
  </div>
</section>
```

- `data-slide` 속성에 1부터 순번 부여
- 첫 슬라이드에만 `active` 클래스 추가
- 프래그먼트 요소에는 `class="fragment" data-fragment="N"` (0부터 순번)
- `.content` 래퍼로 `max-width: 680px` 제한

### 6단계: 검증

생성 후 다음을 확인한다:
- `data-slide` 번호가 1부터 연속인지
- 첫 슬라이드에만 `active` 클래스가 있는지
- `fragment` 인덱스가 슬라이드 내에서 0부터 연속인지
- `slide-counter`의 총 슬라이드 수가 실제와 일치하는지
- 닫는 태그(`</section>`, `</div>`) 누락이 없는지

## 커스터마이징 가이드

### 테마 선택
사용자가 테마를 요청하면 `<body>`에 해당 클래스를 기본 설정한다:

| 사용자가 말하면 | body 클래스 |
|---------------|-----------:|
| "다크 모드로", "dark theme" | `<body class="theme-dark">` |
| "밝은 톤으로", "light theme" | `<body class="theme-light">` |
| "따뜻한 느낌으로", "warm" | `<body class="theme-warm">` |
| "흑백으로", "모노톤", "noir" | `<body class="theme-noir">` |
| (미지정) | `<body>` (default) |

### 색상 테마 변경
`:root`의 `--c-*` 변수만 변경하면 전체 테마가 바뀐다.
브랜드 컬러가 있으면 `--c-accent`를 브랜드 메인 컬러로, `--c-teal`을 서브 컬러로 설정.

### 콘텐츠 폭 변경
`--content-max` 값을 조정한다. 기본 680px, 넓은 콘텐츠는 800~960px 권장.

### 폰트 변경
- 한국어: `Pretendard` (기본, 로컬 폰트) → SUIT, Noto Sans KR 등으로 교체 가능
- 영어: `Inter` (기본, Google Fonts) → `font-family: system-ui, sans-serif`로 시스템 폰트 사용 가능
- 로컬 폰트 사용 시 `@font-face`의 `local()` src를 적절히 설정

### 전환 효과 변경
`--t-speed`(기본 0.45s)와 `--t-ease`를 조정한다.
`translateY(24px)` → `translateX(100px)` 등으로 방향 변경 가능.

## 레퍼런스

자세한 CSS/HTML 코드 패턴은 다음 레퍼런스를 참조:
- `references/components.md` — 7가지 컴포넌트 CSS + HTML 구조
- `references/slide-variants.md` — 5가지 슬라이드 유형 CSS
- `references/engine.md` — JavaScript 엔진 전체 코드 (테마 전환 포함)
- `references/themes.md` — 5가지 테마 CSS 구현
- 전체 동작 예시: `docs/reference/html-slide-demo.html`
