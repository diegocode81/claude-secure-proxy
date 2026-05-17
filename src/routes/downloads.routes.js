import fs from 'node:fs';

function sendFileDownload(req, res, filePath, downloadName, sendJson) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, {
      error: 'Download file not found'
    });
    return;
  }

  const stats = fs.statSync(filePath);
  res.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-disposition': `attachment; filename="${downloadName}"`,
    'content-length': stats.size
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

export function handleDownloadsRoutes({
  req,
  res,
  pathname,
  sendJson,
  vscodeExtensionFile,
  vscodeExtensionDownloadName
}) {
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    (pathname === '/downloads/secure-code-vscode' || pathname === '/downloads/claude-secure-vscode')
  ) {
    sendFileDownload(req, res, vscodeExtensionFile, vscodeExtensionDownloadName, sendJson);
    return true;
  }

  return false;
}
