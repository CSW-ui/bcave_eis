# JavaScript Slide Engine

슬라이드 프레젠테이션의 전체 JavaScript 엔진. IIFE로 감싸서 전역 오염 방지.

---

## 전체 코드

```javascript
(() => {
  'use strict';

  const state = {
    currentSlide: 0,
    currentFragment: -1,
    slides: [],
    totalSlides: 0,
    isOverview: false,
    transitioning: false,
  };

  // ── Init ──
  function init() {
    state.slides = Array.from(document.querySelectorAll('section.slide'));
    state.totalSlides = state.slides.length;
    document.getElementById('total-num').textContent = state.totalSlides;

    const hash = parseInt(location.hash.replace('#slide-', ''), 10);
    if (hash >= 1 && hash <= state.totalSlides) state.currentSlide = hash - 1;

    goToSlide(state.currentSlide, true);
    setupKeyboard();
    setupTouch();
    setupWheel();
    setupOverviewClick();

    document.addEventListener('keydown', hideHint, { once: true });
    document.addEventListener('touchstart', hideHint, { once: true });
  }

  function hideHint() {
    document.getElementById('keyboard-hint').classList.add('hidden');
  }

  // ── Navigation ──
  function goToSlide(index, instant) {
    index = Math.max(0, Math.min(index, state.totalSlides - 1));

    if (instant) {
      state.slides.forEach(s => { s.style.transition = 'none'; });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          state.slides.forEach(s => { s.style.transition = ''; });
        });
      });
    }

    state.slides.forEach((slide, i) => {
      slide.classList.remove('active', 'prev');
      if (i < index) slide.classList.add('prev');
      else if (i === index) slide.classList.add('active');
    });

    resetFragments(index);
    state.currentSlide = index;
    state.currentFragment = -1;

    updateUI();
    updateCounterColor();
    history.replaceState({ slide: index }, '', `#slide-${index + 1}`);

    // Transition lock to prevent rapid-fire navigation
    state.transitioning = true;
    setTimeout(() => { state.transitioning = false; }, instant ? 50 : 480);
  }

  function next() {
    if (state.isOverview || state.transitioning) return;
    if (!nextFragment()) {
      if (state.currentSlide < state.totalSlides - 1) goToSlide(state.currentSlide + 1);
    }
  }

  function prev() {
    if (state.isOverview || state.transitioning) return;
    if (!prevFragment()) {
      if (state.currentSlide > 0) {
        goToSlide(state.currentSlide - 1);
        // Show all fragments on previous slide
        const frags = getFragments(state.currentSlide);
        frags.forEach(f => f.classList.add('visible'));
        state.currentFragment = frags.length - 1;
      }
    }
  }

  // ── Fragments ──
  function getFragments(idx) {
    return Array.from(state.slides[idx].querySelectorAll('.fragment'))
      .sort((a, b) => (parseInt(a.dataset.fragment) || 0) - (parseInt(b.dataset.fragment) || 0));
  }

  function resetFragments(idx) {
    getFragments(idx).forEach(f => f.classList.remove('visible'));
  }

  function nextFragment() {
    const frags = getFragments(state.currentSlide);
    if (state.currentFragment < frags.length - 1) {
      state.currentFragment++;
      frags[state.currentFragment].classList.add('visible');
      return true;
    }
    return false;
  }

  function prevFragment() {
    const frags = getFragments(state.currentSlide);
    if (state.currentFragment >= 0) {
      frags[state.currentFragment].classList.remove('visible');
      state.currentFragment--;
      return true;
    }
    return false;
  }

  // ── UI Updates ──
  function updateUI() {
    document.getElementById('current-num').textContent = state.currentSlide + 1;
    const pct = state.totalSlides > 1
      ? (state.currentSlide / (state.totalSlides - 1)) * 100 : 0;
    document.querySelector('.progress-fill').style.width = pct + '%';
  }

  function updateCounterColor() {
    const slide = state.slides[state.currentSlide];
    const isBodyDark = document.body.classList.contains('theme-dark') ||
                       document.body.classList.contains('theme-noir');
    const isSlideDark = slide.classList.contains('slide--cover') ||
                        slide.classList.contains('slide--dark') ||
                        slide.classList.contains('slide--end');
    const isLight = document.body.classList.contains('theme-light');
    const isDark = isLight ? false : (isBodyDark || isSlideDark);
    const counter = document.querySelector('.slide-counter');
    const hint = document.getElementById('keyboard-hint');
    counter.style.color = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    hint.style.color = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  }

  // ── Theme ──
  const THEMES = ['', 'theme-dark', 'theme-light', 'theme-warm', 'theme-noir'];
  const THEME_LABELS = ['Default', 'Dark', 'Light', 'Warm', 'Noir'];
  let currentTheme = 0;

  function cycleTheme() {
    if (THEMES[currentTheme]) document.body.classList.remove(THEMES[currentTheme]);
    currentTheme = (currentTheme + 1) % THEMES.length;
    if (THEMES[currentTheme]) document.body.classList.add(THEMES[currentTheme]);
    showThemeToast(THEME_LABELS[currentTheme]);
    updateCounterColor();
  }

  function showThemeToast(label) {
    const toast = document.getElementById('theme-toast');
    if (!toast) return;
    toast.textContent = label;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 1200);
  }

  // ── Keyboard ──
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (state.isOverview && e.key !== 'o' && e.key !== 'Escape') return;
      const map = {
        'ArrowRight': next, 'ArrowDown': next,
        'ArrowLeft': prev, 'ArrowUp': prev,
        ' ': () => { e.preventDefault(); next(); },
        'PageDown': () => { e.preventDefault(); next(); },
        'PageUp': () => { e.preventDefault(); prev(); },
        'Home': () => goToSlide(0),
        'End': () => goToSlide(state.totalSlides - 1),
        'f': toggleFullscreen,
        't': cycleTheme,
        'Escape': () => {
          if (state.isOverview) toggleOverview();
          else if (document.fullscreenElement) document.exitFullscreen();
        },
        'o': toggleOverview,
      };
      const fn = map[e.key];
      if (fn) fn();
    });
  }

  // ── Touch ──
  function setupTouch() {
    let sx = 0, sy = 0;
    document.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        dx < 0 ? next() : prev();
      }
    }, { passive: true });
  }

  // ── Wheel (page-by-page with lock) ──
  function setupWheel() {
    let wheelLock = false;
    document.addEventListener('wheel', (e) => {
      if (state.isOverview || wheelLock) return;
      e.preventDefault();
      wheelLock = true;
      if (e.deltaY > 0) next(); else prev();
      setTimeout(() => { wheelLock = false; }, 600);
    }, { passive: false });
  }

  // ── Fullscreen ──
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen ||
       document.documentElement.webkitRequestFullscreen)
        ?.call(document.documentElement);
    } else {
      (document.exitFullscreen ||
       document.webkitExitFullscreen)
        ?.call(document);
    }
  }

  // ── Overview ──
  function toggleOverview() {
    state.isOverview = !state.isOverview;
    document.body.classList.toggle('overview', state.isOverview);
    if (!state.isOverview) goToSlide(state.currentSlide, true);
  }

  function setupOverviewClick() {
    document.querySelector('.slides-container').addEventListener('click', (e) => {
      if (!state.isOverview) return;
      const slide = e.target.closest('section.slide');
      if (slide) {
        const idx = state.slides.indexOf(slide);
        if (idx !== -1) { toggleOverview(); goToSlide(idx, true); }
      }
    });
  }

  // ── Hash Routing ──
  window.addEventListener('hashchange', () => {
    const h = parseInt(location.hash.replace('#slide-', ''), 10);
    if (h >= 1 && h <= state.totalSlides) goToSlide(h - 1);
  });

  window.addEventListener('popstate', (e) => {
    if (e.state && typeof e.state.slide === 'number') goToSlide(e.state.slide);
  });

  // ── Start ──
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
```

---

## 키보드 단축키 요약

| 키 | 동작 |
|----|------|
| `→` `↓` `Space` `PageDown` | 다음 (프래그먼트 → 슬라이드) |
| `←` `↑` `PageUp` | 이전 |
| `Home` | 첫 슬라이드 |
| `End` | 마지막 슬라이드 |
| `F` | 전체화면 토글 |
| `T` | 테마 순환 전환 (Default → Dark → Light → Warm → Noir) |
| `O` | 오버뷰 모드 토글 |
| `Escape` | 오버뷰/전체화면 해제 |

---

## HTML 구조 — UI 요소

슬라이드 컨테이너 바깥(닫는 `</div>` 뒤)에 배치:

```html
<!-- Progress Bar -->
<div class="progress-bar"><div class="progress-fill"></div></div>

