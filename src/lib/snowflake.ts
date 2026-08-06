/**
 * Snowflake REST API – RSA Key-Pair JWT 인증
 * 서버 전용 (API Route에서만 사용)
 */

import crypto from 'crypto'

const ACCOUNT   = process.env.SNOWFLAKE_ACCOUNT!          // e.g. CL49554.ap-northeast-2.aws
const USER      = process.env.SNOWFLAKE_USER!              // e.g. BCAVE_AI
const DATABASE  = process.env.SNOWFLAKE_DATABASE!
const SCHEMA    = process.env.SNOWFLAKE_SCHEMA!
const WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE!
const PRIVATE_KEY_PEM = process.env.SNOWFLAKE_PRIVATE_KEY!       // PEM 전체 (줄바꿈 \n)
const PRIVATE_KEY_PASS = process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE // 암호화 키일 경우

// Snowflake account identifier: 대문자, 점(.) → 언더바 없이 그대로
// ─── 데이터 범위 제한 ────────────────────────────────────────────
// 브랜드: 커버낫(CO), 와키윌리(WA), 리(LE), 커버낫 키즈(CK), Lee Kids(LK)
export const BRAND_FILTER = `BRANDCD IN ('CO','WA','LE','CK','LK')`

// 콤마 구분 브랜드 파라미터 → SQL IN 절 변환
// 'all' → 전체, 'CO' → 단일, 'CO,WA,LE' → 복수
import { VALID_BRANDS } from '@/lib/constants'
export function parseBrandParam(param: string): { valid: boolean; inClause: string } {
  if (param === 'all') return { valid: true, inClause: `('CO','WA','LE','CK','LK')` }
  const brands = param.split(',').filter(b => VALID_BRANDS.has(b))
  if (brands.length === 0) return { valid: false, inClause: '' }
  return { valid: true, inClause: `(${brands.map(b => `'${b}'`).join(',')})` }
}
// 매출 기준일: 2025년 1월 1일 이후 (뷰: VW_SALES_VAT 사용, SW_SALEINFO 직접 조회 금지)
export const SALE_DATE_FILTER = `SALEDT >= '20250101'`

// 자사 해외법인 이전분(해외사입) — 실수요 아닌 계열사 이동이라 목표/달성률/국내실적 전반에서 제외
//   실적(VW) 코드: B6055 대만 B.CAVE · B6057 일본 B.CAVE · B6063 중국 B.CAVE (외부 총판/플랫폼은 유지)
export const OVERSEAS_TRANSFER_SHOPS = ['B6055', 'B6057', 'B6063'] as const
// 목표(사업계획) 코드: 계획서는 중국·일본 법인을 별도 기획코드로 잡아둠 → 목표 제외 시 함께 처리
//   COF001 중국 법인 · COF002 일본 법인 · WAF005 일본 법인(와키윌리) + 위 실적코드
export const OVERSEAS_TRANSFER_TARGET_CODES = ['B6055', 'B6057', 'B6063', 'COF001', 'COF002', 'WAF005'] as const
// SALES_VIEW는 위 이전분을 이미 제외한 파생 뷰. FROM ${SALES_VIEW} v 형태(별칭 유/무 모두 가능)로 사용
export const SALES_VIEW = `(SELECT * FROM BCAVE.SEWON.VW_SALES_VAT WHERE SHOPCD NOT IN ('B6055','B6057','B6063'))`

const ACCOUNT_ID = ACCOUNT.toUpperCase()
const QUALIFIED_USERNAME = `${ACCOUNT_ID}.${USER.toUpperCase()}`

const BASE_URL = `https://${ACCOUNT}.snowflakecomputing.com`

function buildJwt(): string {
  const privateKey = crypto.createPrivateKey({
    key: PRIVATE_KEY_PEM.replace(/\\n/g, '\n'),
    format: 'pem',
    ...(PRIVATE_KEY_PASS ? { passphrase: PRIVATE_KEY_PASS } : {}),
  })

  // 공개키 지문 계산 (SHA256 of DER-encoded public key)
  const publicKey = crypto.createPublicKey(privateKey)
  const pubDer = publicKey.export({ type: 'spki', format: 'der' }) as Buffer
  const fingerprint = 'SHA256:' + crypto.createHash('sha256').update(pubDer).digest('base64')

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: `${QUALIFIED_USERNAME}.${fingerprint}`,
    sub: QUALIFIED_USERNAME,
    iat: now,
    exp: now + 59,
  })).toString('base64url')

  const signing = `${header}.${payload}`
  const signature = crypto.sign('sha256', Buffer.from(signing), privateKey).toString('base64url')
  return `${signing}.${signature}`
}

export async function snowflakeQuery<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const jwt = buildJwt()

  const res = await fetch(`${BASE_URL}/api/v2/statements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
    },
    body: JSON.stringify({
      statement: sql,
      database: DATABASE,
      schema: SCHEMA,
      warehouse: WAREHOUSE,
      timeout: 30,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Snowflake 쿼리 실패: ${res.status} ${text}`)
  }

  const json = await res.json()

  const cols: string[] = json.resultSetMetaData?.rowType?.map((c: { name: string }) => c.name) ?? []
  const rows: unknown[][] = json.data ?? []

  // 파티션 처리: Snowflake REST API는 대량 결과를 여러 파티션으로 분할
  const totalPartitions = json.resultSetMetaData?.partitionInfo?.length ?? 1
  const statementHandle = json.statementHandle

  if (totalPartitions > 1 && statementHandle) {
    for (let p = 1; p < totalPartitions; p++) {
      const partRes = await fetch(
        `${BASE_URL}/api/v2/statements/${statementHandle}?partition=${p}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
          },
        }
      )
      if (partRes.ok) {
        const partJson = await partRes.json()
        if (partJson.data) rows.push(...partJson.data)
      }
    }
  }

  return rows.map((row) =>
    Object.fromEntries(cols.map((col, i) => [col, row[i]]))
  ) as T[]
}
