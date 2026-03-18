#!/usr/bin/env python3
"""
FPOF Market Intelligence — Report Generator
3축 위클리 트렌드 리포트: 라이프스타일 / 패션 관심사 / 아이템 유형
- 마크다운 상세 리포트 생성
- Teams Adaptive Card JSON 동시 생성
Usage: python3 scripts/market-intel/generate-report.py
       → stdout에 리포트 파일 경로 출력
"""

import json
import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = PROJECT_ROOT / "config" / "market-intel-config.json"
DATA_DIR = PROJECT_ROOT / "data" / "market-intel"

WEBHOOK_URL = "https://barrelsco.webhook.office.com/webhookb2/d8954247-b422-4200-a42f-1633a72bea8f@09cefcf6-a744-4cc2-a8ec-681fe0d1a85a/IncomingWebhook/a841af53650f41768a2ba5743c51f81b/340d1d22-3feb-4861-8fa7-0817ccb36e31/V2eQcdNKq4VtO3MEbbM7j58jOkRpTdCdO9zxFHTcEGpZA1"

SPARK = "▁▂▃▄▅▆▇█"


def sparkline(values):
    if not values:
        return ""
    mn, mx = min(values), max(values)
    rng = mx - mn if mx != mn else 1
    return "".join(SPARK[min(int((v - mn) / rng * 7), 7)] for v in values)


def trend_arrow(pct):
    if pct is None:
        return "—"
    if pct > 15:
        return "🔥"
    if pct > 5:
        return "↑"
    if pct > -5:
        return "→"
    if pct > -15:
        return "↓"
    return "❄️"


def wow_label(wow):
    """WoW 변동률 → 상태 라벨"""
    if wow is None:
        return "데이터 부족"
    if wow > 50:
        return "급등"
    if wow > 15:
        return "상승세"
    if wow > 5:
        return "소폭 상승"
    if wow > -5:
        return "안정세"
    if wow > -15:
        return "소폭 하락"
    if wow > -50:
        return "하락세"
    return "급락"


def find_latest_raw():
    files = sorted(DATA_DIR.glob("raw-*.json"), reverse=True)
    if not files:
        raise FileNotFoundError(f"데이터 없음: {DATA_DIR}/raw-*.json")
    return files[0]


# ── 네이버 축 데이터 추출 ──────────────────────────────────

def extract_naver_rankings(axis_data):
    """네이버 축 데이터 → 랭킹 리스트 (현재 지수, WoW, 스파크라인)"""
    rankings = []
    if not axis_data or isinstance(axis_data, dict) and "error" in axis_data:
        return rankings

    for g in axis_data:
        resp = g.get("response", {})
        if "error" in resp or "results" not in resp:
            rankings.append({"name": g["group_name"], "index": None, "wow": None, "spark": []})
            continue

        data_pts = resp["results"][0].get("data", [])
        values = [d["ratio"] for d in data_pts]
        cur = values[-1] if values else None
        prev = values[-2] if len(values) >= 2 else None
        wow = round((cur - prev) / prev * 100, 1) if cur and prev and prev != 0 else None
        recent = values[-5:] if len(values) >= 5 else values

        rankings.append({"name": g["group_name"], "index": round(cur, 1) if cur else None, "wow": wow, "spark": recent})

    rankings.sort(key=lambda x: x.get("index") or 0, reverse=True)
    return rankings


# ── 키워드별 상세 분석 ─────────────────────────────────────

