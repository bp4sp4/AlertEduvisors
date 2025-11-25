const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

let mainWindow = null; // 설정 창 (필요시에만 표시)
let tray = null;
let server = null;
let pollInterval = null;

// 설정 관리
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  console.log('📂 설정 파일 경로:', CONFIG_FILE);
  
  // 기본 설정
  const defaultConfig = {
    apiUrl: process.env.API_URL || (process.env.WEB_URL ? `${process.env.WEB_URL}/api/notifications` : 'http://localhost:3000/api/notifications'),
    userId: process.env.USER_ID || '',
    email: process.env.EMAIL || '',
    pollingInterval: 10000, // 10초 (기본값)
    types: 'all', // all, customer_edit, work_cooperation, sales_consultation, institution_request, meeting
    enabled: true,
    repeatNotifications: true // 같은 알림을 계속 표시할지 여부 (기본: true)
  };
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const loadedConfig = JSON.parse(data);
      console.log('✅ 설정 파일 로드 성공:', loadedConfig);
      
      // 기본값과 병합 (기존 설정에 없는 필드는 기본값 사용)
      const mergedConfig = {
        ...defaultConfig,
        ...loadedConfig,
        // repeatNotifications가 없으면 기본값 true 사용
        repeatNotifications: loadedConfig.repeatNotifications !== undefined ? loadedConfig.repeatNotifications : true
      };
      
      console.log('📋 병합된 설정:', mergedConfig);
      console.log('🔄 repeatNotifications:', mergedConfig.repeatNotifications);
      return mergedConfig;
    } else {
      console.log('ℹ️ 설정 파일이 없습니다. 기본 설정을 사용합니다.');
    }
  } catch (error) {
    console.error('❌ 설정 로드 오류:', error);
  }
  
  console.log('📋 기본 설정:', defaultConfig);
  return defaultConfig;
}

function saveConfig(config) {
  try {
    // 디렉토리가 없으면 생성
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('📁 설정 디렉토리 생성:', configDir);
    }
    
    console.log('💾 ===== saveConfig 시작 =====');
    console.log('💾 받은 config:', JSON.stringify(config, null, 2));
    console.log('💾 config.email 원본:', config.email, '타입:', typeof config.email);
    
    // 저장할 설정 객체 생성 (모든 필드 포함, 명시적으로 설정)
    // email과 userId는 trim() 처리된 값으로 저장
    let emailToSave = '';
    if (config.email !== undefined && config.email !== null) {
      if (typeof config.email === 'string') {
        emailToSave = config.email.trim();
      } else {
        emailToSave = String(config.email).trim();
      }
    }
    
    let userIdToSave = '';
    if (config.userId !== undefined && config.userId !== null) {
      if (typeof config.userId === 'string') {
        userIdToSave = config.userId.trim();
      } else {
        userIdToSave = String(config.userId).trim();
      }
    }
    
    console.log('💾 처리된 emailToSave:', emailToSave, '타입:', typeof emailToSave, '길이:', emailToSave.length);
    console.log('💾 처리된 userIdToSave:', userIdToSave, '타입:', typeof userIdToSave);
    
    const configToSave = {
      apiUrl: config.apiUrl || 'http://localhost:3000/api/notifications',
      email: emailToSave,
      userId: userIdToSave,
      pollingInterval: config.pollingInterval || 10000,
      types: config.types || 'all',
      enabled: config.enabled !== false,
      repeatNotifications: config.repeatNotifications !== false // 기본값: true
    };
    
    console.log('💾 최종 저장할 설정:', JSON.stringify(configToSave, null, 2));
    console.log('💾 emailToSave 최종 확인:', configToSave.email, '타입:', typeof configToSave.email, '길이:', configToSave.email.length);
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf8');
    console.log('✅ 설정 저장 완료:', CONFIG_FILE);
    
    // 저장 확인 - 파일에서 다시 읽어서 검증
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = fs.readFileSync(CONFIG_FILE, 'utf8');
      const savedParsed = JSON.parse(saved);
      console.log('✅ 저장 확인 - 파일 내용:', saved);
      console.log('✅ 저장 확인 - email:', savedParsed.email || '(없음)', '타입:', typeof savedParsed.email, '길이:', savedParsed.email ? savedParsed.email.length : 0);
      console.log('✅ 저장 확인 - userId:', savedParsed.userId || '(없음)');
      
      // 검증: 저장한 값과 읽은 값이 일치하는지 확인
      if (savedParsed.email !== configToSave.email) {
        console.error('❌ 경고: 저장한 email과 읽은 email이 다릅니다!');
        console.error('  저장한 값:', configToSave.email);
        console.error('  읽은 값:', savedParsed.email);
      } else {
        console.log('✅ email 저장 검증 성공');
      }
    }
    console.log('💾 ===== saveConfig 완료 =====');
  } catch (error) {
    console.error('❌ 설정 저장 오류:', error);
    console.error('오류 상세:', error.stack);
  }
}

