# JIKYU Studio

AI(FACS 프롬프트)로 얼굴 표정을 변환하는 웹 앱입니다.

- **브랜드:** JIKYU Studio
- **프로덕션:** https://jikyu.studio
- **Vercel 백업:** https://irr-expression-studio.vercel.app
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

## 프로덕션 환경변수 (Vercel)

**Project → Settings → Environment Variables**

| 변수 | Production 값 |
|------|----------------|
| `AUTH_URL` | `https://jikyu.studio` |
| `NEXT_PUBLIC_APP_URL` | `https://jikyu.studio` |

변경 후 **Redeploy**.

---

## 로그인 설정 (Google + Kakao)

### 공통

| 변수 | 설명 |
|------|------|
| `AUTH_SECRET` | `openssl rand -base64 32` 로 생성 |
| `AUTH_URL` | 로컬: `http://localhost:3000` / 프로덕션: `https://jikyu.studio` |

### Google — 승인된 리디렉션 URI

- `http://localhost:3000/api/auth/callback/google`
- `https://jikyu.studio/api/auth/callback/google`
- (선택) `https://irr-expression-studio.vercel.app/api/auth/callback/google`

### Kakao

1. [Kakao Developers](https://developers.kakao.com/console/app)
2. **웹** 사이트 도메인: `https://jikyu.studio`
3. **Redirect URI**
   - `http://localhost:3000/api/auth/callback/kakao`
   - `https://jikyu.studio/api/auth/callback/kakao`

| 변수 | 값 |
|------|-----|
| `AUTH_KAKAO_ID` | REST API 키 |
| `AUTH_KAKAO_SECRET` | Client Secret |
| `AUTH_KAKAO_REQUEST_EMAIL` | `1` — 이메일 동의항목 설정 후 (선택) |

---

## 도메인 (jikyu.studio)

1. 도메인 등록 업체 DNS에서 Vercel 안내에 따라 설정
2. Vercel → **Project → Settings → Domains** → `jikyu.studio` 추가
3. SSL 발급 대기 (몇 분~수십 분)
4. 위 **환경변수** 반영 후 Redeploy
5. Google / Kakao / Toss 콘솔 URI를 `jikyu.studio` 기준으로 갱신

---

## 실결제 (Toss)

- **로컬:** `PAYMENT_MOCK=true` 가능
- **프로덕션:** `PAYMENT_MOCK` 삭제, `live_ck_` / `live_sk_` 키 사용
- 프로덕션에서는 코드상 mock **강제 비활성화**

---

## 런칭 체크리스트

- [x] JIKYU Studio 브랜딩
- [x] 도메인 `jikyu.studio` 구매
- [ ] Vercel Domains 연결 + DNS
- [ ] `AUTH_URL` · `NEXT_PUBLIC_APP_URL` → `https://jikyu.studio`
- [ ] Google / Kakao Redirect URI 갱신
- [ ] Toss 가맹점·라이브 키

---

## 스크립트

```bash
npm run dev
npm test
npm run build
```
