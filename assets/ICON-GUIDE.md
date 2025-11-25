# 아이콘 파일 가이드

## 📁 파일 위치

모든 아이콘 파일은 **`assets/`** 폴더에 넣으세요.

## 📋 필요한 아이콘 파일

### 1. 앱 아이콘 (필수)

**빌드용:**
- `icon.icns` - macOS용 (512x512 권장)
- `icon.ico` - Windows용 (256x256 권장)
- `icon.png` - Linux용 (512x512 권장)

**실행용:**
- `icon.png` - 앱 창 아이콘 (256x256 또는 512x512)

### 2. 트레이 아이콘 (선택사항)

- `tray-icon.png` - 시스템 트레이 아이콘 (16x16 또는 32x32)
- macOS는 투명 배경 PNG 권장

### 3. 알림 아이콘 (선택사항)

- `notification-icon.png` - 알림 아이콘 (64x64)

## 🎨 아이콘 변환 방법

### 원본 이미지 준비

1. 원본 이미지를 `assets/` 폴더에 넣기
   - 예: `assets/logo.png` 또는 `assets/logo.jpg`

### macOS용 .icns 변환

**방법 1: macOS 명령어 (권장)**
```bash
# 1. iconset 폴더 생성
mkdir assets/icon.iconset

# 2. 다양한 크기로 이미지 생성 (512x512 PNG 필요)
sips -z 16 16     logo.png --out assets/icon.iconset/icon_16x16.png
sips -z 32 32     logo.png --out assets/icon.iconset/icon_16x16@2x.png
sips -z 32 32     logo.png --out assets/icon.iconset/icon_32x32.png
sips -z 64 64     logo.png --out assets/icon.iconset/icon_32x32@2x.png
sips -z 128 128   logo.png --out assets/icon.iconset/icon_128x128.png
sips -z 256 256   logo.png --out assets/icon.iconset/icon_128x128@2x.png
sips -z 256 256   logo.png --out assets/icon.iconset/icon_256x256.png
sips -z 512 512   logo.png --out assets/icon.iconset/icon_256x256@2x.png
sips -z 512 512   logo.png --out assets/icon.iconset/icon_512x512.png
sips -z 1024 1024 logo.png --out assets/icon.iconset/icon_512x512@2x.png

# 3. .icns 파일 생성
iconutil -c icns assets/icon.iconset -o assets/icon.icns

# 4. iconset 폴더 삭제
rm -rf assets/icon.iconset
```

**방법 2: 온라인 변환기**
- https://cloudconvert.com/png-to-icns
- https://iconverticons.com/online/

### Windows용 .ico 변환

**온라인 변환기:**
- https://cloudconvert.com/png-to-ico
- https://convertio.co/png-ico/
- https://www.icoconverter.com/

**요구사항:**
- 256x256 크기 권장
- 여러 크기 포함 가능 (16x16, 32x32, 48x48, 256x256)

### 간단한 방법 (권장)

1. **원본 이미지를 `assets/icon.png`로 저장** (512x512 권장)
2. **온라인 변환기 사용:**
   - PNG → ICNS: https://cloudconvert.com/png-to-icns
   - PNG → ICO: https://cloudconvert.com/png-to-ico
3. **변환된 파일을 `assets/` 폴더에 저장**

## ✅ 최종 파일 구조

```
assets/
├── icon.png          # 원본 (512x512)
├── icon.icns         # macOS 빌드용
├── icon.ico          # Windows 빌드용
├── tray-icon.png     # 트레이 아이콘 (16x16 또는 32x32)
└── notification-icon.png  # 알림 아이콘 (64x64)
```

## 💡 빠른 시작

1. 원본 이미지를 `assets/icon.png`로 저장 (512x512)
2. 온라인 변환기로 `.icns`와 `.ico` 생성
3. `assets/` 폴더에 모두 저장
4. 완료!

## 🔍 확인 방법

빌드 후 아이콘이 제대로 적용되었는지 확인:
```bash
npm run build
# dist/ 폴더의 앱 파일에서 아이콘 확인
```

