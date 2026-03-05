-- Migration: ajout de la table tasks (tâches avec délais pour les membres d'équipe)
-- Exécuter si la table n'existe pas encore: mysql -u timemanager -p timemanager < sql/migrate-tasks.sql

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to_user_id BIGINT UNSIGNED NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED,
  due_date DATETIME NULL,
  status ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Index optionnels (ignorer si déjà existants)
-- CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);
-- CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by_user_id);
-- CREATE INDEX idx_tasks_team ON tasks(team_id);
-- CREATE INDEX idx_tasks_status ON tasks(status);
-- CREATE INDEX idx_tasks_due_date ON tasks(due_date);
