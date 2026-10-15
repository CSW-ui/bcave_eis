# Microsoft 독립 계정 로그인 설정

Microsoft SSO와 기존 이메일·비밀번호 EIS 로그인을 함께 제공합니다. **이메일이 같아도 두 계정의 사용자 ID, 역할, 브랜드 권한과 OTP를 각각 관리합니다.** Microsoft 계정을 기존 EIS 사용자에게 연결하거나 권한을 자동으로 복사하지 않습니다. 관리자 지시로 수행하는 사전 등록은 아래 절차에 따라 권한을 한 번 복사할 수 있습니다.

Entra 설정과 Client Secret 입력을 완료하고 과거 자동 연결 공급자를 비활성화했습니다. **같은 회사 이메일로 기존 EIS 계정과 다른 Microsoft UUID가 생성되는 것과, 명시적 관리자 승인 없이 실제 Entra callback에서 접근이 차단되는 것을 확인했습니다. 인증 회귀 테스트 178개를 통과했습니다.** 기존 EIS 비밀번호·OTP 재로그인과 독립 Microsoft 계정의 어드민·전체 브랜드 승인 후 EIS OTP 없이 대시보드 진입을 로컬에서 확인했습니다. 과거 identity 연결 해제는 `manual_linking_disabled`로 차단되어 소유자의 조치가 남아 있습니다. 운영 배포는 사용자가 직접 진행하며 운영 환경은 변경하지 않았습니다.

## 계정 분리 기준

| 항목 | 기존 EIS 계정 | Microsoft 계정 |
| --- | --- | --- |
| 로그인 | 기존 이메일·비밀번호 | 회사 Microsoft 인증 |
| 사용자 식별 | 기존 Supabase 사용자 UUID | Entra `tid` + `oid`에 대응하는 별도 UUID |
| 이메일 | 기존 로그인 이메일 | 회사 이메일은 표시 정보로만 사용 |
| 역할·브랜드 | 기존 프로필 유지 | Microsoft UUID별 프로필과 명시적 관리자 승인 필요 |
| OTP | 기존 TOTP 유지 | 검증된 `bcave.co.kr` 계정은 EIS OTP 생략 |
| 관리자 화면 | **EIS 계정** 탭 | **Microsoft 계정** 탭 |

Microsoft 계정은 검증된 회사 테넌트 ID(`tid`)와 사용자 object ID(`oid`)로 식별합니다. 이 조합을 SHA-256으로 변환한 `64자리 hex@microsoft-sso.invalid` 내부 주소로 독립 Supabase Auth 사용자를 생성합니다. 회사 이메일은 `app_metadata`의 표시 정보이며 계정 검색·연결·권한 판단에 사용하지 않습니다. Microsoft는 `oid`·`tid`를 안정된 사용자 식별자로 제공하고 이메일이나 표시 이름은 변경될 수 있다고 설명합니다. [Microsoft ID token claims](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)

Microsoft 로그인은 자신의 UUID에 대응하는 `profiles`만 조회합니다. 같은 회사 이메일의 기존 EIS 프로필을 대신 사용하거나 역할·브랜드·OTP를 자동 복사하는 처리는 없습니다. 회사 이메일이 변경되어도 `tid`와 `oid`가 같으면 같은 독립 Microsoft 계정을 사용합니다.

현재 프로젝트에는 Auth 사용자 생성 시 `profiles`를 자동 생성하는 DB trigger가 있습니다. 따라서 **프로필 존재나 기본 역할만으로 Microsoft 접근을 승인하지 않습니다.** 서버가 관리하는 `app_metadata.microsoft_access_approved === true`가 별도로 필요하며, 자동 프로필이 있더라도 이 표시가 없으면 승인 대기입니다. Callback, 보호 페이지·API와 세션 검사에서 동일한 승인 조건을 확인합니다.

## 최초 로그인과 관리자 승인

