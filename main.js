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
    apiUrl: process.env.API_URL || (process.env.WEB_URL ? `${process.env.WEB_URL}/api/notifications` : 'https://nms-system.vercel.app/api/notifications'),
    userId: process.env.USER_ID || '',
    email: process.env.EMAIL || '',
    pollingInterval: 300000, // 5분 (300초, 기본값)
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
      apiUrl: config.apiUrl || 'https://nms-system.vercel.app/api/notifications',
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
    width: 800,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: false // 개발자 도구 비활성화
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
    
    // 알림 옵션 설정
    const notificationOptions = {
      title: title,
      body: body,
      icon: notificationIcon,
      silent: options.silent || false,
      urgency: urgency // 'critical'로 설정하면 알림이 더 오래 지속됨
    };
    
    // macOS에서 추가 옵션: hasReply를 사용하면 알림이 더 오래 지속될 수 있음
    if (process.platform === 'darwin' && urgency === 'critical') {
      notificationOptions.hasReply = false; // 답장 기능은 사용하지 않지만, critical urgency로 지속 시간 증가
    }
    
    console.log('🔔 Notification 옵션:', notificationOptions);
    
    const notification = new Notification(notificationOptions);

    notification.on('click', () => {
      console.log('🔔 알림 클릭됨:', title);
      // 알림 클릭 시 닫기
      notification.close();
      console.log('✅ 알림 닫힘 (사용자 클릭)');
      
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
      notificationsType: Array.isArray(response.data?.notifications) ? 'array' : typeof response.data?.notifications,
      hasUser: !!response.data?.user,
      isSuperAdmin: response.data?.user?.is_super_admin
    });
    
    // 응답 데이터 상세 로그
    if (response.data) {
      console.log('📦 API 응답 데이터 구조:', {
        success: response.data.success,
        notificationsLength: response.data.notifications?.length || 0,
        lastChecked: response.data.last_checked,
        user: response.data.user ? {
          id: response.data.user.id,
          email: response.data.user.email,
          is_super_admin: response.data.user.is_super_admin
        } : '없음',
        notifications: response.data.notifications ? response.data.notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message?.substring(0, 50) + '...'
        })) : '없음'
      });
      
      // ⚠️ 중요: API 응답에 회의 알림이 있는지 확인
      if (response.data.notifications && Array.isArray(response.data.notifications)) {
        const meetingCount = response.data.notifications.filter(n => n.type === 'meeting').length;
        const allTypes = [...new Set(response.data.notifications.map(n => n.type))];
        console.log(`🔍 API 응답 알림 타입 분석:`, {
          총알림개수: response.data.notifications.length,
          회의알림개수: meetingCount,
          모든알림타입: allTypes,
          회의알림있음: meetingCount > 0 ? '예' : '아니오'
        });
        
        if (meetingCount === 0) {
          console.warn(`⚠️ API 응답에 회의 알림이 없습니다!`);
          console.warn(`⚠️ 이는 API 서버 측 문제일 수 있습니다.`);
          console.warn(`⚠️ API 서버에서 회의 알림을 반환하지 않고 있습니다.`);
        }
      }
    }

    if (response.data && response.data.success && response.data.notifications) {
      let notifications = response.data.notifications;
      console.log(`📬 받은 알림 개수 (필터링 전): ${notifications.length}개`);
      
      // API 응답 전체 확인 (디버깅)
      console.log(`🔍 API 응답 전체:`, JSON.stringify(response.data, null, 2));
      
      // 알림 객체 구조 디버깅 (첫 번째 알림만)
      if (notifications.length > 0) {
        console.log('🔍 알림 객체 구조 샘플:', JSON.stringify(notifications[0], null, 2));
      }
      
      // 회의 알림만 필터링해서 확인
      const meetingOnly = notifications.filter(n => n.type === 'meeting');
      console.log(`🔍 회의 알림만 (API 응답에서):`, meetingOnly.length > 0 ? meetingOnly : '없음');
      
      // API에서 받은 사용자 정보 확인
      const isSuperAdminFromAPI = response.data.user?.is_super_admin === true;
      const userEmail = config.email?.trim().toLowerCase() || '';
      
      // 마스터 어드민 이메일 체크 (백업 방법)
      const isMasterAdminByEmail = userEmail === 'masteradmin@nms.com' || 
                                    userEmail.includes('masteradmin@nms.com') ||
                                    (userEmail.includes('masteradmin') && userEmail.includes('@nms.com'));
      
      // 마스터 어드민 여부 (API 응답 또는 이메일 체크)
      const isMasterAdmin = isSuperAdminFromAPI || isMasterAdminByEmail;
      
      console.log(`🔍 ===== 사용자 정보 확인 =====`);
      console.log(`📧 사용자 이메일: ${userEmail || '(없음)'}`);
      console.log(`👑 API 응답 - 마스터 관리자: ${isSuperAdminFromAPI ? '예' : '아니오'}`);
      console.log(`👑 이메일 기반 - 마스터 관리자: ${isMasterAdminByEmail ? '예' : '아니오'}`);
      console.log(`👑 최종 - 마스터 관리자: ${isMasterAdmin ? '예' : '아니오'}`);
      console.log(`📬 받은 알림 개수: ${notifications.length}개`);
      
      // ⚠️ 클라이언트 측 필터링
      // API에서 이미 사용자별로 필터링된 알림을 받으므로,
      // 클라이언트에서 추가 필터링할 필요 없음
      // (상담, 업무협조, 교육원, 회의 등 모든 알림은 API에서 이미 필터링됨)
      
      // 알림 타입별 개수 확인 (디버깅)
      const typeCountBefore = {};
      notifications.forEach(notif => {
        typeCountBefore[notif.type] = (typeCountBefore[notif.type] || 0) + 1;
      });
      console.log(`📋 알림 타입별 개수 (필터링 전):`, typeCountBefore);
      
      // 회의 알림 상세 확인 (디버깅)
      const meetingNotifications = notifications.filter(n => n.type === 'meeting');
      if (meetingNotifications.length > 0) {
        console.log(`🔍 회의 알림 상세 (${meetingNotifications.length}개):`);
        meetingNotifications.forEach((notif, index) => {
          console.log(`  ${index + 1}. 회의 알림:`, {
            id: notif.id,
            title: notif.title,
            message: notif.message,
            data: notif.data ? JSON.stringify(notif.data).substring(0, 200) : '(없음)',
            timestamp: notif.timestamp
          });
        });
      } else {
        console.log(`⚠️ 회의 알림이 없습니다.`);
      }
      
      // customer_edit 타입만 일반 사용자에게서 제외 (선택적)
      // 마스터 어드민은 모든 알림 표시 (필터링 없음)
      if (isMasterAdmin) {
        console.log(`👑 마스터 관리자: 모든 알림 표시 (필터링 없음)`);
        console.log(`📬 마스터 관리자 알림 개수: ${notifications.length}개`);
        console.log(`📋 마스터 관리자 알림 타입:`, typeCountBefore);
        
        // customer_edit 알림도 포함되어 있는지 확인
        const customerEditCount = notifications.filter(n => n.type === 'customer_edit').length;
        if (customerEditCount > 0) {
          console.log(`✅ 마스터 관리자: 데이터 수정 요청(customer_edit) 알림 ${customerEditCount}개 포함`);
        } else {
          console.log(`ℹ️ 마스터 관리자: 데이터 수정 요청(customer_edit) 알림 없음 (API에서 반환하지 않음)`);
        }
        
        // 마스터 관리자는 모든 알림 표시 (API에서 이미 모든 알림을 반환)
      } else if (userEmail) {
        const beforeCount = notifications.length;
        notifications = notifications.filter(notif => {
          // ⚠️ 중요: 회의 알림(meeting)은 API에서 이미 필터링됨
          // API가 해당 사용자의 user_id나 attendees를 기준으로 필터링하므로
          // 클라이언트에서 추가 필터링할 필요 없음
          if (notif.type === 'meeting') {
            console.log(`✅ 회의 알림은 API에서 이미 필터링됨:`, {
              id: notif.id,
              title: notif.title
            });
            return true; // 회의 알림은 항상 표시
          }
          
          // ⚠️ 중요: 상담 알림(sales_consultation)도 API에서 이미 필터링됨
          if (notif.type === 'sales_consultation') {
            console.log(`✅ 상담 알림은 API에서 이미 필터링됨:`, {
              id: notif.id,
              title: notif.title
            });
            return true; // 상담 알림도 항상 표시
          }
          
          // ⚠️ 중요: 교육원 요청(institution_request)도 API에서 이미 필터링됨
          if (notif.type === 'institution_request') {
            console.log(`✅ 교육원 요청 알림은 API에서 이미 필터링됨:`, {
              id: notif.id,
              title: notif.title
            });
            return true; // 교육원 요청 알림도 항상 표시
          }
          
          // customer_edit는 관리자용이므로 일반 사용자에게서 제외
          if (notif.type === 'customer_edit') {
            console.log(`⏭️ customer_edit 알림 제외 (관리자용):`, notif.id);
            return false;
          }
          
          // 기타 알림 타입은 API에서 이미 필터링되었으므로 표시
          // (업무협조 등은 API에서 recipient_id로 필터링)
          console.log(`✅ 알림 표시 (API에서 이미 필터링됨):`, {
            id: notif.id,
            type: notif.type,
            title: notif.title
          });
          return true;
        });
        console.log(`📬 customer_edit 제외 후: ${beforeCount}개 → ${notifications.length}개`);
        
        // 필터링 후 알림 타입별 개수 확인
        const typeCountAfter = {};
        notifications.forEach(notif => {
          typeCountAfter[notif.type] = (typeCountAfter[notif.type] || 0) + 1;
        });
        console.log(`📋 알림 타입별 개수 (필터링 후):`, typeCountAfter);
      } else if (!userEmail) {
        console.warn('⚠️ 이메일이 설정되지 않아 customer_edit 알림만 표시합니다.');
        // 이메일이 없으면 customer_edit만 표시 (관리자용)
        notifications = notifications.filter(notif => notif.type === 'customer_edit');
        console.log(`📬 customer_edit 알림만 표시: ${notifications.length}개`);
      }
      
      // 각 알림 상세 정보 로그
      console.log(`📋 ===== 알림 타입별 개수 =====`);
      const typeCount = {};
      notifications.forEach(notif => {
        typeCount[notif.type] = (typeCount[notif.type] || 0) + 1;
      });
      console.log('알림 타입별 개수:', typeCount);
      console.log(`📋 ===== 알림 타입별 개수 끝 =====`);
      
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
    
    // 여러 알림을 하나로 합치거나 순차적으로 표시
    if (notifications.length === 1) {
      // 알림이 1개면 그대로 표시
      const notification = notifications[0];
      console.log(`\n🔔 알림 1/1 처리 중:`, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        isDuplicate: processedNotificationIds.has(notification.id)
      });
      
      const shouldRepeat = config.repeatNotifications !== false;
      if (!shouldRepeat) {
        if (processedNotificationIds.has(notification.id)) {
          console.log('⏭️ 중복 알림 건너뛰기:', notification.id);
          return;
        }
        processedNotificationIds.add(notification.id);
      }
      
      try {
        showNotification(notification.title, notification.message, {
          priority: notification.priority || 'normal',
          data: notification.data,
          icon: notification.icon
        });
        console.log('✅ 알림 표시 완료:', notification.title);
      } catch (error) {
        console.error('❌ 알림 표시 오류:', error);
      }
    } else {
      // 알림이 여러 개면 하나로 합쳐서 표시
      const notificationTypes = {};
      notifications.forEach(notif => {
        const type = notif.type;
        if (!notificationTypes[type]) {
          notificationTypes[type] = [];
        }
        notificationTypes[type].push(notif);
      });
      
      // 타입별로 그룹화된 알림 메시지 생성
      const typeMessages = [];
      Object.keys(notificationTypes).forEach(type => {
        const count = notificationTypes[type].length;
        const typeNames = {
          'meeting': '회의',
          'sales_consultation': '상담',
          'work_cooperation': '업무협조',
          'institution_request': '교육원 요청',
          'customer_edit': '고객 수정'
        };
        const typeName = typeNames[type] || type;
        typeMessages.push(`${typeName} ${count}개`);
      });
      
      const summaryTitle = `${notifications.length}개의 새 알림`;
      const summaryBody = typeMessages.join(', ');
      
      console.log(`📋 알림 요약: ${summaryTitle} - ${summaryBody}`);
      
      // 요약 알림 표시
      try {
        showNotification(summaryTitle, summaryBody, {
          priority: 'high', // 중요도 높게 설정하여 더 오래 표시
          data: { notifications: notifications }
        });
        console.log('✅ 요약 알림 표시 완료');
      } catch (error) {
        console.error('❌ 요약 알림 표시 오류:', error);
      }
      
      // 각 알림도 개별적으로 표시 (딜레이를 두고 순차적으로)
      // 요약 알림 후 3초 대기 후 첫 번째 알림 표시, 이후 각 알림 사이에 4초 간격
      notifications.forEach((notification, index) => {
        setTimeout(() => {
          console.log(`\n🔔 알림 ${index + 1}/${notifications.length} 처리 중:`, {
            id: notification.id,
            type: notification.type,
            title: notification.title
          });
          
          const shouldRepeat = config.repeatNotifications !== false;
          if (!shouldRepeat) {
            if (processedNotificationIds.has(notification.id)) {
              console.log('⏭️ 중복 알림 건너뛰기:', notification.id);
              return;
            }
            processedNotificationIds.add(notification.id);
          }
          
          try {
            showNotification(notification.title, notification.message, {
              priority: notification.priority || 'normal',
              data: notification.data,
              icon: notification.icon
            });
            console.log('✅ 알림 표시 완료:', notification.title);
          } catch (error) {
            console.error('❌ 알림 표시 오류:', error);
          }
        }, 3000 + (index * 4000)); // 요약 알림 후 3초 대기, 이후 각 알림 사이에 4초 간격
      });
    }
    
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

