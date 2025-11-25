# GitHub Actions 워크플로우 설정

## ⚠️ 중요: 워크플로우 파일 수동 추가 필요

GitHub Personal Access Token에 `workflow` 권한이 없어서 워크플로우 파일을 자동으로 푸시할 수 없습니다.

## 📝 수동 추가 방법

### 방법 1: GitHub 웹 인터페이스에서 추가 (권장)

1. https://github.com/bp4sp4/AlertEduvisors 접속
2. **Add file** → **Create new file** 클릭
3. 파일 경로 입력: `.github/workflows/build.yml`
4. 아래 내용을 복사하여 붙여넣기:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: '버전 번호 (예: 1.0.0)'
        required: false

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
        include:
          - os: macos-latest
            build-command: npm run build:mac
          - os: windows-latest
            build-command: npm run build:win
    runs-on: ${{ matrix.os }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build app
        run: ${{ matrix.build-command }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: dist/
          retention-days: 30
      
      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          files: dist/**
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

5. **Commit new file** 클릭

### 방법 2: Personal Access Token 권한 업데이트

1. GitHub → Settings → Developer settings → Personal access tokens
2. 토큰에 `workflow` 권한 추가
3. 다시 푸시 시도

## ✅ 완료 후

워크플로우 파일을 추가한 후:

```bash
# 버전 태그 생성 및 푸시
git tag v1.0.0
git push origin v1.0.0
```

이제 GitHub Actions가 자동으로 Windows와 macOS용 빌드를 생성합니다!

