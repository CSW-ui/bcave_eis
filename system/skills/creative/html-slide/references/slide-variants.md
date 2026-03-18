# Slide Variants

5가지 슬라이드 유형별 CSS와 HTML 구조.

---

## 1. Cover — 표지

프레젠테이션 첫 장. 다크 배경 + 중앙 정렬.

```html
<section class="slide slide--cover active" data-slide="1">
  <div class="content">
    <span class="tag">Season Plan 2026</span>
    <div class="divider"></div>
    <h1>프레젠테이션<br>메인 타이틀</h1>
    <p class="subtitle">서브타이틀 또는 슬로건</p>
  </div>
</section>
```

```css
.slide--cover {
  background: linear-gradient(145deg, var(--c-ink) 0%, var(--c-ink-light) 100%);
  color: var(--c-white);
  text-align: center;
}

.slide--cover .content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
}

.slide--cover .tag {
  display: inline-block;
  font-family: var(--font-en);
  font-size: var(--fs-tiny);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-accent);
  background: var(--c-accent-light);
  padding: 0.3em 0.9em;
  border-radius: 100px;
}

.slide--cover h1 {
  font-size: var(--fs-display);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.slide--cover .subtitle {
  font-size: var(--fs-body);
  color: var(--c-muted);
  max-width: 460px;
  line-height: 1.6;
}

.slide--cover .divider {
  width: 48px;
  height: 2px;
  background: var(--c-accent);
  border-radius: 1px;
}
```

`--c-accent-light: rgba(91, 95, 199, 0.15)` — Design Tokens에 선언.

---

## 2. Section Divider — 섹션 구분

챕터 시작 표시. 큰 숫자 + 제목.

```html
<section class="slide slide--section" data-slide="2">
  <div class="content">
    <div class="section-num">01</div>
    <div>
      <h2>섹션 제목</h2>
      <p class="section-sub">섹션 부제목</p>
    </div>
  </div>
</section>
```

```css
.slide--section {
  background: var(--c-surface);
}

.slide--section .content {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
}

.slide--section .section-num {
  font-family: var(--font-en);
  font-size: clamp(4rem, 10vw, 7rem);
  font-weight: 700;
  line-height: 0.85;
  color: var(--c-accent);
  opacity: 0.12;
}

.slide--section h2 {
  font-size: var(--fs-display);
  font-weight: 700;
  line-height: 1.1;
  color: var(--c-ink);
  letter-spacing: -0.02em;
}

.slide--section .section-sub {
  font-size: var(--fs-small);
  color: var(--c-muted);
  margin-top: 0.4rem;
}
```

---

## 3. Content — 일반 콘텐츠

가장 많이 사용하는 유형. 흰 배경 + 제목 + 리드 + 컴포넌트.

```html
<section class="slide slide--content" data-slide="3">
  <div class="content">
    <h2>슬라이드 제목</h2>
    <p class="lead">부제목 또는 설명</p>
    <!-- 컴포넌트 삽입 위치 -->
  </div>
</section>
```

```css
.slide--content {
  background: var(--c-bg);
}

.slide--content h2 {
  font-size: var(--fs-h1);
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 0.4rem;
  color: var(--c-ink);
}

.slide--content .lead {
  font-size: var(--fs-small);
  color: var(--c-muted);
  margin-bottom: 1.5rem;
}
```

---

## 4. Dark — 강조 콘텐츠

데이터 시각화나 핵심 포인트 강조용. 다크 배경.

```html
<section class="slide slide--dark" data-slide="6">
  <div class="content">
    <h2>다크 슬라이드 제목</h2>
    <p class="lead">설명 텍스트</p>
    <!-- 컴포넌트 (차트, 통계 등) -->
  </div>
</section>
```

```css
.slide--dark {
  background: var(--c-ink);
  color: var(--c-white);
}

.slide--dark h2 { color: var(--c-white); }
.slide--dark .lead { color: var(--c-muted); }
```

다크 슬라이드에서는 컴포넌트의 다크 변형 CSS가 자동 적용됨.

---

## 5. End — 마지막 장

Thank You 또는 마무리. Cover와 비슷한 다크 그라디언트.

```html
<section class="slide slide--end" data-slide="10">
  <div class="content">
    <div class="divider" style="margin: 0 auto 1.5rem;"></div>
    <h2>Thank You</h2>
    <p class="contact">연락처 또는 슬로건</p>
  </div>
</section>
```

```css
.slide--end {
  background: linear-gradient(145deg, var(--c-ink) 0%, var(--c-ink-light) 100%);
  color: var(--c-white);
  text-align: center;
}

.slide--end h2 {
  font-size: var(--fs-display);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.slide--end .contact {
  font-size: var(--fs-small);
  color: var(--c-muted);
  margin-top: 0.8rem;
}
```

---

## 일반적인 슬라이드 구성 순서

1. **Cover** — 표지 (1장)
2. **Section** — 첫 번째 섹션 (01)
3. **Content** — 데이터/내용 (2~3장)
4. **Section** — 두 번째 섹션 (02)
5. **Dark** — 핵심 데이터 강조 (1장)
6. **Content** — 추가 내용 (1~2장)
7. **End** — 마무리 (1장)

총 8~12장이 발표에 적합한 분량.
