#!/bin/bash
# Script pour initialiser la base de données
# Usage: docker-compose exec db bash -c "mariadb -u timemanager -ptimemanager timemanager < /app/sql/schema.sql"

echo "📦 Initialisation de la base de données..."

# Depuis le conteneur db
mariadb -u timemanager -ptimemanager timemanager < /app/sql/schema.sql

if [ $? -eq 0 ]; then
  echo "✅ Tables créées avec succès!"
else
  echo "❌ Erreur lors de la création des tables"
  exit 1
fi
