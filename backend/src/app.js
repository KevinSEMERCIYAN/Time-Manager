const express = require("express");
const ctx = require("./context/appContext");
const { applyHttpMiddlewares } = require("./middlewares");
const { registerRoutes } = require("./routes");

const createApp = () => {
  const app = express();

  applyHttpMiddlewares(app);

  app.get("/health", (req, res) => res.json({ ok: true }));

  registerRoutes(app, ctx);

  return app;
};

module.exports = {
  createApp,
  ctx,
};
