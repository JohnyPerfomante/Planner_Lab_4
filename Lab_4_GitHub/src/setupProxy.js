const http = require('node:http');

// Окремий Node API доступний через той самий origin у режимі розробки.
module.exports = (app) => {
  app.use('/api', (req, res) => {
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: process.env.ROBOT_API_PORT || 4004,
        path: req.originalUrl,
        method: req.method,
        headers: req.headers,
      },
      (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent)
        res.status(502).json({ message: 'Немає зв’язку з API сервером.' });
      else res.end();
    });
    req.pipe(upstream);
  });
};
