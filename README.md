# Alert Electron

Electron 기반 NMS 시스템 알림 앱

## 📋 개요

이 앱은 Next.js 기반 NMS 시스템의 알림을 데스크톱에서 받아볼 수 있게 해주는 Electron 앱입니다.

**주요 기능:**

- ✅ 업무협조 요청 알림
- ✅ 상담게시판 요청 알림
- ✅ 교육원 요청 알림
- ✅ 회의 알림
- ✅ 고객 수정 내역 알림 (관리자)
- ✅ 백그라운드 실행 (트레이 아이콘)
- ✅ 주기적 폴링 (기본 30초)
- ✅ 중복 알림 방지
- ✅ 사용자별 알림 필터링

## 설치

```bash
npm install
```

## 실행

```bash
npm start
```

앱이 백그라운드에서 실행되며 트레이에 아이콘이 표시됩니다.

## 설정

1. 트레이 아이콘 클릭 → 설정 열기
2. 다음 항목을 설정:
   - **API URL**: Next.js 알림 API 엔드포인트 (예: `http://localhost:3000/api/notifications`)
   - **사용자 ID**: 사용자 ID (선택사항, 업무협조/상담/교육원/회의 알림용)
   - **폴링 간격**: 알림 확인 주기 (기본: 30초, 10-300초)
   - **알림 타입**: 받을 알림 타입 선택
   - **알림 활성화**: 알림 수신 활성화/비활성화
3. "설정 저장" 클릭

## 환경 변수 (선택사항)

`.env` 파일을 생성하여 기본 설정을 지정할 수 있습니다:

```env
# Next.js 서버 URL (선택사항)
# WEB_URL을 설정하면 API_URL이 자동으로 ${WEB_URL}/api/notifications로 설정됩니다
WEB_URL=http://localhost:3000

# 또는 직접 API URL 설정
# API_URL=http://localhost:3000/api/notifications

# 사용자 이메일 (권장)
EMAIL=user@example.com

# 또는 사용자 ID (UUID)
# USER_ID=32306f36-9e1d-4436-8b6c-745fdf6d1655

# Electron 내부 서버 포트 (선택사항, 기본값: 3001)
PORT=3001
```

## 사용 방법

1. **앱 실행**: `npm start`로 앱을 실행합니다
2. **트레이 아이콘**: 앱은 백그라운드에서 실행되며 트레이에 아이콘이 표시됩니다
3. **설정**: 트레이 아이콘을 클릭하여 설정 창을 엽니다

## 배포 (빌드)

### 빌드 준비

1. **아이콘 파일 준비** (선택사항):
   - macOS: `assets/icon.icns` (512x512 권장)
   - Windows: `assets/icon.ico` (256x256 권장)
   - Linux: `assets/icon.png` (512x512 권장)
   - 아이콘이 없어도 빌드는 가능하지만 기본 아이콘이 사용됩니다

### 빌드 명령어

```bash
# 모든 플랫폼 빌드 (현재 OS에서 가능한 것만)
npm run build

# macOS만 빌드
npm run build:mac

# Windows만 빌드 (macOS/Linux에서도 가능, Wine 필요)
npm run build:win

# macOS와 Windows 모두 빌드
npm run build:all
```

### 빌드 결과물

빌드가 완료되면 `dist/` 폴더에 다음 파일들이 생성됩니다:

**macOS:**
- `Alert Electron-1.0.0.dmg` - 설치 파일
- `Alert Electron-1.0.0-mac.zip` - 압축 파일 (직접 실행 가능)

**Windows:**
- `Alert Electron Setup 1.0.0.exe` - 설치 파일 (NSIS)
- `Alert Electron-1.0.0-portable.exe` - 포터블 버전 (설치 불필요)

**Linux:**
- `Alert Electron-1.0.0.AppImage` - AppImage 파일
- `alert-electron_1.0.0_amd64.deb` - Debian 패키지

### 배포 방법

1. **직접 배포**: `dist/` 폴더의 파일을 사용자에게 제공
2. **GitHub Releases**: GitHub에 릴리즈를 만들어 파일 업로드
3. **자동 업데이트**: `electron-updater`를 추가하여 자동 업데이트 기능 구현 가능

### 크로스 플랫폼 빌드

**macOS에서 Windows 빌드:**
- Wine 설치 필요 (선택사항)
- 또는 GitHub Actions 사용 권장

**Windows에서 macOS 빌드:**
- 불가능 (macOS 빌드는 macOS에서만 가능)
- GitHub Actions 사용 권장

### GitHub Actions로 자동 빌드 (권장)

`.github/workflows/build.yml` 파일을 생성하여 자동 빌드 설정 가능:

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: dist/
```
4. **알림 수신**: 설정한 간격마다 자동으로 알림을 확인하고 표시합니다

## Next.js 연동

자세한 연동 방법은 다음 문서를 참고하세요:

- [NMS 연동 가이드](./NMS-INTEGRATION-GUIDE.md) - 상세한 API 연동 방법
- [Next.js 연동 가이드](./nextjs-integration.md) - 일반적인 Next.js 연동 방법

## 알림 타입

- **customer_edit**: 고객 수정 내역 (관리자)
- **work_cooperation**: 업무협조 요청
- **sales_consultation**: 상담 요청
- **institution_request**: 교육원 요청
- **meeting**: 회의 알림

## 문제 해결

### 알림이 표시되지 않음

1. 시스템 알림 권한 확인 (macOS: 시스템 설정 > 알림)
2. 설정 창에서 "알림 활성화" 확인
3. "테스트 알림" 버튼으로 기능 테스트
4. Next.js 서버가 실행 중인지 확인

### API 연결 실패

1. Next.js 서버가 실행 중인지 확인
2. API URL이 올바른지 확인
3. 설정 창에서 "API 연결 테스트" 버튼 사용
4. CORS 설정 확인 (개발 환경)

## 빌드

```bash
npm run build
```

## 개발 모드

```bash
npm run dev
```

개발 모드에서는 개발자 도구가 자동으로 열립니다.

## 라이선스

MIT
