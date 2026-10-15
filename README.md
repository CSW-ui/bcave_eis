This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Microsoft 회사 계정 로그인은 기존 EIS 이메일·비밀번호 계정과 별도로 관리합니다. 이메일이 같아도 UUID·권한·OTP를 연결하거나 복사하지 않습니다. 자동 프로필이 있어도 명시적 관리자 승인 전에는 접근할 수 없습니다. [설정 가이드](docs/microsoft-sso.md)와 [.env.microsoft.example](.env.microsoft.example)을 확인하세요. 별도 UUID 생성·실제 미승인 접근 차단과 인증 테스트 178개를 확인했고, 기존 EIS 비밀번호·OTP 로그인과 독립 MS 관리자 계정의 OTP 없는 대시보드 진입을 로컬에서 확인했습니다. Microsoft가 검증한 `bcave.co.kr` 이메일만 SSO를 허용합니다. 과거 연결 해제는 Supabase 소유자 정책에 막혀 소유자 조치가 남아 있습니다. Node.js 20.19.0 이상 또는 22.12.0 이상의 지원 버전을 사용하며, 운영 배포는 사용자가 직접 진행합니다.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
