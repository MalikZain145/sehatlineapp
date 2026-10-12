// SehatLine Desktop — an Electron shell around the Expo web build.
// It serves the bundled web app from a tiny local HTTP server (the Expo build
// uses absolute asset paths, so file:// won't work) and opens it in a window
// sized like the phone app so the layout/alignment matches.

const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// Serve the packaged web build on 127.0.0.1 (random port). SPA fallback → index.html.
function startServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/') urlPath = '/index.html';
        const filePath = path.normalize(path.join(root, urlPath));
        if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            // single-page-app fallback
            fs.readFile(path.join(root, 'index.html'), (e2, html) => {
              if (e2) { res.writeHead(404); return res.end('Not found'); }
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(html);
            });
            return;
          }
          res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
          res.end(data);
        });
      } catch (e) { res.writeHead(500); res.end('err'); }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

async function createWindow() {
  const webRoot = path.join(__dirname, 'web');
  const baseUrl = await startServer(webRoot);

  const win = new BrowserWindow({
    width: 440,
    height: 900,
    minWidth: 380,
    minHeight: 640,
    title: 'SehatLine',
    backgroundColor: '#0e1319',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);

  // open external links (http/https to other hosts) in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.startsWith(baseUrl)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  win.loadURL(baseUrl);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