<!-- Slide Counter -->
<div class="slide-counter">
  <span id="current-num">1</span> / <span id="total-num">10</span>
</div>

<!-- Keyboard Hint — 첫 입력 시 자동 페이드아웃 -->
<div class="keyboard-hint" id="keyboard-hint">
  ← → Arrow Keys · Space Next · F Fullscreen · O Overview · T Theme
</div>

<!-- Theme Toast — 테마 전환 시 화면 중앙에 잠시 표시 -->
<div class="theme-toast" id="theme-toast"></div>
```

`total-num`의 텍스트 콘텐츠는 JS `init()`에서 자동 갱신되지만,
HTML에도 정확한 숫자를 미리 넣어두면 로딩 시 깜빡임이 없다.

---

## 주의 사항

1. **Transition Lock**: `goToSlide` 후 480ms 동안 `state.transitioning = true`.
   빠른 키 입력이나 휠 스크롤 시 슬라이드가 건너뛰지 않도록 방지.

2. **Wheel Lock**: 휠 이벤트는 600ms cooldown. `passive: false`로
   `e.preventDefault()` 호출하여 페이지 자체 스크롤 차단.

3. **prev() 시 프래그먼트**: 이전 슬라이드로 돌아가면 해당 슬라이드의
   모든 프래그먼트를 `.visible`로 설정 (이미 본 콘텐츠이므로).

4. **Overview 모드**: `body.overview` 클래스가 CSS grid 레이아웃을 활성화.
   오버뷰에서 키보드는 O/Escape만 동작. 슬라이드 클릭으로 이동.

5. **Fullscreen**: `webkitRequestFullscreen` fallback 포함하여 Safari 지원.
