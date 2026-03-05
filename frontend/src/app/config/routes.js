export const ROUTES = {
  LANDING: "/",
  SIGN_IN: "/sign-in",
  CLOCK_IN: "/clock-in",
  MY_CLOCKS: "/my-clocks",
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  MEMBERS: "/members",
  MEMBERS_CREATE: "/members/create",
  TEAMS: "/teams",
  TEAMS_CREATE: "/teams/createteam",
};

export const isMemberDetailsRoute = (route) => route.startsWith("/members/") && route !== ROUTES.MEMBERS_CREATE;

export const isProtectedRoute = (route) =>
  route === ROUTES.PROFILE ||
  route === ROUTES.DASHBOARD ||
  route === ROUTES.MY_CLOCKS ||
  route.startsWith(ROUTES.MEMBERS) ||
  route === ROUTES.TEAMS ||
  route === ROUTES.TEAMS_CREATE;
