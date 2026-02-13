const request = require("supertest");
const app = require("../src/index.js");

describe("smoke", () => {
  it("GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /auth/me unauthorized", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.statusCode).toBe(401);
  });

  it("GDPR endpoints unauthorized", async () => {
    const res1 = await request(app).get("/gdpr/export");
    const res2 = await request(app).post("/gdpr/anonymize");
    expect(res1.statusCode).toBe(401);
    expect(res2.statusCode).toBe(401);
  });

  it("Self endpoints unauthorized", async () => {
    const res1 = await request(app).put("/me");
    const res2 = await request(app).delete("/me");
    expect(res1.statusCode).toBe(401);
    expect(res2.statusCode).toBe(401);
  });

  it("Report endpoints unauthorized", async () => {
    const res1 = await request(app).get("/reports/team");
    const res2 = await request(app).get("/reports/user");
    expect(res1.statusCode).toBe(401);
    expect(res2.statusCode).toBe(401);
  });
});
