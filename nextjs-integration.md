# Next.js 연동 가이드

## 백그라운드 알림 앱

이 Electron 앱은 백그라운드에서 실행되며, 웹(Next.js)에서 HTTP 요청을 보내면 알림을 표시합니다.

## 작동 방식

1. Electron 앱이 백그라운드에서 HTTP 서버를 실행합니다 (기본 포트: 3001)
2. Next.js 웹사이트에서 HTTP POST 요청을 보냅니다
3. Electron 앱이 알림을 표시합니다

## Next.js에서 알림 보내기

### 1. 기본 사용법

```typescript
// utils/notification.ts
const ELECTRON_API_URL = 'http://localhost:3001/api/notification';

export async function sendNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    silent?: boolean;
  }
) {
  try {
    const response = await fetch(ELECTRON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        icon: options?.icon,
        silent: options?.silent || false,
      }),
    });

    if (!response.ok) {
      throw new Error('알림 전송 실패');
    }

    return await response.json();
  } catch (error) {
    // Electron 앱이 실행되지 않은 경우
    console.warn('Electron 알림 앱이 실행되지 않았습니다:', error);
    
    // 대체: 브라우저 알림 사용
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, ...options });
    }
  }
}
```

### 2. React 컴포넌트에서 사용

```typescript
'use client';

import { sendNotification } from '@/utils/notification';

export default function NotificationButton() {
  const handleClick = async () => {
    await sendNotification(
      '새 메시지',
      '새로운 메시지가 도착했습니다!',
      { silent: false }
    );
  };

  return (
    <button onClick={handleClick}>
      알림 보내기
    </button>
  );
}
```

### 3. API Route에서 사용 (서버 사이드)

```typescript
// app/api/notify/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { title, body } = await request.json();

  // Electron 앱에 알림 전송
  try {
    const response = await fetch('http://localhost:3001/api/notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    });

    if (!response.ok) {
      throw new Error('알림 전송 실패');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Electron 앱이 실행되지 않았습니다' },
      { status: 500 }
    );
  }
}
```

### 4. 실시간 알림 (예: WebSocket, Server-Sent Events)

```typescript
// hooks/useRealtimeNotifications.ts
'use client';

import { useEffect } from 'react';
import { sendNotification } from '@/utils/notification';

export function useRealtimeNotifications() {
  useEffect(() => {
    // 예: Server-Sent Events
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Electron 앱에 알림 전송
      sendNotification(data.title, data.body);
    };

    return () => {
      eventSource.close();
    };
  }, []);
}
```

## 환경 변수 설정

### Electron 앱 (.env)

```
PORT=3001
```

### Next.js 앱 (.env.local)

```
NEXT_PUBLIC_ELECTRON_API_URL=http://localhost:3001
```

## 실행 방법

1. **Electron 앱 실행**:
```bash
cd AlertEletron
npm install
npm start
```

2. **Next.js 앱 실행**:
```bash
cd your-nextjs-app
npm run dev
```

3. **테스트**: Next.js 웹사이트에서 알림을 보내면 Electron 앱이 알림을 표시합니다.

## 설정 확인

Electron 앱의 트레이 아이콘을 클릭하여 설정 창을 열면:
- 서버 상태 확인
- 서버 포트 확인
- API 엔드포인트 확인
- 테스트 알림 보내기

## 보안 고려사항

현재는 로컬호스트에서만 작동합니다. 프로덕션 환경에서는:
- 인증 토큰 추가
- HTTPS 사용
- 포트 방화벽 설정
- CORS 정책 강화

## 알림 권한

macOS에서는 시스템 설정에서 알림 권한을 허용해야 합니다:
- 시스템 설정 > 알림 > Alert Electron > 허용

## 문제 해결

### Electron 앱이 알림을 받지 못하는 경우

1. Electron 앱이 실행 중인지 확인
2. 포트 3001이 사용 가능한지 확인
3. 설정 창에서 서버 상태 확인
4. 브라우저 콘솔에서 네트워크 오류 확인

### CORS 오류가 발생하는 경우

Electron 앱의 `main.js`에서 CORS 설정을 확인하세요. 현재는 모든 origin을 허용하도록 설정되어 있습니다.
