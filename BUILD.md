# 빌드 및 배포 가이드

## 🚀 빠른 시작 (로컬 빌드)

**GitHub에 올리지 않고도 바로 빌드할 수 있습니다!**

```bash
# 1. 의존성 설치 (처음 한 번만)
npm install

# 2. 현재 OS에 맞는 빌드 (macOS에서 실행하면 macOS용 파일 생성)
npm run build

# 빌드 완료 후 dist/ 폴더 확인
ls dist/
```

**결과물:**
- macOS에서 빌드: `Alert Electron-1.0.0.dmg` 파일 생성
- Windows에서 빌드: `Alert Electron Setup 1.0.0.exe` 파일 생성

## 📦 배포 파일 생성

### 로컬 빌드 (GitHub 불필요)

```bash
# 현재 OS에 맞는 빌드
npm run build

# macOS 빌드
npm run build:mac

# Windows 빌드 (macOS에서도 가능하지만 권장하지 않음)
npm run build:win

# 모든 플랫폼 빌드
npm run build:all
```

## 🎯 빌드 결과물

빌드가 완료되면 `dist/` 폴더에 다음 파일들이 생성됩니다:

### macOS
- **`Alert Electron-1.0.0.dmg`** - 설치 파일 (더블클릭하여 설치)
- **`Alert Electron-1.0.0-mac.zip`** - 압축 파일 (압축 해제 후 바로 실행)

### Windows
- **`Alert Electron Setup 1.0.0.exe`** - 설치 파일 (더블클릭하여 설치)
- **`Alert Electron-1.0.0-portable.exe`** - 포터블 버전 (설치 없이 바로 실행)

### Linux
- **`Alert Electron-1.0.0.AppImage`** - AppImage 파일 (실행 권한 부여 후 실행)
- **`alert-electron_1.0.0_amd64.deb`** - Debian/Ubuntu 패키지

## 🖼️ 아이콘 준비 (선택사항)

아이콘 파일을 준비하면 더 전문적인 앱이 됩니다:

1. **macOS**: `assets/icon.icns` (512x512 권장)
2. **Windows**: `assets/icon.ico` (256x256 권장)
3. **Linux**: `assets/icon.png` (512x512 권장)

아이콘 변환 도구:
- 온라인: https://cloudconvert.com/
- macOS: `iconutil` 명령어
- Windows: 온라인 변환기 사용

## 🚀 배포 방법

### 방법 1: 직접 배포
1. `dist/` 폴더의 파일을 사용자에게 제공
2. 사용자가 다운로드하여 설치/실행

### 방법 2: GitHub Releases
1. GitHub 저장소에 태그 생성: `git tag v1.0.0`
2. GitHub Releases 페이지에서 릴리즈 생성
3. `dist/` 폴더의 파일들을 업로드

### 방법 3: 자동 빌드 (GitHub Actions)

`.github/workflows/build.yml` 파일 생성:

```yaml
name: Build and Release

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
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: dist/
```

## 📝 빌드 설정 커스터마이징

`package.json`의 `build` 섹션을 수정하여 빌드 설정을 변경할 수 있습니다:

- **앱 이름**: `productName` 변경
- **아이콘**: `icon` 경로 변경
- **출력 폴더**: `directories.output` 변경
- **포함할 파일**: `files` 배열 수정

## ⚠️ 주의사항

1. **코드 서명** (선택사항):
   - macOS: Apple Developer 계정 필요
   - Windows: 코드 서명 인증서 필요
   - 서명 없이도 배포 가능하지만 보안 경고가 표시될 수 있음

2. **크로스 플랫폼 빌드**:
   - macOS에서 Windows 빌드: Wine 필요 (권장하지 않음)
   - Windows에서 macOS 빌드: 불가능
   - **권장**: GitHub Actions 사용

3. **파일 크기**:
   - 빌드된 파일은 약 100-200MB 정도
   - Electron 런타임이 포함되어 있음

## 🔄 버전 업데이트

새 버전을 배포하려면:

1. `package.json`의 `version` 업데이트
2. `npm run build` 실행
3. `dist/` 폴더의 새 파일 배포

