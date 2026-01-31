const { execSync } = require('child_process');

function killPort(port) {
    try {
        console.log(`Checking for processes on port ${port}...`);
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');

        const pids = new Set();
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0' && !isNaN(pid)) {
                    pids.add(pid);
                }
            }
        });

        if (pids.size === 0) {
            console.log(`No processes found on port ${port}.`);
            return;
        }

        pids.forEach(pid => {
            try {
                console.log(`Terminating process with PID: ${pid}`);
                execSync(`taskkill /F /PID ${pid} /T`);
            } catch (e) {
                console.warn(`Could not terminate PID ${pid}: ${e.message}`);
            }
        });

        // Give it a moment to release
        console.log('Waiting for port to be released...');
        execSync('timeout /t 1 /nobreak > nul 2>&1 || ping 127.0.0.1 -n 2 > nul');

    } catch (error) {
        if (error.status === 1) {
            console.log(`No processes found on port ${port}.`);
        } else {
            console.error(`Error killing port ${port}:`, error.message);
        }
    }
}

killPort(process.env.PORT || 3000);