let config = loadConfig();
console.log('🔧 현재 설정:', config);
console.log('📧 이메일 확인:', config.email || '(없음)');
console.log('🆔 사용자 ID 확인:', config.userId || '(없음)');

// 설정이 없으면 경고
if (!config.email && !config.userId) {
  console.warn('⚠️ 이메일 또는 사용자 ID가 설정되지 않았습니다. 설정 창에서 입력하세요.');
}

let lastChecked = null;
let processedNotificationIds = new Set(); // 중복 알림 방지

function createSettingsWindow() {
  // 설정 창 (필요시에만 표시)
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const windowIcon = fs.existsSync(iconPath) ? iconPath : undefined;
  
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      // 개발자 도구 콘솔 오류 필터링 (선택사항)
      devTools: true
    },
    icon: windowIcon,
    show: false
  });
  
  // 콘솔 오류 필터링 (dragEvent 같은 내부 오류 무시)
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // dragEvent 관련 오류는 무시
    if (message.includes('dragEvent') && message.includes('not defined')) {
      return; // 이 오류는 무시
    }
    // 다른 오류는 그대로 출력
  });

  mainWindow.loadFile('settings.html');

  // 개발자 도구 열기 - 항상 자동으로 열리도록
  mainWindow.webContents.on('did-finish-load', () => {
    // 설정 창이 로드되면 자동으로 개발자 도구 열기
    mainWindow.webContents.openDevTools();
    console.log('✅ 개발자 도구 자동으로 열림');
  });

  // F12 키로 개발자 도구 열기/닫기
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      event.preventDefault();
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });


  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  // 아이콘 파일이 없으면 기본 아이콘 경로로 대체 시도
  let trayIconPath = iconPath;
  
  if (!fs.existsSync(iconPath)) {
    console.log('트레이 아이콘 파일을 찾을 수 없습니다. 기본 아이콘을 시도합니다.');
    // 기본 아이콘 경로로 대체 시도
    const defaultIconPath = path.join(__dirname, 'assets', 'icon.png');
    if (fs.existsSync(defaultIconPath)) {
      trayIconPath = defaultIconPath;
    } else {
      // 아이콘이 없으면 트레이를 생성하지 않음 (선택적 기능)
      console.warn('아이콘 파일이 없어 트레이를 생성하지 않습니다. assets/tray-icon.png 또는 assets/icon.png 파일을 추가하세요.');
      tray = null;
      return;
    }
  }
  
  try {
    tray = new Tray(trayIconPath);
  } catch (error) {
    console.warn('트레이 생성 실패 (앱은 계속 실행됩니다):', error.message);
    // 트레이 생성 실패해도 앱은 계속 실행
    tray = null;
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '설정',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      label: '개발자 도구',
      click: () => {
        if (mainWindow) {
          if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
          } else {
            mainWindow.webContents.openDevTools();
          }
        } else {
          createSettingsWindow();
          // 창이 열린 후 개발자 도구 열기
          setTimeout(() => {
            if (mainWindow) {
              mainWindow.webContents.openDevTools();
            }
          }, 500);
        }
      }
    },
    {
      label: '테스트 알림',
      click: () => {
        showNotification('테스트 알림', '알림이 정상적으로 작동합니다!');
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.quit();
      }
    }
  ]);

  if (tray) {
    tray.setToolTip('Alert Electron');
    tray.setContextMenu(contextMenu);
    
    // 트레이 아이콘 클릭 시 설정 창 토글
    tray.on('click', () => {
      createSettingsWindow();
    });
  }
}

