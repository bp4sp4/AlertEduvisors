# 배포 가이드 - 간단 버전

## 🎯 빠른 배포 (GitHub 없이)

### 1단계: 빌드

```bash
# 현재 macOS에서 실행하면 macOS용 파일 생성
npm run build
```

### 2단계: 배포 파일 확인

```bash
# dist/ 폴더 확인
ls -lh dist/
```

**생성된 파일:**
- `Alert Electron-1.0.0.dmg` - macOS 설치 파일
- `Alert Electron-1.0.0-mac.zip` - macOS 압축 파일

### 3단계: 사용자에게 배포

1. `dist/` 폴더의 `.dmg` 파일을 사용자에게 전달
2. 사용자가 더블클릭하여 설치
3. 완료!

## 🪟 Windows 빌드 방법

### 옵션 1: Windows PC에서 직접 빌드 (권장)

1. Windows PC에서 프로젝트 클론
2. `npm install` 실행
3. `npm run build` 실행
4. `dist/` 폴더의 `.exe` 파일 배포

### 옵션 2: GitHub Actions 사용 (자동 빌드)

1. GitHub에 저장소 생성
2. 코드 푸시
3. 태그 생성: `git tag v1.0.0 && git push origin v1.0.0`
4. GitHub Actions가 자동으로 Windows 빌드 생성
5. `dist/` 폴더에서 다운로드

## 📝 배포 체크리스트

- [ ] `package.json`의 `version` 확인
- [ ] 아이콘 파일 준비 (선택사항)
- [ ] `npm run build` 실행
- [ ] `dist/` 폴더의 파일 테스트
- [ ] 사용자에게 배포

## 💡 팁

- **로컬 빌드**: 빠르고 간단, GitHub 불필요
- **GitHub Actions**: 자동화, 모든 플랫폼 한 번에 빌드
- **포터블 버전**: 설치 없이 바로 실행 가능 (Windows)

