#!/usr/bin/env python3
"""
FPOF Dashboard Deployer
대시보드 HTML을 GitHub Pages로 배포하여 팀원에게 URL 공유

사용법:
  python3 scripts/dashboard/deploy.py
  python3 scripts/dashboard/deploy.py --method github-pages
  python3 scripts/dashboard/deploy.py --method local-server --port 8080

배포 방법:
  1. github-pages  — gh-pages 브랜치에 push → https://<user>.github.io/<repo>/
  2. local-server  — 로컬 HTTP 서버 + ngrok (개발/테스트용)
"""

import argparse
import http.server
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DASHBOARD_DIR = ROOT / "output" / "dashboard"
DASHBOARD_HTML = DASHBOARD_DIR / "wacky-willy-dashboard.html"


def get_git_remote_url():
    """git remote origin URL 파싱"""
    try:
        url = subprocess.check_output(
            ["git", "remote", "get-url", "origin"],
            cwd=str(ROOT),
            text=True,
        ).strip()
        return url
    except subprocess.CalledProcessError:
        return None


def parse_github_info(remote_url):
    """GitHub owner/repo 추출"""
    import re
    # https://github.com/owner/repo.git or git@github.com:owner/repo.git
    m = re.search(r"github\.com[:/](.+?)/(.+?)(?:\.git)?$", remote_url or "")
    if m:
        return m.group(1), m.group(2)
    return None, None


def deploy_github_pages():
    """gh-pages 브랜치에 대시보드 배포"""
    remote_url = get_git_remote_url()
    owner, repo = parse_github_info(remote_url)

    if not owner or not repo:
        print("ERROR: GitHub remote를 파싱할 수 없습니다.")
        print(f"  Remote URL: {remote_url}")
        sys.exit(1)

    print(f"  GitHub: {owner}/{repo}")
    pages_url = f"https://{owner}.github.io/{repo}/"

    # 임시 디렉토리에 배포 파일 준비
    import tempfile
    deploy_dir = Path(tempfile.mkdtemp(prefix="fpof-deploy-"))

    try:
        # 대시보드 HTML 복사
        shutil.copy2(DASHBOARD_HTML, deploy_dir / "index.html")

        # gh-pages 브랜치 관리
        print("  gh-pages 브랜치 준비 중...")

        # 현재 브랜치 저장
        current_branch = subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=str(ROOT), text=True
        ).strip()

        # gh-pages 브랜치가 있는지 확인
        result = subprocess.run(
            ["git", "branch", "--list", "gh-pages"],
            cwd=str(ROOT), capture_output=True, text=True,
        )
        has_ghpages = bool(result.stdout.strip())

        if has_ghpages:
            # 기존 gh-pages 체크아웃
            subprocess.run(["git", "checkout", "gh-pages"], cwd=str(ROOT), check=True,
                         capture_output=True)
        else:
            # 새 orphan 브랜치 생성
            subprocess.run(["git", "checkout", "--orphan", "gh-pages"], cwd=str(ROOT),
                         check=True, capture_output=True)
            # 기존 파일 모두 제거
            subprocess.run(["git", "rm", "-rf", "."], cwd=str(ROOT),
                         check=True, capture_output=True)

        # index.html 복사
        shutil.copy2(deploy_dir / "index.html", ROOT / "index.html")

        # .nojekyll 파일 (GitHub Pages에서 Jekyll 비활성화)
        (ROOT / ".nojekyll").touch()

        # 커밋 & 푸시
        subprocess.run(["git", "add", "index.html", ".nojekyll"],
                      cwd=str(ROOT), check=True, capture_output=True)

        # 변경사항 있는지 확인
        diff_result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=str(ROOT), capture_output=True,
        )

        if diff_result.returncode != 0:
            # 변경사항이 있을 때만 커밋
            import datetime
            msg = f"Dashboard update {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"
            subprocess.run(
                ["git", "commit", "-m", msg],
                cwd=str(ROOT), check=True, capture_output=True,
            )
            print("  gh-pages 브랜치에 push 중...")
            subprocess.run(
                ["git", "push", "origin", "gh-pages"],
                cwd=str(ROOT), check=True, capture_output=True,
            )
            print("  ✓ Push 완료!")
        else:
            print("  변경사항 없음 (이미 최신)")

        # 원래 브랜치로 복귀
        subprocess.run(["git", "checkout", current_branch],
                      cwd=str(ROOT), check=True, capture_output=True)

        # GitHub Pages 활성화 확인
        print(f"\n  ✓ 배포 완료!")
        print(f"  ┌─────────────────────────────────────────────")
        print(f"  │ 대시보드 URL: {pages_url}")
        print(f"  └─────────────────────────────────────────────")
        print(f"\n  ⚠️  처음 배포 시 GitHub Pages 활성화 필요:")
        print(f"     1. https://github.com/{owner}/{repo}/settings/pages")
        print(f"     2. Source → 'Deploy from a branch'")
        print(f"     3. Branch → 'gh-pages' / '/ (root)' 선택 → Save")
        print(f"     4. 1-2분 후 URL 접속 가능")

        return pages_url

    finally:
        shutil.rmtree(deploy_dir, ignore_errors=True)


def deploy_local_server(port=8080):
    """로컬 HTTP 서버 (개발/테스트용)"""
    os.chdir(str(DASHBOARD_DIR))

    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(("0.0.0.0", port), handler)

    print(f"\n  ✓ 로컬 서버 시작!")
    print(f"  ┌─────────────────────────────────────────────")
    print(f"  │ 로컬 URL:  http://localhost:{port}/wacky-willy-dashboard.html")
    print(f"  │ 네트워크:  http://<your-ip>:{port}/wacky-willy-dashboard.html")
    print(f"  └─────────────────────────────────────────────")
    print(f"\n  Ctrl+C로 종료")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  서버 종료")
        httpd.shutdown()


def main():
    parser = argparse.ArgumentParser(description="FPOF Dashboard Deployer")
    parser.add_argument(
        "--method",
        choices=["github-pages", "local-server"],
        default="github-pages",
        help="배포 방법 (기본: github-pages)",
    )
    parser.add_argument("--port", type=int, default=8080, help="로컬 서버 포트 (기본: 8080)")
    args = parser.parse_args()

    print(f"═══ FPOF Dashboard Deployer ═══")
    print(f"  방법: {args.method}")

    if not DASHBOARD_HTML.exists():
        print(f"ERROR: 대시보드 파일을 찾을 수 없습니다: {DASHBOARD_HTML}")
        print(f"  먼저 extract_data.py를 실행하세요.")
        sys.exit(1)

    if args.method == "github-pages":
        deploy_github_pages()
    elif args.method == "local-server":
        deploy_local_server(args.port)


if __name__ == "__main__":
    main()
