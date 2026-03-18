#!/usr/bin/env python3
"""
FPOF Market Intelligence — Data Fetcher
3축 트렌드 데이터 수집: 라이프스타일 / 패션 관심사 / 아이템 유형
데이터 소스: 네이버 데이터랩 쇼핑 인사이트
Usage: python3 scripts/market-intel/fetch-data.py
"""

import os
import sys
import json
import time
import datetime
import requests
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("[FETCH ERROR] python-dotenv 미설치. pip3 install -r requirements-market-intel.txt")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = PROJECT_ROOT / "config" / "market-intel-config.json"
OUTPUT_DIR = PROJECT_ROOT / "data" / "market-intel"

load_dotenv(PROJECT_ROOT / ".env")


def load_config():
    if not CONFIG_PATH.exists():
        print(f"[FETCH ERROR] 설정 파일 없음: {CONFIG_PATH}")
        sys.exit(1)
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


# ── 네이버 데이터랩 ────────────────────────────────────────
NAVER_KEYWORD_URL = "https://openapi.naver.com/v1/datalab/shopping/category/keywords"


def get_naver_headers():
    client_id = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    if not client_id or not client_secret:
        print("[FETCH ERROR] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.")
        return None
    return {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
        "Content-Type": "application/json",
    }


def naver_request(url, body, headers, retry=1):
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=10)
        if resp.status_code == 429 and retry > 0:
            time.sleep(1)
            return naver_request(url, body, headers, retry - 1)
        if resp.status_code in (401, 403):
            return {"error": f"인증 실패 (HTTP {resp.status_code})"}
        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        return resp.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"네트워크 오류: {str(e)}"}


def fetch_naver_axis(keyword_groups, headers, start_date, end_date):
    """네이버 데이터랩 — 한 축(5개 키워드 그룹)을 한 번에 비교 수집"""
    keyword_entries = []
    for group in keyword_groups[:5]:
        keyword_entries.append({
            "name": group["group_name"],
            "param": [group["keywords"][0]],
        })

    body = {
        "startDate": start_date,
        "endDate": end_date,
        "timeUnit": "week",
        "category": "50000000",  # 패션의류
        "keyword": keyword_entries,
        "device": "",
        "gender": "",
        "ages": [],
    }
    data = naver_request(NAVER_KEYWORD_URL, body, headers)

    results = []
    for i, group in enumerate(keyword_groups[:5]):
        group_result = {
            "group_name": group["group_name"],
            "keywords": group["keywords"],
            "response": {},
        }
        if "error" in data:
            group_result["response"] = data
        elif "results" in data and i < len(data["results"]):
            group_result["response"] = {"results": [data["results"][i]]}
        results.append(group_result)

    return results


def fetch_naver_all(config):
    """네이버 데이터랩 — 3축 데이터 수집"""
    headers = get_naver_headers()
    if not headers:
        return {"error": "네이버 API 크리덴셜 미설정"}

    naver_cfg = config["naver_datalab"]
    today = datetime.date.today()
    start_date = (today - datetime.timedelta(days=naver_cfg["period_months"] * 30)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")

    result = {}

    # 축 1: 라이프스타일 트렌드
    print("[FETCH]   → 라이프스타일 키워드...")
    result["lifestyle"] = fetch_naver_axis(
        naver_cfg.get("lifestyle_keywords", []), headers, start_date, end_date)
    time.sleep(0.3)

    # 축 2: 패션 관심사
    print("[FETCH]   → 패션 관심사 키워드...")
    result["fashion_interest"] = fetch_naver_axis(
        naver_cfg.get("fashion_interest_keywords", []), headers, start_date, end_date)
    time.sleep(0.3)

    # 축 3: 아이템 유형
    print("[FETCH]   → 아이템 유형 키워드...")
    result["item_type"] = fetch_naver_axis(
        naver_cfg.get("item_type_keywords", []), headers, start_date, end_date)

    return result


# ── 메인 실행 ──────────────────────────────────────────────

def main():
    config = load_config()
    today = datetime.date.today().isoformat()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[FETCH] 데이터 수집 시작 — {today}")

    print("[FETCH] 네이버 데이터랩 3축 수집...")
    naver = fetch_naver_all(config)

    result = {
        "fetch_date": today,
        "season": config["season"],
        "target_audience": config.get("target_audience", ""),
        "naver": naver,
    }

    out_path = OUTPUT_DIR / f"raw-{today}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[FETCH OK] {out_path}")


if __name__ == "__main__":
    main()
