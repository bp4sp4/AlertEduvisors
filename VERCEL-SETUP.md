# 🚀 Vercel 배포 환경 설정 가이드

## 📋 개요

Vercel에 배포된 Next.js 웹 앱과 Electron 알림 앱을 연동하는 방법을 설명합니다.

## 1️⃣ Vercel 배포 URL 확인

1. Vercel 대시보드 접속: https://vercel.com/dashboard
2. 프로젝트 선택
3. **Settings** → **Domains**에서 배포 URL 확인
   - 예: `https://your-app.vercel.app`
   - 또는 커스텀 도메인: `https://your-domain.com`

## 2️⃣ Electron 앱 설정 방법

### 방법 1: 설정 화면에서 직접 입력 (권장) ⭐

1. Electron 앱 실행
2. 트레이 아이콘 클릭 → **설정** 열기
3. **API URL** 필드에 Vercel URL 입력:
   ```
   https://your-app.vercel.app/api/notifications
   ```
4. **이메일** 입력
5. **설정 저장** 클릭

### 방법 2: .env 파일 사용

1. 프로젝트 루트에 `.env` 파일 생성:
   ```bash
   cp .env.example .env
   ```

2. `.env` 파일 편집:
   ```env
   # Vercel 배포 URL
   WEB_URL=https://your-app.vercel.app
   
   # 또는 직접 API URL 설정
   # API_URL=https://your-app.vercel.app/api/notifications
   
   # 사용자 이메일 (선택사항, 설정 화면에서 입력하는 것이 더 안전)
   # EMAIL=user@example.com
   ```

3. 앱 재시작:
   ```bash
   npm start
   ```

## 3️⃣ CORS 설정 확인

Vercel에 배포된 API는 CORS 설정이 필요할 수 있습니다.

### Next.js API 라우트에 CORS 추가

`/api/notifications/route.ts` (또는 `route.js`) 파일에 다음을 추가:

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // CORS 헤더 추가
  const response = NextResponse.json({
    // ... 응답 데이터
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

또는 `next.config.js`에 CORS 설정 추가:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## 4️⃣ 테스트

### 1. API 연결 테스트

1. Electron 앱 설정 화면 열기
2. **API 연결 테스트** 버튼 클릭
3. 성공 메시지 확인

### 2. 수동 테스트

브라우저에서 직접 API 호출:

```bash
# 터미널에서 실행
curl "https://your-app.vercel.app/api/notifications?email=user@example.com"
```

또는 브라우저 주소창에 입력:
```
https://your-app.vercel.app/api/notifications?email=user@example.com
```

정상 응답 예시:
```json
{
  "success": true,
  "notifications": [],
  "count": 0,
  "last_checked": "2024-01-01T00:00:00Z"
}
```

## 5️⃣ 문제 해결

### 문제: CORS 오류 발생

**증상:**
```
Access to fetch at 'https://your-app.vercel.app/api/notifications' 
from origin 'null' has been blocked by CORS policy
```

**해결:**
- 위의 CORS 설정을 추가하세요
- Vercel에 재배포하세요

### 문제: API 연결 실패

**확인 사항:**
1. Vercel URL이 올바른지 확인
2. `/api/notifications` 경로가 존재하는지 확인
3. Vercel 대시보드에서 배포 상태 확인
4. Vercel 함수 로그 확인 (Functions 탭)

### 문제: 알림이 표시되지 않음

**확인 사항:**
1. 이메일이 올바르게 입력되었는지 확인
2. Electron 앱 로그 확인 (개발자 도구)
3. Vercel 함수 로그에서 API 호출 확인
4. `last_checked` 파라미터 확인

## 6️⃣ 보안 고려사항

### 프로덕션 환경 권장사항

1. **CORS 제한**: `Access-Control-Allow-Origin`을 `*` 대신 특정 도메인으로 제한
   ```javascript
   'Access-Control-Allow-Origin': 'https://your-app.vercel.app'
   ```

2. **HTTPS 사용**: Vercel은 기본적으로 HTTPS를 제공합니다

3. **API 인증**: 필요시 API 키 또는 토큰 인증 추가

4. **환경 변수**: 민감한 정보는 `.env` 파일에 저장하고 Git에 커밋하지 않기

## 7️⃣ 체크리스트

배포 전 확인:

- [ ] Vercel 배포 URL 확인
- [ ] Electron 앱 설정에서 API URL 입력
- [ ] 이메일 입력
- [ ] API 연결 테스트 성공
- [ ] CORS 설정 확인 (필요시)
- [ ] 실제 알림 수신 테스트

## 📞 추가 도움말

- [NMS 연동 가이드](./NMS-INTEGRATION-GUIDE.md) - 상세한 API 연동 방법
- [README](./README.md) - 기본 사용 방법

