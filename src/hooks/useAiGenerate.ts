'use client'

import { useState, useCallback } from 'react'

const MOCK_OUTPUTS: Record<string, string> = {
  sns: `✨ [봄 신상 출시 알림]\n\n따뜻한 봄과 함께 새로운 컬렉션이 찾아왔어요 🌸\n\n비케이브 2026 S/S 시즌의 시작을 알리는 스페셜 런칭!\n섬세한 디테일과 트렌디한 감각으로 완성된 이번 컬렉션은\n당신의 봄을 더욱 특별하게 만들어드립니다.\n\n📦 선착순 100명 특별 혜택\n🎁 5만원 이상 구매 시 봄 기프트 증정\n🚚 당일 발송 가능\n\n지금 바로 확인하세요 👇\n#비케이브 #봄신상 #2026SS #패션`,

  email: `안녕하세요, {고객명}님 😊\n\n비케이브입니다.\n\n고객님께서 찜해두신 상품이 이번 봄 시즌에 특별 할인 중이에요!\n\n■ 혜택 안내\n- 봄 신상 전품목 15% 할인\n- 3만원 이상 구매 시 무료배송\n- 리뷰 작성 시 적립금 2,000원\n\n▶ 지금 확인하기\n\n이 특별 혜택은 3월 31일까지만 제공됩니다.\n서둘러 쇼핑을 즐겨보세요!\n\n감사합니다.\nB.cave 마케팅팀 드림`,

  product: `[신제품 소개]\n\n비케이브의 2026 S/S 시그니처 라인을 소개합니다.\n\n이번 시즌의 핵심 키워드는 '미니멀 럭셔리'입니다.\n군더더기 없는 깔끔한 라인과 고급 소재의 조합으로\n일상에서도 특별함을 느낄 수 있는 제품을 선보입니다.\n\n• 소재: 프리미엄 코튼 블렌드\n• 주요 색상: 오트밀 화이트, 소프트 베이지, 라벤더\n• 사이즈: S, M, L, XL\n• 출시일: 2026년 3월 15일\n\n오랜 R&D를 통해 개발된 이 제품은\n세탁 후에도 형태가 유지되는 특수 처리로\n오래도록 새것 같은 착용감을 제공합니다.`,

  report: `2026년 3월 마케팅 성과 보고서\n\n━━━━━━━━━━━━━━━━━━━━━\n\n■ 핵심 지표 요약\n\n• 총 노출수: 4,521만회 (전월 대비 +15.2%)\n• 총 클릭수: 12.8만회 (전월 대비 +9.7%)\n• 전환율(CVR): 2.83% (전월 대비 -0.3%p)\n• ROAS: 4.2x (전월 대비 +5.1%)\n\n■ 채널별 성과\n\n1. SNS 광고 (38% 비중)\n   - 노출: 1,718만회 | 클릭: 48,560회\n   - ROAS: 5.1x → 전체 채널 중 최고 효율\n\n2. 검색 광고 (27% 비중)\n   - 노출: 1,221만회 | 클릭: 34,560회\n   - CPC 전월 대비 +8% 상승 → 입찰가 조정 필요\n\n■ 다음 달 액션 플랜\n\n1. SNS 릴스 광고 예산 30% 증액\n2. 검색 광고 롱테일 키워드 확대\n3. 이메일 개인화 자동화 시스템 구축 검토`,
}

export function useAiGenerate() {
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async (prompt: string, type: string = 'sns') => {
    setIsGenerating(true)
    setOutput('')

    const text = MOCK_OUTPUTS[type] ?? MOCK_OUTPUTS.sns
    let i = 0

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setOutput(text.slice(0, i + 1))
          i += 3
        } else {
          setOutput(text)
          clearInterval(interval)
          setIsGenerating(false)
          resolve()
        }
      }, 20)
    })
  }, [])

  const reset = useCallback(() => {
    setOutput('')
    setIsGenerating(false)
  }, [])

  return { output, isGenerating, generate, reset }
}
