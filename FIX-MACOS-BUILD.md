# 🔧 macOS 빌드 오류 수정 가이드

## 문제

GitHub Actions에서 macOS 빌드가 실패하는 경우, 일반적으로 코드 서명 문제입니다.

## 해결 방법

### 1. package.json 수정 (완료됨 ✅)

`package.json`의 `mac` 섹션에 다음을 추가했습니다:

```json
"mac": {
  "identity": null,
  "gatekeeperAssess": false,
  "hardenedRuntime": false,
  // ... 나머지 설정
}
```

### 2. GitHub 웹에서 워크플로우 파일 수정

1. https://github.com/bp4sp4/AlertEduvisors/blob/main/.github/workflows/build.yml 접속
2. 연필 아이콘(✏️) 클릭하여 편집
3. **38-41번 줄** 수정:

**수정 전:**
```yaml
      - name: Build app
        run: ${{ matrix.build-command }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**수정 후:**
```yaml
      - name: Build app
        run: ${{ matrix.build-command }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_IDENTITY_AUTO_DISCOVERY: false
```

4. "Commit changes..." 클릭

### 3. 새 태그로 빌드 재시작

워크플로우 파일 수정 후:

```bash
git tag v1.0.4
git push origin v1.0.4
```

또는 GitHub 웹에서:
- **Releases** → **Draft a new release**
- 태그: `v1.0.4` 생성
- 이렇게 하면 자동으로 빌드가 시작됩니다

## 추가 문제 해결

### 아이콘 파일 문제

만약 아이콘 파일이 없어서 빌드가 실패하는 경우:

1. `assets/icon.icns` 파일이 있는지 확인
2. 없으면 `assets/icon.png`를 사용하도록 수정:

```json
"mac": {
  "icon": "assets/icon.png"  // .icns 대신 .png 사용
}
```

### 아키텍처 문제

x64와 arm64를 모두 빌드하는데 문제가 있는 경우, 단일 아키텍처로 빌드:

```json
"mac": {
  "target": [
    {
      "target": "dmg",
      "arch": ["x64"]  // 또는 ["arm64"]
    }
  ]
}
```

## 확인

빌드가 성공하면:
1. GitHub Actions에서 초록색 체크 표시 확인
2. Artifacts 섹션에서 빌드 파일 다운로드 가능