1. 직원이 **Microsoft 회사 계정으로 로그인**을 실행합니다. 정상 Microsoft 인증 후 독립 Auth 계정이 생성됩니다. DB trigger로 프로필도 생길 수 있지만 명시적 승인 표시가 없으므로 승인 안내를 받고 EIS에 진입하지 못합니다.
2. 기존 EIS 관리자는 **관리자 → 사용자 관리 → Microsoft 계정**에서 해당 승인 대기 계정을 확인합니다. **EIS 계정** 탭의 기존 권한은 별도로 유지됩니다.
3. 관리자가 **권한 등록**에서 이름, 역할과 접근 브랜드를 명시하여 해당 Microsoft UUID의 프로필을 저장합니다. 프로필 저장에 성공한 뒤 서버가 `microsoft_access_approved: true`를 설정합니다. 현재 EIS 규칙상 브랜드 미선택은 전체 접근이므로 브랜드 제한이 필요하면 허용 브랜드를 선택합니다.
4. 직원이 Microsoft로 다시 로그인합니다. Microsoft가 서명한 `email`이 정확히 `bcave.co.kr` 도메인이고 `xms_edov=true`인 경우에만 허용하며 EIS OTP는 생략합니다. 다른 도메인·하위 도메인·검증되지 않은 이메일은 계정 생성과 세션 발급 전에 차단합니다. Entra 자체 MFA 정책은 그대로 적용됩니다.
5. 승인된 역할·브랜드 범위로 EIS에 진입합니다. 이후 권한 변경·OTP 초기화·계정 삭제도 각 계정별로 처리합니다.

관리자 화면에서 Microsoft 계정의 회사 비밀번호를 설정하거나 EIS 비밀번호로 전환하지 않습니다. 기존 EIS 계정의 비밀번호, 프로필과 OTP는 유지합니다. Microsoft에만 적용한 회사의 조건부 접근 정책은 기존 비밀번호 로그인까지 강제되지 않으며, 두 계정에 필요한 EIS 권한은 각각 승인합니다.

## 관리자 지시에 따른 사전 등록

직원의 최초 로그인 전에 관리자가 명시적으로 승인하면, 기존 EIS 역할·브랜드 권한을 독립 Microsoft UUID에 한 번 복사할 수 있습니다. 로그인 시 자동 승계하거나 두 계정의 권한을 동기화하지 않습니다.

- 회사 Entra 디렉터리의 이메일 및 UPN이 기존 `@bcave.co.kr` 이메일과 정확히 일치하는 사용자 한 명만 대상으로 합니다. 실제 Entra Object ID와 회사 tenant ID로 기존 SSO와 동일한 내부 주소를 계산합니다. 별칭 추측이나 이름만으로 매칭하지 않습니다.
- 새 Auth UUID를 승인 대기로 생성하고, 기존 역할·브랜드를 별도 프로필에 저장한 뒤 관리자 승인 표시를 설정합니다. 저장한 권한과 승인 상태를 다시 조회하여 확인합니다.
- 이미 존재하는 Microsoft 계정은 덮어쓰지 않습니다. 매칭이 없거나 여러 개인 계정, 회사 도메인이 아닌 계정은 제외하고 별도 확인합니다.
- 기존 EIS 계정의 비밀번호·OTP·권한·UUID와 기존 Microsoft 계정은 유지합니다. 이후 양쪽 권한은 각각 관리하며 일반 신규 직원의 최초 로그인 승인 대기 정책은 그대로 유지합니다.

## 기존 계정에서 Microsoft 계정으로 전환

운영 원칙은 **관리자 승인 및 브랜드 권한 부여 후 이용**, **기존 EIS 계정과 Microsoft 계정의 연동·권한 자동 승계 없음**입니다. 기존 EIS 계정 정리는 전환을 확인한 뒤 별도 진행합니다.

전환 기간에는 기존 이메일·비밀번호 로그인과 Microsoft 로그인을 함께 제공합니다. 약 1주 병행 운영은 검토 제안이며 확정된 종료 일정은 아닙니다. 배포일에 맞춰 운영 담당자가 기간과 종료일을 확정합니다. 자동 종료나 기존 계정 일괄 삭제는 구현하지 않습니다.

