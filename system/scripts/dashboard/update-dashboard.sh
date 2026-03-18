#!/bin/bash
# ═══════════════════════════════════════════
# FPOF 대시보드 자동 업데이트 & 배포
# ═══════════════════════════════════════════
#
# 사용법:
#   ./scripts/dashboard/update-dashboard.sh              # 전체 (추출 + 빌드 + 배포)
#   ./scripts/dashboard/update-dashboard.sh --extract     # 데이터 추출만
#   ./scripts/dashboard/update-dashboard.sh --deploy      # 배포만
#   ./scripts/dashboard/update-dashboard.sh --week W10    # 특정 주차 지정
#   ./scripts/dashboard/update-dashboard.sh --local       # 로컬 서버로 배포
#   ./scripts/dashboard/update-dashboard.sh --open        # 완료 후 브라우저 열기
#
# 새 주차 데이터 업로드 후 실행 절차:
#   1. sheet_sales-review_wNN.xlsx → output/26SS/weekly/data/
#   2. sheet_product-master_wNN.xlsx → output/26SS/weekly/data/
#   3. ./scripts/dashboard/update-dashboard.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SEASON="26SS"
DATA_DIR="$ROOT_DIR/output/$SEASON/weekly/data"
DASHBOARD_DIR="$ROOT_DIR/output/$SEASON/dashboard"

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 옵션 파싱
EXTRACT=true
DEPLOY=true
WEEK=""
DEPLOY_METHOD="github-pages"
OPEN_BROWSER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --extract)   EXTRACT=true; DEPLOY=false; shift ;;
        --deploy)    EXTRACT=false; DEPLOY=true; shift ;;
        --week)      WEEK="$2"; shift 2 ;;
        --local)     DEPLOY_METHOD="local-server"; shift ;;
        --open)      OPEN_BROWSER=true; shift ;;
        --help|-h)
            echo "사용법: $0 [--extract] [--deploy] [--week W10] [--local] [--open]"
            exit 0 ;;
        *)
            echo -e "${RED}알 수 없는 옵션: $1${NC}"
            exit 1 ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  FPOF 대시보드 업데이트 파이프라인${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# 새 주차 파일 감지
echo -e "${YELLOW}[1/4] 주차 데이터 감지...${NC}"
SALES_FILES=$(ls "$DATA_DIR"/sheet_sales-review_w*.xlsx 2>/dev/null | sort)
MASTER_FILES=$(ls "$DATA_DIR"/sheet_product-master_w*.xlsx 2>/dev/null | sort)

if [ -z "$SALES_FILES" ]; then
    echo -e "${RED}  ERROR: Weekly Sales 파일을 찾을 수 없습니다.${NC}"
    echo "  위치: $DATA_DIR/"
    exit 1
fi

LATEST_SALES=$(echo "$SALES_FILES" | tail -1)
LATEST_WEEK=$(echo "$LATEST_SALES" | grep -oE 'w[0-9]+' | tail -1)
echo -e "${GREEN}  ✓ Sales: $(echo "$SALES_FILES" | wc -l | tr -d ' ')개 주차 감지${NC}"
echo -e "${GREEN}  ✓ 최신 주차: $LATEST_WEEK${NC}"

if [ -n "$MASTER_FILES" ]; then
    echo -e "${GREEN}  ✓ Product Master: $(echo "$MASTER_FILES" | wc -l | tr -d ' ')개 주차${NC}"
fi
echo ""

# 데이터 추출
if [ "$EXTRACT" = true ]; then
    echo -e "${YELLOW}[2/4] 데이터 추출 중...${NC}"
    WEEK_ARG=""
    if [ -n "$WEEK" ]; then
        WEEK_ARG="--week $WEEK"
    fi
    python3 "$SCRIPT_DIR/extract_data.py" $WEEK_ARG
    echo ""
fi

# 빌드 확인
echo -e "${YELLOW}[3/4] 빌드 확인...${NC}"
if [ -f "$DASHBOARD_DIR/board_sales.html" ]; then
    FILE_SIZE=$(du -h "$DASHBOARD_DIR/board_sales.html" | cut -f1)
    echo -e "${GREEN}  ✓ 대시보드 HTML: $FILE_SIZE${NC}"
else
    echo -e "${RED}  ERROR: 대시보드 HTML을 찾을 수 없습니다.${NC}"
    exit 1
fi
echo ""

# 배포
if [ "$DEPLOY" = true ]; then
    echo -e "${YELLOW}[4/4] 배포 중... ($DEPLOY_METHOD)${NC}"
    python3 "$SCRIPT_DIR/deploy.py" --method "$DEPLOY_METHOD"
fi

# 브라우저 열기
if [ "$OPEN_BROWSER" = true ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$DASHBOARD_DIR/board_sales.html"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$DASHBOARD_DIR/board_sales.html"
    fi
fi

echo ""
echo -e "${GREEN}═══ 파이프라인 완료! ═══${NC}"
