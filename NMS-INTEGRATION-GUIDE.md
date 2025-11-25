# Electron 알림 앱 연동 가이드

## 📋 개요

이 문서는 NMS 시스템의 알림 기능을 Electron 데스크톱 앱과 연동하는 방법을 설명합니다.

**주요 기능:**

- 업무협조 요청 알림
- 상담게시판 요청 알림
- 교육원 요청 알림
- 회의 알림
- 고객 수정 내역 알림 (관리자)

**연동 방식:**

- HTTP GET 요청으로 주기적으로 알림 조회 (폴링)
- 개발 환경: `http://localhost:3000/api/notifications`
- 프로덕션 환경: 실제 도메인으로 변경 필요

---

## 🚀 빠른 시작

### 1단계: Next.js 서버 실행 확인

```bash
# Next.js 개발 서버가 실행 중인지 확인
# http://localhost:3000 에서 접근 가능해야 합니다
npm run dev
```

### 2단계: Electron 앱에서 API 호출

> **⚠️ 중요**: `email` 또는 `user_id` 파라미터를 반드시 포함해야 합니다!
> 
> **현재 문제**: 로그에 `email: null`이 나오고 URL에 `email` 파라미터가 없습니다.
> 
> **해결**: 아래 코드에서 `params.append('email', userEmail)` 부분이 반드시 있어야 합니다!

```javascript
// ⚠️ 중요: 이 코드를 그대로 사용하세요!
const API_URL = 'http://localhost:3000/api/notifications';

// ⚠️ 문제: 설정 화면에서 이메일을 가져오는 방법
// 현재 config: { email: undefined, userId: '' } 가 나오면 설정에서 값을 가져오지 못한 것입니다!

// ✅ 해결 방법 1: HTML input에서 직접 가져오기
const emailInput = document.getElementById('email-input'); // 또는 실제 input의 ID
const userEmail = emailInput ? emailInput.value : null;

// ✅ 해결 방법 2: 설정 객체에서 가져오기 (설정 객체가 있는 경우)
// const userEmail = settings?.email || config?.email || null;

// ✅ 해결 방법 3: React/Vue 등 프레임워크 사용 시
// const userEmail = emailState; // 또는 useState로 관리하는 값

// ✅ 해결 방법 4: Electron의 설정 저장소에서 가져오기
// const { app } = require('electron');
// const userEmail = app.getPath('userData') + '/settings.json'에서 읽기
// 또는 electron-store 같은 라이브러리 사용

// ⚠️ 디버깅: 값이 제대로 가져와지는지 확인
console.log('현재 config:', { email: userEmail, userId: userId });
if (!userEmail) {
  console.error('❌ 이메일이 설정되지 않았습니다! 설정 화면에서 이메일을 입력했는지 확인하세요.');
}

let lastChecked = null;

// 30초마다 알림 확인
setInterval(async () => {
  try {
    // ⚠️ 필수: URLSearchParams 객체 생성
    const params = new URLSearchParams();
    
    // ⚠️ 필수: email 파라미터 추가 (이 줄이 없으면 알림이 작동하지 않습니다!)
    if (!userEmail) {
      console.error('❌ userEmail이 설정되지 않았습니다!');
      return;
    }
    params.append('email', userEmail); // ⚠️ 이 줄이 가장 중요합니다!
    
    // 선택: 마지막 확인 시간
    if (lastChecked) {
      params.append('last_checked', lastChecked);
    }
    
    // ⚠️ 중요: params.toString()을 사용하여 URL 생성
    const url = `${API_URL}?${params.toString()}`;
    
    // 디버깅: 실제 호출되는 URL 확인
    console.log('✅ API 호출 URL:', url);
    // ✅ 올바른 URL 예: http://localhost:3000/api/notifications?email=user@example.com&last_checked=...
    // ❌ 잘못된 URL 예: http://localhost:3000/api/notifications?last_checked=... (email 없음)
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.notifications && data.notifications.length > 0) {
      console.log(`✅ ${data.notifications.length}개의 새 알림 발견`);
      data.notifications.forEach(notif => {
        // Electron 알림 표시
        new Notification({
          title: notif.title,
          body: notif.message
        }).show();
      });
      
      // 마지막 확인 시간 업데이트
      lastChecked = data.last_checked;
    } else {
      console.log('새 알림 없음');
    }
  } catch (error) {
    console.error('❌ 알림 조회 오류:', error);
  }
}, 30000); // 30초마다
```

