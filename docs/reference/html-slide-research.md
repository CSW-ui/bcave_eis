# 웹 기반 슬라이드 프레젠테이션 구현 리서치

> 순수 HTML, CSS, JavaScript로 단일 파일 슬라이드 프레젠테이션을 구현하기 위한 종합 리서치.
> FPOF 패션 하우스 스킬 개발의 기초 자료.

---

## 1. 기존 프레임워크 분석

### 1-1. 주요 프레임워크 비교

| 프레임워크 | 슬라이드 구조 | 전환 방식 | 의존성 | 크기 | PDF 출력 |
|-----------|-------------|----------|--------|------|---------|
| **reveal.js** | `<section>` 중첩 (2D 그리드) | transform + opacity | 없음 | ~300KB | print stylesheet |
| **impress.js** | `<div class="step">` 3D 좌표 | 3D transform (카메라 이동) | 없음 | ~50KB | 외부 도구 |
| **Shower** | `<section class="slide">` | visibility 토글 | 없음 | ~20KB | print CSS 내장 |
| **Remark.js** | Markdown `---` 구분 in `<textarea>` | JS DOM 교체 | CDN 1개 | ~100KB | 미지원 |
| **Marp** | Markdown → scoped `<section>` | PostCSS 빌드 | Node.js | 빌드 도구 | CLI 내장 |
| **Slidev** | Markdown + Vue 3 컴포넌트 | Vue Transition API | Vue/Vite | 빌드 도구 | CLI 내장 |
| **deck.js** | `<section class="slide">` | CSS 상태 클래스 | jQuery | ~30KB+jQuery | 미지원 |
| **Minislides** | `<section>` + `:target` | CSS hash 기반 | 없음 | **648B JS + 371B CSS** | 미지원 |

### 1-2. 프레임워크별 아키텍처 핵심

#### reveal.js (가장 완성도 높음)
```html
<div class="reveal">
  <div class="slides">
    <section>Slide 1</section>
    <section>
      <section>Vertical Slide 1</section>
      <section>Vertical Slide 2</section>
    </section>
  </div>
</div>
```
- `position: absolute` + `transform: translate(-50%, -50%)` 중앙 정렬
- CSS 변수 `--slide-width`, `--slide-height`, `--slide-scale`로 스케일링
- `data-auto-animate`: FLIP 기법으로 인접 슬라이드 요소 자동 애니메이션
- `.fragment` 클래스로 순차 공개 (`.grow`, `.fade-out`, `.highlight-red` 변형)
- `?print-pdf` 쿼리로 인쇄 모드 전환

#### impress.js (3D 캔버스)
```html
<div id="impress">
  <div class="step" data-x="0" data-y="0" data-z="0"
       data-rotate-x="0" data-rotate-y="0" data-scale="1">
    Content
  </div>
</div>
```
- `transform-style: preserve-3d` + `perspective: 1000px`
- 각 스텝을 3D 공간에 자유 배치, 카메라가 역변환으로 이동
- `.future` → `.present` → `.past` 상태 클래스

#### Shower (최소주의)
- `.shower.list` (전체 목록 모드) ↔ `.shower.full` (발표 모드) 이중 모드
- `.next` 클래스로 순차 공개
- W3C에서 공식 사용

#### Remark.js (단일 파일 Markdown)
```html
<textarea id="source">
# Slide 1
---
# Slide 2
</textarea>
<script src="remark-latest.min.js"></script>
<script>var slideshow = remark.create();</script>
```
- Markdown을 `<textarea>`에 작성, JS가 파싱
- 가장 단순한 단일 파일 구조

---

## 2. 순수 구현의 3가지 패러다임

### 2-1. CSS Scroll Snap (JS 불필요)

```css
html {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.slide {
  min-height: 100svh;
  scroll-snap-align: start;
  scroll-snap-stop: always;    /* 슬라이드 건너뛰기 방지 */
  display: grid;
  place-items: center;
}
```