function showNotification(title, body, options = {}) {
  console.log('🔔 showNotification 호출:', {
    title: title,
    body: body?.substring(0, 50) + (body?.length > 50 ? '...' : ''),
    isSupported: Notification.isSupported(),
    priority: options.priority
  });
  
  if (!Notification.isSupported()) {
    console.error('❌ Notification이 지원되지 않습니다.');
    return;
  }
  
  try {
    const notificationIconPath = options.icon || path.join(__dirname, 'assets', 'notification-icon.png');
    const notificationIcon = fs.existsSync(notificationIconPath) ? notificationIconPath : undefined;
    
    // 우선순위에 따라 urgency 설정
    const urgency = options.priority === 'high' ? 'critical' : 'normal';
    
    console.log('🔔 Notification 객체 생성 중...', {
      title: title,
      body: body,
      icon: notificationIcon,
      urgency: urgency
    });
    
    const notification = new Notification({
      title: title,
      body: body,
      icon: notificationIcon,
      silent: options.silent || false,
      urgency: urgency
    });

    notification.on('click', () => {
      console.log('🔔 알림 클릭됨:', title);
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
      // 알림 데이터가 있으면 처리
      if (options.data) {
        console.log('알림 클릭 데이터:', options.data);
      }
    });

    notification.on('show', () => {
      console.log('✅ 알림 표시됨:', title);
    });

    notification.on('error', (error) => {
      console.error('❌ 알림 표시 오류:', error);
    });

    notification.show();
    console.log('✅ notification.show() 호출 완료');
  } catch (error) {
    console.error('❌ showNotification 오류:', error);
    console.error('❌ 오류 상세:', error.stack);
  }
}

