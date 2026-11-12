# ERP 판매현황 장부금액 연동

EIS 매출의 부가세 제외 기준은 ERP **판매현황(BC) → 장부금액**이다. `SW_SALEINFO.SALEAMT`는 이 화면의 실판매금액과 일치한다. 같은 매장·일자라도 판매와 반품에 계산 방식이 다를 수 있어 원장의 장부금액을 거래 행 단위로 연결한다. 면세와 영세율, 반품, 외화 거래의 원화 환산액도 ERP 원장에 기록된 부호와 금액을 사용한다.

기존 ERP 적재 작업에 2026-10-01부터 판매현황과 동일한 원천의 아래 필드를 추가한다. `SHOPCD`는 SW_SALEINFO에 적재되는 매장코드를 사용하고, `SALESEQ`는 앞자리 0을 제거한 숫자로 적재한다. `ACTUAL_SALE_AMOUNT`와 `BOOK_AMOUNT`는 각각 판매현황의 원화 실판매금액과 장부금액이다.

```sql
CREATE TABLE IF NOT EXISTS BCAVE.SEWON.ERP_SALES_LEDGER (
    SALEDT VARCHAR(8) NOT NULL,
    SHOPCD VARCHAR NOT NULL,
    SALENO VARCHAR NOT NULL,
    SALESEQ NUMBER(38, 0) NOT NULL,
    ACTUAL_SALE_AMOUNT NUMBER(38, 6) NOT NULL,
    BOOK_AMOUNT NUMBER(38, 6) NOT NULL,
    PRIMARY KEY (SALEDT, SHOPCD, SALENO, SALESEQ)
);
```

`SW_SALEINFO`를 갱신할 때 같은 일자·매장 범위의 장부도 같은 ERP 추출본으로 갱신한다. ERP에서 재마감하거나 거래를 삭제하면 해당 범위를 함께 교체한다. Snowflake 표준 테이블의 기본 키 선언은 중복을 차단하지 않으므로 적재 작업에서 중복을 검사한다. EIS 조회 역할에 이 테이블의 `SELECT` 권한을 부여한다.

운영 적용 전에 아래 쿼리가 0행을 반환하고, 같은 기간·브랜드·매장 범위의 `BOOK_AMOUNT` 합계가 ERP 화면 합계와 일치하는지 확인한다. 이 확인에는 면세 매장과 외화 거래가 포함돼야 한다.

```sql
WITH sales AS (
    SELECT SALEDT, SHOPCD, SALENO, TRY_TO_NUMBER(SALESEQ) AS SALESEQ,
           COUNT(*) AS LINE_COUNT, MIN(TO_DECIMAL(SALEAMT, 38, 6)) AS ACTUAL_SALE_AMOUNT
    FROM BCAVE.SEWON.SW_SALEINFO
    WHERE SALEDT >= '20261001'
    GROUP BY 1, 2, 3, 4
), ledger AS (
    SELECT SALEDT, SHOPCD, SALENO, SALESEQ,
           COUNT(*) AS LINE_COUNT, MIN(ACTUAL_SALE_AMOUNT) AS ACTUAL_SALE_AMOUNT
    FROM BCAVE.SEWON.ERP_SALES_LEDGER
    WHERE SALEDT >= '20261001'
    GROUP BY 1, 2, 3, 4
)
SELECT SALEDT, SHOPCD, SALENO, SALESEQ,
       sales.LINE_COUNT AS SALES_LINES, ledger.LINE_COUNT AS LEDGER_LINES
FROM sales FULL OUTER JOIN ledger USING (SALEDT, SHOPCD, SALENO, SALESEQ)
WHERE sales.LINE_COUNT IS DISTINCT FROM 1 OR ledger.LINE_COUNT IS DISTINCT FROM 1
   OR sales.ACTUAL_SALE_AMOUNT IS DISTINCT FROM ledger.ACTUAL_SALE_AMOUNT;
```

검증이 끝나면 EIS 서버 환경 변수 `EIS_USE_ERP_BOOK_AMOUNT=true`로 활성화한다. 활성화 이후 누락·중복·실판매금액 불일치가 발견되면 해당 매출 조회가 실패한다. 집계 범위에 따라 EIS 일반 매출은 해외 자회사 이전분을 제외하며, 그 금액은 해외법인 이전출고 메뉴에 표시한다.
