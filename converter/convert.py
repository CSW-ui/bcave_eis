#!/usr/bin/env python3
"""
convert.py — FPOF Document Converter CLI
=========================================
MD 파일을 PPTX / DOCX / XLSX / PDF 로 변환하는 메인 진입점.

사용법:
  python converter/convert.py --input FILE --format FORMAT [--template TEMPLATE] [--lang LANG]
  python converter/convert.py --input-dir DIR --format FORMAT [--template TEMPLATE]

옵션:
  --input FILE          변환할 MD 파일 경로
  --input-dir DIR       폴더 내 모든 MD 파일 일괄 변환
  --format FORMAT       출력 형식: pptx | docx | xlsx | pdf
  --template TEMPLATE   디자인 템플릿: executive | creative | report | internal  (기본: format별 자동)
  --output DIR          출력 폴더 경로  (기본: 입력 파일 옆 exports/)
  --title TITLE         문서 제목 오버라이드  (기본: MD H1 또는 frontmatter title)
  --lang LANG           언어: ko | en | mixed  (기본: 자동 감지)
  --preset-dir DIR      presets/[브랜드]/ 경로  (기본: 자동 탐색)
  --list-formats        지원 형식 출력
"""
from __future__ import annotations
import argparse
import os
import sys
import traceback
from pathlib import Path

# ── sys.path 설정 ─────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_PARENT = os.path.dirname(_HERE)
if _PARENT not in sys.path:
    sys.path.insert(0, _PARENT)

from converter.core.parser import parse
from converter.core.brand_loader import load as load_brand

# ── 포맷 → 기본 템플릿 매핑 ──────────────────────────────────────────
_DEFAULT_TEMPLATE = {
    "pptx": "executive",
    "docx": "internal",
    "xlsx": "internal",
    "pdf":  "report",
}

SUPPORTED_FORMATS   = list(_DEFAULT_TEMPLATE.keys())
SUPPORTED_TEMPLATES = ["executive", "creative", "report", "internal"]


def _resolve_output_path(input_path: str, output_dir: str,
                          template: str, fmt: str) -> str:
    """출력 파일 경로 결정"""
    base = os.path.splitext(os.path.basename(input_path))[0]
    filename = f"{base}_{template}.{fmt}"
    if output_dir:
        return os.path.join(output_dir, filename)
    # 기본: 입력 파일 옆 exports/
    src_dir = os.path.dirname(os.path.abspath(input_path))
    return os.path.join(src_dir, "exports", filename)


def _find_preset_dir() -> str | None:
    """conductor-playground/presets/ 하위의 첫 번째 브랜드 폴더 자동 탐색"""
    candidates = [
        os.path.join(_PARENT, "presets"),
        os.path.join(_HERE, "..", "presets"),
    ]
    for base in candidates:
        if os.path.isdir(base):
            for entry in os.listdir(base):
                vi = os.path.join(base, entry, "visual-identity.json")
                if os.path.exists(vi):
                    return os.path.join(base, entry)
    return None


def convert_file(
    input_path: str,
    fmt: str,
    template: str,
    output_dir: str = None,
    title_override: str = None,
    lang_override: str = None,
    preset_dir: str = None,
    verbose: bool = True,
) -> str:
    """단일 MD 파일 변환. 생성된 파일 경로 반환."""

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"입력 파일 없음: {input_path}")

    fmt      = fmt.lower()
    template = template.lower()

    if fmt not in SUPPORTED_FORMATS:
        raise ValueError(f"지원하지 않는 형식: {fmt}. 지원 형식: {SUPPORTED_FORMATS}")
    if template not in SUPPORTED_TEMPLATES:
        raise ValueError(f"지원하지 않는 템플릿: {template}. 지원 템플릿: {SUPPORTED_TEMPLATES}")

    if verbose:
        print(f"  파싱 중: {input_path}")

    # 1. 파싱
    doc = parse(input_path, lang_override=lang_override)
    if title_override:
        doc.title = title_override

    # 2. 브랜드 로드
    _preset = preset_dir or _find_preset_dir()
    brand = load_brand(preset_dir=_preset)

    # 3. 출력 경로
    out_path = _resolve_output_path(input_path, output_dir, template, fmt)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    if verbose:
        print(f"  생성 중: [{fmt.upper()}] {os.path.basename(out_path)}")

    # 4. 생성
    if fmt == "pptx":
        from converter.generators.pptx_generator import generate
    elif fmt == "docx":
        from converter.generators.docx_generator import generate
    elif fmt == "xlsx":
        from converter.generators.xlsx_generator import generate
    elif fmt == "pdf":
        from converter.generators.pdf_generator import generate

    result = generate(doc, brand, template=template, output_path=out_path)

    if verbose:
        print(f"  ✓ 저장 완료: {result}")

    return result


