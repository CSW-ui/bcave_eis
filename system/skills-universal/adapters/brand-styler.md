# Brand Styler — 와키윌리 브랜드 적용 가이드

> **어댑터 출처:** `.claude/skills/brand-guidelines/SKILL.md` 기반, Anthropic 브랜드 참조 제거
> **대상:** 와키윌리(Wacky Willy) 브랜드 전용 스타일 적용
> **원본 브랜드 소스:** `presets/wacky-willy/visual-identity.json`

---

## 와키윌리 브랜드 아이덴티티

**컨셉:** Kitsch Street & IP Universe
**무드:** "Not just clothes, it's a culture."
**디자인 키워드:** Doodle · Graffiti · Pop Art · Bold Lines · Vivid Colors

---

## 컬러 팔레트

### Primary Colors (브랜드 아이덴티티)

| 역할 | 색상명 | HEX | RGB | 용도 |
|------|--------|-----|-----|------|
| 주색 | Signature Yellow | `#FEF200` | R254 G242 B0 | 브랜드 포인트, CTA, 강조 배경 |
| 주색 | Black | `#000000` | R0 G0 B0 | 텍스트, 아웃라인, 다크 배경 |
| 주색 | White | `#FFFFFF` | R255 G255 B255 | 여백, 라이트 배경 |

### Secondary Colors (시즌 악센트)

| 역할 | 색상명 | HEX | RGB | 용도 |
|------|--------|-----|-----|------|
| 시즌 악센트 | Sky Blue | `#68A8DB` | R104 G168 B219 | 26SS 시즌 포인트 |

### 색상 사용 원칙

- **Primary = 브랜드 아이덴티티** — Black + Signature Yellow 조합이 WW 시그니처
- **Secondary = 시즌 악센트** — 시즌마다 변경 가능 (현재 시즌 `visual-identity.json` 확인)
- 배경이 Black이면 Yellow 또는 White 텍스트
- 배경이 White이면 Black 또는 Yellow 강조

---

## 타이포그래피

| 역할 | 스타일 | 폴백 | 용도 |
|------|--------|------|------|
| Display / Heading | Bold grotesque sans-serif (graffiti 감성) | Arial Black, Impact | 타이틀, 히어로 텍스트 |
| Body / 본문 | Clean sans-serif (가독성 우선) | Arial, Helvetica | 설명 텍스트, 캡션 |
| Accent / IP | Hand-drawn / doodle style | 없음 (이미지로 처리) | IP 캐릭터 콘텐츠 |

---

## 그래픽 스타일

### IP 적용 원칙
- **Bold outline + flat color fill** — 두꺼운 윤곽선, 단색 채우기
- **Doodle / Graffiti aesthetic** — 손으로 그린 듯한 느낌
- 키키(Kiki)와 11 캐릭터 활용 시 `presets/wacky-willy/ip-bible.json` 참조

### 사진/비주얼 방향
- Street context — 도시/거리 배경
- 자연광 — 스튜디오 조명보다 자연광 선호
- 움직임이 있는 포즈 — 정적 포즈 지양

### 레이아웃 원칙

| 원칙 | 설명 |
|------|------|
| Asymmetric | 비대칭 구성으로 역동성 |
| Bold Crop | 대담한 크롭으로 임팩트 |
| Text Overlay OK | 이미지 위 텍스트 허용 |
| White Space Minimal | 여백 최소화, 밀도 높은 레이아웃 |

---

## 산출물 유형별 적용 가이드

### PPTX 슬라이드

```
커버 슬라이드:
  배경: #000000 (Black)
  타이틀: #FEF200 (Signature Yellow), Bold grotesque
  서브타이틀: #FFFFFF, Clean sans-serif

섹션 헤더:
  배경: #FEF200 (Signature Yellow)
  텍스트: #000000 (Black), Bold

콘텐츠 슬라이드:
  배경: #FFFFFF (White)
  헤딩: #000000, Bold grotesque
  본문: #000000, Clean sans-serif
  강조: #FEF200 또는 #68A8DB (시즌 악센트)

클로징 슬라이드:
  배경: #000000 (Black)
  텍스트: #FEF200 (Signature Yellow)
```

### 문서 (DOCX / PDF)

```
헤딩 1: Bold grotesque, #000000, 밑줄 또는 Yellow 하이라이트
헤딩 2: Bold sans-serif, #000000
본문: Clean sans-serif, #000000, 11~12pt
강조/콜아웃: #FEF200 배경 또는 #000000 테두리 박스
표 헤더: #000000 배경, #FEF200 또는 #FFFFFF 텍스트
```

### 소셜 미디어 / 캠페인 비주얼

```
배경: Black 또는 Signature Yellow (교차 사용)
타이포: 크고 대담하게, Bold grotesque
색상 비율: Black 50% : Yellow 30% : White 20%
악센트: Sky Blue #68A8DB (포인트 요소에만)
IP 캐릭터: Bold outline, flat color, doodle 스타일
```

### 웹 / 디지털

```css
:root {
  --ww-black: #000000;
  --ww-yellow: #FEF200;
  --ww-white: #FFFFFF;
  --ww-sky-blue: #68A8DB;

  --ww-font-display: 'Bebas Neue', 'Impact', Arial Black, sans-serif;
  --ww-font-body: 'Helvetica Neue', Arial, sans-serif;
}

/* 시그니처 버튼 */
.ww-btn-primary {
  background: var(--ww-yellow);
  color: var(--ww-black);
  font-family: var(--ww-font-display);
  font-weight: 900;
  text-transform: uppercase;
}

/* 다크 섹션 */
.ww-section-dark {
  background: var(--ww-black);
  color: var(--ww-yellow);
}
```

---

## 품질 체크리스트

산출물에 WW 브랜드를 적용한 후 확인:

- [ ] Primary 컬러 `#FEF200` / `#000000` / `#FFFFFF` 사용
- [ ] Secondary `#68A8DB` 남용 없음 (포인트 요소에만)
- [ ] 헤딩에 Bold grotesque 계열 폰트
- [ ] 본문에 Clean sans-serif
- [ ] Doodle/Graffiti 감성 유지 (너무 깔끔하면 WW 느낌 안 남)
- [ ] IP 캐릭터 사용 시 Bold outline + flat color fill
- [ ] 레이아웃 비대칭, 여백 최소화

---

## 주의사항

- 이 가이드는 **와키윌리 전용**입니다. 다른 브랜드 출력물에는 사용하지 마십시오.
- 시즌별 Secondary 컬러는 `presets/wacky-willy/visual-identity.json` 최신 값 확인
- 고객 대면 콘텐츠는 반드시 `presets/wacky-willy/tone-manner.json`도 함께 참조
- IP 캐릭터(키키, 11 캐릭터) 활용 시 `presets/wacky-willy/ip-bible.json` 참조
