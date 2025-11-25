# 🔧 Windows 아이콘 수정 가이드

## 문제
Windows 빌드 시 `icon.ico` 파일이 32x32로 너무 작아서 오류가 발생합니다.
최소 256x256 크기가 필요합니다.

## 해결 방법

### 방법 1: 온라인 변환기 사용 (권장)

1. **256x256 PNG 파일 준비**
   - `assets/icon-256.png` 파일이 이미 생성되어 있습니다.
   - 또는 `assets/logo.png`를 사용할 수 있습니다.

2. **온라인 변환기로 .ico 생성**
   - https://cloudconvert.com/png-to-ico 접속
   - `assets/icon-256.png` 파일 업로드
   - **256x256 크기 선택** (중요!)
   - 변환 후 다운로드

3. **파일 교체**
   - 다운로드한 `.ico` 파일을 `assets/icon.ico`로 저장 (기존 파일 덮어쓰기)

### 방법 2: ImageMagick 사용 (터미널)

```bash
# ImageMagick 설치 (Homebrew)
brew install imagemagick

# .ico 파일 생성
convert assets/icon-256.png -define icon:auto-resize=256 assets/icon.ico
```

### 방법 3: Python 스크립트 사용

```bash
pip install Pillow
python3 << EOF
from PIL import Image
img = Image.open('assets/icon-256.png')
img.save('assets/icon.ico', format='ICO', sizes=[(256,256)])
EOF
```

## ✅ 확인

변환 후 파일 크기 확인:
```bash
file assets/icon.ico
# 결과에 "256x256"이 포함되어야 합니다
```

## 🚀 다음 단계

1. `.ico` 파일 교체 완료
2. 변경사항 커밋 및 푸시:
   ```bash
   git add assets/icon.ico
   git commit -m "Fix: Update Windows icon to 256x256"
   git push
   ```
3. 새 태그로 다시 빌드:
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```

