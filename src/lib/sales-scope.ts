// 자회사별 기존 매장 코드와 2026년 10월 ERP 전환 후 매장 코드.
const TRANSFER_SHOP_PAIRS = [
  ['B6055', 'WA9015'], // 대만
  ['B6057', 'CO9039'], // 일본
  ['B6063', 'CO9040'], // 중국
] as const

export const OVERSEAS_TRANSFER_ENTITY_CODES = TRANSFER_SHOP_PAIRS.map(([original]) => original)
export const OVERSEAS_TRANSFER_SHOPS = TRANSFER_SHOP_PAIRS.flat()
export const OVERSEAS_TRANSFER_SHOP_LIST = OVERSEAS_TRANSFER_SHOPS.map(code => `'${code}'`).join(',')

// 계획서에는 일부 해외법인이 별도 기획 코드로도 올라온다.
export const OVERSEAS_TRANSFER_TARGET_CODES = [...OVERSEAS_TRANSFER_SHOPS, 'COF001', 'COF002', 'WAF005'] as const

export const OVERSEAS_TRANSFER_ENTITY_SQL = `CASE v.SHOPCD
  ${TRANSFER_SHOP_PAIRS.map(([original, current]) => `WHEN '${current}' THEN '${original}'`).join('\n  ')}
  ELSE v.SHOPCD END`

// 신 ERP 판매현황은 실판매금액과 장부금액을 따로 관리한다.
export const ERP_SALES_CUTOVER = '20261001'

const erpBookAmountEnabled = process.env.EIS_USE_ERP_BOOK_AMOUNT === 'true'

const erpBookAmountJoin = erpBookAmountEnabled ? `
  LEFT JOIN (
    SELECT SALEDT, SHOPCD, SALENO, SALESEQ,
           MAX(ACTUAL_SALE_AMOUNT) AS ACTUAL_SALE_AMOUNT, MAX(BOOK_AMOUNT) AS BOOK_AMOUNT
    FROM BCAVE.SEWON.ERP_SALES_LEDGER
    WHERE SALEDT >= '${ERP_SALES_CUTOVER}'
    GROUP BY SALEDT, SHOPCD, SALENO, SALESEQ
    HAVING COUNT(*) = 1
  ) ledger ON s.SALEDT >= '${ERP_SALES_CUTOVER}'
    AND s.SALEDT = ledger.SALEDT AND s.SHOPCD = ledger.SHOPCD
    AND s.SALENO = ledger.SALENO AND TRY_TO_NUMBER(s.SALESEQ) = ledger.SALESEQ
    AND TO_DECIMAL(s.SALEAMT, 38, 6) = ledger.ACTUAL_SALE_AMOUNT` : ''

// 장부 연동 후에는 누락·중복·금액 불일치가 합계에서 조용히 빠지지 않도록 한다.
const postCutoverAmount = erpBookAmountEnabled ? `CASE
  WHEN ledger.BOOK_AMOUNT IS NOT NULL THEN ledger.BOOK_AMOUNT
  ELSE TO_DECIMAL('Missing ERP book amount for ' || s.SALEDT || '/' || s.SHOPCD, 38, 6)
END` : 's.SALEAMT'

export const REPLENISHMENT_NORMAL_SALE = `s.PRICETYPE = IFF(s.SALEDT < '${ERP_SALES_CUTOVER}', '0', '1')`
export const REPLENISHMENT_RETAIL_SHOP = `NOT REGEXP_LIKE(COALESCE(si.SHOPTYPENM,''), '.*(면세|해외|온라인|B2B|오프라인 위탁|수출|위탁처).*')`

// 한 개의 신규 매장에 연결되는 기존 코드만 합산한다.
export const SHOP_CODE_ALIASES = `(
  SELECT OLD_SHOPCD, MAX(SHOPCD) AS SHOPCD
  FROM BCAVE.SEWON.SW_SHOPINFO
  WHERE NULLIF(TRIM(OLD_SHOPCD), '') IS NOT NULL AND SHOPCD <> OLD_SHOPCD
  GROUP BY OLD_SHOPCD
  HAVING COUNT(DISTINCT SHOPCD) = 1
)`

