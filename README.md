# JIKYU Studio

AI(FACS 프롬프트)로 얼굴 표정을 변환하는 웹 앱입니다.

- **브랜드:** JIKYU Studio
- **프로덕션 (Vercel):** https://irr-expression-studio.vercel.app
- **커스텀 도메인:** 연결 후 `AUTH_URL` · `NEXT_PUBLIC_APP_URL` 및 OAuth Redirect URI 갱신
- **스택:** Next.js · Gemini · Toss Payments · Auth.js (Google / Kakao) · Vercel · Upstash Redis

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```

http://localhost:3000

---

## 로그인 설정 (Google + Kakao)

코드는 이미 연동되어 있습니다. **콘솔 + 환경변수**만 채우면 버튼이 나타납니다.

### 공통

| 변수 | 설명 |
|------|------|
| `AUTH_SECRET` | `openssl rand -base64 32` 로 생성 |
| `AUTH_URL` | 로컬: `http://localhost:3000` / 프로덕션: `https://your-domain.com` |

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 클라이언트
2. **승인된 리디렉션 URI**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://irr-expression-studio.vercel.app/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google` ← 커스텀 도메인 연결 후 추가

| 변수 | 값 |
|------|-----|
| `AUTH_GOOGLE_ID` | 클라이언트 ID |
| `AUTH_GOOGLE_SECRET` | 클라이언트 보안 비밀 |

### Kakao

1. [Kakao Developers](https://developers.kakao.com/console/app) → 앱 만들기
2. **앱 → 제품 설정 → 카카오 로그인** → 활성화 ON
3. **웹** 플랫폼 등록 (사이트 도메인)
   - `http://localhost:3000`
   - `https://irr-expression-studio.vercel.app`
   - `https://your-domain.com` (도메인 확정 후)
4. **Redirect URI**
   - `http://localhost:3000/api/auth/callback/kakao`
   - `https://irr-expression-studio.vercel.app/api/auth/callback/kakao`
   - `https://your-domain.com/api/auth/callback/kakao`
5. **앱 키 → REST API 키** → `AUTH_KAKAO_ID`
6. **보안 → Client Secret** 생성·활성화 → `AUTH_KAKAO_SECRET`

| 변수 | 값 |
|------|-----|
| `AUTH_KAKAO_ID` | REST API 키 |
| `AUTH_KAKAO_SECRET` | Client Secret |
| `AUTH_KAKAO_REQUEST_EMAIL` | `1` — 카카오 이메일 동의항목 설정 후 (구글·카카오 크레딧 통합) |

### Vercel에 넣을 곳

**Project → Settings → Environment Variables**

변경 후 **Redeploy**.

---

## 커스텀 도메인 (JIKYU Studio 런칭)

Vercel은 **도메인 판매가 아니라 연결**만 합니다. 먼저 외부에서 구매합니다.

### 이름 아이디어

| 후보 | 메모 |
|------|------|
| `jikyu.studio` | 브랜드명과 일치 |
| `jikyustudio.com` | 국제 `.com` |
| `jikyu.kr` / `jikyu.co.kr` | 한국 사용자 (가비아 등) |

### Vercel 연결 절차

1. 도메인 구매
2. Vercel → **Project → Settings → Domains** → 도메인 입력
3. DNS 설정 (CNAME → `cname.vercel-dns.com` 등)
4. SSL 자동 발급 (몇 분~수십 분)
5. **환경변수 업데이트 후 Redeploy**

| 변수 | 새 값 예시 |
|------|------------|
| `AUTH_URL` | `https://jikyu.studio` |
| `NEXT_PUBLIC_APP_URL` | `https://jikyu.studio` |

6. **Google / Kakao 콘솔**에 새 Redirect URI 추가
7. Toss **실결제** 사용 시 성공/실패 URL도 새 도메인으로 변경

---

## 실결제 전환 (Toss)

### PAYMENT_MOCK

- **로컬 개발:** `.env.local`에 `PAYMENT_MOCK=true` 가능 (결제창 없이 크레딧 테스트)
- **Vercel 프로덕션:** `PAYMENT_MOCK` **설정하지 않거나 삭제**  
  코드에서도 `NODE_ENV=production`이면 mock이 **강제 비활성화**됩니다.

### 토스 라이브 키 발급

1. [토스페이먼츠](https://www.tosspayments.com/) 가맹점 신청·심사
2. 대시보드 → **API 키** → **라이브** 키 확인
   - `NEXT_PUBLIC_TOSS_CLIENT_KEY` = `live_ck_...`
   - `TOSS_SECRET_KEY` = `live_sk_...` (서버 전용, 절대 클라이언트에 노출 금지)
3. Vercel에 반영 후 **Redeploy**
4. 테스트 키(`test_ck_` / `test_sk_`)는 프로덕션 env에서 제거

실결제 전에는 토스 **테스트 키**로 결제창·승인 플로우만 검증할 수 있습니다 (실제 출금 없음).

---

## JIKYU 도메인 구매 추천

| 서비스 | 추천 대상 | 장점 | JIKYU에 맞는 TLD |
|--------|-----------|------|------------------|
| **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)** | `.com` · `.dev` · `.io` | 갱신가 원가에 가깝, DNS·CDN 통합, WHOIS 프라이버시 | `jikyu.dev`, `jikyudev.com`, `jikyu.io` |
| **[가비아](https://domain.gabia.com/)** | `.kr` · `.co.kr` | 한국어 지원, 국내 사업자·신뢰감 | `jikyu.kr`, `지큐.kr`(한글 도메인) |
| **[Porkbun](https://porkbun.com/)** | Cloudflare 대안 | UI 단순, `.dev`·`.io` 가끔 저렴 | `jikyustudio.dev` 등 |

### 이름 후보 (구매 전 가용성 검색)

| 용도 | 후보 |
|------|------|
| 브랜드 허브 (JIKYU DEV) | `jikyu.dev`, `jikyudev.com`, `jikyu.io` |
| 현재 앱 (JIKYU Studio) | `jikyustudio.com`, `studio.jikyu.dev` (서브도메인) |

- **JIKYU DEV** = 개발·브랜드 사이트, **JIKYU Studio** = 표정 변환 앱으로 나누기 좋음  
- `.dev`는 HTTPS 필수 TLD라 프로덕션에 잘 맞음  
- Cloudflare에서 `jikyu.dev` 구매 → DNS에서 `studio.jikyu.dev`를 Vercel에 CNAME 연결 가능

---

## 런칭 체크리스트

- [x] 표정 변환 · 크레딧 · Google / Kakao 로그인
- [x] JIKYU Studio 브랜딩
- [x] 프로덕션 PAYMENT_MOCK 강제 비활성화 (코드)
- [ ] Vercel에서 `PAYMENT_MOCK` 삭제 + Toss 라이브 키
- [ ] 커스텀 도메인 + `AUTH_URL` / OAuth URI 갱신
- [ ] (선택) 이용약관·환불 안내 페이지

---

## 스크립트

```bash
npm run dev      # 개발 서버
npm test         # 테스트
npm run build    # 프로덕션 빌드
```

## Runtime Audit (마무리 점검)

```powershell
& "$env:USERPROFILE\.cursor\skills\runtime-audit-js\scripts\runtime-audit-js.ps1" . -Copy
```

Cursor Agent에 붙여넣어 OOM·누수·race condition 정적 검수를 실행합니다.
