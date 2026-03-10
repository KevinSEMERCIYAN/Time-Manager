/**
 * Service API pour communiquer avec le backend Time-Manager
 */

// Si VITE_API_URL est défini et non vide, l'utiliser, sinon utiliser une URL relative
// En développement: http://localhost:3000
// En production via nginx: laisser vide pour utiliser des URLs relatives
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Récupère le token JWT depuis localStorage
 */
function getToken() {
  return localStorage.getItem('tm_token') || '';
}

/**
 * Configure les headers pour les requêtes authentifiées
 */
function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Gère les erreurs HTTP
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      // Si la réponse n'est pas du JSON, utiliser le status text
      errorMessage = response.statusText || errorMessage;
    }
    
    // Gérer les erreurs spécifiques
    if (response.status === 401) {
      // Token expiré ou invalide, supprimer le token
      localStorage.removeItem('tm_token');
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    
    throw new Error(errorMessage);
  }
  
  // Gérer les réponses vides (204 No Content)
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

/**
 * API d'authentification
 */
export const authAPI = {
  /**
   * Connexion avec username/password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{token, roles, username, displayName, team, teams, users}>}
   */
  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(response);
    // Stocker le token
    if (data.token) {
      localStorage.setItem('tm_token', data.token);
      localStorage.setItem('tm_username', data.username || '');
      localStorage.setItem('tm_display_name', data.displayName || '');
      localStorage.setItem('tm_team', data.team || '');
      if (data.roles) {
        localStorage.setItem('tm_roles', JSON.stringify(data.roles));
      }
    }
    return data;
  },

  /**
   * Récupère les informations de l'utilisateur connecté
   * @returns {Promise<{username, roles}>}
   */
  async getMe() {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Déconnexion (supprime le token)
   */
  logout() {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_username');
    localStorage.removeItem('tm_display_name');
    localStorage.removeItem('tm_team');
    localStorage.removeItem('tm_roles');
  },
};

/**
 * API des utilisateurs
 */
export const usersAPI = {
  /**
   * Liste tous les utilisateurs
   * @returns {Promise<Array>}
   */
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Récupère un utilisateur par ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Met à jour un utilisateur
   * @param {number} id
   * @param {Object} updates - {displayName?, email?, teamId?, isActive?}
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  /**
   * Récupère les rôles d'un utilisateur (Admin uniquement)
   * @param {number} id
   * @returns {Promise<{userId, roles}>}
   */
  async getRoles(id) {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}/roles`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Met à jour les rôles d'un utilisateur (Admin uniquement)
   * @param {number} id
   * @param {string[]} roles - Array de rôles (ex: ['ROLE_EMPLOYEE', 'ROLE_MANAGER'])
   * @returns {Promise<Object>}
   */
  async updateRoles(id, roles) {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}/roles`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roles }),
    });
    return handleResponse(response);
  },
};

/**
 * API des équipes
 */
export const teamsAPI = {
  /**
   * Liste toutes les équipes
   * @returns {Promise<Array>}
   */
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/api/teams`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

/**
 * API des time entries (pointages)
 */
export const timeEntriesAPI = {
  /**
   * Liste les time entries avec filtres optionnels
   * @param {Object} filters - {userId?, teamId?, from?, to?}
   * @returns {Promise<Array>}
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.teamId) params.append('teamId', filters.teamId);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/time-entries${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Crée un nouveau time entry
   * @param {Object} entry - {userId, teamId?, startTime, endTime?, source?, comment?}
   * @returns {Promise<Object>}
   */
  async create(entry) {
    const response = await fetch(`${API_BASE_URL}/api/time-entries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(entry),
    });
    return handleResponse(response);
  },

  /**
   * Met à jour un time entry
   * @param {number} id
   * @param {Object} updates - {endTime?, comment?}
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    const response = await fetch(`${API_BASE_URL}/api/time-entries/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  /**
   * Supprime un time entry
   * @param {number} id
   */
  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/api/time-entries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : handleResponse(response);
  },
};