def keyword_detail(r):
    """키워드 1개에 대한 상세 분석 라인 생성"""
    name = r["name"]
    index = r["index"]
    wow = r["wow"]
    spark = r["spark"]

    if index is None:
        return [f"- **{name}**: 검색량이 매우 적거나 데이터가 수집되지 않았습니다. 해당 키워드의 유효성을 재검토하거나, 유사 키워드로 교체를 검토하세요."]

    label = wow_label(wow)
    lines = []

    wow_str = f"WoW {wow:+.1f}%" if wow is not None else "변동률 N/A"
    main_line = f"- **{name}** (지수 {index}, {wow_str}) — {label}."

    if wow is not None:
        if wow > 50:
            main_line += " 검색 관심이 크게 증가하고 있어 즉시 주목이 필요합니다."
            lines.append(main_line)
            lines.append(f"  - 💡 '{name}' 관련 상품 기획 및 마케팅 연계 즉시 검토 권장")
            lines.append(f"  - 💡 SNS 콘텐츠·해시태그에 '{name}' 키워드 적극 활용")
        elif wow > 15:
            main_line += " 트렌드 초기 진입 가능성이 있습니다. 향후 2~3주 추이를 주시하세요."
            lines.append(main_line)
            lines.append(f"  - 💡 관련 아이템 라인업 확인 및 SNS 모니터링 강화")
        elif wow > 5:
            main_line += " 관심도가 소폭 상승하고 있습니다."
            lines.append(main_line)
        elif wow > -5:
            main_line += " 큰 변동 없이 일정한 관심을 유지하고 있습니다."
            lines.append(main_line)
        elif wow > -15:
            main_line += " 관심이 약간 줄고 있으나 일시적 변동일 수 있습니다. 추이를 모니터링하세요."
            lines.append(main_line)
        elif wow > -50:
            main_line += " 트렌드 피크를 지난 것으로 보입니다."
            lines.append(main_line)
            lines.append(f"  - ⚠️ '{name}' 관련 라인 QR 물량 조정 및 재고 관리 주의")
        else:
            main_line += " 검색 관심이 크게 감소했습니다."
            lines.append(main_line)
            lines.append(f"  - ⚠️ '{name}' 관련 라인 신규 투자 보류, 재고 소진 전략 검토")
    else:
        lines.append(main_line)

    # 스파크라인 추세 분석
    if spark and len(spark) >= 3:
        recent = spark[-3:]
        if recent[0] < recent[1] < recent[2]:
            lines.append("  - 📈 최근 3주 연속 상승 추세")
        elif recent[0] > recent[1] > recent[2]:
            lines.append("  - 📉 최근 3주 연속 하락 추세")
        elif len(spark) >= 3 and spark[-1] > spark[-2] and spark[-2] < spark[-3]:
            lines.append("  - 🔄 직전 주 대비 반등 신호 감지")

    return lines


def axis_summary(axis_label, rankings):
    """축별 종합 요약 문단 생성"""
    if not rankings:
        return f"이번 주 {axis_label} 데이터를 수집할 수 없었습니다."

    total = len(rankings)
    with_data = [r for r in rankings if r["wow"] is not None]
    rising_count = len([r for r in with_data if r["wow"] > 5])
    falling_count = len([r for r in with_data if r["wow"] < -5])
    stable_count = len([r for r in with_data if -5 <= r["wow"] <= 5])
    no_data = total - len(with_data)

    if falling_count > rising_count and falling_count > stable_count:
        trend_desc = "전반적으로 하락세를 보이고 있습니다"
    elif rising_count > falling_count:
        trend_desc = "전반적으로 상승세를 보이고 있습니다"
    elif stable_count >= rising_count and stable_count >= falling_count:
        trend_desc = "대체로 안정세를 유지하고 있습니다"
    else:
        trend_desc = "혼조세를 보이고 있습니다"

    counts = []
    if rising_count:
        counts.append(f"{rising_count}개 상승")
    if falling_count:
        counts.append(f"{falling_count}개 하락")
    if stable_count:
        counts.append(f"{stable_count}개 안정")
    if no_data:
        counts.append(f"{no_data}개 데이터 부족")

    parts = [f"이번 주 {axis_label} 트렌드는 {trend_desc}. {total}개 키워드 중 {', '.join(counts)}."]

    if with_data:
        biggest_rise = max(with_data, key=lambda x: x["wow"])
        biggest_fall = min(with_data, key=lambda x: x["wow"])
        if biggest_rise["wow"] > 15:
            parts.append(f" **{biggest_rise['name']}**의 상승({biggest_rise['wow']:+.1f}%)이 가장 두드러지며, 관련 상품 기획과 마케팅 연계를 적극 검토할 필요가 있습니다.")
        if biggest_fall["wow"] < -15:
            parts.append(f" **{biggest_fall['name']}**의 하락({biggest_fall['wow']:+.1f}%)이 가장 크며, 해당 라인의 재고 관리와 QR 전략 재검토가 필요합니다.")

    return "".join(parts)


