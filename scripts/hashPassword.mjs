import crypto from 'crypto';

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node scripts/hashPassword.mjs <password>');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(String(pw)).digest('hex');
console.log(hash);
