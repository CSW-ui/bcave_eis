"""
content_model.py — DocumentContent 데이터클래스 정의
FPOF Document Converter Core
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class BlockType(Enum):
    HEADING1  = "h1"
    HEADING2  = "h2"
    HEADING3  = "h3"
    PARAGRAPH = "paragraph"
    BULLET    = "bullet"
    TABLE     = "table"
    CODE      = "code"
    HR        = "hr"
    KPI       = "kpi"       # 숫자/% 강조 패턴


@dataclass
class TableRow:
    cells: list[str]
    is_header: bool = False


@dataclass
class Block:
    type: BlockType
    text: str = ""                  # 단순 텍스트 블록
    level: int = 1                  # heading level (1–3)
    rows: list[TableRow] = field(default_factory=list)   # TABLE 전용
    items: list[str]    = field(default_factory=list)    # BULLET 전용
    language: str = ""              # CODE 전용
    kpi_value: str = ""             # KPI 전용 — 숫자 or %
    kpi_label: str = ""             # KPI 전용 — 설명


@dataclass
class Section:
    """H2 제목으로 구분된 섹션"""
    title: str
    blocks: list[Block] = field(default_factory=list)


@dataclass
class DocumentContent:
    """파서가 반환하는 최상위 문서 모델"""
    title: str                           # H1 또는 frontmatter title
    subtitle: str = ""                   # frontmatter subtitle
    season: str = ""                     # frontmatter season
    date: str = ""                       # frontmatter date
    author: str = ""                     # frontmatter author
    doc_type: str = ""                   # frontmatter type (trend-brief, brand-strategy, …)
    lang: str = "ko"                     # 감지된 언어
    sections: list[Section] = field(default_factory=list)
    raw_frontmatter: dict = field(default_factory=dict)
    source_path: str = ""


@dataclass
class BrandTheme:
    """brand_loader.py가 반환하는 브랜드 테마"""
    brand_name: str = "FPOF Brand"
    # 색상 (hex string, '#' 포함)
    primary:    str = "#FF6B00"
    secondary:  str = "#000000"
    accent1:    str = "#0047FF"
    accent2:    str = "#FF1493"
    accent3:    str = "#B5FF00"
    background: str = "#FFFFFF"
    text:       str = "#000000"
    text_light: str = "#666666"
    # 타이포
    display_font: str = "Inter"
    body_font:    str = "Inter"
    heading_size: int = 32
    body_size:    int = 18
    caption_size: int = 12
