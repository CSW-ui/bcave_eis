// ─── Legacy (kept for CampaignTable backward compat) ─────────
export interface Campaign {
  id: string
  name: string
  channel: 'sns' | 'search' | 'email' | 'display'
  status: 'active' | 'paused' | 'completed'
  budget: number
  spend: number
  impressions: number
  clicks: number
  conversions: number
  startDate: Date
  endDate: Date
}

// ─── IMC Plan ─────────────────────────────────────────────────

export interface CampaignProduct {
  productCode: string
  productName: string
}

export interface InfluencerSeedingRecord {
  influencerId: string
  influencerHandle: string
  productCode: string
  seedingQty: number
  seedingDate: string
}

export interface MetaAdLink {
  campaignId: string
  spend: number
  revenue: number
  roas: number
}

export interface IMCCampaign {
  id: string
  title: string
  startDate: string
  endDate: string
  status: 'planned' | 'active' | 'completed'
  color: string
  products: CampaignProduct[]
  seedingRecords: InfluencerSeedingRecord[]
  metaAds?: MetaAdLink
  oohCost: number
  notes?: string
}

// ─── Influencer Tracking ──────────────────────────────────────

export type InfluencerCategory = '패션' | '뷰티' | '라이프스타일' | '스포츠' | '여행'
export type SeedingType = '제품발송' | '콘텐츠의뢰'

export interface InfluencerAccount {
  id: string
  handle: string
  platform: 'instagram' | 'youtube' | 'tiktok'
  followers: number
  category: InfluencerCategory
  engagementRate: number
  collectedAt: string
}

export interface SeedingRecord {
  id: string
  campaignId: string
  campaignTitle: string
  productCode: string
  productName: string
  influencerId: string
  influencerHandle: string
  seedingDate: string
  seedingType: SeedingType
  status: '발송완료' | '수령확인' | '게시완료'
}

export interface SeedingResult {
  seedingRecordId: string
  influencerHandle: string
  platform: 'instagram' | 'youtube' | 'tiktok'
  postUrl?: string
  views: number
  likes: number
  comments: number
  estimatedReach: number
  isPosted: boolean
  postedAt?: string
}

// ─── Digital Marketing ────────────────────────────────────────

export interface MetaAdsCampaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed'
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  revenue: number
  roas: number
}

export interface ChannelPerformance {
  channel: 'Meta' | 'Google' | 'Naver' | 'Kakao'
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  roas: number
  ctr: number
}
