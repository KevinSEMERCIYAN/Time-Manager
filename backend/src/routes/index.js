const createAuthRoutes = require("./auth.routes");
const createUsersRoutes = require("./users.routes");
const createTeamsRoutes = require("./teams.routes");
const createClocksRoutes = require("./clocks.routes");
const createReportsRoutes = require("./reports.routes");
const createAdminRoutes = require("./admin.routes");

const registerRoutes = (app, ctx) => {
  const routeFactories = [
    createAuthRoutes,
    createUsersRoutes,
    createTeamsRoutes,
    createClocksRoutes,
    createReportsRoutes,
    createAdminRoutes,
  ];

  routeFactories.forEach((factory) => {
    app.use(factory(ctx));
  });
};

module.exports = {
  registerRoutes,
};
