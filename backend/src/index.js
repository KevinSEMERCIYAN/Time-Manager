const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const ldap = require("ldapjs");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username/password required" });

  const LDAP_URL = process.env.LDAP_URL;
  const BASE_DN = process.env.LDAP_BASE_DN;
  const BIND_DN = process.env.LDAP_BIND_DN;
  const BIND_PW = process.env.LDAP_BIND_PASSWORD;
  const FILTER = (process.env.LDAP_USER_FILTER || "(sAMAccountName={{username}})").replace("{{username}}", username);

  const client = ldap.createClient({ url: LDAP_URL, tlsOptions: { rejectUnauthorized: true } });

  const bind = (dn, pw) => new Promise((resolve, reject) =>
    client.bind(dn, pw, (err) => (err ? reject(err) : resolve()))
  );

  const searchUser = () => new Promise((resolve, reject) => {
    client.search(BASE_DN, { scope: "sub", filter: FILTER, attributes: ["dn", "memberOf"] }, (err, r) => {
      if (err) return reject(err);
      let entry;
      r.on("searchEntry", (e) => entry = e.object);
      r.on("error", reject);
      r.on("end", () => entry ? resolve(entry) : reject(new Error("User not found")));
    });
  });

  try {
    await bind(BIND_DN, BIND_PW);
    const u = await searchUser();
    await bind(u.dn, password);

    const memberOf = Array.isArray(u.memberOf) ? u.memberOf : (u.memberOf ? [u.memberOf] : []);
    const has = (cn) => memberOf.some(g => g.toLowerCase().includes(`cn=${cn.toLowerCase()},`));

    const roles = [];
    if (has("GG_TM_Admins")) roles.push("ROLE_ADMIN");
    if (has("GG_TM_Managers")) roles.push("ROLE_MANAGER");
    if (has("GG_TM_Employees")) roles.push("ROLE_EMPLOYEE");
    if (!roles.length) return res.status(403).json({ error: "No allowed AD group" });

    const ttl = `${parseInt(process.env.JWT_TTL_MINUTES || "15", 10)}m`;
    const token = jwt.sign({ sub: username, roles }, process.env.JWT_SECRET, { expiresIn: ttl });
    res.json({ token, roles });
  } catch {
    res.status(401).json({ error: "Invalid credentials" });
  } finally {
    client.unbind(() => {});
  }
});

app.listen(3000, () => console.log("Backend on :3000"));
