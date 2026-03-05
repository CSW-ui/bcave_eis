"""
brand_loader.py — visual-identity.json → BrandTheme
FPOF Document Converter Core

우선순위: visual-identity.json > defaults.json > 하드코딩 폴백
"""
from __future__ import annotations
import json
import os
from .content_model import BrandTheme


def _hex(color: str) -> str:
    """'#' 없는 hex를 '#' 포함으로 정규화"""
    color = color.strip()
    return color if color.startswith('#') else f"#{color}"


def load(
    preset_dir: Optional[str] = None,
    defaults_path: Optional[str] = None,
) -> BrandTheme:
    """
    BrandTheme 로드.

    Args:
        preset_dir:    presets/wacky-willy/ 경로 (visual-identity.json 위치)
        defaults_path: config/defaults.json 경로 (폴백용)
    """
    # 기본 경로 추론
    _here = os.path.dirname(os.path.abspath(__file__))          # core/
    _converter = os.path.dirname(_here)                          # converter/
    _project   = os.path.dirname(_converter)                     # conductor-playground/

    if preset_dir is None:
        preset_dir = os.path.join(_project, "presets", "wacky-willy")
    if defaults_path is None:
        defaults_path = os.path.join(_converter, "config", "defaults.json")

    # ── defaults.json 로드 (폴백) ──────────────────────────────────
    defaults_colors = {}
    defaults_typo   = {}
    if os.path.exists(defaults_path):
        with open(defaults_path, 'r', encoding='utf-8') as f:
            d = json.load(f)
        defaults_colors = d.get("brand_fallback", {}).get("colors", {})
        defaults_typo   = d.get("brand_fallback", {}).get("typography", {})

    theme = BrandTheme(
        primary=_hex(defaults_colors.get("primary",    "#FF6B00")),
        secondary=_hex(defaults_colors.get("secondary", "#000000")),
        accent1=_hex(defaults_colors.get("accent1",    "#0047FF")),
        accent2=_hex(defaults_colors.get("accent2",    "#FF1493")),
        accent3=_hex(defaults_colors.get("accent3",    "#B5FF00")),
        background=_hex(defaults_colors.get("background", "#FFFFFF")),
        text=_hex(defaults_colors.get("text",          "#000000")),
        text_light=_hex(defaults_colors.get("text_light", "#666666")),
        display_font=defaults_typo.get("display_font", "Inter"),
        body_font=defaults_typo.get("body_font",       "Inter"),
        heading_size=int(defaults_typo.get("heading_size", 32)),
        body_size=int(defaults_typo.get("body_size",   18)),
        caption_size=int(defaults_typo.get("caption_size", 12)),
    )

    # ── visual-identity.json 오버라이드 ───────────────────────────
    vi_path = os.path.join(preset_dir, "visual-identity.json")
    if not os.path.exists(vi_path):
        return theme

    with open(vi_path, 'r', encoding='utf-8') as f:
        vi = json.load(f)

    palette = vi.get("color_palette", {})
    primary = palette.get("primary", {})
    secondary = palette.get("secondary", {})

    # primary accent — try new key first, fall back to legacy
    accent_primary = (primary.get("signature_yellow")
                      or primary.get("vivid_orange"))
    if accent_primary:
        theme.primary = _hex(accent_primary)
    if primary.get("black"):
        theme.secondary = _hex(primary["black"])

    # secondary accent — try new key first, fall back to legacy
    accent1 = (secondary.get("sky_blue")
               or secondary.get("electric_blue"))
    if accent1:
        theme.accent1 = _hex(accent1)

    # legacy-only secondary accents
    if secondary.get("hot_pink"):
        theme.accent2 = _hex(secondary["hot_pink"])
    if secondary.get("acid_green"):
        theme.accent3 = _hex(secondary["acid_green"])

    # brand.config.json 에서 브랜드명 보완 시도
    brand_path = os.path.join(preset_dir, "brand.config.json")
    if os.path.exists(brand_path):
        with open(brand_path, 'r', encoding='utf-8') as f:
            bc = json.load(f)
        theme.brand_name = bc.get("brand_name", theme.brand_name)

    return theme


# type hint 임포트 (Python 3.9 이하 호환)
from typing import Optional
