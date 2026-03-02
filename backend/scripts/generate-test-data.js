/**
 * Script pour générer des données de test :
 * - 20 employés
 * - 4 managers
 * - Pointages avec heures supplémentaires
 */

const db = require('../src/db');

// Noms français pour les utilisateurs
const firstNames = [
  'Jean', 'Marie', 'Pierre', 'Sophie', 'Thomas', 'Julie', 'Nicolas', 'Camille',
  'Antoine', 'Laura', 'Julien', 'Emma', 'Alexandre', 'Léa', 'Maxime', 'Chloé',
  'David', 'Sarah', 'Paul', 'Manon', 'Lucas', 'Clara', 'Hugo', 'Inès'
];

const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
  'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefevre'
];

const teams = ['IT', 'RH', 'Finance', 'Marketing', 'Support', 'Direction'];

// Générer un nom d'utilisateur unique
function generateUsername(firstName, lastName, index) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  return index > 0 ? `${base}${index}` : base;
}

// Générer un email
function generateEmail(username) {
  return `${username}@primebank.local`;
}

// Générer un displayName
function generateDisplayName(firstName, lastName) {
  return `${firstName} ${lastName}`;
}

// Générer des données de test
async function generateTestData() {
  try {
    console.log('🚀 Génération des données de test...\n');

    // 0. Créer les équipes et l'admin si besoin
    console.log('📋 Vérification des équipes et de l\'admin...');
    const teamNames = ['IT', 'RH', 'Finance', 'Marketing', 'Support', 'Direction'];
    for (const name of teamNames) {
      await db.query(
        `INSERT IGNORE INTO teams (name, type, created_at, updated_at) VALUES (?, 'INTERNAL', NOW(), NOW())`,
        [name]
      );
    }
    console.log('  ✅ Équipes OK');

    // Admin (pour les tests) : créé en base si pas encore là
    const adminExists = await db.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminExists || adminExists.length === 0) {
      await db.query(
        `INSERT INTO users (username, display_name, email, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())`,
        ['admin', 'Administrateur', 'admin@primebank.local']
      );
      const adminRow = await db.query('SELECT id FROM users WHERE username = ?', ['admin']);
      const roleAdmin = await db.query('SELECT id FROM roles WHERE name = ?', ['ROLE_ADMIN']);
      if (adminRow?.[0]?.id && roleAdmin?.[0]?.id) {
        await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminRow[0].id, roleAdmin[0].id]);
      }
      console.log('  ✅ Compte admin créé (username: admin)');
    } else {
      console.log('  ⚠️  Admin déjà présent');
    }

    // 1. Créer 20 employés
    console.log('📝 Création de 20 employés...');
    const employees = [];
    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const username = generateUsername(firstName, lastName, i);
      const displayName = generateDisplayName(firstName, lastName);
      const email = generateEmail(username);
      const team = teams[i % teams.length];

      const result = await db.query(
        `INSERT INTO users (username, display_name, email, team_id, is_active, created_at, updated_at)
         SELECT ?, ?, ?, 
                (SELECT id FROM teams WHERE name = ? LIMIT 1),
                1, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?)`,
        [username, displayName, email, team, username]
      );

      if (result && result.affectedRows > 0) {
        const userResult = await db.query('SELECT id, username FROM users WHERE username = ?', [username]);
        employees.push(userResult[0]);
        console.log(`  ✅ Créé: ${displayName} (${username}) - Équipe: ${team}`);
      } else {
        const existingResult = await db.query('SELECT id, username FROM users WHERE username = ?', [username]);
        employees.push(existingResult[0]);
        console.log(`  ⚠️  Existant: ${displayName} (${username})`);
      }
    }

    // Attribuer ROLE_EMPLOYEE à tous les employés
    const roleEmployee = await db.query('SELECT id FROM roles WHERE name = ?', ['ROLE_EMPLOYEE']);
    if (roleEmployee?.[0]?.id) {
      for (const emp of employees) {
        await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [emp.id, roleEmployee[0].id]);
      }
      console.log('  ✅ Rôle employé attribué aux 20 employés');
    }

    // 2. Créer 4 managers
    console.log('\n👔 Création de 4 managers...');
    const managers = [];
    const managerNames = [
      { first: 'Marc', last: 'Dupont' },
      { first: 'Céline', last: 'Martin' },
      { first: 'François', last: 'Bernard' },
      { first: 'Isabelle', last: 'Moreau' }
    ];

    for (let i = 0; i < 4; i++) {
      const { first, last } = managerNames[i];
      const username = `manager${i + 1}`;
      const displayName = `${first} ${last}`;
      const email = generateEmail(username);
      const team = teams[i % teams.length];

      const result = await db.query(
        `INSERT INTO users (username, display_name, email, team_id, is_active, created_at, updated_at)
         SELECT ?, ?, ?, 
                (SELECT id FROM teams WHERE name = ? LIMIT 1),
                1, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?)`,
        [username, displayName, email, team, username]
      );

      if (result && result.affectedRows > 0) {
        const userResult = await db.query('SELECT id, username FROM users WHERE username = ?', [username]);
        if (userResult && userResult.length > 0) {
          managers.push(userResult[0]);
        }
        console.log(`  ✅ Créé: ${displayName} (${username}) - Équipe: ${team}`);
      } else {
        const existingResult = await db.query('SELECT id, username FROM users WHERE username = ?', [username]);
        if (existingResult && existingResult.length > 0) {
          managers.push(existingResult[0]);
        }
        console.log(`  ⚠️  Existant: ${displayName} (${username})`);
      }
    }

    // Attribuer ROLE_MANAGER + ROLE_EMPLOYEE aux 4 managers
    const roleManager = await db.query('SELECT id FROM roles WHERE name = ?', ['ROLE_MANAGER']);
    if (roleManager?.[0]?.id && roleEmployee?.[0]?.id) {
      for (const mgr of managers) {
        await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [mgr.id, roleManager[0].id]);
        await db.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [mgr.id, roleEmployee[0].id]);
      }
      console.log('  ✅ Rôles manager + employé attribués aux 4 managers');
    }

    // 3. Créer des pointages avec heures supplémentaires
    console.log('\n⏰ Création des pointages avec heures supplémentaires...');
    
    // Dates pour la semaine dernière et cette semaine
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    // Générer des pointages pour chaque employé sur les 14 derniers jours
    let totalEntries = 0;
    for (const employee of employees) {
      for (let day = 0; day < 14; day++) {
        const date = new Date(lastWeek);
        date.setDate(lastWeek.getDate() + day);
        
        // Ne pas créer de pointages le week-end
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Heure d'entrée : entre 7h30 et 9h30 (certains arrivent en retard)
        const entryHour = 7 + Math.floor(Math.random() * 2); // 7h ou 8h
        const entryMinute = Math.floor(Math.random() * 60);
        const startTime = new Date(date);
        startTime.setHours(entryHour, entryMinute, 0, 0);

        // Heure de sortie : entre 17h et 20h (certains font des heures sup)
        const exitHour = 17 + Math.floor(Math.random() * 3); // 17h, 18h ou 19h
        const exitMinute = Math.floor(Math.random() * 60);
        const endTime = new Date(date);
        endTime.setHours(exitHour, exitMinute, 0, 0);

        // Vérifier si le pointage existe déjà
        const existing = await db.query(
          `SELECT id FROM time_entries 
           WHERE user_id = ? AND DATE(start_time) = DATE(?)`,
          [employee.id, startTime]
        );

        if (!existing || existing.length === 0) {
          const teamIdRes = await db.query('SELECT team_id FROM users WHERE id = ?', [employee.id]);
          const teamId = teamIdRes?.[0]?.team_id || null;
          await db.query(
            `INSERT INTO time_entries (user_id, team_id, start_time, end_time, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'SEEDED', NOW(), NOW())`,
            [employee.id, teamId, startTime, endTime]
          );
          totalEntries++;
        }
      }
    }

    // Générer des pointages pour les managers aussi
    for (const manager of managers) {
      for (let day = 0; day < 10; day++) {
        const date = new Date(lastWeek);
        date.setDate(lastWeek.getDate() + day);
        
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const entryHour = 8 + Math.floor(Math.random() * 2);
        const entryMinute = Math.floor(Math.random() * 60);
        const startTime = new Date(date);
        startTime.setHours(entryHour, entryMinute, 0, 0);

        const exitHour = 18 + Math.floor(Math.random() * 2);
        const exitMinute = Math.floor(Math.random() * 60);
        const endTime = new Date(date);
        endTime.setHours(exitHour, exitMinute, 0, 0);

        const existing = await db.query(
          `SELECT id FROM time_entries 
           WHERE user_id = ? AND DATE(start_time) = DATE(?)`,
          [manager.id, startTime]
        );

        if (!existing || existing.length === 0) {
          const teamIdRes = await db.query('SELECT team_id FROM users WHERE id = ?', [manager.id]);
          const teamId = teamIdRes?.[0]?.team_id || null;
          await db.query(
            `INSERT INTO time_entries (user_id, team_id, start_time, end_time, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'SEEDED', NOW(), NOW())`,
            [manager.id, teamId, startTime, endTime]
          );
          totalEntries++;
        }
      }
    }

    console.log(`\n✅ ${totalEntries} pointages créés avec succès !`);

    // 4. Afficher un résumé
    console.log('\n📊 Résumé des données créées :');
    console.log(`  - ${employees.length} employés`);
    console.log(`  - ${managers.length} managers`);
    console.log(`  - ${totalEntries} pointages`);
    
    // Calculer les heures supplémentaires
    const overtimeStats = await db.query(`
      SELECT 
        COUNT(*) as totalEntries,
        SUM(CASE 
          WHEN TIMESTAMPDIFF(MINUTE, start_time, end_time) > 420 THEN 1 
          ELSE 0 
        END) as entriesWithOvertime,
        SUM(CASE 
          WHEN TIMESTAMPDIFF(MINUTE, start_time, end_time) > 420 
          THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) - 420 
          ELSE 0 
        END) as totalOvertimeMinutes
      FROM time_entries
      WHERE end_time IS NOT NULL
      AND DATE(start_time) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
    `);

    if (overtimeStats && overtimeStats.length > 0) {
      const stats = overtimeStats[0];
      const overtimeHours = Math.floor(stats.totalOvertimeMinutes / 60);
      const overtimeMins = stats.totalOvertimeMinutes % 60;
      console.log(`  - ${stats.entriesWithOvertime} pointages avec heures supplémentaires`);
      console.log(`  - Total heures sup: ${overtimeHours}h ${overtimeMins}m`);
    }

    console.log('\n✨ Génération terminée avec succès !\n');

  } catch (error) {
    console.error('❌ Erreur lors de la génération des données:', error);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  generateTestData()
    .then(() => {
      console.log('✅ Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { generateTestData };
