const { contextBridge, ipcRenderer } = require('electron');

// Next.js 앱에서 사용할 수 있는 Electron API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 알림 표시
  showNotification: (options) => {
    ipcRenderer.send('show-notification', {
      title: options.title || '알림',
      body: options.body || '',
      options: {
        icon: options.icon,
        silent: options.silent || false
      }
    });
  },

  // 앱 창 숨기기
  hideWindow: () => {
    ipcRenderer.send('app-hide');
  },

  // 앱 창 보이기
  showWindow: () => {
    ipcRenderer.send('app-show');
  },

  // 플랫폼 정보
  platform: process.platform,

  // 환경 변수
  getEnv: (key) => {
    return process.env[key];
  },

  // 설정 관련 IPC (settings.html에서 사용)
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // IPC 이벤트 리스너
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
  },

  // IPC 이벤트 리스너 제거
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Next.js의 Notification API를 Electron 알림으로 변환
window.addEventListener('DOMContentLoaded', () => {
  // Notification API 래핑
  if (window.Notification) {
    const OriginalNotification = window.Notification;
    
    window.Notification = function(title, options = {}) {
      // Electron API가 있으면 Electron 알림 사용
      if (window.electronAPI) {
        window.electronAPI.showNotification({
          title: title,
          body: options.body || '',
          icon: options.icon,
          silent: options.silent || false
        });
      }
      
      // 원본 Notification도 호출 (브라우저 호환성)
      return new OriginalNotification(title, options);
    };
    
    // Notification 정적 속성 복사
    Object.setPrototypeOf(window.Notification, OriginalNotification);
    window.Notification.prototype = OriginalNotification.prototype;
    window.Notification.permission = OriginalNotification.permission;
    window.Notification.requestPermission = OriginalNotification.requestPermission;
  }
});