// Next.js API에서 알림 가져오기
async function fetchNotifications() {
  // ⚠️ 즉시 확인
  console.log('🔍 ===== fetchNotifications 시작 =====');
  console.log('🔍 현재 config:', {
    email: config.email,
    userId: config.userId,
    emailType: typeof config.email,
    userIdType: typeof config.userId,
    emailExists: !!config.email,
    emailLength: config.email ? config.email.length : 0
  });
  
  if (!config.enabled) {
    console.log('⏸️ 알림이 비활성화되어 있습니다.');
    return [];
  }
  if (!config.apiUrl) {
    console.error('❌ API URL이 설정되지 않았습니다.');
    return [];
  }

  try {
    const params = new URLSearchParams();
    
    // email 또는 user_id 파라미터 추가
    if (config.email && config.email.trim()) {
      params.append('email', config.email.trim());
      console.log('✅ email 파라미터 추가:', config.email.trim());
    } else if (config.userId && config.userId.trim()) {
      params.append('user_id', config.userId.trim());
      console.log('✅ user_id 파라미터 추가:', config.userId.trim());
    } else {
      console.warn('⚠️ email과 user_id가 모두 없습니다!');
      console.warn('⚠️ 업무협조, 상담, 교육원, 회의 알림을 받을 수 없습니다.');
    }
    
    // repeatNotifications가 false일 때만 last_checked 사용 (중복 방지)
    // repeatNotifications가 true이면 last_checked를 사용하지 않아 같은 알림이 계속 표시됨
    // undefined나 true일 때는 last_checked를 사용하지 않음 (기본값: true)
    const shouldRepeat = config.repeatNotifications !== false;
    if (!shouldRepeat && lastChecked) {
      params.append('last_checked', lastChecked);
      console.log('🕐 last_checked 파라미터 추가 (중복 방지):', lastChecked);
    } else {
      console.log('🔄 repeatNotifications 활성화: last_checked 사용 안 함 (모든 알림 표시)');
    }
    
    if (config.types && config.types !== 'all') {
      params.append('types', config.types);
    }

    const url = `${config.apiUrl}?${params.toString()}`;
    console.log('🌐 API 호출 URL:', url);
    console.log('📋 파라미터 확인:', {
      email: config.email || '(없음)',
      userId: config.userId || '(없음)',
      hasEmailParam: params.has('email'),
      hasUserIdParam: params.has('user_id'),
      urlContainsEmail: url.includes('email='),
      urlContainsUserId: url.includes('user_id='),
      emailParamValue: params.get('email') || '(없음)'
    });
    
    // ⚠️ 중요: email 파라미터가 없으면 경고
    if (!params.has('email') && !params.has('user_id')) {
      console.error('❌ 경고: email 또는 user_id 파라미터가 없습니다!');
      console.error('❌ API가 모든 알림을 반환할 수 있습니다.');
    }

    const response = await axios.get(url, {
      timeout: 10000 // 10초 타임아웃
    });
    
    console.log('✅ API 응답 받음:', {
      success: response.data?.success,
      count: response.data?.notifications?.length || 0,
      hasNotifications: !!response.data?.notifications,
      notificationsType: Array.isArray(response.data?.notifications) ? 'array' : typeof response.data?.notifications
    });

    // 응답 데이터 상세 로그
    if (response.data) {
      console.log('📦 API 응답 데이터 구조:', {
        success: response.data.success,
        notificationsLength: response.data.notifications?.length || 0,
        lastChecked: response.data.last_checked,
        notifications: response.data.notifications ? response.data.notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message?.substring(0, 50) + '...'
        })) : '없음'
      });
    }

    if (response.data && response.data.success && response.data.notifications) {
      let notifications = response.data.notifications;
      console.log(`📬 받은 알림 개수 (필터링 전): ${notifications.length}개`);
      
      // 알림 객체 구조 디버깅 (첫 번째 알림만)
      if (notifications.length > 0) {
        console.log('🔍 알림 객체 구조 샘플:', JSON.stringify(notifications[0], null, 2));
      }
      
      // ⚠️ 중요: API가 이미 email 파라미터로 필터링하고 있다고 가정
      // 따라서 API가 반환한 알림은 모두 해당 이메일의 알림입니다
      // 단, customer_edit 타입은 관리자용이므로 제외
      if (config.email && config.email.trim()) {
        const userEmail = config.email.trim().toLowerCase();
        console.log(`🔍 필터링 시작 - 내 이메일: ${userEmail}`);
        console.log(`ℹ️ API가 이미 email 파라미터로 필터링했으므로, 반환된 알림은 모두 내 알림입니다.`);
        console.log(`ℹ️ 단, customer_edit 타입은 관리자용이므로 제외합니다.`);
        
        // customer_edit 타입만 제외 (관리자용)
        const filteredNotifications = notifications.filter(notif => {
          if (notif.type === 'customer_edit') {
            console.log(`⏭️ customer_edit 알림 제외 (관리자용):`, notif.id);
            return false;
          }
          
          // 나머지 알림은 모두 표시 (API가 이미 필터링함)
          console.log(`✅ 알림 표시:`, {
            id: notif.id,
            type: notif.type,
            title: notif.title
          });
          return true;
        });
        
        notifications = filteredNotifications;
        console.log(`📬 필터링 후 알림 개수: ${notifications.length}개`);
        console.log(`📧 내 이메일: ${userEmail}`);
      } else {
        console.warn('⚠️ 이메일이 설정되지 않아 customer_edit 알림만 표시합니다.');
        // 이메일이 없으면 customer_edit만 표시 (관리자용)
        notifications = notifications.filter(notif => notif.type === 'customer_edit');
        console.log(`📬 customer_edit 알림만 표시: ${notifications.length}개`);
      }
      
      // 각 알림 상세 정보 로그
      notifications.forEach((notif, index) => {
        console.log(`📬 알림 ${index + 1}:`, {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          priority: notif.priority
        });
      });
      
      // repeatNotifications가 false일 때만 last_checked 업데이트
      // undefined나 true일 때는 업데이트하지 않음 (기본값: true)
      const shouldRepeat = config.repeatNotifications !== false;
      if (!shouldRepeat && response.data.last_checked) {
        lastChecked = response.data.last_checked;
        console.log('🕐 last_checked 업데이트:', lastChecked);
      } else {
        console.log('🔄 repeatNotifications 활성화: last_checked 업데이트 안 함');
      }
      
      console.log('🔍 ===== fetchNotifications 완료 =====');
      return notifications;
    }

    console.log('🔍 ===== fetchNotifications 완료 (알림 없음) =====');
    console.log('🔍 응답 데이터:', response.data);
    return [];
  } catch (error) {
    console.error('❌ ===== fetchNotifications 오류 =====');
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Next.js 서버에 연결할 수 없습니다.');
      console.error('❌ 서버가 실행 중인지 확인하세요: npm run dev');
    } else {
      console.error('❌ 오류:', error.message);
    }
    console.error('❌ ===== fetchNotifications 오류 끝 =====');
    return [];
  }
}