# ── 리포트 빌드 ────────────────────────────────────────────

def build_report(raw, config):
    today = raw["fetch_date"]
    season = raw["season"]
    target = raw.get("target_audience", "18~25세 트렌드리더")
    naver = raw.get("naver", {})

    lines = []

    # Frontmatter
    lines.extend([
        "---",
        f'title: "위클리 트렌드 인텔리전스 — {today}"',
        f'date: "{today}"',
        f'author: "데이터 인텔리전스 / 마켓 인텔리전스 애널리스트"',
        f'season: "{season}"',
        f'phase: "plan"',
        f'tags: [위클리트렌드, 라이프스타일, 패션관심사, 아이템트렌드, 자동화]',
        "---",
        "",
        f"# 위클리 트렌드 인텔리전스 — {today}",
        "",
        f"> {target} 기준 | 네이버 데이터랩 쇼핑 인사이트 자동 수집·분석",
        "",
    ])

    # 3축 데이터 추출
    axis_data = {}
    for key in ["lifestyle", "fashion_interest", "item_type"]:
        axis_data[key] = extract_naver_rankings(naver.get(key, []))

    # ── Executive Summary ──
    all_ranked = {}
    for rankings in axis_data.values():
        for r in rankings:
            if r["wow"] is not None:
                all_ranked[r["name"]] = r

    rising = sorted([r for r in all_ranked.values() if r["wow"] and r["wow"] > 0],
                    key=lambda x: x["wow"], reverse=True)
    falling = sorted([r for r in all_ranked.values() if r["wow"] and r["wow"] < 0],
                     key=lambda x: x["wow"])

    lines.extend([
        "## Executive Summary",
        "",
        "### 🔥 뜨는 키워드 TOP 3",
        "",
    ])
    if rising:
        for r in rising[:3]:
            label = wow_label(r["wow"])
            lines.append(f"- {trend_arrow(r['wow'])} **{r['name']}** — WoW {r['wow']:+.1f}% ({label})")
    else:
        lines.append("- 이번 주 뚜렷한 상승 키워드 없음")
    lines.append("")

    lines.append("### ❄️ 지는 키워드 TOP 3")
    lines.append("")
    if falling:
        for r in falling[:3]:
            label = wow_label(r["wow"])
            lines.append(f"- {trend_arrow(r['wow'])} **{r['name']}** — WoW {r['wow']:+.1f}% ({label})")
    else:
        lines.append("- 이번 주 뚜렷한 하락 키워드 없음")
    lines.extend(["", "---", ""])

    # ── 축 1: 라이프스타일 트렌드 ──
    lines.extend([
        "## 1. 라이프스타일 트렌드 — 타겟 고객은 지금 무엇에 빠져 있나?",
        "",
        f"> {target}의 라이프스타일 관심사 변화를 추적합니다.",
        "",
    ])
    _render_axis_full(lines, "라이프스타일", axis_data["lifestyle"])

    # ── 축 2: 패션 관심사 ──
    lines.extend([
        "## 2. 패션 무드 & 관심사 — 어떤 스타일이 뜨고 있나?",
        "",
        "> 패션 전반의 스타일 키워드 흐름을 모니터링합니다.",
        "",
    ])
    _render_axis_full(lines, "패션 관심사", axis_data["fashion_interest"])

    # ── 축 3: 아이템 유형 ──
    lines.extend([
        "## 3. 아이템 유형 트렌드 — 어떤 아이템이 검색되고 있나?",
        "",
        "> 구체적인 패션 아이템 카테고리의 수요 변화를 추적합니다.",
        "",
    ])
    _render_axis_full(lines, "아이템 유형", axis_data["item_type"])

    # ── 와키윌리 인사이트 & MD 액션 ──
    lines.extend([
        "## 4. 와키윌리 인사이트 & MD 액션",
        "",
    ])
    _render_insights(lines, rising, falling)
    lines.extend(["", "---", ""])

    # ── 메타데이터 ──
    lines.append("## 메타데이터")
    lines.append("")
    lines.append(f"- **수집일**: {today}")
    period = config["naver_datalab"]["period_months"]
    lines.append(f"- **네이버 데이터랩**: 최근 {period}개월, 패션의류 카테고리")
    lines.append(f"- **설정**: config/market-intel-config.json")
    next_mon = datetime.date.today() + datetime.timedelta(days=(7 - datetime.date.today().weekday()) % 7 or 7)
    lines.append(f"- **다음 실행**: {next_mon.isoformat()} (월요일 09:00)")
    lines.append("")

    return "\n".join(lines), rising, falling, axis_data


