const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SUBSERVICES_BY_DEPARTMENT = {
  Finance: [
    "Facturation",
    "Comptabilite",
    "Controle",
    "Consolidation",
    "Budget",
    "Recouvrement",
    "Tarification",
    "Analyse",
    "Fiscalite",
  ],
  Juridique: [
    "Conformite",
    "Contrats",
    "Contentieux",
    "Gouvernance",
    "Ethique",
    "Reglementation",
    "Audit legal",
    "Secretariat",
    "Mediation",
  ],
  IT: [
    "Support",
    "Infrastructure",
    "Applications",
    "Securite",
    "Data",
    "Automatisation",
    "Reseau",
    "DevOps",
  ],
  RH: [
    "Recrutement",
    "Paie",
    "Formation",
    "Carriere",
    "Attractivite",
    "Discipline",
    "QVT",
    "Administration RH",
  ],
  Tresorerie: [
    "Paiements",
    "Cash Management",
    "Risques",
    "Liquidite",
    "Back Office",
    "SWIFT",
    "Controle Treso",
    "Previsions",
  ],
  Conseillers: [
    "Accueil",
    "Particuliers",
    "Professionnels",
    "Premium",
    "Patrimoine",
    "Credit",
    "Assurances",
    "Fidelisation",
  ],
};

const hasRole = (roles, role) => Array.isArray(roles) && roles.includes(role);

async function main() {
  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      isProvisioned: true,
      department: { not: null },
    },
    select: {
      id: true,
      username: true,
      department: true,
      roles: true,
    },
    orderBy: [{ department: "asc" }, { username: "asc" }],
  });

  const byDept = new Map();
  for (const u of users) {
    const dept = (u.department || "").trim();
    if (!dept) continue;
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept).push(u);
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany({});
    await tx.team.deleteMany({});

    for (const [dept, deptUsers] of byDept.entries()) {
      const subservices = SUBSERVICES_BY_DEPARTMENT[dept] || ["Service A", "Service B", "Service C"];
      const managers = deptUsers.filter((u) => hasRole(u.roles, "MANAGER"));
      const employees = deptUsers.filter((u) => hasRole(u.roles, "EMPLOYEE"));

      const teamRecords = [];
      for (let i = 0; i < subservices.length; i++) {
        const manager = managers.length ? managers[i % managers.length] : null;
        const team = await tx.team.create({
          data: {
            name: subservices[i],
            department: dept,
            description: `Sous-service ${subservices[i]} (${dept})`,
            managerUserId: manager ? manager.id : null,
          },
        });
        teamRecords.push(team);
      }

      if (teamRecords.length && employees.length) {
        const memberships = employees.map((e, idx) => ({
          teamId: teamRecords[idx % teamRecords.length].id,
          userId: e.id,
        }));

        for (let i = 0; i < memberships.length; i += 1000) {
          await tx.teamMember.createMany({
            data: memberships.slice(i, i + 1000),
            skipDuplicates: true,
          });
        }
      }
    }
  });

  const teams = await prisma.team.findMany({
    include: {
      manager: { select: { username: true } },
      _count: { select: { members: true } },
    },
    orderBy: [{ department: "asc" }, { name: "asc" }],
  });

  const summary = teams.map((t) => ({
    team: t.name,
    department: t.department,
    manager: t.manager?.username || null,
    members: t._count.members,
  }));

  console.log(JSON.stringify({ ok: true, teams: summary.length, summary }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
