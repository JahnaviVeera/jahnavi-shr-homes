const fs = require('fs');
try {
    const content = fs.readFileSync('.env', 'utf16le');
    console.log('--- UTF-16LE ---');
    console.log(content);
} catch (e) {
    console.error('Failed UTF-16LE');
}

try {
    const content = fs.readFileSync('.env', 'utf8');
    console.log('--- UTF-8 ---');
    console.log(content);
} catch (e) {
    console.error('Failed UTF-8');
}
