const { createApp, ctx } = require("./app");

const app = createApp();

if (require.main === module) {
  app.listen(ctx.PORT, () => {
    console.log(`Backend on :${ctx.PORT}`);
  });
  ctx.startAdSyncScheduler();
}

module.exports = app;
