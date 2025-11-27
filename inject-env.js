// inject-env.js

const fs = require('fs');
const path = require('path');

// .env 파일 로드 (dotenv가 있으면 사용)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv가 없어도 계속 진행
}

// 1. GitHub Actions Secrets에서 값을 가져옵니다. (.env 파일 또는 환경 변수)
const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD;
const DEFAULT_PASSWORD = 'AdMin2025!!'; 
const passwordToEncode = (masterAdminPassword && masterAdminPassword.trim()) || DEFAULT_PASSWORD; 
const configFilePath = path.join(__dirname, 'config.bin');

if (!masterAdminPassword || !masterAdminPassword.trim()) {
  console.log('⚠️ MASTER_ADMIN_PASSWORD 환경 변수가 설정되지 않아 기본값을 인코딩합니다.');
} else {
  console.log('✅ MASTER_ADMIN_PASSWORD Secret을 인코딩합니다.');
}

try {
    // 2. Secret 값을 Base64로 인코딩합니다. (문자열 노출 방지)
    if (!passwordToEncode || passwordToEncode.length === 0) {
      throw new Error('인코딩할 비밀번호가 없습니다.');
    }
    
    const encodedPassword = Buffer.from(passwordToEncode, 'utf8').toString('base64');
    
    if (!encodedPassword || encodedPassword.length === 0) {
      throw new Error('비밀번호 인코딩에 실패했습니다.');
    }

    // 3. 인코딩된 비밀번호를 별도의 파일로 저장합니다.
    fs.writeFileSync(configFilePath, encodedPassword, 'utf8');
    
    // 파일이 제대로 생성되었는지 확인
    if (!fs.existsSync(configFilePath)) {
      throw new Error('config.bin 파일이 생성되지 않았습니다.');
    }
    
    const fileStats = fs.statSync(configFilePath);
    console.log(`✅ config.bin 파일에 암호화된 비밀번호가 저장되었습니다. (크기: ${fileStats.size} bytes)`);
} catch (error) {
    console.error(`❌ config.bin 파일 생성 중 오류 발생: ${error.message}`);
    console.error(`스택 트레이스: ${error.stack}`);
    process.exit(1);
}