// 알림 폴링 시작
function startPolling() {
  stopPolling(); // 기존 폴링 중지

  if (!config.enabled) {
    console.log('⚠️ 알림 폴링이 비활성화되어 있습니다. (config.enabled:', config.enabled, ')');
    return;
  }

  if (!config.email && !config.userId) {
    console.warn('⚠️ 이메일 또는 사용자 ID가 설정되지 않았습니다. 업무협조, 상담, 교육원, 회의 알림을 받을 수 없습니다.');
  }

  const intervalSeconds = config.pollingInterval / 1000;
  console.log(`✅ 알림 폴링 시작: ${intervalSeconds}초마다`);
  console.log('📋 폴링 설정:', {
    enabled: config.enabled,
    email: config.email || '(없음)',
    userId: config.userId || '(없음)',
    apiUrl: config.apiUrl,
    types: config.types,
    intervalMs: config.pollingInterval,
    intervalSeconds: intervalSeconds,
    repeatNotifications: config.repeatNotifications !== false // 기본값 true
  });
  console.log('🔄 repeatNotifications 모드:', config.repeatNotifications !== false ? '활성화 (같은 알림 계속 표시)' : '비활성화 (중복 방지)');
  
  // 즉시 한 번 실행
  console.log('🚀 즉시 알림 확인 시작...');
  checkNotifications();

  // 주기적으로 실행
  pollInterval = setInterval(() => {
    console.log(`⏰ ${intervalSeconds}초 경과 - 알림 확인 시작...`);
    checkNotifications();
  }, config.pollingInterval);
  
  console.log(`✅ 폴링 인터벌 설정 완료: ${intervalSeconds}초마다 실행`);
}

// 알림 폴링 중지
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('알림 폴링 중지');
  }
}

// 알림 확인 및 표시
async function checkNotifications() {
  if (!config.enabled) {
    console.log('알림이 비활성화되어 있어 조회를 건너뜁니다.');
    return;
  }
  
  console.log('알림 조회 시작...', {
    email: config.email || null,
    userId: config.userId || null,
    emailType: typeof config.email,
    userIdType: typeof config.userId,
    emailLength: config.email ? config.email.length : 0,
    userIdLength: config.userId ? config.userId.length : 0,
    emailIsEmpty: !config.email || config.email.trim() === '',
    userIdIsEmpty: !config.userId || config.userId.trim() === '',
    types: config.types,
    lastChecked: lastChecked
  });
  
  const notifications = await fetchNotifications();
  
  console.log(`📊 알림 조회 완료: ${notifications.length}개 알림 발견`);
  console.log(`📊 processedNotificationIds 크기: ${processedNotificationIds.size}`);
  
  if (notifications.length > 0) {
    console.log('🔔 알림 처리 시작...');
    notifications.forEach((notification, index) => {
      console.log(`\n🔔 알림 ${index + 1}/${notifications.length} 처리 중:`, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        isDuplicate: processedNotificationIds.has(notification.id)
      });
      
      // 중복 알림 방지 (repeatNotifications가 false일 때만)
      // undefined나 true일 때는 중복 체크하지 않음 (기본값: true)
      const shouldRepeat = config.repeatNotifications !== false;
      if (!shouldRepeat) {
        if (processedNotificationIds.has(notification.id)) {
          console.log('⏭️ 중복 알림 건너뛰기:', notification.id);
          return;
        }
        processedNotificationIds.add(notification.id);
        console.log('✅ 알림 ID 추가됨 (중복 방지):', notification.id);
      } else {
        console.log('🔄 repeatNotifications 활성화: 중복 체크 없이 알림 표시');
      }
      console.log('📢 알림 표시 시작:', notification.title);
      
      // 알림 표시
      try {
        showNotification(notification.title, notification.message, {
          priority: notification.priority || 'normal',
          data: notification.data,
          icon: notification.icon
        });
        console.log('✅ 알림 표시 완료:', notification.title);
      } catch (error) {
        console.error('❌ 알림 표시 오류:', error);
        console.error('❌ 알림 데이터:', notification);
      }
    });
    console.log('🔔 알림 처리 완료\n');

    // 설정 창이 열려있으면 업데이트
    if (mainWindow) {
      mainWindow.webContents.send('notifications-updated', {
        count: notifications.length,
        lastChecked: lastChecked
      });
    }
  }
}

