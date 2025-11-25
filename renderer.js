const { ipcRenderer } = require('electron');

// DOM 요소
const testNotificationBtn = document.getElementById('test-notification');
const hideWindowBtn = document.getElementById('hide-window');
const loadWebBtn = document.getElementById('load-web');
const openDirectBtn = document.getElementById('open-direct');
const webUrlInput = document.getElementById('web-url');
const webview = document.getElementById('webview');
const statusDiv = document.getElementById('status');

// 상태 업데이트 함수
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  setTimeout(() => {
    statusDiv.className = 'status';
    statusDiv.textContent = '준비됨';
  }, 3000);
}

// 테스트 알림
testNotificationBtn.addEventListener('click', () => {
  ipcRenderer.send('show-notification', {
    title: '테스트 알림',
    body: '알림이 정상적으로 작동합니다!',
    options: {
      silent: false
    }
  });
  updateStatus('알림이 전송되었습니다', 'info');
});

// 창 숨기기
hideWindowBtn.addEventListener('click', () => {
  ipcRenderer.send('app-hide');
  updateStatus('창이 숨겨졌습니다. 트레이 아이콘을 클릭하여 다시 열 수 있습니다.', 'info');
});

// 웹 로드 (iframe 모드)
loadWebBtn.addEventListener('click', () => {
  const url = webUrlInput.value.trim();
  
  if (!url) {
    updateStatus('URL을 입력해주세요', 'error');
    return;
  }

  // URL 유효성 검사
  try {
    new URL(url);
  } catch (e) {
    updateStatus('유효한 URL을 입력해주세요', 'error');
    return;
  }

  webview.src = url;
  updateStatus(`웹 페이지 로딩 중: ${url}`, 'info');
  
  webview.onload = () => {
    updateStatus('웹 페이지가 로드되었습니다', 'info');
  };

  webview.onerror = () => {
    updateStatus('웹 페이지 로드에 실패했습니다', 'error');
  };
});

// 직접 열기 (새 창에서 Next.js 로드)
openDirectBtn.addEventListener('click', () => {
  const url = webUrlInput.value.trim() || 'http://localhost:3000';
  
  try {
    new URL(url);
    // 메인 프로세스에 새 창 열기 요청
    ipcRenderer.send('open-web-window', { url });
    updateStatus(`새 창에서 열기: ${url}`, 'info');
  } catch (e) {
    updateStatus('유효한 URL을 입력해주세요', 'error');
  }
});

// 웹뷰에서 알림 요청 처리 (iframe 모드일 때)
webview.addEventListener('dom-ready', () => {
  // 웹뷰 내부의 알림 요청을 감지하고 Electron 알림으로 변환
  try {
    webview.executeJavaScript(`
      (function() {
        if (window.Notification && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        
        // 원본 Notification을 래핑하여 Electron 알림으로 전달
        const OriginalNotification = window.Notification;
        window.Notification = function(title, options) {
          // postMessage를 통해 부모 창에 알림 요청 전달
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'electron-notification',
              title: title,
              body: options?.body || '',
              options: options
            }, '*');
          }
          return new OriginalNotification(title, options);
        };
        window.Notification.prototype = OriginalNotification.prototype;
        window.Notification.permission = OriginalNotification.permission;
        window.Notification.requestPermission = OriginalNotification.requestPermission;
      })();
    `);
  } catch (e) {
    console.log('웹뷰 알림 설정 실패:', e);
  }
});

// 웹뷰에서 온 알림 메시지 수신
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'electron-notification') {
    ipcRenderer.send('show-notification', {
      title: event.data.title,
      body: event.data.body,
      options: event.data.options || {}
    });
  }
});

// 환경 변수에서 기본 URL 로드
if (process.env.WEB_URL) {
  webUrlInput.value = process.env.WEB_URL;
  webview.src = process.env.WEB_URL;
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + L: URL 입력 필드 포커스
  if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
    e.preventDefault();
    webUrlInput.focus();
    webUrlInput.select();
  }
  
  // Cmd/Ctrl + H: 창 숨기기
  if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
    e.preventDefault();
    ipcRenderer.send('app-hide');
  }
});

// 초기화 완료
updateStatus('앱이 준비되었습니다', 'info');

