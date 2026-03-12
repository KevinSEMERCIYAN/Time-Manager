const rawApiFetch = async (path, options = {}) =>
  fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

export const apiFetch = async (path, options = {}) => {
  let res = await rawApiFetch(path, options);
  const canRetryWithRefresh =
    res.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/refresh" &&
    path !== "/auth/logout";

  if (canRetryWithRefresh) {
    const refreshRes = await rawApiFetch("/auth/refresh", { method: "POST" });
    if (refreshRes.ok) {
      res = await rawApiFetch(path, options);
    }
  }

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  const isDev = typeof import.meta !== "undefined" && import.meta.env?.MODE !== "production";

  // Fallback de développement : si le backend n'est pas disponible,
  // /api/auth/login renvoie souvent 404 via Vite. Dans ce cas, on simule
  // une authentification pour pouvoir explorer le front.
  if (!res.ok) {
    if (isDev && path === "/auth/login" && res.status === 404) {
      let body = {};
      try {
        body = options.body ? JSON.parse(options.body) : {};
      } catch {
        body = {};
      }
      const username = body.username || "dev.manager";

      return {
        user: {
          id: "dev-user",
          username,
          displayName: username,
          roles: ["ADMIN", "MANAGER"],
        },
      };
    }

    throw new Error(data?.error || `Erreur serveur (${res.status})`);
  }

  return data;
};