def _render_axis_full(lines, axis_label, rankings):
    """축 데이터: 테이블 + 키워드별 상세 분석 + 축 요약"""

    if not rankings:
        lines.append(f"*{axis_label} 데이터를 수집할 수 없었습니다.*")
        lines.extend(["", "---", ""])
        return

    # 랭킹 테이블
    lines.append("| 순위 | 키워드 | 지수 | WoW | 방향 | 추이 |")
    lines.append("|------|--------|------|-----|------|------|")
    for i, r in enumerate(rankings, 1):
        idx = f"{r['index']}" if r["index"] is not None else "—"
        wow = f"{r['wow']:+.1f}%" if r["wow"] is not None else "—"
        arrow = trend_arrow(r["wow"])
        spark = sparkline(r["spark"])
        lines.append(f"| {i} | {r['name']} | {idx} | {wow} | {arrow} | {spark} |")
    lines.append("")

    # 키워드별 상세 분석
    lines.append(f"### 키워드별 상세 분석")
    lines.append("")
    for r in rankings:
        for detail_line in keyword_detail(r):
            lines.append(detail_line)
    lines.append("")

    # 축 요약
    lines.append(f"### {axis_label} 축 요약")
    lines.append("")
    lines.append(axis_summary(axis_label, rankings))
    lines.extend(["", "---", ""])


