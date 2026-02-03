const fs = require('fs');
const content = fs.readFileSync('.env', 'utf16le');
const lines = content.split(/\r?\n/);
const result = [];

lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        // Try to find KEY=VALUE
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            result.push(`${key}=${value}`);
        }
    }
});

console.log(result.join('\n'));
fs.writeFileSync('.env.new', result.join('\n'), 'utf8');
console.log('--- Created .env.new ---');