1. 직원은 회사 Microsoft 계정으로 최초 로그인하여 독립 계정을 등록합니다. 승인 대기 중에는 기존 EIS 계정으로 업무를 계속할 수 있습니다.
2. 관리자는 Microsoft 계정마다 역할과 접근 브랜드를 확인해 승인합니다. 기존 EIS 권한은 참고할 수 있지만 자동 복사하거나 연결하지 않습니다. 어드민은 전체 브랜드이며, 그 외 역할은 허용 브랜드를 지정합니다. 현재 브랜드 미선택은 전체 접근이므로 전체 허용 의도가 있는 경우에만 비워 둡니다.
3. 직원별 Microsoft 로그인과 승인된 브랜드 접근을 확인한 뒤 전환 완료를 기록합니다.
4. 병행 기간 종료와 대상자 전환 완료를 확인한 후, 기존 EIS 계정의 보존·접근 종료·삭제 범위를 별도 확정합니다. 기존 관리자 계정도 사전 확인 없이 정리하지 않습니다.

## 인증과 세션 처리

1. `/auth/microsoft`가 회사 Entra의 authorization code 흐름을 시작합니다. PKCE와 state, nonce를 사용하며 짧은 인증 트랜잭션을 보호된 쿠키에 저장합니다.
2. Microsoft가 같은 사이트의 `/auth/callback`으로 돌아오면 EIS 서버에서 code를 교환합니다.
3. `jose`로 Microsoft JWKS의 RS256 서명, 고정 issuer·client ID audience, nonce, 토큰 유효 시간, 회사 `tid`와 사용자 `oid`, 검증된 `bcave.co.kr` 이메일 및 `xms_edov=true`를 검증합니다.
4. 독립 Microsoft UUID를 확보하고 해당 UUID의 프로필·역할과 `microsoft_access_approved === true`를 검사합니다. 자동 생성된 프로필이 있더라도 미승인 계정에는 EIS 세션을 발급하지 않습니다.
5. 서버에서만 Supabase 관리자 `generateLink`로 해당 내부 계정의 일회용 grant를 생성하고 SSR `verifyOtp`로 교환합니다. 이메일이나 로그인 링크를 직원에게 보내지 않습니다. [Supabase generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
6. Supabase의 해당 `session_id`와 사용자·`tid`·`oid`에 묶인 서명된 HttpOnly 세션 증명을 함께 발급합니다. Microsoft 계정에는 이 증명이 필수이며 앱의 고정 8시간 만료는 없습니다. 증명은 현재 Supabase 세션에 종속되며 Supabase 로그인 자동 갱신을 따릅니다. 증명이 없거나 다른 세션이면 접근을 거절하고 Microsoft 재로그인이 필요합니다.
7. `/login?auth_complete=1`에서 서명된 회사 도메인 검증 증명을 확인하여 EIS OTP를 생략하고 로그인을 완료합니다. 로그인 이력과 동시 로그인 제한도 독립 UUID별로 적용됩니다.

이 구조는 Supabase의 회사 이메일 자동 identity 연결을 호출하지 않습니다. 과거의 `custom:bcave-entra` 공급자는 비활성 상태로 유지합니다. Supabase Site URL이나 전역 Redirect URLs allowlist 변경은 필요하지 않으며, 서버에서 기존 Supabase 관리자 API를 사용합니다. Supabase 대시보드 로그인이나 프로젝트 소유자의 Management API 토큰은 이 절차에 필요하지 않습니다.

## Entra 설정

회사의 기존 **BCAVE EIS** 앱을 사용합니다.

| 설정 | 값 |
| --- | --- |
| Application (client) ID | `6bda999f-ddc2-4411-bb66-9e5ece2a7bb2` |
| Directory (tenant) ID | `09cefcf6-a744-4cc2-a8ec-681fe0d1a85a` |
| 지원 계정 유형 | 회사 디렉터리의 Single tenant (`AzureADMyOrg`) |
| ID token issuer | `https://login.microsoftonline.com/09cefcf6-a744-4cc2-a8ec-681fe0d1a85a/v2.0` |

인증 플랫폼은 **Web**입니다. 기존 Supabase callback을 보존하고 아래 주소를 등록한 뒤 저장된 Manifest에서 확인했습니다.

```text
https://portal.bcave.co.kr/auth/callback
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3105/auth/callback
```

Microsoft는 `localhost` callback을 비교할 때 포트를 무시하므로 포트만 다른 `http://localhost:3105/auth/callback`을 중복 등록하지 않습니다. `127.0.0.1`은 정확한 포트를 등록해야 합니다. 앱 자체는 허용 origin을 검사하므로 다른 로컬 포트에는 아래 환경 변수도 필요합니다. [Microsoft Redirect URI 규칙](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url)

저장된 optional claims는 ID token의 `email`, `xms_edov` 및 Access token의 `xms_edov`입니다. 이 이메일 정보는 표시용으로만 사용합니다. 회사 정책으로 동의·사용자 할당이 필요하면 Entra 관리자가 처리하며, 회사 테넌트 게스트도 EIS의 독립 프로필 승인을 받아야 합니다.

## 환경 변수와 런타임

`jose` 6.2.12와 CommonJS 회귀 테스트의 ESM 로딩에 맞추어 **Node.js `^20.19.0 || ^22.12.0 || >=23.0.0`**을 사용합니다. Node 20 계열은 20.19.0 이상, Node 22 계열은 22.12.0 이상이 필요하며 운영에는 **22.12.0 이상의 지원 중인 버전**을 권장합니다. 빌드와 서비스 실행에 같은 지원 런타임을 사용합니다. [jose의 ESM·런타임 안내](https://github.com/panva/jose#footnotes)

사용자가 새 Client Secret의 **Value**를 `.env.local`에 직접 입력했습니다. 운영 서버에도 유효한 Value를 비밀 환경 변수로 설정합니다. **Secret ID가 아닙니다.** Value는 재조회할 수 없으므로 분실하거나 만료되면 Entra에서 새 secret을 발급하고 서버 환경을 갱신합니다. 만료일과 갱신 담당자를 기록합니다. [Microsoft 앱 인증 정보](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials)

`.env.microsoft.example`을 참고하여 기존 환경 변수에 필요한 항목을 병합합니다.

```dotenv
NEXT_PUBLIC_BASE_URL=https://portal.bcave.co.kr
NEXT_PUBLIC_MICROSOFT_SSO_ENABLED=false
NEXT_PUBLIC_AUTH_LOCAL_ORIGINS=http://localhost:3105,http://127.0.0.1:3105
MICROSOFT_TENANT_ID=09cefcf6-a744-4cc2-a8ec-681fe0d1a85a
MICROSOFT_CLIENT_ID=6bda999f-ddc2-4411-bb66-9e5ece2a7bb2
MICROSOFT_OIDC_PROVIDER_ID=custom:bcave-entra
MICROSOFT_CLIENT_SECRET=<Client Secret Value를 직접 입력>
```

`MICROSOFT_OIDC_PROVIDER_ID`는 과거 자동 연결 공급자를 비활성화할 때 확인할 식별자입니다. 신규 Microsoft 계정의 identity를 이 공급자에 연결하지 않습니다. 기존 `NEXT_PUBLIC_SUPABASE_URL`, 브라우저용 Supabase 키, `SUPABASE_SECRET_KEY`와 `REQUIRE_MFA`는 기존 설정을 사용합니다. `MICROSOFT_CLIENT_SECRET`과 `SUPABASE_SECRET_KEY`는 서버 전용입니다. 실제 비밀 값을 Git·문서·채팅·공개 환경 변수에 넣지 않습니다.

`NEXT_PUBLIC_` 설정을 바꾸면 다시 빌드하거나 개발 서버를 재시작합니다. 기본 Microsoft 로그인 플래그는 비활성입니다.

## 과거 자동 연결 공급자 비활성화 확인

실제 EIS 프로젝트 `hdkueztehflzzxakgklp`의 `custom:bcave-entra` 공급자를 비활성화했습니다. 이후 설정 확인에는 아래 명령을 사용합니다.

```bash
npm run sso:setup
```

기본 명령은 read-only이며 `accountMode: separate`, `legacyAutoLinkingDisabled: true`를 확인합니다. secret이나 서버 키를 출력하지 않습니다. 과거 공급자가 없는 프로젝트도 정상입니다.

```bash
npm run sso:setup -- --apply
```

`--apply`는 알려진 앱·테넌트와 일치하는 기존 공급자를 **비활성화하고 읽기 검증**합니다. 공급자를 추가하거나 활성화하지 않습니다. 동일 identifier가 다른 앱·테넌트에 연결된 경우에는 변경하지 않습니다. 전역 회원가입·요금제·redirect 설정도 변경하지 않습니다.

공급자 비활성화만으로 과거 자동 연결 테스트의 identity가 삭제되지는 않습니다. 기존 EIS 사용자·이메일 identity·비밀번호·프로필·TOTP를 보존하면서 과거 Microsoft 연결만 처리해야 하며, 새 독립 계정의 권한을 기존 계정에서 복사하지 않습니다.

본인이 기존 **EIS 비밀번호와 OTP로 로그인**한 뒤 **설정 → 보안 → Microsoft 로그인 연결 해제**를 사용할 수 있습니다. 서버는 로그인한 본인의 과거 Microsoft identity만 해제하며 비밀번호 인증과 기존 EIS 이메일 identity를 확인합니다. 실제 사용자 실행 결과 `manual_linking_disabled`로 실패했으며 과거 identity는 아직 남아 있습니다. 이전 OAuth 세션은 애플리케이션에서 차단하며 새 SSO는 독립 UUID로 동작합니다. `manual_linking_disabled` 오류가 나오면 Supabase 프로젝트 소유자가 identity 연결 정책을 확인해야 할 수 있으며, 현재 이 소유자 설정은 변경하지 않았습니다.

## 로컬 3105 포트와 운영 배포

로컬 검증에는 위의 로컬 origin 목록, Client Secret 및 `NEXT_PUBLIC_MICROSOFT_SSO_ENABLED=true`가 필요합니다.

```bash
npm ci
npm run test:auth
npm run sso:setup
npm run dev -- --port 3105
```

Chrome에서 `http://127.0.0.1:3105/login`을 열고 기존 EIS 로그인과 Microsoft 독립 계정을 각각 검증합니다. 최초 Microsoft 인증, 승인 대기 확인, 기존 EIS 관리자의 Microsoft 권한 등록, Microsoft 재로그인, EIS OTP 없이 대시보드 진입 순서로 확인합니다. 두 계정의 UUID가 다르고 권한·OTP가 공유되지 않는지 확인합니다.

운영 서버에는 동일한 Entra 설정과 유효한 secret, 기존 Supabase 환경 변수, `NEXT_PUBLIC_BASE_URL=https://portal.bcave.co.kr`, `NEXT_PUBLIC_MICROSOFT_SSO_ENABLED=true`를 설정합니다.

```bash
npm ci
npm run test:auth
npm run sso:setup
npm run build
```

사용자가 기존 배포 방식으로 결과물을 반영하고 서비스 프로세스를 재시작합니다. 운영에서도 Microsoft 계정을 별도 승인하여 `https://portal.bcave.co.kr/login`부터 확인합니다. Microsoft 버튼을 숨기려면 플래그를 `false`로 바꾸고 다시 빌드·배포합니다.

## 인수 조건

인증 회귀 테스트 178개와 실제 회사 계정의 별도 UUID 생성·미승인 접근 차단을 확인했습니다. 기존 EIS 비밀번호·OTP 재로그인과 Microsoft 별도 관리자 승인 후 OTP 없는 대시보드 진입을 확인했습니다. 과거 연결 해제는 소유자 정책으로 차단되었으며 운영 배포·운영 확인은 사용자가 진행합니다. 아래 표에 따라 로컬과 운영 결과를 각각 기록합니다.

| 시나리오 | 기대 결과 |
| --- | --- |
| 기존 EIS 비밀번호 로그인 | 기존 UUID·프로필·브랜드·TOTP 유지 |
| 같은 회사 이메일로 Microsoft 최초 로그인 | 다른 Auth UUID 생성, 기존 EIS identity에 연결 없음 |
| 자동 프로필이 생긴 Microsoft 미승인 계정 | 명시적 승인 표시가 없으면 승인 안내 및 보호 페이지·API 접근 거절 |
| 관리자 Microsoft 권한 등록 | 해당 UUID의 프로필 저장 성공 후 승인 표시 설정, 역할·브랜드 별도 적용 |
| Microsoft 역할·브랜드 변경 | 같은 이메일의 기존 EIS 권한 유지 |
| EIS 역할·브랜드 변경 | Microsoft 권한 유지 |
| `REQUIRE_MFA` 활성 | 기존 EIS OTP 유지, 검증된 회사 Microsoft 계정은 EIS OTP 생략 |
| 회사 이메일이 `bcave.co.kr`가 아님 또는 검증 누락 | 로그인·계정 생성·세션 발급 거절 |
| EIS OTP 초기화 또는 Microsoft OTP 초기화 | 선택한 계정의 OTP만 처리 |
| 회사 이메일 변경, 동일 `tid`·`oid` | 같은 Microsoft UUID 유지, 표시 정보 갱신 |
| 다른 `oid` 또는 다른 테넌트 | 기존 사용자와 합쳐지지 않음, 회사 테넌트 검증 적용 |
| 잘못된 서명·issuer·audience·nonce·state·유효 시간 | 계정 세션 발급 거절 |
| 누락·위조·만료된 Microsoft 세션 증명 | 보호 페이지·API 접근 거절 |
| 다른 Supabase `session_id`의 세션 증명 | 접근 거절 |
| 기능 플래그 비활성 | Microsoft 버튼 숨김, 기존 EIS 로그인 가능 |
| 로그아웃·다른 브라우저 로그인 | 해당 독립 계정의 기존 세션 정책 적용 |

진단 로그에는 단계·상태·안전한 오류 코드만 확인합니다. secret, token, code, 일회용 grant나 전체 쿠키를 출력하지 않습니다.

## 일시적인 인증 통신 장애 복구

서버의 Supabase 요청에는 요청당 8초 제한을 둡니다. 조회(GET/HEAD)는 연결 초기화·연결 시간 초과·일시 DNS 오류 및 502/503/504에 한해 간격을 늘리며 최대 3회 시도합니다. 인증 거절과 429는 자동 반복하지 않습니다. POST/PUT/DELETE, refresh token과 일회용 인증 코드는 통신 계층에서 재전송하지 않습니다.

Microsoft 인증 이후 Supabase 세션 교환이 일시적으로 실패하면 동일하게 검증된 독립 계정에 대해 **새 grant를 발급**하여 최대 3회 시도합니다. 매 시도마다 UUID·Microsoft 계정 유형·관리자 승인 상태를 확인하며, 실패한 일회용 토큰이나 Entra authorization code를 재사용하지 않습니다. 신규 사용자 생성 응답이 유실되면 동일한 고유 내부 주소로 재시도하고 `email_exists`에서 기존 독립 UUID를 확인합니다. 권한을 중복 생성하거나 승인 표시를 자동 설정하지 않습니다.

장애가 계속되면 접근을 허용하지 않고 일시적인 인증 서버 장애로 안내합니다. 보호 경로에서 사용자 확인 통신이 실패하면 로그인 만료로 취급하지 않고 HTTP 503과 `Retry-After: 3`을 반환합니다. 복구 성공은 안전한 `session_recovered` 로그로 확인할 수 있습니다. 토큰·인증 코드·쿠키는 기록하지 않습니다.

운영 배포 시 callback을 처리하는 서버/프록시의 제한 시간이 이 복구 절차보다 짧지 않은지 확인합니다. 신규 계정 생성과 조회까지 포함하면 여러 외부 요청이 순차적으로 발생할 수 있습니다. 장기적인 Microsoft·Supabase·네트워크 장애 자체를 애플리케이션에서 없앨 수는 없으며, 지속 장애·503·복구 횟수는 운영 모니터링 대상입니다.

Microsoft callback 후 `/login?auth_complete=1`에서는 보호된 세션 완료 POST를 한 번 호출합니다. 이 경로에서 브라우저의 `getUser`·프로필 조회와 세션 GET을 중복 수행하지 않습니다. 서버의 계정 분리·회사 도메인 증명·승인·OTP 정책 검사는 유지됩니다.

대시보드는 실패 응답을 차트 데이터로 저장하지 않고 재시도 안내를 표시합니다. Snowflake 조회는 동일 requestId와 retry 플래그로 일시 오류를 복구하고 202 실행 중 응답을 polling합니다. 동일 SQL의 동시 SELECT는 진행 중 요청만 공유하며 권한 필터가 다른 SQL은 공유하지 않습니다. `npm run test:data`에서 관련 통신 회귀 테스트를 실행합니다.

## 중복 조회 제거와 로컬 측정 (2026-10-15)

- 초기 사용자 처리는 `INITIAL_SESSION` 이벤트를 사용합니다. 브라우저 프로필과 선택적 `session_token`을 한 번 조회하며, 같은 클라이언트·UUID의 진행 중 조회만 공유합니다. 응답 후 권한 데이터를 캐시하지 않습니다. 다른 기기 로그인 감지, 창 활성화 시 확인, 승인 대기 차단은 유지합니다. 선택적 토큰 컬럼이 없는 DB에서는 기존 프로필 조회로 호환합니다.
- 기존 MS 계정은 내부 주소에 해당하는 프로필 ID로 위치만 찾고 Auth `getUserById`로 현재 metadata를 다시 확인합니다. 역할 승인은 프로필 ID로 판단하지 않으며 실제 회사 이메일을 계정 연결 키로 사용하지 않습니다. 기존 계정의 생성 시도 및 전체 Auth 사용자 목록 검색을 줄입니다. 프로필이 없는 예외 상황의 중복 주소 복구 경로는 유지합니다.
- 대시보드·목표 데이터는 동일 화면에서 진행 중인 같은 조회만 공유합니다. 목표 업로드 후에는 강제로 새로 조회하며 삭제·업로드 전에 시작한 응답은 최신 데이터를 덮어쓰지 않습니다. 집계식·브랜드 필터는 변경하지 않았습니다.
- 기존 로그인 화면도 서버가 반환한 승인 역할을 사용하여 같은 프로필을 브라우저에서 다시 읽지 않습니다. 일시적인 세션 확인 503은 계정을 로그아웃시키지 않습니다.

Chrome, `http://127.0.0.1:3105`, 같은 MS 관리자, 개발 서버에서 이전 기록과 비교했습니다. 최초 데이터 준비까지는 dashboard HTML 요청 시작부터 dashboard·targets 응답 완료까지의 구간이며 개발 중 HMR 재조회는 제외했습니다. 이전 6.028초, 개선 후 재조회 3회는 5.401/2.888/3.134초(중앙값 3.134초), MS 로그인 직후 첫 데이터는 1.905초였습니다. 프로필 요청은 6→1회, dashboard와 targets는 각각 2→1회였습니다. 성공한 로그인 완료 POST의 서버 처리 시간은 0.782초(이전 기록 1.249초)였습니다. Entra에서 계정 선택하는 시간은 이 POST 측정에 포함되지 않습니다.

네트워크 지연 편차가 있고 개선 전 반복 표본이 충분하지 않으므로 운영 성능이나 일정한 개선율을 보장하는 수치로 해석하지 않습니다. 운영 배포는 사용자가 진행합니다. 인증·중복 조회 회귀 테스트 178개와 Snowflake 통신 테스트 8개로 권한·OTP·계정 분리·단일 세션과 통신 처리를 확인합니다.

## MS 로그인 유지 정책

MS 로그인도 기존 EIS처럼 Supabase 세션 자동 갱신을 따르며 앱에서 8시간 경과만으로 재로그인을 요구하지 않습니다. 새 서명 증명에는 `session_lifetime=supabase_session`을 포함하고 고정 `exp`를 두지 않습니다. 이 증명만으로 로그인할 수는 없으며 서버가 확인한 현재 Supabase 사용자·동일 session_id·tenant·object ID와 관리자 승인 상태가 모두 필요합니다.

브라우저의 영구 쿠키는 Supabase SSR 기본과 같은 400일 보존 한도를 사용하고, 검증된 요청에서 하루 간격으로 갱신합니다. 이는 로그인 유효기간을 400일로 강제하는 정책이 아니라 브라우저 보존 한도입니다. 사용자가 쿠키를 지우거나 브라우저가 저장소를 삭제하면 재로그인이 필요합니다. Supabase 소유자 측 세션 최대 수명·비활성 제한이 있다면 해당 정책도 적용되며 현재 소유자 설정은 확인·변경하지 않았습니다.

유효한 기존 8시간 증명은 첫 보호 경로 요청에서 자동 전환합니다. 이미 만료된 증명은 갱신 근거로 사용할 수 없으므로 한 번 다시 로그인해야 합니다. 로그아웃은 HttpOnly MS 증명 쿠키를 삭제한 뒤 기존 Supabase signOut을 수행합니다. 다른 기기 로그인에 대한 단일 세션 정책, 권한 해제, 계정 삭제와 회사 도메인 제한은 유지합니다.


## HTTPS 앞단과 내부 HTTP 포트

운영 외부 주소는 `https://portal.bcave.co.kr`이며 내부 Node 포트는 10010이어도 됩니다.
프록시가 `Host`와 `X-Forwarded-Host`를 `portal.bcave.co.kr`로 전달하면,
내부 전송을 나타내는 `X-Forwarded-Proto: http`여도 정확히 허용된 공개 도메인의 HTTPS origin으로 인증 시작·콜백을 처리합니다.
콜백과 Secure 쿠키는 계속 HTTPS를 사용하며, 외부 프록시는 HTTPS 접속을 제공해야 합니다.
알 수 없는 도메인과 여러 값이 섞인 전달 헤더는 계속 거절합니다.
운영 도메인으로 접속하는 경우 내부 포트 10010을 로컬 허용 origin이나 Entra 콜백에 추가할 필요가 없습니다.


## 인증 쿠키 크기 축소

브라우저·서버·미들웨어 Supabase SSR 클라이언트의 `cookies.encode`를 모두 `tokens-only`로 통일합니다.
액세스 토큰과 refresh token은 기존 SSR 쿠키에 유지하고, 중복 사용자 객체는 브라우저 별도 저장소/서버 요청별 메모리에서 처리합니다.
사용자 객체가 없는 첫 브라우저 세션은 `getUser()`로 보완하며, 프로필 승인·브랜드·회사 도메인·세션 proof와 OTP 검증은 유지합니다.
기존 사용자 포함 쿠키도 읽을 수 있고 세션 갱신 후 새 포맷으로 저장됩니다. 별도 DB/환경 변수 변경은 없습니다.
실제 설치된 SSR SDK와 합성 계정으로 쿠키 저장·새 서버 클라이언트 읽기·갱신·로그아웃·이전 포맷 호환을 테스트합니다.
합성 샘플의 Set-Cookie는 2545→1555바이트였으나 운영 계정의 토큰/헤더 크기에 따라 차이가 있으며, 프록시 버퍼 초과 해결을 보장하는 값은 아닙니다.

EIS MFA 조회는 토큰만 있는 서버 세션에서도 등록된 인증 수단을 놓치지 않도록 명시적인 세션 JWT를 SDK에 전달합니다. 이 경우 SDK가 사용자 인증 수단을 서버에서 다시 조회합니다. MS의 검증된 OTP 생략 경로는 유지합니다.
