// 빌드 시 환경 변수를 코드에 주입하는 스크립트
const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');
const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD || 'nms2024admin!';

// main.js 파일 읽기
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// MASTER_ADMIN_PASSWORD 상수 부분 찾아서 교체
const passwordPattern = /const MASTER_ADMIN_PASSWORD = process\.env\.MASTER_ADMIN_PASSWORD \|\| '[^']*';/;
const replacement = `const MASTER_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || '${masterAdminPassword}';`;

if (passwordPattern.test(mainJsContent)) {
  mainJsContent = mainJsContent.replace(passwordPattern, replacement);
  fs.writeFileSync(mainJsPath, mainJsContent, 'utf8');
  console.log('✅ 환경 변수가 코드에 주입되었습니다.');
} else {
  console.log('⚠️ MASTER_ADMIN_PASSWORD 패턴을 찾을 수 없습니다.');
}

