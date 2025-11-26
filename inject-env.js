// inject-env.js

const fs = require('fs');
const path = require('path');

// 1. GitHub Actions Secrets에서 값을 가져옵니다.
const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD;
const DEFAULT_PASSWORD = 'AdMin2025!!'; 
const passwordToEncode = masterAdminPassword || DEFAULT_PASSWORD; 
const configFilePath = path.join(__dirname, 'config.bin');

if (!masterAdminPassword) {
  console.log('⚠️ MASTER_ADMIN_PASSWORD 환경 변수가 설정되지 않아 기본값(' + DEFAULT_PASSWORD + ')을 인코딩합니다.');
} else {
  console.log('✅ MASTER_ADMIN_PASSWORD Secret을 인코딩합니다.');
}

try {
    // 2. Secret 값을 Base64로 인코딩합니다. (문자열 노출 방지)
    const encodedPassword = Buffer.from(passwordToEncode, 'utf8').toString('base64');

    // 3. 인코딩된 비밀번호를 별도의 파일로 저장합니다.
    fs.writeFileSync(configFilePath, encodedPassword, 'utf8');

    console.log('✅ config.bin 파일에 암호화된 비밀번호가 저장되었습니다.');
} catch (error) {
    console.error(`❌ config.bin 파일 생성 중 오류 발생: ${error.message}`);
    process.exit(1);
}