| 장점 | 한계 |
|------|------|
| JS 없이 동작 | 전환 애니메이션 커스터마이징 불가 |
| 브라우저 네이티브 스냅 | 키보드 내비게이션 미지원 (스크롤만) |
| 모바일 터치 자연스러움 | 슬라이드 번호/프로그레스바 없음 |
| Baseline 전 브라우저 지원 (2022~) | 프래그먼트(순차 공개) 불가 |

**수평 스크롤 변형:**
```css
.slides {
  display: grid;
  grid-auto-flow: column;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
.slide { width: 100vw; height: 100vh; }
```

### 2-2. CSS `:target` (JS 불필요)

```css
.slide {
  position: fixed;
  inset: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s ease;
}

.slide:target { opacity: 1; visibility: visible; z-index: 1; }
.slide:first-of-type { opacity: 1; visibility: visible; }  /* 기본 슬라이드 */
```

| 장점 | 한계 |
|------|------|
| URL 해시 기반 → 북마크 가능 | `<a>` 링크로만 이동 (키보드 불가) |
| CSS transition으로 전환 효과 | 슬라이드 순서 강제 불가 |
| 뒤로가기 버튼으로 이전 슬라이드 | N개 슬라이드에 N개 링크 필요 |

### 2-3. JS 클래스 토글 (권장 — reveal.js 경량 패턴)

```javascript
const slides = document.querySelectorAll('.slide');
let current = 0;

function goTo(n) {
  slides[current].classList.remove('active');
  current = Math.max(0, Math.min(n, slides.length - 1));
  slides[current].classList.add('active');
  history.replaceState({ slide: current }, '', `#slide-${current + 1}`);
}
```

```css
.slide {
  position: fixed; inset: 0;
  opacity: 0; visibility: hidden;
  transition: opacity 0.5s ease, transform 0.5s ease;
  transform: translateX(100%);
}
.slide.active {
  opacity: 1; visibility: visible;
  transform: translateX(0); z-index: 2;
}
.slide.prev { transform: translateX(-100%); }
```

| 장점 | 한계 |
|------|------|
| 모든 기능 지원 (키보드/터치/풀스크린) | JS ~450줄 필요 |
| 프래그먼트, 발표자 노트, 오버뷰 | 코드량이 가장 많음 |
| View Transition API 연동 가능 | — |
| `@media print`로 PDF 출력 | — |

---

## 3. 핵심 CSS 기법 상세

### 3-1. 반응형 타이포그래피 — `clamp()`

```css
:root {
  --font-size-h1: clamp(2rem, 5vw, 4.5rem);      /* 타이틀 */
  --font-size-h2: clamp(1.5rem, 3.5vw, 3rem);     /* 섹션 헤딩 */
  --font-size-h3: clamp(1.25rem, 2.5vw, 2rem);    /* 서브타이틀 */
  --font-size-body: clamp(1rem, 1.5vw, 1.5rem);   /* 본문 */
  --font-size-small: clamp(0.75rem, 1vw, 0.875rem); /* 캡션 */
  --font-size-code: clamp(0.8rem, 1.2vw, 1.1rem); /* 코드 */
}
```

> `clamp(MIN, PREFERRED, MAX)` — preferred(vw)가 유동적으로 스케일하되, MIN/MAX(rem) 범위를 벗어나지 않음. rem 단위라 브라우저 줌에도 반응.

### 3-2. 뷰포트 단위

| 단위 | 의미 | 용도 |
|------|------|------|
| `vh` / `vw` | 전통적 뷰포트 | 데스크톱 전용 |
| `svh` / `svw` | Small viewport (브라우저 UI 제외) | **프레젠테이션 권장** — 모바일 안정 |
| `dvh` / `dvw` | Dynamic viewport (실시간 변동) | 스크롤 시 레이아웃 시프트 주의 |
| `lvh` / `lvw` | Large viewport (UI 숨김 상태) | 최대 영역 |

```css
.slide {
  min-height: 100svh;   /* 모바일에서도 안정적 */
  width: 100vw;
}
```

### 3-3. 슬라이드 비율 고정 — `aspect-ratio`

```css
.slide {
  aspect-ratio: 16 / 9;
  width: min(100vw, 100vh * 16 / 9);
  max-height: 100vh;
  margin: auto;
  overflow: hidden;
}
```

### 3-4. Container Queries — 슬라이드 내부 반응형

```css
.slide {
  container-type: inline-size;
  container-name: slide;
}