> **⚠️ 주의사항**:
> 1. **`email` 파라미터는 필수입니다!** - 없으면 대부분의 알림을 받을 수 없습니다.
> 2. `fetch`에서 직접 문자열을 연결하지 말고 `URLSearchParams`를 사용하세요!
>    - ❌ 잘못된 예: `fetch(\`${API_URL}?email=${userEmail}\`)` - 특수문자 인코딩 문제 발생 가능
>    - ✅ 올바른 예: `URLSearchParams` 사용 (위 코드 참고)
> 3. **디버깅**: `console.log('API 호출 URL:', url)`로 실제 호출되는 URL을 확인하세요.
>    - 올바른 URL 예: `http://localhost:3000/api/notifications?email=user@example.com&last_checked=...`
>    - 잘못된 URL 예: `http://localhost:3000/api/notifications?last_checked=...` (email 없음)

---

## 개발 환경 연동 방법

### 1. Next.js API 엔드포인트

알림 API는 `/api/notifications`에서 제공됩니다.

**엔드포인트**: `http://localhost:3000/api/notifications`

**쿼리 파라미터**:

- `user_id` (선택): 사용자 ID - 데이터베이스 `users` 테이블의 `id` 컬럼 값 (UUID 형식)
- `email` (선택): 사용자 이메일 - **이메일로도 조회 가능합니다!** `user_id`가 없으면 `email`로 사용자를 찾습니다.
- `last_checked` (선택): 마지막 확인 시간 (ISO 8601 형식)
- `types` (선택): 알림 타입 (쉼표로 구분) - `customer_edit`, `work_cooperation`, `sales_consultation`, `institution_request`, `meeting`, `all` (기본값)

> **💡 사용자 식별 방법:**
> - **권장**: `email` 파라미터 사용 (예: `?email=user@example.com`) - 사용자가 쉽게 입력 가능
> - 또는 `user_id` 파라미터 사용 (UUID 형식) - 웹 앱에서 로그인 후 브라우저 개발자 도구 콘솔에서: `JSON.parse(localStorage.getItem('nms-user-session')).id`

**예시 요청**:

```bash
# ⚠️ 중요: user_id 또는 email 파라미터는 필수입니다 (업무협조, 상담, 교육원, 회의 알림을 받으려면)
# user_id/email 없이 호출하면 customer_edit 알림만 조회됩니다

# ✅ 권장: 이메일로 조회 (사용자가 쉽게 입력 가능)
GET http://localhost:3000/api/notifications?email=user@example.com

# 또는 UUID로 조회
GET http://localhost:3000/api/notifications?user_id=32306f36-9e1d-4436-8b6c-745fdf6d1655

# 마지막 확인 이후 새 알림만 조회
GET http://localhost:3000/api/notifications?email=user@example.com&last_checked=2024-01-01T00:00:00Z

# 특정 타입만 조회
GET http://localhost:3000/api/notifications?email=user@example.com&types=work_cooperation,sales_consultation

# 교육원 요청과 회의 알림만 조회
GET http://localhost:3000/api/notifications?email=user@example.com&types=institution_request,meeting
```

> **⚠️ 주의**: `user_id` 또는 `email` 파라미터가 없으면 대부분의 알림(업무협조, 상담, 교육원, 회의)을 받을 수 없습니다!

**응답 형식**:

```json
{
  "success": true,
  "notifications": [
    {
      "id": "customer_edit_xxx",
      "type": "customer_edit",
      "title": "고객 정보 수정",
      "message": "홍길동님이 고객 정보를 수정했습니다 (3개 필드 변경)",
      "data": {
        "customer_id": "xxx",
        "edited_by": "홍길동",
        "edited_fields": ["customer_name", "contact", "institution"],
        "edited_at": "2024-01-01T12:00:00Z"
      },
      "timestamp": "2024-01-01T12:00:00Z",
      "priority": "normal"
    }
  ],
  "count": 1,
  "last_checked": "2024-01-01T12:00:00Z"
}
```

### 2. Electron 앱 연동 예제 코드

> **💡 필수 구현 사항:**
> 1. 주기적으로 API 호출 (권장: 30초마다)
> 2. `last_checked` 파라미터로 중복 알림 방지
> 3. `user_id` 파라미터로 사용자별 알림 필터링
> 4. Electron의 `Notification` API로 데스크톱 알림 표시

