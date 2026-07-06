import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'

// 백화점·아울렛 동업계 비교 — 전 매장(건물) 단위, 성인/키즈 조닝
//  우리=VW(VAT포함 ×1.1), 경쟁=SW_INDUSTRYPEERS(비우리 PEERNM)
//  경쟁사는 매니저 수기입력 중복/불일치 → 건물당 (PEERNM,주차) 최댓값으로 dedupe
//  '와릿이즌'(BR045)=우리 와키윌리이므로 경쟁사 제외
const OUR_PEER_EXCL = `('커버낫','LEE','CK','와릿이즌')`
const BLD = `REGEXP_REPLACE(sh.SHOPNM,'_[^_]+$','')`

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = (searchParams.get('from') || '20260101').replace(/[^0-9]/g, '').slice(0, 8)
  const to = (searchParams.get('to') || '20261231').replace(/[^0-9]/g, '').slice(0, 8)
  const scope = searchParams.get('scope') === 'all' ? 'all' : 'offline'
  const gran = searchParams.get('gran') === 'month' ? 'month' : 'week'
  const zone = searchParams.get('zone') === 'kids' ? 'kids' : 'adult'
  const building = (searchParams.get('building') || '').replace(/'/g, "''")
  const zoneCodes = zone === 'kids' ? `('CK','LK')` : `('CO','LE','WA')`
  const pt = scope === 'offline' ? `AND PRICETYPENM <> '온라인'` : ''
  const ch = searchParams.get('ch') // 'dept'|'outlet'|'mall'|'duty'(면세점)|'direct'(직영점) | null(전체)
  const CH_MAP: Record<string, string> = { dept: '백화점', outlet: '아울렛', mall: '쇼핑몰', duty: '면세점', direct: '직영점' }
  const chType = ch && CH_MAP[ch] ? `sh.SHOPTYPENM = '${CH_MAP[ch]}'` : `sh.SHOPTYPENM IN ('백화점','아울렛','쇼핑몰','면세점','직영점')`
  // 폐점/종료 카운터 제외 — '(폐)' 접미사로 건물이 쪼개지는 문제 방지 (예: 신_대구 vs (폐)신_대구)
  const CH = `${chType} AND sh.PROCSTATUSNM <> '종료' AND sh.SHOPNM NOT LIKE '(폐)%'`
  const bucketOur = gran === 'month' ? `SUBSTR(v.SALEDT,1,6)` : `TO_CHAR(DATE_TRUNC('WEEK',TO_DATE(v.SALEDT,'YYYYMMDD')),'YYYYMMDD')`
  const bucketPeer = gran === 'month' ? `SUBSTR(SALEDT,1,6)` : `TO_CHAR(DATE_TRUNC('WEEK',TO_DATE(SALEDT,'YYYYMMDD')),'YYYYMMDD')`
  const ourShopsSub = `(SELECT DISTINCT v.SHOPCD FROM BCAVE.SEWON.VW_SALES_VAT v JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD=sh.SHOPCD WHERE v.BRANDCD IN ${zoneCodes} AND ${CH} AND v.SALEDT BETWEEN '${from}' AND '${to}')`

  try {
    // ── 매장 클릭: 브랜드×주차 매트릭스 (우리 + 경쟁 dedupe) ──
    if (building) {
      const rows = await snowflakeQuery<Record<string, string>>(`
        WITH shops AS (
          SELECT DISTINCT v.SHOPCD FROM BCAVE.SEWON.VW_SALES_VAT v JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD=sh.SHOPCD
          WHERE ${BLD}='${building}' AND ${CH} AND v.BRANDCD IN ${zoneCodes} AND v.SALEDT BETWEEN '${from}' AND '${to}'
        )
        SELECT BR, OURS, BK, AMT FROM (
          SELECT v.BRANDCD AS BR, TRUE AS OURS, ${bucketOur} AS BK, SUM(v.SALEAMT_VAT_EX)*1.1 AS AMT
          FROM BCAVE.SEWON.VW_SALES_VAT v WHERE v.SHOPCD IN (SELECT SHOPCD FROM shops) AND v.BRANDCD IN ${zoneCodes} AND v.SALEDT BETWEEN '${from}' AND '${to}'
          GROUP BY v.BRANDCD, ${bucketOur}
          UNION ALL
          SELECT PEERNM AS BR, FALSE AS OURS, BK, MAX(AMT) AS AMT FROM (
            SELECT PEERNM, ${bucketPeer} AS BK, SHOPCD, SUM(SALEAMT) AS AMT
            FROM BCAVE.SEWON.SW_INDUSTRYPEERS WHERE SHOPCD IN (SELECT SHOPCD FROM shops) AND PEERNM NOT IN ${OUR_PEER_EXCL} ${pt} AND SALEDT BETWEEN '${from}' AND '${to}'
            GROUP BY PEERNM, ${bucketPeer}, SHOPCD
          ) GROUP BY PEERNM, BK
        )
      `)
      return NextResponse.json({ matrix: rows.map(r => ({ brand: r.BR, isOurs: String(r.OURS).toLowerCase() === 'true', bucket: String(r.BK || ''), amt: Number(r.AMT) || 0 })).filter(r => r.amt > 0) })
    }

    // ── 전 매장 요약 + 우리 브랜드별 + 시장 추이(주간/월간) ──
    const [summaryRaw, ourRaw, marketRaw] = await Promise.all([
      snowflakeQuery<Record<string, string>>(`
        WITH our_bld AS (
          SELECT ${BLD} AS BLD, v.BRANDCD AS BR, TRUE AS OURS, SUM(v.SALEAMT_VAT_EX)*1.1 AS AMT
          FROM BCAVE.SEWON.VW_SALES_VAT v JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD=sh.SHOPCD
          WHERE v.BRANDCD IN ${zoneCodes} AND ${CH} AND v.SALEDT BETWEEN '${from}' AND '${to}'
          GROUP BY ${BLD}, v.BRANDCD
        ),
        comp_ded AS (
          SELECT BLD, PEERNM AS BR, FALSE AS OURS, MAX(AMT) AS AMT FROM (
            SELECT ${BLD} AS BLD, p.PEERNM, p.SHOPCD, SUM(p.SALEAMT) AS AMT
            FROM BCAVE.SEWON.SW_INDUSTRYPEERS p JOIN BCAVE.SEWON.SW_SHOPINFO sh ON p.SHOPCD=sh.SHOPCD
            WHERE p.PEERNM NOT IN ${OUR_PEER_EXCL} ${pt} AND p.SALEDT BETWEEN '${from}' AND '${to}' AND p.SHOPCD IN ${ourShopsSub}
            GROUP BY ${BLD}, p.PEERNM, p.SHOPCD
          ) GROUP BY BLD, PEERNM
        ),
        allb AS (SELECT BLD, BR, OURS, AMT FROM our_bld UNION ALL SELECT BLD, BR, OURS, AMT FROM comp_ded),
        ranked AS (
          SELECT BLD, BR, OURS, AMT,
            RANK() OVER (PARTITION BY BLD ORDER BY AMT DESC) AS RNK,
            SUM(AMT) OVER (PARTITION BY BLD) AS TOTAL
          FROM allb
        )
        SELECT BLD,
          SUM(CASE WHEN OURS THEN AMT END) AS OUR_AMT,
          MAX(TOTAL) AS TOTAL,
          MIN(CASE WHEN OURS THEN RNK END) AS OUR_BEST_RANK,
          MAX(CASE WHEN RNK=1 THEN BR END) AS TOP_BRAND,
          MAX(CASE WHEN RNK=1 AND OURS THEN 1 ELSE 0 END) AS TOP_IS_OURS,
          COUNT(CASE WHEN NOT OURS THEN 1 END) AS COMP_CNT
        FROM ranked GROUP BY BLD
      `),
      snowflakeQuery<Record<string, string>>(`
        SELECT ${BLD} AS BLD, v.BRANDCD AS BR, SUM(v.SALEAMT_VAT_EX)*1.1 AS AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD=sh.SHOPCD
        WHERE v.BRANDCD IN ${zoneCodes} AND ${CH} AND v.SALEDT BETWEEN '${from}' AND '${to}'
        GROUP BY ${BLD}, v.BRANDCD
      `),
      // 시장 추이: 우리 브랜드(VW) + 경쟁사(건물·버킷당 max로 중복제거 후 매장 합산), 버킷별
      snowflakeQuery<Record<string, string>>(`
        -- 우리
        SELECT v.BRANDCD AS BR, TRUE AS OURS, ${bucketOur} AS BK, SUM(v.SALEAMT_VAT_EX)*1.1 AS AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD=sh.SHOPCD
        WHERE v.BRANDCD IN ${zoneCodes} AND ${CH} AND v.SALEDT BETWEEN '${from}' AND '${to}'
        GROUP BY v.BRANDCD, ${bucketOur}
        UNION ALL
        -- 경쟁사
        SELECT PEERNM AS BR, FALSE AS OURS, BK, SUM(BLD_MAX) AS AMT FROM (
          SELECT BLD, PEERNM, BK, MAX(CNT_AMT) AS BLD_MAX FROM (
            SELECT ${BLD} AS BLD, p.PEERNM AS PEERNM, ${bucketPeer} AS BK, p.SHOPCD, SUM(p.SALEAMT) AS CNT_AMT
            FROM BCAVE.SEWON.SW_INDUSTRYPEERS p JOIN BCAVE.SEWON.SW_SHOPINFO sh ON p.SHOPCD=sh.SHOPCD
            WHERE p.PEERNM NOT IN ${OUR_PEER_EXCL} ${pt} AND p.SALEDT BETWEEN '${from}' AND '${to}' AND p.SHOPCD IN ${ourShopsSub}
            GROUP BY ${BLD}, p.PEERNM, ${bucketPeer}, p.SHOPCD
          ) GROUP BY BLD, PEERNM, BK
        ) GROUP BY PEERNM, BK
      `),
    ])

    const ourByBld = new Map<string, Record<string, number>>()
    for (const r of ourRaw) {
      const m = ourByBld.get(r.BLD) ?? {}
      m[r.BR] = (m[r.BR] ?? 0) + (Number(r.AMT) || 0)
      ourByBld.set(r.BLD, m)
    }
    const buildings = summaryRaw.map(r => {
      const ourAmt = Number(r.OUR_AMT) || 0
      const total = Number(r.TOTAL) || 0
      return {
        bld: r.BLD,
        ourAmt, total,
        share: total > 0 ? Math.round(ourAmt / total * 1000) / 10 : null,
        bestRank: r.OUR_BEST_RANK != null ? Number(r.OUR_BEST_RANK) : null,
        topBrand: r.TOP_BRAND,
        topIsOurs: String(r.TOP_IS_OURS) === '1',
        compCnt: Number(r.COMP_CNT) || 0,
        ours: ourByBld.get(r.BLD) ?? {},
      }
    }).filter(b => b.ourAmt > 0).sort((a, b) => b.ourAmt - a.ourAmt)

    const marketTrend = marketRaw.map(r => ({ brand: r.BR, isOurs: String(r.OURS).toLowerCase() === 'true', bucket: String(r.BK || ''), amt: Number(r.AMT) || 0 })).filter(r => r.amt > 0)

    return NextResponse.json({ buildings, marketTrend, meta: { from, to, scope, gran, zone } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
