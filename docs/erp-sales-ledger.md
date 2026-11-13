# ERP 판매현황 장부금액

EIS의 부가세 제외 매출은 ERP **판매현황(BC) → 장부금액**을 사용한다. Snowflake 원본은 `BCAVE.SEWON.SW_SALEINFO`이고, 2026-10-01부터 `BOOKAMT`가 원화 장부금액, `TAXAMT`가 부가세, `SALEAMT`가 원화 실판매금액이다. `EXCHCD`, `EXRTRT`, `EXAMT`는 환종, 환율, 외화 결제액이다. 이미 원화로 적재된 `BOOKAMT`를 다시 환산하거나 면세·영세율 금액에서 부가세를 차감하지 않는다.

장부금액이 적재된 판매·반품 행은 `BOOKAMT`를 그대로 집계한다. `BOOKAMT = 0`도 유효한 값이다. 이관 중 `BOOKAMT IS NULL`인 행은 잠정 집계에 `SALEAMT`를 사용하고 매출·상품기획 화면에 미적재 기간을 표시한다. 과거 데이터가 채워지면 다음 조회부터 반영된다. ERP 전환 전은 기존 매출 대시보드 계산 기준을 따르고, 동업계 비교는 부가세 포함 금액을 사용한다. 해외 자회사 이전 매출은 일반 매출 합계에서 제외하며 해외 출고분 메뉴에서 조회할 수 있다.

아래 쿼리로 브랜드별 장부 적재 건수, 합계 및 금액 불일치를 확인한다. 거래가 통째로 빠진 경우는 이 쿼리의 미적재 건수에 나타나지 않으므로 ERP 합계 및 거래 건수도 비교한다.

```sql
SELECT SALEDT, BRANDCD, COUNT(*) AS LINES, COUNT(BOOKAMT) AS BOOK_LINES,
       COUNT_IF(BOOKAMT IS NULL AND COALESCE(SALEAMT, 0) <> 0) AS PENDING_LINES,
       COUNT_IF(BOOKAMT IS NOT NULL AND
         (TAXAMT IS NULL OR SALEAMT IS NULL OR ABS(SALEAMT - BOOKAMT - TAXAMT) > 0.001)) AS MISMATCH_LINES,
       SUM(BOOKAMT) AS BOOK_AMOUNT, SUM(TAXAMT) AS VAT
FROM BCAVE.SEWON.SW_SALEINFO
WHERE SALEDT >= '20261001'
  AND BRANDCD IN ('CO', 'WA', 'LE', 'CK', 'LK')
GROUP BY SALEDT, BRANDCD
ORDER BY SALEDT, BRANDCD;
```
