const bcrypt = require('bcrypt');

const password = 'Adminshr@123!';
const hash = bcrypt.hashSync(password, 10);

console.log('\n=================================');
console.log('Password Hash Generated');
console.log('=================================');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('=================================\n');
console.log('Copy this hash and replace it in insert-admin.sql');
console.log('\n');
