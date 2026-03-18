"""
pdf_generator.py — reportlab 기반 PDF 생성기
FPOF Document Converter
"""
from __future__ import annotations
import os
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents

from ..core.content_model import (
    DocumentContent, Section, Block, BlockType, BrandTheme, TableRow
)

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm


def _color(hex_str: str) -> HexColor:
    return HexColor(hex_str)


def _build_styles(brand: BrandTheme) -> dict:
    base = getSampleStyleSheet()
    primary   = _color(brand.primary)
    secondary = _color(brand.secondary)
    text_c    = _color(brand.text)
    text_light = _color(brand.text_light)

    styles = {
        'title': ParagraphStyle(
            'title',
            fontName='Helvetica-Bold',
            fontSize=28,
            textColor=secondary,
            spaceAfter=6,
            leading=34,
        ),
        'subtitle': ParagraphStyle(
            'subtitle',
            fontName='Helvetica',
            fontSize=14,
            textColor=text_light,
            spaceAfter=4,
        ),
        'brand': ParagraphStyle(
            'brand',
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=primary,
            spaceAfter=12,
        ),
        'h2': ParagraphStyle(
            'h2',
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=primary,
            spaceBefore=14,
            spaceAfter=6,
        ),
        'h3': ParagraphStyle(
            'h3',
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=secondary,
            spaceBefore=8,
            spaceAfter=4,
        ),
        'body': ParagraphStyle(
            'body',
            fontName='Helvetica',
            fontSize=10,
            textColor=text_c,
            leading=16,
            spaceAfter=4,
            alignment=TA_JUSTIFY,
        ),
        'bullet': ParagraphStyle(
            'bullet',
            fontName='Helvetica',
            fontSize=10,
            textColor=text_c,
            leading=15,
            leftIndent=12,
            spaceAfter=2,
        ),
        'code': ParagraphStyle(
            'code',
            fontName='Courier',
            fontSize=9,
            textColor=text_c,
            backColor=HexColor('#F5F5F5'),
            leading=13,
            spaceAfter=4,
        ),
        'kpi_value': ParagraphStyle(
            'kpi_value',
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=primary,
            spaceAfter=2,
        ),
        'kpi_label': ParagraphStyle(
            'kpi_label',
            fontName='Helvetica',
            fontSize=10,
            textColor=text_light,
            spaceAfter=6,
        ),
        'meta': ParagraphStyle(
            'meta',
            fontName='Helvetica',
            fontSize=9,
            textColor=text_light,
            spaceAfter=4,
        ),
        'toc_h1': ParagraphStyle(
            'toc_h1',
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=secondary,
        ),
        'toc_h2': ParagraphStyle(
            'toc_h2',
            fontName='Helvetica',
            fontSize=10,
            textColor=text_c,
            leftIndent=10,
        ),
    }
    return styles


def _cover_elements(doc: DocumentContent, brand: BrandTheme, styles: dict) -> list:
    elems = []
    elems.append(Spacer(1, 40 * mm))
    elems.append(Paragraph(brand.brand_name.upper(), styles['brand']))
    elems.append(Spacer(1, 8 * mm))
    elems.append(Paragraph(doc.title, styles['title']))
    if doc.subtitle:
        elems.append(Paragraph(doc.subtitle, styles['subtitle']))

    meta_parts = [x for x in [doc.season, str(doc.date)] if x]
    if meta_parts:
        elems.append(Spacer(1, 4 * mm))
        elems.append(Paragraph("  ·  ".join(meta_parts), styles['meta']))

    if doc.author:
        elems.append(Paragraph(f"Author: {doc.author}", styles['meta']))

    elems.append(Spacer(1, 8 * mm))
    elems.append(HRFlowable(width="100%", thickness=2, color=_color(brand.primary)))
    elems.append(PageBreak())
    return elems


def _block_to_flowables(block: Block, brand: BrandTheme, styles: dict) -> list:
    elems = []

    if block.type == BlockType.HEADING3:
        elems.append(Paragraph(block.text, styles['h3']))

    elif block.type == BlockType.PARAGRAPH:
        if block.text.strip():
            # HTML 이스케이프
            txt = block.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            elems.append(Paragraph(txt, styles['body']))

    elif block.type == BlockType.BULLET:
        for item in block.items:
            item_safe = item.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            elems.append(Paragraph(f"• {item_safe}", styles['bullet']))

    elif block.type == BlockType.TABLE:
        tbl_elem = _table_flowable(block, brand)
        if tbl_elem:
            elems.append(Spacer(1, 2 * mm))
            elems.append(tbl_elem)
            elems.append(Spacer(1, 2 * mm))

    elif block.type == BlockType.KPI:
        elems.append(Paragraph(block.kpi_value, styles['kpi_value']))
        if block.kpi_label:
            elems.append(Paragraph(block.kpi_label, styles['kpi_label']))

    elif block.type == BlockType.CODE:
        code_safe = block.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        elems.append(Paragraph(f'<pre>{code_safe}</pre>', styles['code']))

    elif block.type == BlockType.HR:
        elems.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#CCCCCC')))

    return elems


def _table_flowable(block: Block, brand: BrandTheme):
    rows = [r for r in block.rows if r.cells]
    if not rows:
        return None

    cols = max(len(r.cells) for r in rows)
    usable_w = PAGE_W - 2 * MARGIN
    col_w = usable_w / cols

    data = []
    for row in rows:
        padded = list(row.cells[:cols]) + [''] * (cols - len(row.cells))
        data.append(padded)

    style = TableStyle([
        ('FONTNAME',  (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',  (0, 0), (-1, -1), 9),
        ('GRID',      (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
        ('VALIGN',    (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ])

    # 헤더 스타일
    if rows[0].is_header:
        style.add('BACKGROUND', (0, 0), (-1, 0), _color(brand.secondary))
        style.add('TEXTCOLOR',  (0, 0), (-1, 0), white)
        style.add('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold')

    # 짝수 행 배경
    for r in range(1 if rows[0].is_header else 0, len(rows), 2):
        style.add('BACKGROUND', (0, r), (-1, r), HexColor('#F9F9F9'))

    return Table(data, colWidths=[col_w] * cols, style=style)


def generate(doc: DocumentContent, brand: BrandTheme,
             template: str = "report",
             output_path: str = None) -> str:
    """
    DocumentContent + BrandTheme → PDF 파일 생성
    """
    if output_path is None:
        base = os.path.splitext(os.path.basename(doc.source_path))[0]
        output_path = os.path.join(
            os.path.dirname(doc.source_path), "exports",
            f"{base}_{template}.pdf"
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    pdf = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=doc.title,
        author=doc.author or brand.brand_name,
    )

    styles = _build_styles(brand)
    story  = []

    # 커버
    story.extend(_cover_elements(doc, brand, styles))

    # 본문
    for sec in doc.sections:
        if sec.title and sec.title != "(intro)":
            story.append(Paragraph(sec.title, styles['h2']))
            story.append(HRFlowable(
                width="100%", thickness=1.5,
                color=_color(brand.primary), spaceAfter=4
            ))

        for block in sec.blocks:
            flowables = _block_to_flowables(block, brand, styles)
            story.extend(flowables)

    pdf.build(story)
    return output_path