// IPC 핸들러
ipcMain.on('show-notification', (event, { title, body, options }) => {
  showNotification(title, body, options);
});

ipcMain.on('app-hide', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on('app-show', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createSettingsWindow();
  }
});

// 설정 관련 IPC 핸들러
ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('update-config', (event, newConfig) => {
  console.log('📝 ===== 설정 업데이트 시작 =====');
  console.log('📝 받은 설정:', JSON.stringify(newConfig, null, 2));
  console.log('📝 newConfig.email:', newConfig.email, '타입:', typeof newConfig.email, '길이:', newConfig.email ? newConfig.email.length : 0);
  console.log('📝 newConfig.userId:', newConfig.userId, '타입:', typeof newConfig.userId);
  console.log('📝 newConfig.hasOwnProperty("email"):', newConfig.hasOwnProperty('email'));
  
  const oldEmail = config.email;
  const oldUserId = config.userId;
  
  // 설정 병합 - 모든 필드를 명시적으로 처리
  config = { 
    ...config, 
    ...newConfig
  };
  
  // email과 userId는 명시적으로 설정
  if (newConfig.hasOwnProperty('email')) {
    // trim()을 적용하여 공백만 있는 경우도 빈 문자열로 처리
    let trimmedEmail = '';
    if (newConfig.email !== undefined && newConfig.email !== null) {
      if (typeof newConfig.email === 'string') {
        trimmedEmail = newConfig.email.trim();
      } else {
        trimmedEmail = String(newConfig.email).trim();
      }
    }
    config.email = trimmedEmail;
    console.log('✅ email 설정됨:', config.email, '타입:', typeof config.email, '길이:', config.email.length);
    console.log('✅ 원본 newConfig.email:', newConfig.email, '타입:', typeof newConfig.email);
    console.log('✅ 처리된 trimmedEmail:', trimmedEmail, '타입:', typeof trimmedEmail, '길이:', trimmedEmail.length);
  } else {
    console.log('⚠️ newConfig에 email 속성이 없습니다. 기존 값 유지:', config.email);
  }
  
  if (newConfig.hasOwnProperty('userId')) {
    const trimmedUserId = typeof newConfig.userId === 'string' ? newConfig.userId.trim() : '';
    config.userId = trimmedUserId;
    console.log('✅ userId 설정됨:', config.userId);
  }
  
  console.log('🔧 병합된 config:', JSON.stringify(config, null, 2));
  console.log('🔧 config.email 최종 확인:', config.email, '타입:', typeof config.email, '길이:', config.email ? config.email.length : 0);
  
  // 설정 저장
  saveConfig(config);
  
  // 저장 후 파일에서 다시 읽어서 확인
  const savedConfig = loadConfig();
  console.log('💾 파일에서 읽은 설정:', JSON.stringify(savedConfig, null, 2));
  console.log('💾 savedConfig.email:', savedConfig.email, '타입:', typeof savedConfig.email, '길이:', savedConfig.email ? savedConfig.email.length : 0);
  
  // 메모리 업데이트
  config = savedConfig;
  
  console.log('🔄 변경 사항:');
  console.log('  email:', oldEmail || '(없음)', '→', config.email || '(없음)');
  console.log('  userId:', oldUserId || '(없음)', '→', config.userId || '(없음)');
  
  // 폴링 재시작
  if (config.enabled) {
    console.log('▶️ 폴링 재시작...');
    stopPolling();
    startPolling();
  }
  
  console.log('📝 ===== 설정 업데이트 완료 =====');
  console.log('📝 최종 config.email:', config.email || '(없음)', '타입:', typeof config.email, '길이:', config.email ? config.email.length : 0);
  
  return { 
    success: true, 
    config: config 
  };
});

