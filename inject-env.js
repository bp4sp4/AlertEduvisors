// 빌드 시 환경 변수를 코드에 주입하는 스크립트
const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');
const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD;

// 환경 변수가 없으면 에러 발생 (프로덕션 빌드에서는 필수)
if (!masterAdminPassword && process.env.NODE_ENV === 'production') {
  console.error('❌ 오류: MASTER_ADMIN_PASSWORD 환경 변수가 설정되지 않았습니다.');
  console.error('   GitHub Secrets에 MASTER_ADMIN_PASSWORD를 설정해주세요.');
  process.exit(1);
}

// 개발 환경에서는 기본값 사용 (로컬 개발용)
const passwordToInject = masterAdminPassword || 'nms2024admin!';

// main.js 파일 읽기
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// MASTER_ADMIN_PASSWORD 상수 부분 찾아서 교체
const passwordPattern = /const MASTER_ADMIN_PASSWORD = process\.env\.MASTER_ADMIN_PASSWORD \|\| '[^']*';/;
const replacement = `const MASTER_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || '${passwordToInject}';`;

if (passwordPattern.test(mainJsContent)) {
  mainJsContent = mainJsContent.replace(passwordPattern, replacement);
  fs.writeFileSync(mainJsPath, mainJsContent, 'utf8');
  console.log('✅ 환경 변수가 코드에 주입되었습니다.');
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ 프로덕션 빌드: GitHub Secrets에서 비밀번호를 사용합니다.');
  } else {
    console.log('⚠️ 개발 환경: 기본 비밀번호를 사용합니다.');
  }
} else {
  console.log('⚠️ MASTER_ADMIN_PASSWORD 패턴을 찾을 수 없습니다.');
}

