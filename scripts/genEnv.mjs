import fs from 'fs';
import crypto from 'crypto';

const pw = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '');
const hash = crypto.createHash('sha256').update(pw).digest('hex');
fs.writeFileSync('.env.local', `SHARED_SITE_PASSWORD_HASH=${hash}\n`);
console.log('PASSWORD_FOR_YOU:' + pw);