ipcMain.handle('test-notification', () => {
  showNotification('테스트 알림', '알림이 정상적으로 작동합니다!');
  return { success: true };
});

ipcMain.handle('test-api-connection', async () => {
  console.log('🧪 ===== API 연결 테스트 시작 =====');
  console.log('🧪 현재 설정:', {
    apiUrl: config.apiUrl,
    email: config.email || '(없음)',
    userId: config.userId || '(없음)',
    enabled: config.enabled,
    lastChecked: lastChecked || '(없음)'
  });
  
  try {
    // API URL 확인
    if (!config.apiUrl) {
      return {
        success: false,
        message: 'API URL이 설정되지 않았습니다.'
      };
    }
    
    // 이메일 또는 사용자 ID 확인
    if (!config.email && !config.userId) {
      return {
        success: false,
        message: '이메일 또는 사용자 ID가 설정되지 않았습니다. 설정에서 이메일을 입력하세요.'
      };
    }
    
    // 실제 API 호출 테스트
    // ⚠️ 중요: 테스트 시에는 last_checked를 제외하여 모든 알림을 확인
    const testParams = new URLSearchParams();
    if (config.email && config.email.trim()) {
      testParams.append('email', config.email.trim());
    } else if (config.userId && config.userId.trim()) {
      testParams.append('user_id', config.userId.trim());
    }
    
    // last_checked는 테스트에서 제외 (모든 알림 확인)
    // 실제 폴링에서는 last_checked를 포함하여 중복 방지
    
    const testUrl = `${config.apiUrl}?${testParams.toString()}`;
    console.log('🧪 테스트 URL (last_checked 제외):', testUrl);
    console.log('🧪 참고: 테스트는 모든 알림을 확인합니다. 실제 폴링에서는 last_checked로 중복을 방지합니다.');
    
    const response = await axios.get(testUrl, {
      timeout: 10000,
      validateStatus: (status) => status < 500 // 500 이상만 에러로 처리
    });
    
    console.log('🧪 API 응답 상태:', response.status);
    console.log('🧪 API 응답 데이터:', response.data);
    
    if (response.status === 200 && response.data) {
      const notifications = response.data.notifications || [];
      console.log(`🧪 발견된 알림 개수: ${notifications.length}개`);
      
      // 알림 상세 정보 로그
      if (notifications.length > 0) {
        console.log('🧪 알림 목록:');
        notifications.forEach((notif, index) => {
          console.log(`  ${index + 1}. [${notif.type}] ${notif.title}`);
        });
      } else {
        console.log('🧪 알림이 없습니다. 다음을 확인하세요:');
        console.log('  1. Next.js API에 실제로 알림 데이터가 있는지');
        console.log('  2. 이메일이 올바르게 설정되었는지');
        console.log('  3. 알림 타입 필터가 올바른지');
      }
      
      return {
        success: true,
        count: notifications.length,
        message: `API 연결 성공! ${notifications.length}개의 알림을 찾았습니다.`,
        status: response.status,
        data: response.data,
        notifications: notifications // 알림 목록도 반환
      };
    } else {
      return {
        success: false,
        message: `API 응답 오류 (상태: ${response.status})`,
        status: response.status,
        data: response.data
      };
    }
  } catch (error) {
    console.error('❌ API 연결 테스트 오류:', error);
    
    let errorMessage = 'API 연결 실패';
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Next.js 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요. (http://localhost:3000)';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '연결 시간 초과. 서버 응답이 너무 느립니다.';
    } else if (error.response) {
      errorMessage = `서버 오류 (${error.response.status}): ${error.response.statusText}`;
    } else {
      errorMessage = error.message || '알 수 없는 오류';
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code
    };
  }
});

