import {
  Package,
  Target,
  BarChart3,
  ClipboardList,
  Archive,
  Truck,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon?: React.ElementType
  badge?: number
  children?: NavItem[]
}

export type NavSection = {
  id: string
  label: string
  icon?: React.ElementType
  items: NavItem[]
}

export const NAV_CONFIG: NavSection[] = [
  {
    id: 'departments',
    label: '부서',
    items: [
      {
        label: '상품기획',
        href: '/planning',
        icon: Package,
        children: [
          { label: '기획현황판', href: '/planning', icon: ClipboardList },
          { label: '입판재현황', href: '/planning/ipj', icon: BarChart3 },
          { label: '이월재고 관리', href: '/planning/carryover', icon: Archive },
        ],
      },
      {
        label: '영업',
        href: '/sales',
        icon: Target,
        children: [
          { label: '매출 대시보드', href: '/sales', icon: BarChart3 },
          { label: '보충출고 자동화', href: '/sales/replenishment', icon: Truck },
        ],
      },
    ],
  },
]

export const DEPT_COLORS = {
  'product-planning': { bg: '#dbeafe', text: '#1d4ed8', label: '상품기획' },
  sales: { bg: '#dcfce7', text: '#15803d', label: '영업' },
  marketing: { bg: '#fce7f3', text: '#be185d', label: '마케팅' },
}

export const BRAND = {
  name: 'B.cave',
  accent: '#e91e63',
}

// 브랜드 코드별 색상 (차트, 뱃지 등)
export const BRAND_COLORS: Record<string, string> = {
  CO: '#e91e63', LE: '#3b82f6', WA: '#10b981', CK: '#f59e0b', LK: '#8b5cf6',
}

// 브랜드 코드 → 한글 이름
export const BRAND_NAMES: Record<string, string> = {
  CO: '커버낫', LE: '리(Lee)', WA: '와키윌리', CK: '커버낫 키즈', LK: 'Lee Kids',
}

// 한글 브랜드명 → 브랜드 코드 (엑셀 업로드 등에서 사용)
const BRANDNM_TO_CD_RAW: Record<string, string> = {
  '커버낫': 'CO',
  '리(lee)': 'LE', '리(Lee)': 'LE', '리(LEE)': 'LE', '리': 'LE', 'lee': 'LE',
  '와키윌리': 'WA',
  '커버낫 키즈': 'CK', '커버낫키즈': 'CK',
  'lee kids': 'LK', 'LEE KIDS': 'LK', '리키즈': 'LK', '리 키즈': 'LK',
}
const normBrand = (s: string) => s.replace(/\s+/g, '').toLowerCase()
export function brandNameToCode(nm: string): string | null {
  if (BRANDNM_TO_CD_RAW[nm]) return BRANDNM_TO_CD_RAW[nm]
  const n = normBrand(nm)
  for (const [k, v] of Object.entries(BRANDNM_TO_CD_RAW)) {
    if (normBrand(k) === n) return v
  }
  return null
}

// 유효 브랜드 코드 Set (SQL 인젝션 방지용)
export const VALID_BRANDS = new Set(['CO', 'WA', 'LE', 'CK', 'LK'])

// 품목(ITEMNM) → 상위 카테고리 매핑
export const ITEM_CATEGORY_MAP: Record<string, string> = {
  // Outer
  '자켓': 'Outer', '점퍼': 'Outer', '다운파카': 'Outer', '코트': 'Outer',
  '청자켓': 'Outer', '후드집업': 'Outer', '덤블자켓': 'Outer', '가디건': 'Outer',
  '베스트': 'Outer', '다운베스트': 'Outer', '울코트': 'Outer', '아노락': 'Outer', '다운코트': 'Outer',
  // Top
  '반팔티셔츠': 'Top', '긴팔 티셔츠': 'Top', '크루넥': 'Top', '후드티': 'Top',
  '셔츠': 'Top', '반팔 셔츠': 'Top', '니트': 'Top', '슬리브리스': 'Top', '래쉬가드': 'Top',
  // Bottom
  '팬츠': 'Bottom', '반바지': 'Bottom', '청바지': 'Bottom', '스커트': 'Bottom',
  '조거팬츠': 'Bottom', '청반바지': 'Bottom', '저지반바지': 'Bottom', '면바지': 'Bottom', '오버롤': 'Bottom',
  // Bag
  '가방': 'Bag', '백팩': 'Bag', '크로스': 'Bag', '토트': 'Bag', '에코백': 'Bag',
  '숄더백': 'Bag', '메신저백': 'Bag', '슬링백': 'Bag', '파우치': 'Bag', '보틀백': 'Bag',
  // Shoes
  '신발': 'Shoes', '슬리퍼': 'Shoes', '샌들': 'Shoes',
  // ACC
  '모자': 'ACC', '양말': 'ACC', '비니': 'ACC', '머플러': 'ACC', '장갑': 'ACC',
  '쥬얼리': 'ACC', '지갑': 'ACC', '버킷햇': 'ACC', '기타(악세사리)': 'ACC', '스마트 액세서리': 'ACC',
  // Set/Dress
  '셋업': 'Set/Dress', '원피스': 'Set/Dress', '스윔웨어': 'Set/Dress',
  // 속옷
  '레깅스': '속옷', '언더웨어': '속옷', '드로우즈': '속옷',
  // Beauty
  '립스틱': 'Beauty', '립플럼퍼': 'Beauty', '립밤': 'Beauty', '향수': 'Beauty',
  // 기타
  '사은품': '기타', '애견': '기타',
}

// 카테고리 목록 (필터용)
export const ITEM_CATEGORIES = ['전체', 'Outer', 'Top', 'Bottom', 'Bag', 'Shoes', 'ACC', 'Set/Dress', '속옷', 'Beauty', '기타']

// 카테고리별 색상
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Outer:      { bg: '#dbeafe', text: '#1d4ed8' },
  Top:        { bg: '#dcfce7', text: '#15803d' },
  Bottom:     { bg: '#fef3c7', text: '#92400e' },
  Bag:        { bg: '#fce7f3', text: '#be185d' },
  Shoes:      { bg: '#e0e7ff', text: '#3730a3' },
  ACC:        { bg: '#f3e8ff', text: '#6b21a8' },
  'Set/Dress':{ bg: '#ccfbf1', text: '#0f766e' },
  Beauty:     { bg: '#ffe4e6', text: '#9f1239' },
  '기타':     { bg: '#f1f5f9', text: '#475569' },
}

// 대시보드용 브랜드 색상 (한글 키)
export const BRAND_COLORS_KR: Record<string, string> = {
  '커버낫': '#e91e63', '리(LEE)': '#3b82f6', '와키윌리': '#10b981',
  'LEE KIDS': '#8b5cf6', '커버낫 키즈': '#f59e0b',
}

// 브랜드 탭 (전체 + 개별 브랜드)
export const BRAND_TABS = [
  { label: '전체', value: 'all' },
  { label: '커버낫', value: 'CO' },
  { label: '리(Lee)', value: 'LE' },
  { label: '와키윌리', value: 'WA' },
  { label: '커버낫 키즈', value: 'CK' },
  { label: 'Lee Kids', value: 'LK' },
]
