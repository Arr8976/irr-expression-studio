# IRR Expression Studio

AI(FACS 프롬프트)로 얼굴 표정을 변환하는 웹 앱입니다.

- **프로덕션:** https://irr-expression-studio.vercel.app
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

### Google (완료 시 참고)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 클라이언트
2. **승인된 리디렉션 URI**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://irr-expression-studio.vercel.app/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google` ← 도메인 연결 후 추가

| 변수 | 값 |
|------|-----|
| `AUTH_GOOGLE_ID` | 클라이언트 ID |
| `AUTH_GOOGLE_SECRET` | 클라이언트 보안 비밀 |

### Kakao (추가할 부분)

1. [Kakao Developers](https://developers.kakao.com/console/app) → 앱 만들기
2. **앱 → 제품 설정 → 카카오 로그인** → 활성화 ON
3. **웹** 플랫폼 등록 (사이트 도메인)
   - `http://localhost:3000`
   - `https://irr-expression-studio.vercel.app`
   - `https://your-domain.com` (도메인 확정 후)
4. **Redirect URI** (REST API 키 또는 카카오 로그인 → Redirect URI)
   - `http://localhost:3000/api/auth/callback/kakao`
   - `https://irr-expression-studio.vercel.app/api/auth/callback/kakao`
   - `https://your-domain.com/api/auth/callback/kakao`
5. **앱 키 → REST API 키** → `AUTH_KAKAO_ID`
6. **보안 → Client Secret** 생성·활성화 → `AUTH_KAKAO_SECRET`  
   (Client Secret을 켰으면 반드시 env에 넣어야 합니다. 없으면 `KOE010` 오류)

| 변수 | 값 |
|------|-----|
| `AUTH_KAKAO_ID` | REST API 키 |
| `AUTH_KAKAO_SECRET` | Client Secret |

### Vercel에 넣을 곳

**Project → Settings → Environment Variables**

`AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET` 추가 후 **Redeploy**.

로컬은 `.env.local`에 동일하게 추가하고 `npm run dev` 재시작.

### 자주 나는 오류

| 증상 | 원인 |
|------|------|
| `KOE006` | Redirect URI 미등록 또는 URL 불일치 |
| `KOE010` | Client Secret 활성화했는데 env 누락 |
| 카카오 버튼 안 보임 | Vercel에 `AUTH_KAKAO_*` 없음 또는 재배포 안 함 |

---

## 커스텀 도메인

Vercel은 **도메인 판매가 아니라 연결**만 합니다. 먼저 외부에서 구매합니다.

### 어디서 살까?

| 선택 | 적합한 경우 | 대략 비용 |
|------|-------------|-----------|
| **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)** | `.com` 등 국제 도메인, 갱신가 동일·WHOIS 무료 | `.com` 약 $10/년 |
| **[가비아](https://domain.gabia.com/)** | `.kr` / `.co.kr` 필요, 한국어 지원 | `.kr` 약 16,500원/년 |
| Porkbun / Namecheap | Cloudflare 대안 | `.com` 약 $10~12/년 |

- **한국 사용자·신뢰감:** `.co.kr` 또는 `.kr` (가비아 등)
- **비용·장기 운영:** `.com` (Cloudflare 추천)
- Cloudflare는 **`.kr` 등록 불가**

### 이름 아이디어 (가용성은 구매 전 검색)

| 후보 | 메모 |
|------|------|
| `irrexpression.com` | 브랜드 IRR + Expression |
| `irr-expression.com` | 현재 Vercel 서브도메인과 통일 |
| `expressionstudio.kr` | 서비스 설명형 |
| `facefacs.com` | FACS 기술 강조 |
| `표정변환.kr` | 한글 도메인 (가비아) |

짧고 기억하기 쉬운 `.com` 하나 + 나중에 `.kr` 추가도 가능합니다.

### Vercel 연결 절차

1. 도메인 구매
2. Vercel → **Project → Settings → Domains** → 도메인 입력
3. 안내에 따라 DNS 설정
   - Cloudflare 사용 시: CNAME `@` 또는 `www` → `cname.vercel-dns.com`
4. SSL은 Vercel이 자동 발급 (몇 분~수십 분)
5. **환경변수 업데이트 후 Redeploy**

| 변수 | 새 값 예시 |
|------|------------|
| `AUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |

6. **Google / Kakao 콘솔**에 새 Redirect URI 추가 (위 로그인 섹션)
7. Toss **실결제** 사용 시 성공/실패 URL도 새 도메인으로 변경

---

## 베타 체크리스트 (거의 완성)

- [x] 표정 변환 · 크레딧 · Google 로그인
- [ ] Kakao 로그인 env + 콘솔 Redirect URI
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
