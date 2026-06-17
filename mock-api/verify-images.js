/**
 * Verifies that every image URL in db.json resolves to HTTP 200.
 * Run: `npm run verify-images`. Exits non-zero if any URL fails.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));

// Walk the whole structure and collect every http(s) URL.
const urls = new Set();
(function walk(node) {
  if (node == null) return;
  if (typeof node === 'string') {
    if (/^https?:\/\//.test(node)) urls.add(node);
  } else if (Array.isArray(node)) {
    node.forEach(walk);
  } else if (typeof node === 'object') {
    Object.values(node).forEach(walk);
  }
})(db);

const list = [...urls];
console.log(`Checking ${list.length} unique image URLs...`);

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET', timeout: 25000 }, (res) => {
      res.resume(); // drain
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
    req.end();
  });
}

(async () => {
  let failures = 0;
  // limited concurrency
  const queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      const code = await head(url);
      if (code !== 200) {
        failures++;
        console.error(`  FAIL ${code}  ${url}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  if (failures) {
    console.error(`\n${failures} URL(s) did not return 200.`);
    process.exit(1);
  }
  console.log('All image URLs return HTTP 200 ✅');
})();