/**
 * API des schedules (horaires)
 */
export const schedulesAPI = {
  /**
   * Récupère le schedule d'un utilisateur
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getByUserId(userId) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/schedule`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Met à jour le schedule d'un utilisateur
   * @param {number} userId
   * @param {Object} schedule - {amStart, amEnd, pmStart, pmEnd}
   * @returns {Promise<Object>}
   */
  async update(userId, schedule) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/schedule`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(schedule),
    });
    return handleResponse(response);
  },
};

/**
 * API des contracts
 */
export const contractsAPI = {
  /**
   * Récupère le contrat d'un utilisateur
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getByUserId(userId) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/contract`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Met à jour le contrat d'un utilisateur
   * @param {number} userId
   * @param {Object} contract - {type, startDate?, endDate?}
   * @returns {Promise<Object>}
   */
  async update(userId, contract) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/contract`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(contract),
    });
    return handleResponse(response);
  },
};

/**
 * API des custom teams
 */
export const customTeamsAPI = {
  /**
   * Liste toutes les custom teams
   * @returns {Promise<Array>}
   */
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Récupère une custom team par ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Crée une custom team
   * @param {Object} team - {name, memberIds?}
   * @returns {Promise<Object>}
   */
  async create(team) {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(team),
    });
    return handleResponse(response);
  },

  /**
   * Met à jour une custom team
   * @param {number} id
   * @param {Object} updates - {name}
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  /**
   * Supprime une custom team
   * @param {number} id
   */
  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : handleResponse(response);
  },

  /**
   * Met à jour les membres d'une custom team
   * @param {number} teamId
   * @param {number[]} memberIds
   * @returns {Promise<Object>}
   */
  async updateMembers(teamId, memberIds) {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams/${teamId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ memberIds }),
    });
    return handleResponse(response);
  },

  /**
   * Retire un membre d'une custom team
   * @param {number} teamId
   * @param {number} userId
   */
  async removeMember(teamId, userId) {
    const response = await fetch(`${API_BASE_URL}/api/custom-teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : handleResponse(response);
  },
};

/**
 * API des rapports et KPIs
 */
export const reportsAPI = {
  /**
   * Récupère un résumé agrégé des pointages
   * @param {Object} filters - {from?, to?, userId?, teamId?}
   * @returns {Promise<{overview: {...}, users: [...]}>}
   */
  async getSummary(filters = {}) {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.teamId) params.append('teamId', filters.teamId);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/summary${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

/**
 * API des tâches (Manager: créer/supprimer; Employé: cocher)
 */
export const tasksAPI = {
  /**
   * Liste les tâches (employé: les siennes; manager/admin: toutes ou filtrées)
   * @returns {Promise<Array>}
   */
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Tâches assignées à un utilisateur (manager/admin)
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async getForUser(userId) {
    const response = await fetch(`${API_BASE_URL}/api/tasks/for-user/${userId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Créer une tâche (manager/admin)
   * @param {Object} body - {title, description?, assignedToUserId, teamId?, dueDate?}
   * @returns {Promise<Object>}
   */
  async create(body) {
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /**
   * Mettre à jour le statut d'une tâche (employé: cocher; manager: tout)
   * @param {number} id
   * @param {Object} updates - {status: 'PENDING'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'}
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  /**
   * Supprimer une tâche (manager/admin)
   * @param {number} id
   */
  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (response.status === 204) return null;
    return handleResponse(response);
  },
};

/**
 * API des audit logs (Admin uniquement)
 */
export const auditLogsAPI = {
  /**
   * Liste les logs d'audit avec filtres optionnels
   * @param {Object} filters - {userId?, action?, entityType?, from?, to?, limit?}
   * @returns {Promise<Array>}
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.entityType) params.append('entityType', filters.entityType);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/audit-logs${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};
