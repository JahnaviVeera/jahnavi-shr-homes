const fs = require('fs');
const path = require('path');

function fixEnv(src, dest) {
    try {
        console.log(`Checking ${src}...`);
        // Try reading as UTF-16LE
        const buf = fs.readFileSync(src);
        let content;
        if (buf[0] === 0xFF && buf[1] === 0xFE) {
            console.log('Detected UTF-16LE (BOM)');
            content = buf.toString('utf16le');
        } else {
            // Check if it looks like UTF-16LE without BOM
            // (lots of null bytes)
            const nulls = buf.filter(b => b === 0).length;
            if (nulls > buf.length / 4) {
                console.log('Likely UTF-16LE (no BOM)');
                content = buf.toString('utf16le');
            } else {
                console.log('Likely UTF-8');
                content = buf.toString('utf8');
            }
        }

        // Basic sanity check/cleanup
        const cleanLines = content.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.includes('\x00')); // Remove any leftover nulls

        fs.writeFileSync(dest, cleanLines.join('\n'), 'utf8');
        console.log(`Wrote clean UTF-8 to ${dest}`);
    } catch (e) {
        console.error(`Error processing ${src}:`, e);
    }
}

fixEnv('src/config/.env', '.env');
