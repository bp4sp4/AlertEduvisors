# GitHub 배포 가이드

## 🚀 GitHub에 올리고 자동 빌드하기

### 1단계: GitHub 저장소 생성

1. GitHub에 로그인
2. 새 저장소 생성 (예: `AlertElectron`)
3. 저장소 URL 복사

### 2단계: 로컬에서 Git 초기화 및 푸시

```bash
# Git 초기화 (아직 안 했다면)
git init

# 원격 저장소 추가
git remote add origin https://github.com/사용자명/AlertElectron.git

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Alert Electron app"

# 푸시
git branch -M main
git push -u origin main
```

### 3단계: 버전 태그 생성 및 푸시

```bash
# 버전 태그 생성
git tag v1.0.0

# 태그 푸시
git push origin v1.0.0
```

### 4단계: 자동 빌드 확인

1. GitHub 저장소 페이지로 이동
2. **Actions** 탭 클릭
3. 빌드 진행 상황 확인
4. 빌드 완료 후 **Releases** 탭에서 다운로드

## 📦 빌드 결과물

빌드가 완료되면 GitHub Releases에 다음 파일들이 자동으로 업로드됩니다:

**macOS:**
- `Alert Electron-1.0.0.dmg` - 설치 파일
- `Alert Electron-1.0.0-mac.zip` - 압축 파일

**Windows:**
- `Alert Electron Setup 1.0.0.exe` - 설치 파일
- `Alert Electron-1.0.0-portable.exe` - 포터블 버전

## 🔄 새 버전 배포

```bash
# 1. package.json의 version 업데이트
# 예: "version": "1.0.1"

# 2. 변경사항 커밋
git add .
git commit -m "Update to v1.0.1"

# 3. 푸시
git push

# 4. 새 태그 생성 및 푸시
git tag v1.0.1
git push origin v1.0.1
```

## 📝 배포 체크리스트

- [ ] GitHub 저장소 생성
- [ ] 코드 푸시
- [ ] `package.json`의 `version` 확인
- [ ] 아이콘 파일 준비 (`assets/icon.icns`, `assets/icon.ico`)
- [ ] 태그 생성 및 푸시
- [ ] GitHub Actions 빌드 확인
- [ ] Releases에서 다운로드 테스트

## 💡 팁

1. **태그 형식**: `v1.0.0`, `v1.0.1` 형식으로 태그 생성
2. **자동 빌드**: 태그를 푸시하면 자동으로 빌드 시작
3. **빌드 시간**: 약 5-10분 소요
4. **다운로드**: Releases 페이지에서 사용자가 직접 다운로드 가능

## 🐛 문제 해결

### 빌드 실패 시

1. GitHub Actions 로그 확인
2. `package.json`의 `build` 설정 확인
3. 아이콘 파일 경로 확인

### Windows 빌드가 안 될 때

- GitHub Actions는 자동으로 Windows 빌드를 생성합니다
- 로컬에서 Windows 빌드가 필요하면 Windows PC에서 실행

