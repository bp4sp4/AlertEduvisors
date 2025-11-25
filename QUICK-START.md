# 🚀 빠른 시작 가이드

## GitHub에 올리고 배포하기 (5분 안에)

### 1️⃣ GitHub 저장소 생성

1. https://github.com/new 접속
2. 저장소 이름 입력 (예: `AlertElectron`)
3. **Create repository** 클릭

### 2️⃣ 코드 푸시

```bash
# 터미널에서 실행
cd /Users/korhrd/Documents/GitHub/AlertEletron

# Git 초기화 (처음 한 번만)
git init

# 원격 저장소 추가 (YOUR_USERNAME을 실제 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/AlertElectron.git

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Alert Electron notification app"

# 푸시
git branch -M main
git push -u origin main
```

### 3️⃣ 버전 태그 생성

```bash
# 버전 태그 생성
git tag v1.0.0

# 태그 푸시 (이게 중요! 태그를 푸시해야 자동 빌드가 시작됩니다)
git push origin v1.0.0
```

### 4️⃣ 빌드 확인

1. GitHub 저장소 페이지로 이동
2. 상단 메뉴에서 **Actions** 탭 클릭
3. 빌드 진행 상황 확인 (약 5-10분 소요)
4. 빌드 완료 후 **Releases** 탭 클릭
5. 다운로드 파일 확인

## 📥 사용자가 다운로드하는 방법

1. GitHub 저장소의 **Releases** 페이지 접속
2. 최신 버전 선택
3. 다운로드:
   - macOS: `.dmg` 파일 다운로드
   - Windows: `.exe` 파일 다운로드

## 🔄 새 버전 배포

```bash
# 1. package.json의 version 업데이트
# 예: "version": "1.0.1"

# 2. 변경사항 커밋 및 푸시
git add .
git commit -m "Update to v1.0.1"
git push

# 3. 새 태그 생성 및 푸시
git tag v1.0.1
git push origin v1.0.1
```

## ✅ 완료!

이제 GitHub Actions가 자동으로 Windows와 macOS용 빌드를 생성합니다!

