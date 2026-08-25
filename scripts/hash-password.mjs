// Usage: node scripts/hash-password.mjs yourpassword
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.log('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('Hashed password:');
console.log(hash);
console.log('\nRun this SQL to update your admin:');
console.log(`UPDATE users SET password_hash = '${hash}' WHERE full_name = 'YOUR_NAME' AND role = 'admin';`);
process.exit(0);
