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

## 런칭 체크리스트

- [x] 표정 변환 · 크레딧 · Google / Kakao 로그인
- [x] JIKYU Studio 브랜딩
- [ ] 커스텀 도메인 + `AUTH_URL` / OAuth URI 갱신
- [ ] (선택) Toss 라이브 키 전환
- [ ] (선택) 이용약관 페이지

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
