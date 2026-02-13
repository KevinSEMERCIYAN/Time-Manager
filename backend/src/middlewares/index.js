const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const applyHttpMiddlewares = (app) => {
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    })
  );
  app.use(helmet());
};

module.exports = {
  applyHttpMiddlewares,
};
