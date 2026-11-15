const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL_FILE = path.join(__dirname, 'tunnel_url.txt');

function startTunnel() {
  console.log('Starting localhost.run SSH tunnel for port 8080...');
  const proc = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-R', '80:localhost:8080',
    'nokey@localhost.run'
  ]);

  proc.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('[Tunnel STDOUT]', text);
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match) {
      const url = match[0];
      console.log('PUBLIC_TUNNEL_URL:', url);
      fs.writeFileSync(URL_FILE, url, 'utf8');
    }
  });

  proc.stderr.on('data', (data) => {
    console.log('[Tunnel STDERR]', data.toString());
  });

  proc.on('close', (code) => {
    console.log('Tunnel exited with code', code, 'reconnecting in 3s...');
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
