"""
parser.py — Markdown + YAML frontmatter 파서
FPOF Document Converter Core

반환: DocumentContent
"""
from __future__ import annotations
import re
import os
from typing import Optional

try:
    import frontmatter
except ImportError:
    frontmatter = None  # 그레이스풀 폴백

from .content_model import (
    DocumentContent, Section, Block, BlockType, TableRow
)


# ── KPI 패턴: "숫자% 설명" or "설명: 숫자%" ─────────────────────────
_KPI_PATTERNS = [
    re.compile(r'^([\d,\.]+\s*%)\s*[—\-:]?\s*(.+)$'),  # 30% — 성장률
    re.compile(r'^([\d,\.]+[억만천원$])\s*[—\-:]?\s*(.+)$'),  # 10억 — 목표 매출
    re.compile(r'^(.+?)\s*:\s*([\d,\.]+\s*%?)$'),       # 성장률: 30%
]

_KPI_STANDALONE = re.compile(r'^([\d,\.]+\s*[%억만천원$]?)$')  # 단독 숫자


def _detect_lang(text: str) -> str:
    """한글 비율로 언어 감지"""
    korean = len(re.findall(r'[\uAC00-\uD7A3]', text))
    total  = len(re.findall(r'[\w]', text)) or 1
    ratio  = korean / total
    if ratio > 0.3:
        return "ko"
    if ratio > 0.05:
        return "mixed"
    return "en"


def _parse_table(lines: list[str]) -> Block:
    """마크다운 테이블 → Block(TABLE)"""
    rows: list[TableRow] = []
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or line.startswith('|---') or re.match(r'^\|[-: |]+\|$', line):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        rows.append(TableRow(cells=cells, is_header=(i == 0)))
    return Block(type=BlockType.TABLE, rows=rows)


def _try_kpi(text: str) -> Optional[Block]:
    """텍스트가 KPI 패턴이면 KPI Block 반환"""
    text = text.strip()
    for pat in _KPI_PATTERNS:
        m = pat.match(text)
        if m:
            g = m.groups()
            # 첫 그룹이 숫자면 value, 나머지 label
            if re.search(r'\d', g[0]):
                return Block(type=BlockType.KPI, kpi_value=g[0], kpi_label=g[1] if len(g) > 1 else "")
            else:
                return Block(type=BlockType.KPI, kpi_value=g[1], kpi_label=g[0])
    return None


def _parse_body(body: str) -> list[Section]:
    """MD 본문 → Section 리스트"""
    sections: list[Section] = []
    current_section = Section(title="(intro)")
    lines = body.splitlines()

    i = 0
    while i < len(lines):
        line = lines[i]

        # H1 — 문서 제목이므로 섹션으로 취급 안 함
        if re.match(r'^#\s+', line):
            i += 1
            continue

        # H2 → 새 섹션
        m = re.match(r'^##\s+(.+)$', line)
        if m:
            if current_section.blocks or current_section.title != "(intro)":
                sections.append(current_section)
            current_section = Section(title=m.group(1).strip())
            i += 1
            continue

        # H3 → 섹션 내 heading
        m = re.match(r'^###\s+(.+)$', line)
        if m:
            current_section.blocks.append(
                Block(type=BlockType.HEADING3, text=m.group(1).strip(), level=3)
            )
            i += 1
            continue

        # #### 이하 → paragraph로 취급
        m = re.match(r'^#{4,}\s+(.+)$', line)
        if m:
            current_section.blocks.append(
                Block(type=BlockType.PARAGRAPH, text=m.group(1).strip())
            )
            i += 1
            continue

        # 테이블 감지
        if '|' in line and re.match(r'^\s*\|', line):
            table_lines = []
            while i < len(lines) and ('|' in lines[i]):
                table_lines.append(lines[i])
                i += 1
            current_section.blocks.append(_parse_table(table_lines))
            continue

        # 코드 블록
        if line.startswith('```'):
            lang = line[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1
            current_section.blocks.append(
                Block(type=BlockType.CODE, text='\n'.join(code_lines), language=lang)
            )
            continue

        # 불릿 리스트 — 연속된 불릿을 하나의 Block으로 묶음
        if re.match(r'^[\*\-\+]\s+', line) or re.match(r'^\d+\.\s+', line):
            items = []
            while i < len(lines) and (
                re.match(r'^[\*\-\+]\s+', lines[i]) or
                re.match(r'^\d+\.\s+', lines[i])
            ):
                items.append(re.sub(r'^[\*\-\+\d\.]+\s+', '', lines[i]).strip())
                i += 1
            current_section.blocks.append(Block(type=BlockType.BULLET, items=items))
            continue

        # HR
        if re.match(r'^[-*_]{3,}$', line.strip()):
            current_section.blocks.append(Block(type=BlockType.HR))
            i += 1
            continue

        # 빈 줄
        if not line.strip():
            i += 1
            continue

        # 일반 텍스트 — KPI 먼저 시도
        clean = re.sub(r'\*\*(.+?)\*\*', r'\1', line).strip()  # bold 제거
        clean = re.sub(r'\*(.+?)\*', r'\1', clean)
        clean = re.sub(r'`(.+?)`', r'\1', clean)

        kpi = _try_kpi(clean)
        if kpi:
            current_section.blocks.append(kpi)
        else:
            current_section.blocks.append(Block(type=BlockType.PARAGRAPH, text=clean))

        i += 1

    if current_section.blocks or current_section.title != "(intro)":
        sections.append(current_section)

    return sections


def parse(filepath: str, lang_override: Optional[str] = None) -> DocumentContent:
    """MD 파일 경로 → DocumentContent"""
    with open(filepath, 'r', encoding='utf-8') as f:
        raw = f.read()

    # frontmatter 파싱
    fm_meta: dict = {}
    body = raw

    if frontmatter is not None:
        post = frontmatter.loads(raw)
        fm_meta = dict(post.metadata)
        body = post.content
    else:
        # 수동 frontmatter 파싱 (---로 감싸인 YAML)
        m = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', raw, re.DOTALL)
        if m:
            import json
            yaml_block = m.group(1)
            body = m.group(2)
            for line in yaml_block.splitlines():
                kv = re.match(r'^(\w[\w_-]*):\s*(.+)$', line.strip())
                if kv:
                    fm_meta[kv.group(1)] = kv.group(2).strip().strip('"\'')

    # H1 제목 추출
    h1_match = re.search(r'^#\s+(.+)$', body, re.MULTILINE)
    title = fm_meta.get('title') or (h1_match.group(1).strip() if h1_match else os.path.basename(filepath))

    detected_lang = lang_override or _detect_lang(body)

    sections = _parse_body(body)

    return DocumentContent(
        title=title,
        subtitle=str(fm_meta.get('subtitle', '')),
        season=str(fm_meta.get('season', '')),
        date=str(fm_meta.get('date', '')),
        author=str(fm_meta.get('author', '')),
        doc_type=str(fm_meta.get('type', '')),
        lang=detected_lang,
        sections=sections,
        raw_frontmatter=fm_meta,
        source_path=filepath,
    )
