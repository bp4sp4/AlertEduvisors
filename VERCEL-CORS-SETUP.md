# 🔧 Vercel CORS 설정 가이드

## 📋 개요

Electron 앱에서 Vercel API를 호출하려면 CORS 설정이 필요합니다.

## ✅ Vercel에서 해야 할 설정

### 1. Next.js API 라우트에 CORS 헤더 추가

`/api/notifications/route.ts` (또는 `route.js`) 파일을 찾아서 수정하세요.

#### App Router 사용 시 (권장)

```typescript
// app/api/notifications/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const userId = searchParams.get('user_id');
  const lastChecked = searchParams.get('last_checked');
  const types = searchParams.get('types') || 'all';

  // ... 기존 알림 조회 로직 ...

  const response = NextResponse.json({
    success: true,
    notifications: notifications,
    count: notifications.length,
    last_checked: new Date().toISOString()
  });

  // ⚠️ CORS 헤더 추가 (중요!)
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

// ⚠️ OPTIONS 요청 처리 (CORS preflight)
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

#### Pages Router 사용 시

```typescript
// pages/api/notifications.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  notifications: any[];
  count: number;
  last_checked: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // ⚠️ CORS 헤더 추가 (중요!)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { email, user_id, last_checked, types } = req.query;

    // ... 기존 알림 조회 로직 ...

    res.status(200).json({
      success: true,
      notifications: notifications,
      count: notifications.length,
      last_checked: new Date().toISOString()
    });
  } else {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

### 2. next.config.js에 전역 CORS 설정 (선택사항)

모든 API 라우트에 일괄 적용하려면:

```javascript
// next.config.js
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

## 🚀 배포

1. 코드 수정 후 Git에 커밋:
   ```bash
   git add app/api/notifications/route.ts  # 또는 pages/api/notifications.ts
   git commit -m "Add CORS headers for Electron app"
   git push
   ```

2. Vercel에 자동 배포됩니다 (Git 연동 시)

3. 배포 완료 후 Electron 앱에서 테스트

## ✅ 테스트

### 1. 브라우저에서 직접 테스트

브라우저 주소창에 입력:
```
https://nms-system.vercel.app/api/notifications?email=your-email@example.com
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

### 2. Electron 앱에서 테스트

1. Electron 앱 실행
2. 설정 화면 열기
3. **API 연결 테스트** 버튼 클릭
4. 성공 메시지 확인

## 🔒 보안 고려사항 (프로덕션)

프로덕션 환경에서는 `*` 대신 특정 도메인만 허용하는 것이 좋습니다:

```typescript
// 특정 도메인만 허용
response.headers.set('Access-Control-Allow-Origin', 'https://nms-system.vercel.app');
```

또는 환경 변수 사용:

```typescript
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
```

## ❌ 문제 해결

### CORS 오류가 계속 발생하는 경우

1. **Vercel 재배포 확인**: 코드 변경 후 Vercel에 배포되었는지 확인
2. **브라우저 캐시 삭제**: 개발자 도구에서 "Disable cache" 체크
3. **API 라우트 경로 확인**: `/api/notifications` 경로가 정확한지 확인
4. **Vercel 함수 로그 확인**: Vercel 대시보드 → Functions → 로그 확인

### 404 오류가 발생하는 경우

- API 라우트 파일이 올바른 위치에 있는지 확인:
  - App Router: `app/api/notifications/route.ts`
  - Pages Router: `pages/api/notifications.ts`

## 📞 추가 도움말

- [Vercel 공식 문서 - CORS](https://vercel.com/docs/concepts/functions/serverless-functions/cors)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