def _render_insights(lines, rising, falling):
    """트렌드 변화를 와키윌리 관점으로 해석"""

    lines.append("| 우선순위 | 인사이트 | 근거 | 제안 액션 |")
    lines.append("|---------|---------|------|---------|")

    actions_added = 0

    for r in rising[:3]:
        lines.append(
            f"| 🔥 즉시 | {r['name']} 급상승 — 브랜드 연계 기회 | "
            f"WoW {r['wow']:+.1f}% | 상품명/캡션/해시태그 반영, 관련 아이템 기획 검토 |"
        )
        actions_added += 1

    for r in falling[:3]:
        lines.append(
            f"| ❄️ 모니터링 | {r['name']} 하락세 — 재고/QR 주의 | "
            f"WoW {r['wow']:+.1f}% | 해당 라인 QR 보류, 1~2주 추이 재확인 |"
        )
        actions_added += 1

    if actions_added == 0:
        lines.append("| — | 이번 주 큰 변동 없음 | 전반적 안정세 | 기존 전략 유지 |")

    lines.append("")

    # 상세 액션 플랜
    lines.append("### 상세 액션 플랜")
    lines.append("")

    if rising:
        lines.append("**🔥 즉시 대응 (이번 주)**")
        lines.append("")
        for i, r in enumerate(rising[:3], 1):
            label = wow_label(r["wow"])
            lines.append(f"{i}. **{r['name']}** ({label}, WoW {r['wow']:+.1f}%)")
            lines.append(f"   - 현재 진행 중인 '{r['name']}' 관련 라인이 있다면 마케팅 부스팅 검토")
            lines.append(f"   - SNS 콘텐츠에 '{r['name']}' 관련 해시태그 적극 활용")
            lines.append(f"   - 상품명·PDP 카피에 '{r['name']}' 키워드 포함 여부 확인 및 반영")
        lines.append("")

    if falling:
        lines.append("**❄️ 모니터링 (1~2주 추적)**")
        lines.append("")
        for i, r in enumerate(falling[:3], 1):
            label = wow_label(r["wow"])
            lines.append(f"{i}. **{r['name']}** ({label}, WoW {r['wow']:+.1f}%)")
            if r["wow"] < -50:
                lines.append(f"   - 해당 라인 추가 QR 보류 권장, 재고 소진 전략 검토")
            else:
                lines.append(f"   - 1~2주 후 반등 여부 재확인, QR 물량 조정 검토")
            lines.append(f"   - 하락이 시즌 전환 영향인지 트렌드 이탈인지 구분 필요")
        lines.append("")

    if not rising and not falling:
        lines.append("이번 주는 전반적으로 안정세를 보이고 있습니다. 기존 전략을 유지하면서 다음 주 변동 여부를 주시하세요.")
        lines.append("")


# ── Teams Adaptive Card 생성 ──────────────────────────────