#### 기본 폴링 방식 (간단)

```javascript
// main.js 또는 renderer.js
const { app, Notification } = require('electron');
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/notifications';
let lastChecked = null;
let pollInterval = null;

// 알림 폴링 시작
function startPolling(userEmail, intervalMs = 30000) { // 30초마다
  // userEmail 또는 userId 둘 중 하나를 받을 수 있습니다
  pollInterval = setInterval(async () => {
    try {
      const params = new URLSearchParams();
      // ⚠️ 중요: email 또는 user_id는 필수입니다! 없으면 대부분의 알림을 받을 수 없습니다
      if (userEmail) {
        params.append('email', userEmail); // 이메일 사용 (권장)
      } else {
        console.warn('⚠️ email 또는 user_id가 없습니다. 업무협조, 상담, 교육원, 회의 알림을 받을 수 없습니다.');
      }
      if (lastChecked) params.append('last_checked', lastChecked);
      
      const response = await axios.get(`${API_URL}?${params.toString()}`);
      
      if (response.data.success && response.data.notifications.length > 0) {
        // 새 알림 표시
        response.data.notifications.forEach(notification => {
          showNotification(notification);
        });
        
        // 마지막 확인 시간 업데이트
        lastChecked = response.data.last_checked;
      }
    } catch (error) {
      console.error('알림 조회 오류:', error);
    }
  }, intervalMs);
}

// Electron 알림 표시
function showNotification(notification) {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: notification.title,
      body: notification.message,
      icon: '/path/to/icon.png', // 아이콘 경로
      urgency: notification.priority === 'high' ? 'critical' : 'normal',
    });
    notif.on('click', () => {
      // 알림 클릭 시 처리 (예: 앱 열기, 특정 페이지로 이동)
      console.log('알림 클릭:', notification);
    });
    notif.show();
  }
}

// 앱 시작 시 폴링 시작
app.whenReady().then(() => {
  // ✅ 권장: 이메일 사용 (사용자가 쉽게 입력 가능)
  const userEmail = 'user@example.com';
  startPolling(userEmail);
  
  // 또는 UUID 사용
  // const userId = '550e8400-e29b-41d4-a716-446655440000';
  // startPolling(userId);
});

// 앱 종료 시 폴링 중지
app.on('before-quit', () => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
```

#### TypeScript 예제

```typescript
// notificationService.ts
import axios from 'axios';

interface Notification {
  id: string;
  type: 'customer_edit' | 'work_cooperation' | 'sales_consultation' | 'institution_request' | 'meeting';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  priority: 'normal' | 'high';
}

interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
  count: number;
  last_checked: string;
}

export class NotificationService {
  private apiUrl: string;
  private lastChecked: string | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(apiUrl: string = 'http://localhost:3000/api/notifications') {
    this.apiUrl = apiUrl;
  }

  async fetchNotifications(userEmail?: string, userId?: string, types?: string[]): Promise<Notification[]> {
    try {
      const params = new URLSearchParams();
      // ⚠️ 중요: email 또는 user_id는 필수입니다! 없으면 대부분의 알림을 받을 수 없습니다
      if (userEmail) {
        params.append('email', userEmail); // 이메일 사용 (권장)
      } else if (userId) {
        params.append('user_id', userId);
      } else {
        console.warn('⚠️ email 또는 user_id가 없습니다. 업무협조, 상담, 교육원, 회의 알림을 받을 수 없습니다.');
      }
      if (this.lastChecked) params.append('last_checked', this.lastChecked);
      if (types && types.length > 0) {
        params.append('types', types.join(','));
      }

      const response = await axios.get<NotificationResponse>(
        `${this.apiUrl}?${params.toString()}`
      );

      if (response.data.success) {
        this.lastChecked = response.data.last_checked;
        return response.data.notifications;
      }
      return [];
    } catch (error) {
      console.error('알림 조회 오류:', error);
      return [];
    }
  }

  startPolling(
    userEmail: string | undefined,
    userId: string | undefined,
    callback: (notifications: Notification[]) => void,
    intervalMs: number = 30000
  ) {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      const notifications = await this.fetchNotifications(userEmail, userId);
      if (notifications.length > 0) {
        callback(notifications);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
```

### 3. 개발 환경 설정

#### Next.js 개발 서버 실행

