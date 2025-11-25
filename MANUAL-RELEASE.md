# 📦 수동 릴리스 생성 가이드

## 🔧 문제 해결

GitHub Actions에서 자동 릴리스 생성 시 권한 오류가 발생할 수 있습니다. 
이 경우 수동으로 릴리스를 생성할 수 있습니다.

## 📥 빌드 파일 다운로드

1. **GitHub Actions** 페이지 접속:
   https://github.com/bp4sp4/AlertEduvisors/actions

2. **최신 빌드** 클릭 (초록색 체크 표시)

3. **Artifacts** 섹션에서 다운로드:
   - `dist-macos-latest` - macOS 빌드 파일
   - `dist-windows-latest` - Windows 빌드 파일

4. 압축 파일 다운로드 및 압축 해제

## 🚀 수동 릴리스 생성

### 방법 1: GitHub 웹 인터페이스 (권장)

1. **Releases** 페이지 접속:
   https://github.com/bp4sp4/AlertEduvisors/releases

2. **"Draft a new release"** 또는 **"Create a new release"** 클릭

3. **태그 선택**:
   - 태그: `v1.0.3` (또는 원하는 버전)
   - "Create new tag: v1.0.3 on publish" 선택

4. **릴리스 제목**: `v1.0.3` 또는 `Alert Electron v1.0.3`

5. **릴리스 설명** (선택사항):
   ```
   ## 변경사항
   - Vercel 프로덕션 URL로 기본 API URL 업데이트
   - Windows 아이콘 크기 문제 수정
   - GitHub Actions v4로 업데이트
   ```

6. **파일 업로드**:
   - 다운로드한 빌드 파일들을 드래그 앤 드롭:
     - macOS: `.dmg` 또는 `.zip` 파일
     - Windows: `.exe` 파일

7. **"Publish release"** 클릭

### 방법 2: GitHub CLI 사용

```bash
# GitHub CLI 설치 (없는 경우)
brew install gh  # macOS
# 또는 https://cli.github.com/

# 로그인
gh auth login

# 릴리스 생성
gh release create v1.0.3 \
  --title "v1.0.3" \
  --notes "Vercel 프로덕션 URL 업데이트" \
  dist/Alert\ Electron-1.0.0.dmg \
  dist/Alert\ Electron\ Setup\ 1.0.0.exe
```

## 📋 체크리스트

릴리스 생성 전 확인:

- [ ] 빌드가 성공적으로 완료되었는지 확인
- [ ] Artifacts에서 빌드 파일 다운로드
- [ ] 빌드 파일이 올바른 플랫폼용인지 확인
- [ ] 릴리스 제목과 설명 작성
- [ ] 파일 업로드 완료

## 🔄 자동화 개선 (선택사항)

나중에 자동 릴리스를 사용하려면:

1. **GitHub 저장소 설정**:
   - Settings → Actions → General
   - "Workflow permissions" → "Read and write permissions" 선택

2. 또는 **Personal Access Token** 사용:
   - Settings → Developer settings → Personal access tokens
   - `repo` 권한으로 토큰 생성
   - GitHub Actions Secrets에 추가

## 📞 문제 해결

### 빌드 파일을 찾을 수 없는 경우

1. GitHub Actions에서 빌드가 완료되었는지 확인
2. Artifacts 섹션이 보이지 않으면 빌드가 실패했을 수 있음
3. 빌드 로그 확인

### 권한 오류가 계속 발생하는 경우

- 저장소가 Private인 경우: Settings → Actions → General에서 권한 확인
- 저장소가 Public인 경우: 기본 권한으로도 작동해야 함

