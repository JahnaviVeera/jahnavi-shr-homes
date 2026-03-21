const { execSync } = require('child_process');
try {
  execSync('npx ts-node test_db.ts');
  console.log("SUCCESS");
} catch (e) {
  console.log("STDOUT:", e.stdout.toString());
  console.log("STDERR:", e.stderr.toString());
}