```bash
# 프로젝트 루트에서 실행
npm run dev

# 서버가 http://localhost:3000에서 실행됩니다
# 브라우저에서 http://localhost:3000 접속하여 확인 가능
```

#### CORS 설정 (이미 완료됨)

CORS 설정은 이미 `next.config.ts`에 추가되어 있습니다. 별도 설정 불필요합니다.

### 4. 알림 타입별 상세 정보

#### customer_edit (고객 수정 내역)

- **대상**: 관리자
- **트리거**: 고객 정보가 수정 요청 상태에서 수정됨
- **데이터**: `customer_id`, `edited_by`, `edited_fields`, `edited_at`
- **⚠️ 참고**: `userId` 또는 `email` 파라미터가 없어도 작동합니다 (관리자용)

#### work_cooperation (업무협조 요청)

- **대상**: 요청 수신자
- **트리거**: 새로운 업무협조 요청이 생성됨
- **데이터**: `request_id`, `title`, `deadline_end`, `requester_name`
- **⚠️ 중요**: `userId` 또는 `email` 파라미터가 **반드시 필요**합니다!
- **조건**: 
  - `recipient_id`가 현재 사용자의 `userId`와 일치해야 함
  - `status`가 `pending`이어야 함
  - `created_at`이 `last_checked` 이후여야 함

#### sales_consultation (상담 요청)

- **대상**: 모든 사용자
- **트리거**: 새로운 상담 요청이 등록됨
- **데이터**: `consultation_id`, `customer_name`, `inquiry_type`

#### institution_request (교육원 요청)

- **대상**: 교육원 담당자 및 관리자
- **트리거**: 새로운 교육원 요청이 등록됨
- **데이터**: `request_id`, `institution`, `student_name`, `student_id`, `request_content`
- **참고**: 교육원 담당자는 자신의 담당 기관 요청만 받습니다

#### meeting (회의 알림)

- **대상**: 회의 참석자
- **트리거**: 
  1. 새로운 회의 예약이 생성됨
  2. 회의 시작 1시간 전 (다가오는 회의 알림)
- **데이터**: `reservation_id`, `title`, `room_name`, `room_location`, `start_time`, `end_time`, `minutes_until_start` (다가오는 회의인 경우)
- **우선순위**: 회의 시작 15분 이내면 `high`, 그 외는 `normal`

### 5. 프로덕션 환경 설정

프로덕션 환경에서는 API URL을 실제 도메인으로 변경하세요:

```javascript
// 프로덕션 예제
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/api/notifications'  // 실제 도메인으로 변경
  : 'http://localhost:3000/api/notifications';
```

**프로덕션 체크리스트:**

- ✅ API URL을 실제 도메인으로 변경
- ✅ HTTPS 사용 (보안)
- ✅ 사용자 ID를 안전하게 저장/관리
- ✅ 에러 핸들링 및 재시도 로직 구현

### 6. 실제 사용 예제 (완전한 코드)

```javascript
// notificationManager.js
const { app, Notification } = require('electron');
const axios = require('axios');

class NotificationManager {
  constructor(userEmail, userId = null, apiUrl = 'http://localhost:3000/api/notifications') {
    this.userEmail = userEmail; // 이메일 사용 (권장)
    this.userId = userId; // 또는 UUID 사용
    this.apiUrl = apiUrl;
    this.lastChecked = null;
    this.pollInterval = null;
    this.notifiedIds = new Set(); // 중복 알림 방지
  }

  // 알림 폴링 시작
  start(intervalMs = 30000) {
    if (this.pollInterval) {
      this.stop();
    }
    // 즉시 한 번 실행
    this.checkNotifications();
    // 주기적으로 실행
    this.pollInterval = setInterval(() => {
      this.checkNotifications();
    }, intervalMs);
  }

  // 알림 확인
  async checkNotifications() {
    try {
      const params = new URLSearchParams();
      // ⚠️ 중요: email 또는 user_id는 필수입니다!
      if (this.userEmail) {
        params.append('email', this.userEmail); // 이메일 사용 (권장)
      } else if (this.userId) {
        params.append('user_id', this.userId);
      } else {
        console.warn('⚠️ email 또는 user_id가 설정되지 않았습니다. 업무협조, 상담, 교육원, 회의 알림을 받을 수 없습니다.');
        return;
      }
      if (this.lastChecked) {
        params.append('last_checked', this.lastChecked);
      }

      const response = await axios.get(`${this.apiUrl}?${params.toString()}`);
      
      if (response.data.success && response.data.notifications.length > 0) {
        response.data.notifications.forEach(notification => {
          // 중복 체크
          if (!this.notifiedIds.has(notification.id)) {
            this.showNotification(notification);
            this.notifiedIds.add(notification.id);
          }
        });
        // 마지막 확인 시간 업데이트
        this.lastChecked = response.data.last_checked;
      }
    } catch (error) {
      console.error('알림 조회 오류:', error.message);
    }
  }

  // Electron 알림 표시
  showNotification(notification) {
    if (!Notification.isSupported()) {
      console.warn('시스템 알림을 지원하지 않습니다.');
      return;
    }

    const notif = new Notification({
      title: notification.title,
      body: notification.message,
      icon: '/path/to/icon.png', // 아이콘 경로 설정
      urgency: notification.priority === 'high' ? 'critical' : 'normal',
    });

    // 알림 클릭 시 처리
    notif.on('click', () => {
      // 웹 앱 열기 또는 특정 페이지로 이동
      console.log('알림 클릭:', notification);
      // 예: shell.openExternal(`http://localhost:3000/sales-consultations`);
    });

    notif.show();
  }

  // 폴링 중지
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