def convert_dir(
    input_dir: str,
    fmt: str,
    template: str,
    output_dir: str = None,
    lang_override: str = None,
    preset_dir: str = None,
    verbose: bool = True,
) -> list[str]:
    """폴더 내 모든 MD 파일 일괄 변환. 결과 경로 리스트 반환."""
    md_files = sorted(Path(input_dir).glob("*.md"))
    if not md_files:
        print(f"  ⚠ MD 파일 없음: {input_dir}")
        return []

    results = []
    for md_file in md_files:
        try:
            out = convert_file(
                str(md_file), fmt, template,
                output_dir=output_dir,
                lang_override=lang_override,
                preset_dir=preset_dir,
                verbose=verbose,
            )
            results.append(out)
        except Exception as e:
            print(f"  ✗ {md_file.name}: {e}")
    return results


def main():
    parser = argparse.ArgumentParser(
        prog="convert.py",
        description="FPOF Document Converter — MD → PPTX / DOCX / XLSX / PDF",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python converter/convert.py --input output/26SS/_season/plan_trend-brief.md --format pptx --template executive
  python converter/convert.py --input-dir output/26SS/_season/ --format pdf --template report
  python converter/convert.py --list-formats
        """
    )

    src = parser.add_mutually_exclusive_group()
    src.add_argument("--input",     metavar="FILE", help="변환할 MD 파일 경로")
    src.add_argument("--input-dir", metavar="DIR",  help="폴더 내 모든 MD 파일 일괄 변환")

    parser.add_argument("--format",     "-f", metavar="FORMAT",   default=None,
                        help=f"출력 형식: {' | '.join(SUPPORTED_FORMATS)}")
    parser.add_argument("--template",   "-t", metavar="TEMPLATE", default=None,
                        help=f"디자인 템플릿: {' | '.join(SUPPORTED_TEMPLATES)}")
    parser.add_argument("--output",     "-o", metavar="DIR",      default=None,
                        help="출력 폴더 (기본: exports/ 하위)")
    parser.add_argument("--title",      metavar="TITLE", default=None,
                        help="문서 제목 오버라이드")
    parser.add_argument("--lang",       metavar="LANG",  default=None,
                        choices=["ko", "en", "mixed"],
                        help="언어 (기본: 자동 감지)")
    parser.add_argument("--preset-dir", metavar="DIR",   default=None,
                        help="presets/[브랜드]/ 경로")
    parser.add_argument("--list-formats", action="store_true",
                        help="지원 형식 목록 출력 후 종료")
    parser.add_argument("--quiet", "-q", action="store_true",
                        help="진행 메시지 숨기기")

    args = parser.parse_args()

    if args.list_formats:
        print("지원 형식:")
        for fmt in SUPPORTED_FORMATS:
            default_tpl = _DEFAULT_TEMPLATE[fmt]
            print(f"  {fmt:<6} — 기본 템플릿: {default_tpl}")
        print("\n지원 템플릿:")
        for tpl in SUPPORTED_TEMPLATES:
            print(f"  {tpl}")
        return

    if not args.input and not args.input_dir:
        parser.error("--input 또는 --input-dir 중 하나를 지정하세요.")
    if not args.format:
        parser.error("--format 을 지정하세요. (pptx | docx | xlsx | pdf)")

    fmt      = args.format.lower()
    template = (args.template or _DEFAULT_TEMPLATE.get(fmt, "executive")).lower()
    verbose  = not args.quiet

    try:
        if args.input:
            if verbose:
                print(f"\n=== FPOF Converter: {fmt.upper()} ===")
            convert_file(
                input_path=args.input,
                fmt=fmt,
                template=template,
                output_dir=args.output,
                title_override=args.title,
                lang_override=args.lang,
                preset_dir=args.preset_dir,
                verbose=verbose,
            )
        else:
            if verbose:
                print(f"\n=== FPOF Converter: 일괄 변환 [{fmt.upper()}] ===")
            results = convert_dir(
                input_dir=args.input_dir,
                fmt=fmt,
                template=template,
                output_dir=args.output,
                lang_override=args.lang,
                preset_dir=args.preset_dir,
                verbose=verbose,
            )
            if verbose:
                print(f"\n완료: {len(results)}개 파일 생성")

    except (FileNotFoundError, ValueError) as e:
        print(f"오류: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"예상치 못한 오류: {e}", file=sys.stderr)
        if verbose:
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
