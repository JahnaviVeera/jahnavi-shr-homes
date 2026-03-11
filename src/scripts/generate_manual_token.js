const jwt = require('jsonwebtoken');

// Hardcoded values from your .env
const JWT_SECRET = 'your_super_secret_jwt_key_minimum_32_characters_long_random_string'; // Directly from .env file view
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000'; // Dummy ID
const ADMIN_EMAIL = 'admin@example.com';

const payload = {
    userId: ADMIN_USER_ID,
    email: ADMIN_EMAIL,
    role: "admin"
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('---------------------------------------------------');
console.log('GENERATED ADMIN TOKEN (24h validity):');
console.log(token);
console.log('---------------------------------------------------');
console.log('');
console.log('Usage Query Param:');
console.log(`?token=${token}`);
console.log('');
console.log('Usage Header:');
console.log(`Authorization: Bearer ${token}`);
console.log('---------------------------------------------------');
