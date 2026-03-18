#!/usr/bin/env bash
# FPOF Converter — 최초 1회 설치 스크립트
# 폰트(Pretendard, Inter)와 PPTX 테마를 다운로드합니다.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FONTS_DIR="$SCRIPT_DIR/design/fonts"
THEMES_DIR="$SCRIPT_DIR/themes"

echo "=== FPOF Document Converter Setup ==="
echo ""

# ── 폰트 다운로드 ──────────────────────────────────────────────
echo "[1/2] 폰트 다운로드 중..."
mkdir -p "$FONTS_DIR"

# Pretendard (한글 + 영문 무료 OFL)
PRETENDARD_URL="https://github.com/orioncactus/pretendard/releases/latest/download/Pretendard.zip"
INTER_URL="https://github.com/rsms/inter/releases/latest/download/Inter.zip"

# Pretendard
if [ ! -f "$FONTS_DIR/Pretendard-Regular.otf" ]; then
  echo "  → Pretendard 다운로드..."
  TMP=$(mktemp -d)
  if curl -fsSL "$PRETENDARD_URL" -o "$TMP/Pretendard.zip" 2>/dev/null; then
    unzip -q "$TMP/Pretendard.zip" -d "$TMP/Pretendard"
    # OTF 파일을 fonts/ 로 복사 (Regular, Bold, SemiBold)
    find "$TMP/Pretendard" -name "Pretendard-Regular.otf" -exec cp {} "$FONTS_DIR/" \;
    find "$TMP/Pretendard" -name "Pretendard-Bold.otf" -exec cp {} "$FONTS_DIR/" \;
    find "$TMP/Pretendard" -name "Pretendard-SemiBold.otf" -exec cp {} "$FONTS_DIR/" \;
    echo "  ✓ Pretendard 완료"
  else
    echo "  ⚠ Pretendard 다운로드 실패 — 시스템 폰트 사용"
  fi
  rm -rf "$TMP"
else
  echo "  ✓ Pretendard 이미 설치됨"
fi

# Inter (영문 OFL)
if [ ! -f "$FONTS_DIR/Inter-Regular.ttf" ]; then
  echo "  → Inter 다운로드..."
  TMP=$(mktemp -d)
  if curl -fsSL "$INTER_URL" -o "$TMP/Inter.zip" 2>/dev/null; then
    unzip -q "$TMP/Inter.zip" -d "$TMP/Inter"
    find "$TMP/Inter" -name "Inter-Regular.ttf" -exec cp {} "$FONTS_DIR/" \;
    find "$TMP/Inter" -name "Inter-Bold.ttf" -exec cp {} "$FONTS_DIR/" \;
    find "$TMP/Inter" -name "Inter-SemiBold.ttf" -exec cp {} "$FONTS_DIR/" \;
    echo "  ✓ Inter 완료"
  else
    echo "  ⚠ Inter 다운로드 실패 — 시스템 폰트 사용"
  fi
  rm -rf "$TMP"
else
  echo "  ✓ Inter 이미 설치됨"
fi

# ── PPTX 테마 생성 ─────────────────────────────────────────────
echo ""
echo "[2/2] PPTX 테마 생성 중..."
mkdir -p "$THEMES_DIR"

# python-pptx로 기본 테마 .potx 파일 생성
THEMES_DIR_FOR_PY="$THEMES_DIR"
python3 - "$THEMES_DIR_FOR_PY" <<'PYEOF'
import sys, os

try:
    from pptx import Presentation
    from pptx.util import Inches

    themes_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "themes")

    # 4가지 테마 색상 정의
    themes = {
        "executive": {
            "accent1": "FF6B00",  # vivid orange
            "dk1":     "000000",  # black
            "dk2":     "1A1A1A",  # near black
            "lt1":     "FFFFFF",  # white
            "lt2":     "F5F5F5",  # off-white
            "accent2": "0047FF",  # electric blue
            "accent3": "222222",
            "accent4": "444444",
            "accent5": "666666",
            "accent6": "999999",
        },
        "creative": {
            "accent1": "FF6B00",
            "dk1":     "000000",
            "dk2":     "111111",
            "lt1":     "FFFFFF",
            "lt2":     "FFFAF5",
            "accent2": "FF1493",  # hot pink
            "accent3": "B5FF00",  # acid green
            "accent4": "0047FF",
            "accent5": "FF6B00",
            "accent6": "000000",
        },
        "report": {
            "accent1": "FF6B00",
            "dk1":     "1A1A2E",
            "dk2":     "16213E",
            "lt1":     "FFFFFF",
            "lt2":     "F8F9FA",
            "accent2": "0047FF",
            "accent3": "333333",
            "accent4": "555555",
            "accent5": "777777",
            "accent6": "999999",
        },
        "internal": {
            "accent1": "FF6B00",
            "dk1":     "333333",
            "dk2":     "555555",
            "lt1":     "FFFFFF",
            "lt2":     "FAFAFA",
            "accent2": "0047FF",
            "accent3": "444444",
            "accent4": "666666",
            "accent5": "888888",
            "accent6": "AAAAAA",
        },
    }

    for name, colors in themes.items():
        path = os.path.join(themes_dir, f"{name}.potx")
        if os.path.exists(path):
            print(f"  ✓ {name}.potx 이미 존재")
            continue
        prs = Presentation()
        prs.slide_width  = Inches(13.33)
        prs.slide_height = Inches(7.5)
        prs.save(path)
        print(f"  ✓ {name}.potx 생성 완료")

    print("\n테마 생성 완료!")

except ImportError as e:
    print(f"  ⚠ python-pptx 없음: {e}")
    print("  먼저 pip install -r requirements.txt 실행 후 다시 시도하세요.")
PYEOF

echo ""
echo "=== 설치 완료 ==="
echo ""
echo "사용 방법:"
echo "  python converter/convert.py --input output/26SS/_season/파일.md --format pptx --template executive"
echo ""
