const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const teamRoutes = require("./routes/teams");
const timeEntryRoutes = require("./routes/timeEntries");
const scheduleRoutes = require("./routes/schedules");
const contractRoutes = require("./routes/contracts");
const customTeamRoutes = require("./routes/customTeams");
const auditLogRoutes = require("./routes/auditLogs");
const reportRoutes = require("./routes/reports");
const taskRoutes = require("./routes/tasks");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Routes sans préfixe
app.use(healthRoutes);
app.use(authRoutes);

// Routes /api/*
app.use("/api", userRoutes);
app.use("/api", teamRoutes);
app.use("/api", timeEntryRoutes);
app.use("/api", scheduleRoutes);
app.use("/api", contractRoutes);
app.use("/api", customTeamRoutes);
app.use("/api", auditLogRoutes);
app.use("/api", reportRoutes);
app.use("/api", taskRoutes);

app.listen(3000, () => console.log("Backend on :3000"));