export const SALES_WITH_NET_AMOUNT = `(
  SELECT s.*,
         CASE
           WHEN s.SALEDT >= '${ERP_SALES_CUTOVER}' THEN ${postCutoverAmount}
           WHEN sh.SHOPTYPENM = '면세점' THEN s.SALEAMT
           ELSE s.SALEAMT / 1.1
         END AS SALEAMT_VAT_EX
  FROM BCAVE.SEWON.SW_SALEINFO s
  LEFT JOIN BCAVE.SEWON.SW_SHOPINFO sh ON s.SHOPCD = sh.SHOPCD
  ${erpBookAmountJoin}
)`

export const SALES_WITH_CURRENT_SHOP = `(
  SELECT s.* REPLACE (COALESCE(alias.SHOPCD, s.SHOPCD) AS SHOPCD)
  FROM ${SALES_WITH_NET_AMOUNT} s
  LEFT JOIN ${SHOP_CODE_ALIASES} alias ON s.SHOPCD = alias.OLD_SHOPCD
)`

export const SALES_VAT_VIEW = `(
  SELECT s.BRANDCD, s.BRANDNM, COALESCE(alias.SHOPCD, s.SHOPCD) AS SHOPCD, sh.SHOPTYPECD,
         CASE
           WHEN s.SALEDT < '${ERP_SALES_CUTOVER}' THEN sh.SHOPTYPENM
           WHEN sh.SHOPTYPENM = '온라인' AND sh.SALETYPENM = '온라인(B2B)' THEN '온라인B2B'
           WHEN sh.SHOPTYPENM IN ('온라인','수출','위탁처','사입') THEN COALESCE(
             legacy.SHOPTYPENM,
             IFF(sh.SHOPTYPENM = '온라인' AND sh.SALETYPENM = '위탁(국외)', '해외 위탁', sh.SHOPTYPENM))
           ELSE sh.SHOPTYPENM
         END AS SHOPTYPENM,
         s.SALEDT, LEFT(s.SALEDT, 6) AS YYYYMM, s.STYLECD, s.COLORCD, s.SALEQTY, s.TAGPRICE, s.SALEPRICE,
         s.SALEQTY AS FINANCIAL_SALEQTY,
         CASE
           WHEN s.SALEDT >= '${ERP_SALES_CUTOVER}' THEN ${postCutoverAmount}
           WHEN sh.SHOPTYPENM = '면세점' THEN s.SALEAMT
           WHEN sh.SHOPTYPECD IN ('C','D','F') AND sh.CORPTYPECD IS NOT NULL THEN s.SALEAMT
           WHEN sh.SHOPTYPECD IN ('6','9') AND sh.CORPTYPECD IS NULL THEN s.SALEAMT
           ELSE ROUND(s.SALEAMT / 1.1, 0)
         END AS SALEAMT_VAT_EX
  FROM BCAVE.SEWON.SW_SALEINFO s
  LEFT JOIN BCAVE.SEWON.SW_SHOPINFO sh ON s.SHOPCD = sh.SHOPCD
  LEFT JOIN ${SHOP_CODE_ALIASES} alias ON s.SHOPCD = alias.OLD_SHOPCD
  LEFT JOIN BCAVE.SEWON.SW_SHOPINFO legacy ON sh.OLD_SHOPCD = legacy.SHOPCD
  ${erpBookAmountJoin}
)`

export const SALES_VIEW = `(SELECT * FROM ${SALES_VAT_VIEW} WHERE SHOPCD NOT IN (${OVERSEAS_TRANSFER_SHOP_LIST}))`

export const TRANSFER_SALES_VIEW = erpBookAmountEnabled ? SALES_VAT_VIEW : 'BCAVE.SEWON.VW_SALES_VAT'