ipcMain.handle('clear-processed-notifications', () => {
  console.log('🔄 ===== 알림 히스토리 초기화 시작 =====');
  const oldCount = processedNotificationIds.size;
  const oldLastChecked = lastChecked;
  
  console.log('🔄 초기화 전 상태:', {
    processedNotificationIdsCount: oldCount,
    lastChecked: oldLastChecked || '(없음)'
  });
  
  processedNotificationIds.clear();
  lastChecked = null;
  
  console.log(`✅ 초기화 완료:`);
  console.log(`  - ${oldCount}개 알림 ID 제거`);
  console.log(`  - last_checked 초기화 (이전: ${oldLastChecked || '없음'})`);
  console.log('🔄 ===== 알림 히스토리 초기화 완료 =====');
  
  // 초기화 후 즉시 알림 확인 (모든 알림을 다시 확인)
  if (config.enabled) {
    console.log('🚀 초기화 후 즉시 알림 확인 시작...');
    setTimeout(() => {
      checkNotifications();
    }, 1000); // 1초 후 실행
  }
  
  return { 
    success: true,
    clearedCount: oldCount,
    oldLastChecked: oldLastChecked
  };
});

// HTTP 서버 시작 (웹에서 알림 요청 받기)
function startServer() {
  const port = process.env.PORT || 3001;
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // 알림 요청 엔드포인트
  app.post('/api/notification', (req, res) => {
    const { title, body, icon, silent } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    
    showNotification(title, body || '', {
      icon,
      silent: silent || false
    });
    
    res.json({ success: true, message: 'Notification sent' });
  });
  
  // 상태 확인
  app.get('/api/status', (req, res) => {
    res.json({ 
      status: 'running',
      port: port,
      platform: process.platform
    });
  });
  
  server = app.listen(port, () => {
    console.log(`알림 서버가 포트 ${port}에서 실행 중입니다.`);
    console.log(`웹에서 http://localhost:${port}/api/notification 으로 POST 요청을 보내면 알림이 표시됩니다.`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`포트 ${port}가 이미 사용 중입니다. 다른 포트를 사용하세요.`);
    } else {
      console.error('서버 오류:', err);
    }
  });
}

// 서버 종료
function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

// 테스트 함수 추가
async function testConnection() {
  console.log('🧪 API 연결 테스트 시작...');
  
  try {
    const testUrl = 'http://localhost:3000/api/notifications';
    console.log('🌐 테스트 URL:', testUrl);
    
    const response = await axios.get(testUrl, {
      timeout: 5000
    });
    
    console.log('✅ 연결 성공!');
    console.log('응답:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Next.js 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
    }
    return { success: false, error: error.message };
  }
}

// 앱 준비
app.whenReady().then(() => {
  // 설정 로드 후 즉시 확인
  config = loadConfig();
  console.log('🚀 앱 시작 시 설정:', JSON.stringify(config, null, 2));
  console.log('🚀 email 값:', config.email, '타입:', typeof config.email);
  console.log('🚀 email이 있는가?', !!config.email);
  console.log('🚀 email.trim() 결과:', config.email ? config.email.trim() : '(없음)');
  
  // 연결 테스트
  testConnection().then(result => {
    if (result.success) {
      console.log('✅ API 연결 확인 완료');
    } else {
      console.error('❌ API 연결 실패 - 서버를 확인하세요');
    }
  });
  
  // 전역 단축키 등록 (Cmd+Option+I 또는 Ctrl+Shift+I)
  const { globalShortcut } = require('electron');
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    } else {
      createSettingsWindow();
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.webContents.openDevTools();
        }
      }, 500);
    }
  });
  console.log('✅ 단축키 등록: Cmd+Option+I (macOS) 또는 Ctrl+Shift+I (Windows/Linux)');
  
  createTray();
  startServer(); // HTTP 서버 시작
  startPolling(); // 알림 폴링 시작

  app.on('activate', () => {
    // macOS에서 독 아이콘 클릭 시
    if (BrowserWindow.getAllWindows().length === 0) {
      createSettingsWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 창을 닫아도 백그라운드에서 계속 실행 (트레이에서만 표시)
  // 실제 종료는 트레이 메뉴에서만 가능
});

app.on('before-quit', () => {
  stopPolling(); // 폴링 중지
  stopServer(); // 서버 종료
  saveConfig(config); // 설정 저장
});

// 알림 권한 요청
app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const dockIconPath = path.join(__dirname, 'assets', 'icon.png');
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath);
    }
  }
});