@container slide (min-width: 900px) {
  .slide-content { grid-template-columns: 1fr 1fr; }
}

@container slide (max-width: 600px) {
  .slide-content { grid-template-columns: 1fr; font-size: 0.875rem; }
}
```

### 3-5. CSS Custom Properties — 테마 시스템

```css
:root {
  color-scheme: light dark;

  --color-primary: #6C5CE7;
  --color-bg: light-dark(#ffffff, #0f0f23);
  --color-surface: light-dark(#f8f9fa, #1a1a2e);
  --color-text: light-dark(#2d3436, #eaeaea);
  --color-muted: light-dark(#636e72, #a0a0b0);

  --font-heading: system-ui, sans-serif;
  --font-body: system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;

  --slide-padding: clamp(2rem, 4vw, 4rem);
  --transition-speed: 0.4s;
  --transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

> `light-dark()` 함수: 2024.5~ 전 브라우저 지원. `color-scheme: light dark` 선언 필수.

### 3-6. View Transition API (모던 전환 효과)

```javascript
function goToSlide(index) {
  if (!document.startViewTransition) { showSlide(index); return; }
  document.startViewTransition(() => showSlide(index));
}
```

```css
.slide { view-transition-name: slide-content; }

::view-transition-old(slide-content) {
  animation: slide-out-left 0.4s cubic-bezier(0.86, 0, 0.07, 1) forwards;
}
::view-transition-new(slide-content) {
  animation: slide-in-right 0.4s cubic-bezier(0.86, 0, 0.07, 1) forwards;
}
```

- 지원: Chrome 111+, Edge 111+, Safari 18+, Firefox 144 (2025 Q4)
- 미지원 브라우저: CSS transition fallback

### 3-7. 인쇄/PDF 출력

```css
@media print {
  @page { size: 254mm 142.9mm; margin: 0; }  /* 16:9 */

  .slide {
    break-before: page;
    break-inside: avoid;
    min-height: auto;
    height: 100%;
  }
  .slide:first-child { break-before: auto; }

  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .fragment { opacity: 1 !important; visibility: visible !important; }
  nav, .progress-bar, .controls { display: none !important; }
}
```

> `@page size`는 Chromium만 지원. Firefox/Safari는 수동 용지 설정 필요.

### 3-8. 접근성

```css
@media (prefers-reduced-motion: reduce) {
  *, ::view-transition-old(*), ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 4. 필수 JavaScript 모듈

### 4-1. 상태 관리 + 해시 라우팅 (~40줄)

```javascript
const state = { currentSlide: 0, currentFragment: -1, slides: [], totalSlides: 0 };

function init() {
  state.slides = Array.from(document.querySelectorAll('section.slide'));
  state.totalSlides = state.slides.length;
  const hash = parseInt(location.hash.replace('#slide-', ''), 10);
  state.currentSlide = (hash >= 1 && hash <= state.totalSlides) ? hash - 1 : 0;
  goToSlide(state.currentSlide);
}

function updateHash(index) {
  history.replaceState({ slide: index }, '', `#slide-${index + 1}`);
}

window.addEventListener('hashchange', () => {
  const hash = parseInt(location.hash.replace('#slide-', ''), 10);
  if (hash >= 1 && hash <= state.totalSlides) goToSlide(hash - 1);
});

window.addEventListener('popstate', (e) => {
  if (e.state && typeof e.state.slide === 'number') goToSlide(e.state.slide);
});
```

### 4-2. 키보드 내비게이션 (~25줄)

```javascript
document.addEventListener('keydown', (e) => {
  const handlers = {
    'ArrowRight': () => next(),
    'ArrowDown':  () => next(),
    'ArrowLeft':  () => prev(),
    'ArrowUp':    () => prev(),
    ' ':          () => { e.preventDefault(); next(); },
    'PageDown':   () => { e.preventDefault(); next(); },
    'PageUp':     () => { e.preventDefault(); prev(); },
    'Home':       () => goToSlide(0),
    'End':        () => goToSlide(state.totalSlides - 1),
    'f':          () => toggleFullscreen(),
    'Escape':     () => exitFullscreen(),
    'o':          () => toggleOverview(),
  };
  const handler = handlers[e.key];
  if (handler) handler();
});
```

### 4-3. 터치/스와이프 (~25줄)

```javascript
let touchStartX = 0, touchStartY = 0;
const SWIPE_THRESHOLD = 50;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    dx < 0 ? next() : prev();
  }
}, { passive: true });
```

### 4-4. 풀스크린 API (~15줄)

```javascript
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() ||
    document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
}
```

### 4-5. 프래그먼트 (순차 공개) (~50줄)

```html
<li class="fragment" data-fragment="1">첫 번째</li>
<li class="fragment" data-fragment="2">두 번째</li>
```

```javascript
function nextFragment() {
  const fragments = getOrderedFragments(state.currentSlide);
  if (state.currentFragment < fragments.length - 1) {
    state.currentFragment++;
    fragments[state.currentFragment].classList.add('visible');
    return true;
  }
  return false;
}

function next() {
  if (!nextFragment()) {
    if (state.currentSlide < state.totalSlides - 1) goToSlide(state.currentSlide + 1);
  }
}
```

```css
.fragment { opacity: 0; transition: opacity 0.4s ease, transform 0.4s ease; }
.fragment.visible { opacity: 1; }
.fragment.slide-up { transform: translateY(40px); }
.fragment.slide-up.visible { transform: translateY(0); }
```

### 4-6. 반응형 스케일링 (~20줄)

```javascript
const DESIGN_WIDTH = 1920, DESIGN_HEIGHT = 1080;

function scaleSlides() {
  const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  const offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
  const container = document.querySelector('.slides-container');
  container.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  container.style.transformOrigin = 'top left';
}

window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(scaleSlides, 100); });
```

### 4-7. 발표자 노트 (~80줄)

```html
<aside class="notes">여기에 발표자 노트 작성</aside>
```
- `window.open()`으로 팝업 생성
- `window.postMessage()`로 메인 ↔ 팝업 동기화
- 현재 슬라이드 + 다음 슬라이드 미리보기 + 타이머 표시

### 4-8. 프로그레스바 (~10줄)

```javascript
function updateProgress() {
  const progress = (state.currentSlide / (state.totalSlides - 1)) * 100;
  document.querySelector('.progress-fill').style.width = progress + '%';
}
```

```css
.progress-bar { position: fixed; bottom: 0; left: 0; width: 100%; height: 4px; z-index: 100; }
.progress-fill { height: 100%; background: var(--color-primary); transition: width 0.3s ease; }
```

---

## 5. 슬라이드 레이아웃 패턴

### CSS Grid 기반 6가지 핵심 레이아웃

| 레이아웃 | CSS 패턴 | 용도 |
|---------|---------|------|
| **타이틀** | `display: grid; place-items: center; text-align: center` | 표지, 구분 슬라이드 |
| **2컬럼** | `grid-template-columns: 1fr 1fr; gap: 2rem` | 비교, 병렬 내용 |
| **이미지+텍스트** | `grid-template-columns: 1.2fr 1fr` + `object-fit: cover` | 비주얼 스토리텔링 |
| **인용** | `flex; justify-content: center; max-width: 40ch` | 인용문, 핵심 메시지 |
| **3컬럼** | `grid-template-columns: repeat(3, 1fr)` | 통계, 특성 비교 |
| **풀블리드** | `position: relative` + 오버레이 그라데이션 | 임팩트 비주얼 |

---

## 6. FPOF 적용 분석

### 현재 FPOF 프레젠테이션 생태계

| 항목 | 현황 |
|------|------|
| PPTX 생성 | PptxGenJS 기반 `/deck` 스킬 완비 |
| HTML 대시보드 | `board_*.html` 인터랙티브 보고서 활용 중 |
| HTML 슬라이드 | **미존재** — 새 스킬로 개발 필요 |
| 브랜드 컬러 | Signature Yellow `#FEF200`, Black, White, Sky Blue `#68A8DB` |
| 폰트 | Display: Bold grotesque, Body: Clean sans-serif |
| 디자인 방향 | Doodle, Graffiti, Pop Art, 비대칭, 대담한 크롭 |

