const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8000/api",
      changeOrigin: true,
      timeout: 30000,
      proxyTimeout: 30000,
      pathRewrite: { "^/api": "" },
    })
  );
};