#!/bin/bash

# 아이콘 변환 스크립트
# 사용법: ./convert-icon.sh logo.png

if [ -z "$1" ]; then
  echo "사용법: ./convert-icon.sh <원본이미지파일>"
  echo "예: ./convert-icon.sh logo.png"
  exit 1
fi

INPUT_FILE="$1"
BASE_NAME=$(basename "$INPUT_FILE" | sed 's/\.[^.]*$//')

echo "🔄 아이콘 변환 시작: $INPUT_FILE"

# 1. 원본을 icon.png로 복사 (512x512로 리사이즈)
echo "📐 icon.png 생성 중..."
sips -z 512 512 "$INPUT_FILE" --out "icon.png"

# 2. macOS용 .icns 생성
echo "🍎 macOS용 .icns 생성 중..."
mkdir -p "${BASE_NAME}.iconset"

sips -z 16 16     "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_16x16.png"
sips -z 32 32     "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_16x16@2x.png"
sips -z 32 32     "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_32x32.png"
sips -z 64 64     "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_32x32@2x.png"
sips -z 128 128   "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_128x128.png"
sips -z 256 256   "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_128x128@2x.png"
sips -z 256 256   "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_256x256.png"
sips -z 512 512   "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_256x256@2x.png"
sips -z 512 512   "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_512x512.png"
sips -z 1024 1024 "$INPUT_FILE" --out "${BASE_NAME}.iconset/icon_512x512@2x.png"

iconutil -c icns "${BASE_NAME}.iconset" -o icon.icns
rm -rf "${BASE_NAME}.iconset"

# 3. 트레이 아이콘 생성 (16x16)
echo "🔔 트레이 아이콘 생성 중..."
sips -z 16 16 "$INPUT_FILE" --out tray-icon.png

# 4. 알림 아이콘 생성 (64x64)
echo "📢 알림 아이콘 생성 중..."
sips -z 64 64 "$INPUT_FILE" --out notification-icon.png

echo "✅ 완료!"
echo ""
echo "생성된 파일:"
echo "  - icon.png (512x512)"
echo "  - icon.icns (macOS 빌드용)"
echo "  - tray-icon.png (16x16)"
echo "  - notification-icon.png (64x64)"
echo ""
echo "⚠️  Windows용 .ico 파일은 온라인 변환기를 사용하세요:"
echo "   https://cloudconvert.com/png-to-ico"