### 권장 접근법

**"JS 클래스 토글" 방식 (reveal.js 패턴 경량화)**

| 선택 이유 | 설명 |
|----------|------|
| 완전한 제어 | 키보드, 터치, 풀스크린, 프래그먼트 모두 지원 |
| 단일 파일 | HTML + CSS + JS 인라인, 외부 의존성 0 |
| 프린트 가능 | `@media print` + `@page`로 PDF 출력 |
| FPOF 연동 | 와키윌리 브랜드 컬러/폰트를 CSS 변수로 주입 |
| 역할 분리 | PPTX = 외부 배포, HTML = 내부 발표/웹 공유 |

### 핵심 아키텍처 결정

1. **디자인 해상도**: 1920x1080 고정 → `transform: scale()` 자동 피팅
2. **테마**: CSS Custom Properties로 브랜드 컬러 주입
3. **타이포**: `clamp()` 반응형 + Container Queries
4. **전환 효과**: View Transition API (지원 시) + CSS transition fallback
5. **출력**: `@media print` + `@page size: 254mm 142.9mm` (16:9)
6. **코드량**: CSS ~200줄 + JS ~450줄 = 단일 HTML 파일 내 인라인

---

## 7. 참고 자료

### 프레임워크
- [reveal.js](https://revealjs.com/) — 가장 완성도 높은 오픈소스 프레젠테이션 프레임워크
- [impress.js](https://impress.js.org/) — 3D CSS 변환 기반 Prezi 스타일
- [Shower](https://shwr.me/) — W3C 공식 사용, 최소주의
- [Remark.js](https://remarkjs.com/) — Markdown 기반 단일 파일
- [Marp](https://marp.app/) — Markdown → 슬라이드 변환 빌드 도구
- [Slidev](https://sli.dev/) — Vue 3 기반 개발자 프레젠테이션
- [Minislides](https://github.com/ThomasR/minislides) — 648B JS + 371B CSS 초경량

### CSS 기법
- [CSS Scroll Snap (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap)
- [View Transition API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [CSS Container Queries (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [light-dark() (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark)
- [Dynamic Viewport Units (web.dev)](https://web.dev/blog/viewport-units)
- [CSS Scroll Snap Slide Deck (CSS-Tricks)](https://css-tricks.com/css-scroll-snap-slide-deck/)
- [View Transitions in 2025 (Chrome Developers)](https://developer.chrome.com/blog/view-transitions-in-2025)

### 구현 참고
- [HTML Slides Without Frameworks (Chen Hui Jing)](https://chenhuijing.com/blog/html-slides-without-frameworks/)
- [The Tiniest Presentation Framework (SimPre)](https://krasimirtsonev.com/blog/article/the-tiniest-presentation-framework)
- [Snap Slides (Yihui Xie)](https://yihui.org/en/2023/09/snap-slides/)