// 사용 예제
app.whenReady().then(() => {
  // ✅ 권장: 이메일 사용
  const userEmail = 'user@example.com';
  const manager = new NotificationManager(userEmail);
  manager.start(30000); // 30초마다 확인
  
  // 또는 UUID 사용
  // const manager = new NotificationManager(null, '550e8400-e29b-41d4-a716-446655440000');
});

app.on('before-quit', () => {
  // 앱 종료 시 정리
  if (manager) {
    manager.stop();
  }
});
```

### 7. 트러블슈팅

**문제**: CORS 오류 발생

- **해결**: `next.config.ts`에 CORS 헤더 추가 또는 API 라우트에 OPTIONS 핸들러 추가

**문제**: 알림이 중복으로 표시됨

- **해결**: `lastChecked` 시간을 정확히 관리하고, 알림 ID로 중복 체크

**문제**: 폴링이 너무 자주 발생

- **해결**: `intervalMs`를 늘리거나, WebSocket/SSE 사용 고려

**문제**: 사용자 ID를 어떻게 가져오나요?

- **해결**: 
  1. **✅ 권장: 이메일 사용** - `email` 파라미터를 사용하면 사용자가 쉽게 입력할 수 있습니다
     ```javascript
     fetch('http://localhost:3000/api/notifications?email=user@example.com')
     ```
  2. 또는 UUID 사용 - 웹 앱에서 로그인 후 브라우저 개발자 도구 콘솔에서 확인:
     ```javascript
     JSON.parse(localStorage.getItem('nms-user-session')).id
     ```
  3. `user_id`는 데이터베이스 `users` 테이블의 `id` 컬럼 값 (UUID 형식)입니다

**문제**: 알림이 표시되지 않습니다

- **해결**: 
  1. **`email` 또는 `user_id` 파라미터가 URL에 포함되어 있는지 확인** ⚠️ 가장 중요!
     - 올바른 예 (이메일): `GET /api/notifications?email=user@example.com&last_checked=...`
     - 올바른 예 (UUID): `GET /api/notifications?user_id=32306f36-9e1d-4436-8b6c-745fdf6d1655&last_checked=...`
     - 잘못된 예: `GET /api/notifications?last_checked=...` (email/user_id 없음)
  2. **URLSearchParams 사용 확인** - 직접 문자열 연결 시 특수문자 인코딩 문제 발생 가능
     ```javascript
     // ❌ 잘못된 방법
     fetch(`${API_URL}?email=${userEmail}`)
     
     // ✅ 올바른 방법
     const params = new URLSearchParams();
     params.append('email', userEmail);
     fetch(`${API_URL}?${params.toString()}`)
     ```
  3. **서버 로그 확인** - Next.js 서버 콘솔에서 "알림 API 요청" 로그를 확인하여 실제 전달된 파라미터 확인
  4. 시스템 알림 권한 확인 (macOS: 시스템 설정 > 알림)
  5. `Notification.isSupported()` 확인
  6. API 응답이 정상인지 확인 (콘솔 로그 확인)
  7. 서버 로그에서 `userId: null, email: null`이 나오면 `email` 또는 `user_id` 파라미터가 전달되지 않은 것입니다

**문제**: 고객 정보 수정 알림은 뜨는데 업무협조 요청 알림이 안 뜹니다

- **원인**: 
  - 고객 정보 수정 알림은 `userId` 없이도 작동합니다 (관리자용)
  - 업무협조 요청 알림은 `userId` 또는 `email` 파라미터가 **반드시 필요**합니다!
- **해결**:
  1. `email` 또는 `user_id` 파라미터가 URL에 포함되어 있는지 확인
  2. 서버 로그에서 "업무협조 요청 알림 조회 시작" 로그 확인
  3. 서버 로그에서 "업무협조 요청 조회 결과" 로그 확인 - 조회된 요청 수와 상세 정보 확인
  4. 업무협조 요청의 조건 확인:
     - `recipient_id`가 현재 사용자의 `userId`와 일치하는지
     - `status`가 `pending`인지
     - `created_at`이 `last_checked` 이후인지

---

## 📞 문의

구현 중 문제가 발생하면 이 문서를 참고하거나 개발팀에 문의하세요.

## ✅ 필수 체크리스트

**반드시 확인해야 할 사항:**

1. **`email` 파라미터가 URL에 포함되어 있는가?** ⚠️ 가장 중요!
   ```javascript
   // ✅ 올바른 URL 예시
   http://localhost:3000/api/notifications?email=user@example.com&last_checked=...
   
   // ❌ 잘못된 URL 예시 (email 없음)
   http://localhost:3000/api/notifications?last_checked=...
   ```

2. **Electron 앱 코드에서 `email` 파라미터를 추가하고 있는가?**
   ```javascript
   const params = new URLSearchParams();
   params.append('email', userEmail); // ⚠️ 이 줄이 반드시 있어야 합니다!
   params.append('last_checked', lastChecked);
   ```

3. **설정 화면의 이메일 값이 코드에 전달되고 있는가?**
   - Electron 앱 설정 화면에서 입력한 이메일이 변수에 저장되는지 확인
   - `console.log('userEmail:', userEmail)`로 값이 제대로 설정되었는지 확인

4. **서버 로그 확인**
   - Next.js 서버 콘솔에서 `알림 API 요청` 로그 확인
   - `email: null`이 나오면 파라미터가 전달되지 않은 것입니다
   - `hasEmail: true`가 나와야 정상입니다

5. **기타 체크리스트:**
   - [ ] Next.js 서버가 실행 중인가요? (`http://localhost:3000`)
   - [ ] `last_checked` 파라미터를 사용하여 중복 알림을 방지하고 있나요?
   - [ ] Electron의 `Notification` API가 지원되는 환경인가요?
   - [ ] 시스템 알림 권한이 허용되어 있나요?