def build_teams_card(today, target, rising, falling, axis_data):
    """전체 내용을 포함하는 Teams Adaptive Card JSON 생성"""

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    # 축별 텍스트 포맷
    def format_axis_text(rankings):
        if not rankings:
            return "데이터 수집 불가"
        parts = []
        for i, r in enumerate(rankings, 1):
            idx = r["index"] if r["index"] is not None else "—"
            if r["wow"] is not None:
                label = wow_label(r["wow"])
                arrow = trend_arrow(r["wow"])
                parts.append(f"{i}. {arrow} **{r['name']}** — 지수 {idx} | WoW {r['wow']:+.1f}% | {label}")
                # 간단 코멘트
                if r["wow"] > 50:
                    parts.append(f"   → 즉시 주목. 상품 기획·마케팅 연계 검토")
                elif r["wow"] > 15:
                    parts.append(f"   → 상승 초기. SNS 모니터링 강화")
                elif r["wow"] < -50:
                    parts.append(f"   → 급락. 해당 라인 QR 보류, 재고 소진 전략 검토")
                elif r["wow"] < -15:
                    parts.append(f"   → 하락세. QR 물량 조정 및 재고 관리 주의")
            else:
                parts.append(f"{i}. — **{r['name']}** — 지수 {idx} | 데이터 부족")
        return "\n\n".join(parts)

    # 뜨는/지는 키워드 텍스트
    def format_top_keywords(keywords, empty_msg):
        if not keywords:
            return empty_msg
        parts = []
        for r in keywords[:3]:
            label = wow_label(r["wow"])
            parts.append(f"• {trend_arrow(r['wow'])} **{r['name']}** — WoW {r['wow']:+.1f}% ({label})")
        return "\n\n".join(parts)

    rising_text = format_top_keywords(rising, "이번 주 뚜렷한 상승 키워드 없음")
    falling_text = format_top_keywords(falling, "이번 주 뚜렷한 하락 키워드 없음")

    # 인사이트 텍스트
    insight_parts = []
    for r in rising[:3]:
        insight_parts.append(f"🔥 **{r['name']}** 급상승 (WoW {r['wow']:+.1f}%) → 상품명·해시태그 반영, 관련 아이템 기획 검토")
    for r in falling[:3]:
        insight_parts.append(f"❄️ **{r['name']}** 하락 (WoW {r['wow']:+.1f}%) → 해당 라인 QR 보류, 1~2주 추이 재확인")
    if not insight_parts:
        insight_parts.append("이번 주 큰 변동 없음 — 기존 전략 유지")
    insights_text = "\n\n".join(insight_parts)

    # 축별 요약 텍스트
    axis_labels = {
        "lifestyle": "라이프스타일",
        "fashion_interest": "패션 관심사",
        "item_type": "아이템 유형",
    }
    axis_summaries = []
    for key, label in axis_labels.items():
        axis_summaries.append(f"**{label}**: {axis_summary(label, axis_data.get(key, []))}")
    summary_text = "\n\n".join(axis_summaries)

    # Adaptive Card 구성
    card = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "contentUrl": None,
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [
                    {
                        "type": "TextBlock",
                        "text": f"📊 위클리 트렌드 인텔리전스 — {today}",
                        "weight": "Bolder",
                        "size": "Large",
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": f"FPOF 위클리 트렌드 자동 생성 · {now} | {target}",
                        "isSubtle": True,
                        "spacing": "None",
                        "wrap": True,
                    },
                    # Executive Summary
                    {
                        "type": "TextBlock",
                        "text": "**🔥 뜨는 키워드**",
                        "weight": "Bolder",
                        "spacing": "Large",
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": rising_text,
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": "**❄️ 지는 키워드**",
                        "weight": "Bolder",
                        "spacing": "Medium",
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": falling_text,
                        "wrap": True,
                    },
                    # 축 1: 라이프스타일
                    {
                        "type": "TextBlock",
                        "text": "**1️⃣ 라이프스타일 트렌드**",
                        "weight": "Bolder",
                        "spacing": "Large",
                        "separator": True,
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": format_axis_text(axis_data.get("lifestyle", [])),
                        "wrap": True,
                    },
                    # 축 2: 패션 관심사
                    {
                        "type": "TextBlock",
                        "text": "**2️⃣ 패션 무드 & 관심사**",
                        "weight": "Bolder",
                        "spacing": "Large",
                        "separator": True,
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": format_axis_text(axis_data.get("fashion_interest", [])),
                        "wrap": True,
                    },
                    # 축 3: 아이템 유형
                    {
                        "type": "TextBlock",
                        "text": "**3️⃣ 아이템 유형 트렌드**",
                        "weight": "Bolder",
                        "spacing": "Large",
                        "separator": True,
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": format_axis_text(axis_data.get("item_type", [])),
                        "wrap": True,
                    },
                    # 축별 요약
                    {
                        "type": "TextBlock",
                        "text": "**📋 축별 요약**",
                        "weight": "Bolder",
                        "spacing": "Large",
                        "separator": True,
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": summary_text,
                        "wrap": True,
                    },
                    # 인사이트 & 액션
                    {
                        "type": "TextBlock",
                        "text": "**⚡ MD 인사이트 & 액션**",
                        "weight": "Bolder",
                        "spacing": "Large",
                        "separator": True,
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": insights_text,
                        "wrap": True,
                    },
                ],
            },
        }],
    }

    return card


# ── 메인 ───────────────────────────────────────────────────

def main():
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    raw = json.loads(find_latest_raw().read_text(encoding="utf-8"))

    today = raw["fetch_date"]
    target = raw.get("target_audience", "18~25세 트렌드리더")

    # 마크다운 리포트 생성
    report, rising, falling, axis_data = build_report(raw, config)

    prefix = config["report"]["filename_prefix"]
    out_dir = PROJECT_ROOT / config["report"]["output_base"]
    out_dir.mkdir(parents=True, exist_ok=True)

    out_path = out_dir / f"{prefix}-{today}.md"
    out_path.write_text(report, encoding="utf-8")

    # Teams Adaptive Card JSON 생성
    card = build_teams_card(today, target, rising, falling, axis_data)
    card_path = DATA_DIR / f"teams-card-{today}.json"
    card_path.write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")

    # stdout에 리포트 경로 출력 (파이프라인용)
    print(str(out_path))


if __name__ == "__main__":
    main()
