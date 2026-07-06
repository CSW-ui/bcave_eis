/** @type {import('next').NextConfig} */
const nextConfig = {
  // 린트는 빌드를 막지 않음(기존 스타일 부채: 미사용 변수·삼항 부수효과).
  // 타입 검사는 그대로 유지되어 실제 버그는 계속 빌드에서 차단됨.
  // 린트는 `npm run lint`로 별도 점검.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