## 🔍 문제 진단 가이드

### 문제: `email: null`이 서버 로그에 나옵니다

**증상:**

```
알림 조회 시작... {
  email: null,
  userId: null,
  types: 'all',
  lastChecked: '...'
}
API 호출 URL: http://localhost:3000/api/notifications?last_checked=...
```

**원인:**

- Electron 앱 코드에서 `email` 파라미터를 `URLSearchParams`에 추가하지 않았습니다.
- 또는 설정 화면의 이메일 값이 변수에 전달되지 않았습니다.

**해결 방법 (단계별):**

#### 1단계: 코드 확인

현재 코드에 다음이 있는지 확인:

```javascript
const params = new URLSearchParams();
params.append('email', userEmail); // ⚠️ 이 줄이 반드시 있어야 합니다!
```

#### 2단계: 설정 화면에서 이메일 가져오기 ⚠️ 가장 중요!

**현재 문제**: `현재 config: { email: undefined, userId: '' }`가 나오는 경우

설정 화면의 이메일 입력 필드에서 값을 가져오는 코드를 확인하세요:

```javascript
// ✅ 방법 1: HTML input에서 직접 가져오기 (가장 확실한 방법)
const emailInput = document.getElementById('email-input'); // 실제 input의 ID로 변경
const userEmail = emailInput ? emailInput.value.trim() : null;

// ✅ 방법 2: 설정 객체에서 가져오기 (설정 객체가 제대로 초기화되었는지 확인)
const userEmail = settings?.email || config?.email || null;

// ✅ 방법 3: React/Vue 등 프레임워크 사용 시
const userEmail = emailState; // useState로 관리하는 값

// ✅ 방법 4: Electron의 IPC를 통해 메인 프로세스에서 가져오기
// renderer.js
const { ipcRenderer } = require('electron');
const userEmail = ipcRenderer.sendSync('get-settings', 'email');

// ⚠️ 값이 있는지 반드시 확인
console.log('설정된 이메일:', userEmail);
console.log('현재 config:', { email: userEmail, userId: userId });
if (!userEmail) {
  console.error('❌ 이메일이 설정되지 않았습니다!');
  console.error('설정 화면에서 이메일을 입력했는지 확인하세요.');
  return; // 이메일이 없으면 API 호출하지 않음
}
```

**디버깅 팁:**

- 설정 화면에서 이메일을 입력한 후 저장 버튼을 눌렀는지 확인
- 설정이 localStorage나 파일에 저장되는지 확인
- 설정을 불러오는 코드가 실행되는지 확인

#### 3단계: 실제 호출 URL 확인

```javascript
const url = `${API_URL}?${params.toString()}`;
console.log('API 호출 URL:', url);
// ✅ 올바른 예: http://localhost:3000/api/notifications?email=user@example.com&last_checked=...
// ❌ 잘못된 예: http://localhost:3000/api/notifications?last_checked=... (email 없음)
```

#### 4단계: 완전한 코드 예제

**현재 문제 해결을 위한 완전한 예제:**

```javascript
const API_URL = 'http://localhost:3000/api/notifications';
let lastChecked = null;

// ⚠️ 중요: 설정 화면에서 이메일을 가져오는 함수
function getUserEmail() {
  // 방법 1: HTML input에서 직접 가져오기 (권장)
  const emailInput = document.getElementById('email-input'); // 실제 input ID로 변경
  if (emailInput && emailInput.value) {
    return emailInput.value.trim();
  }
  
  // 방법 2: 설정 객체에서 가져오기
  if (settings && settings.email) {
    return settings.email;
  }
  
  // 방법 3: localStorage에서 가져오기
  const savedEmail = localStorage.getItem('userEmail');
  if (savedEmail) {
    return savedEmail;
  }
  
  return null;
}

// API 호출 함수
async function checkNotifications() {
  // ⚠️ 매번 최신 설정에서 이메일 가져오기
  const userEmail = getUserEmail();
  
  // ⚠️ 디버깅: 현재 설정 확인
  console.log('현재 config:', { email: userEmail, userId: userId });
  
  // ⚠️ 이메일이 없으면 API 호출하지 않음
  if (!userEmail) {
    console.error('⚠️ email과 user_id가 모두 없습니다! 업무협조, 상담, 교육원, 회의 알림을 받을 수 없습니다.');
    return;
  }
  
  const params = new URLSearchParams();
  
  // ⚠️ 필수: email 파라미터 추가
  params.append('email', userEmail);
  
  if (lastChecked) {
    params.append('last_checked', lastChecked);
  }
  
  const url = `${API_URL}?${params.toString()}`;
  
  // ⚠️ 디버깅: 실제 호출되는 URL 확인
  console.log('🌐 API 호출 URL:', url);
  
  // ⚠️ 디버깅: 파라미터 확인
  console.log('📋 파라미터 확인:', {
    email: userEmail || '(없음)',
    userId: userId || '(없음)',
    hasEmailParam: !!userEmail,
    hasUserIdParam: !!userId,
    urlContainsEmail: url.includes('email='),
    urlContainsUserId: url.includes('user_id='),
  });
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.notifications && data.notifications.length > 0) {
      console.log(`✅ ${data.notifications.length}개의 새 알림 발견`);
      // 알림 표시...
      lastChecked = data.last_checked;
    } else {
      console.log('알림 조회 완료: 0개 알림 발견');
    }
  } catch (error) {
    console.error('❌ 알림 조회 오류:', error);
  }
}

// 주기적으로 실행
setInterval(checkNotifications, 30000);
```

**핵심 포인트:**

1. `getUserEmail()` 함수를 만들어서 설정에서 이메일을 가져옵니다
2. 매번 API 호출 전에 최신 설정에서 이메일을 가져옵니다
3. 이메일이 없으면 API 호출하지 않습니다
4. 디버깅 로그를 추가하여 문제를 쉽게 파악할 수 있습니다
