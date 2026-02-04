import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

function App() {
  const [route, setRoute] = useState(window.location.pathname || "/");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("tm_token") || "");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("tm_username") || "");
  const [currentTeam, setCurrentTeam] = useState(localStorage.getItem("tm_team") || "");
  const [currentDisplayName, setCurrentDisplayName] = useState(localStorage.getItem("tm_display_name") || "");
  const [teams, setTeams] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_teams") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [users, setUsers] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_users") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [roles, setRoles] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_roles") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockError, setClockError] = useState("");
  const [userSchedules, setUserSchedules] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_user_schedules") || "{}");
      } catch {
        return {};
      }
    })()
  );
  const [userContracts, setUserContracts] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_user_contracts") || "{}");
      } catch {
        return {};
      }
    })()
  );
  const [expandedUser, setExpandedUser] = useState("");
  const [customTeams, setCustomTeams] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_custom_teams") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [period, setPeriod] = useState("week");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const isAdmin = roles.includes("ROLE_ADMIN");
  const isManager = roles.includes("ROLE_MANAGER");
  const isEmployee = roles.includes("ROLE_EMPLOYEE");

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
      setRoute(path);
    }
  };

  useEffect(() => {
    if (route === "/clock-in") {
      if (token) navigate("/dashboard");
      else navigate("/sign-in");
      return;
    }
    const isProtected =
      route === "/profile" ||
      route === "/dashboard" ||
      route === "/dashboard/members" ||
      route === "/dashboard/teams" ||
      route === "/dashboard/teams/createteam";

    if (isProtected && !token) {
      navigate("/sign-in");
      return;
    }

    if (token && route === "/sign-in") {
      navigate("/dashboard");
      return;
    }
  }, [route, token, isAdmin, isManager]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Erreur serveur (${res.status})`);
      }
      if (!res.ok) throw new Error(data?.error || `Erreur serveur (${res.status})`);
      localStorage.setItem("tm_token", data.token);
      localStorage.setItem("tm_roles", JSON.stringify(data.roles || []));
      localStorage.setItem("tm_username", data.username || username);
      localStorage.setItem("tm_team", data.team || "");
      localStorage.setItem("tm_display_name", data.displayName || "");
      localStorage.setItem("tm_teams", JSON.stringify(data.teams || []));
      localStorage.setItem("tm_users", JSON.stringify(data.users || []));
      setToken(data.token);
      setRoles(data.roles || []);
      setCurrentUser(data.username || username);
      setCurrentTeam(data.team || "");
      setCurrentDisplayName(data.displayName || "");
      setTeams(data.teams || []);
      setUsers(data.users || []);
      setPassword("");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem("tm_token");
    localStorage.removeItem("tm_roles");
    localStorage.removeItem("tm_username");
    localStorage.removeItem("tm_team");
    localStorage.removeItem("tm_display_name");
    localStorage.removeItem("tm_teams");
    localStorage.removeItem("tm_users");
    setToken("");
    setRoles([]);
    setCurrentUser("");
    setCurrentTeam("");
    setCurrentDisplayName("");
    setTeams([]);
    setUsers([]);
    navigate("/sign-in");
  };

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const entries = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tm_time_entries") || "[]");
    } catch {
      return [];
    }
  }, [token, currentUser, now]);

  const today = new Date().toISOString().slice(0, 10);
  const userEntries = entries.filter((e) => e.user === currentUser);
  const todayEntries = userEntries.filter((e) => e.date === today);
  const activeEntry = todayEntries.find((e) => !e.clockOut);

  useEffect(() => {
    if (!activeEntry || !currentUser) return;
    const schedule = scheduleForUser(currentUser);
    const entryDate = activeEntry.date || new Date(activeEntry.clockIn).toISOString().slice(0, 10);
    const endTime = parseTimeOnDate(entryDate, schedule.pmEnd);
    const clockInTime = new Date(activeEntry.clockIn);
    if (clockInTime.getTime() >= endTime.getTime()) return;
    if (Date.now() >= endTime.getTime() && !activeEntry.clockOut) {
      const next = entries.map((e) =>
        e.id === activeEntry.id ? { ...e, clockOut: endTime.toISOString(), autoClockOut: true } : e
      );
      saveEntries(next);
    }
  }, [now, activeEntry, currentUser, entries, userSchedules]);

  const defaultSchedule = {
    amStart: "09:00",
    amEnd: "12:00",
    pmStart: "13:30",
    pmEnd: "17:00",
    graceMin: 15,
  };
  const scheduleForUser = (username) => ({
    ...defaultSchedule,
    ...(userSchedules?.[username] || {}),
  });
  const currentSchedule = scheduleForUser(currentUser);

  const parseTimeOnDate = (dateStr, timeStr) => {
    const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const saveSchedules = (next) => {
    localStorage.setItem("tm_user_schedules", JSON.stringify(next));
    setUserSchedules(next);
  };
  const saveContracts = (next) => {
    localStorage.setItem("tm_user_contracts", JSON.stringify(next));
    setUserContracts(next);
  };

  const formatHours = (value) => (Math.round(value * 100) / 100).toFixed(2);
  const entryHours = (e) => {
    if (!e?.clockIn || !e?.clockOut) return 0;
    const start = new Date(e.clockIn).getTime();
    const end = new Date(e.clockOut).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return (end - start) / 3600000;
  };
  const sumHours = (list) => list.reduce((acc, e) => acc + entryHours(e), 0);

  const startOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const getUsersFallback = () => {
    const set = new Set(entries.map((e) => e.user).filter(Boolean));
    if (currentUser) set.add(currentUser);
    return Array.from(set).map((u) => ({ username: u, displayName: u, team: "" }));
  };

  const scopedUsers = (() => {
    const base = users.length ? users : getUsersFallback();
    if (isAdmin) return base;
    if (isManager) return base.filter((u) => u.team === currentTeam);
    return base.filter((u) => u.username === currentUser);
  })();

  const scopedEntries = entries.filter((e) => scopedUsers.some((u) => u.username === e.user));
  const scopedUserEntries = scopedEntries.filter((e) => e.user === currentUser);

  const periodRange = (() => {
    const nowDate = new Date();
    if (period === "month") {
      const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
      const end = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);
      return { start, end, label: "mois" };
    }
    if (period === "year") {
      const start = new Date(nowDate.getFullYear(), 0, 1);
      const end = new Date(nowDate.getFullYear() + 1, 0, 1);
      return { start, end, label: "année" };
    }
    return { start: weekStart, end: weekEnd, label: "semaine" };
  })();

  const customRange = (() => {
    if (!rangeStart || !rangeEnd) return null;
    const start = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${rangeEnd}T00:00:00`);
    end.setDate(end.getDate() + 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end, label: "période" };
  })();

  const activeRange = customRange || periodRange;

  const entriesInPeriod = scopedEntries.filter((e) => {
    const dt = new Date(e.date || e.clockIn);
    return dt >= activeRange.start && dt < activeRange.end;
  });

  const entriesInPeriodCapped = (() => {
    if (period !== "week") return entriesInPeriod;
    if (!isEmployee) return entriesInPeriod;
    const byDate = new Map();
    for (const e of entriesInPeriod) {
      if (!e.date || !e.user) continue;
      if (e.user !== currentUser) continue;
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date).push(e);
    }
    const dates = Array.from(byDate.keys()).sort().slice(0, 5);
    const out = [];
    for (const d of dates) {
      const list = byDate.get(d) || [];
      if (!list.length) continue;
      list.sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
      out.push(list[0]);
    }
    return out;
  })();

  const thisWeekEntries = scopedEntries.filter((e) => {
    const dt = new Date(e.date || e.clockIn);
    return dt >= weekStart && dt < weekEnd;
  });
  const totalHours = sumHours(entriesInPeriodCapped);
  const thisWeekHours = sumHours(thisWeekEntries);
  const todayHours = sumHours(todayEntries);

  const WEEKLY_BUDGET_HOURS = 40;
  const HOURLY_COST = 30;
  const budgetRemaining = Math.max(0, WEEKLY_BUDGET_HOURS - thisWeekHours);
  const budgetPercent = Math.min(100, Math.round((budgetRemaining / WEEKLY_BUDGET_HOURS) * 100));
  const internalCosts = thisWeekHours * HOURLY_COST;
  const uninvoiced = totalHours * HOURLY_COST;

  const weekDays = (() => {
    const days = [];
    for (let i = 0; i < 5; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const entriesForDay = scopedUserEntries.filter((e) => e.date === key);
      const sorted = [...entriesForDay].sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const total = sumHours(entriesForDay);
      days.push({
        key,
        label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" }),
        from: first?.clockIn ? new Date(first.clockIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "",
        to: last?.clockOut ? new Date(last.clockOut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "",
        total,
      });
    }
    return days;
  })();

  const weekSeries = (() => {
    const series = [];
    const start = startOfWeek(new Date());
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(start);
      d.setDate(d.getDate() - i * 7);
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      const hours = sumHours(
        scopedEntries.filter((e) => {
          const dt = new Date(e.date || e.clockIn);
          return dt >= d && dt < next;
        })
      );
      series.push({ label, hours });
    }
    return series;
  })();

  const lastFiveWeekdays = (() => {
    const days = [];
    let d = new Date();
    while (days.length < 5) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) days.push(new Date(d));
      d.setDate(d.getDate() - 1);
    }
    return days.reverse();
  })();

  const expectedDailyHours = (username) => {
    const s = scheduleForUser(username);
    const baseDate = new Date().toISOString().slice(0, 10);
    const amStart = parseTimeOnDate(baseDate, s.amStart);
    const amEnd = parseTimeOnDate(baseDate, s.amEnd);
    const pmStart = parseTimeOnDate(baseDate, s.pmStart);
    const pmEnd = parseTimeOnDate(baseDate, s.pmEnd);
    return Math.max(0, (amEnd - amStart) / 3600000) + Math.max(0, (pmEnd - pmStart) / 3600000);
  };

  const latenessMetrics = (() => {
    let lateCount = 0;
    let shiftCount = 0;
    const grouped = new Map();
    for (const e of entriesInPeriodCapped) {
      if (!e.user || !e.date || !e.clockIn) continue;
      const key = `${e.user}::${e.date}`;
      const list = grouped.get(key) || [];
      list.push(e);
      grouped.set(key, list);
    }
    for (const [key, list] of grouped.entries()) {
      const [username, dateKey] = key.split("::");
      const first = list.sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn))[0];
      const s = scheduleForUser(username);
      const scheduledStart = parseTimeOnDate(
        dateKey,
        new Date(first.clockIn) < parseTimeOnDate(dateKey, s.pmStart) ? s.amStart : s.pmStart
      );
      const graceMs = (s.graceMin || 15) * 60000;
      const lateMinutes = first.lateMinutes ?? Math.max(0, Math.floor((new Date(first.clockIn) - scheduledStart - graceMs) / 60000));
      shiftCount += 1;
      if (lateMinutes > 0) lateCount += 1;
    }
    const rate = shiftCount ? (lateCount / shiftCount) * 100 : 0;
    return { rate, shiftCount };
  })();

  const attendanceMetrics = (() => {
    let expected = 0;
    let worked = 0;
    const days = [];
    for (let d = new Date(activeRange.start); d < activeRange.end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      days.push(new Date(d));
    }
    for (const day of days) {
      const key = day.toISOString().slice(0, 10);
      for (const u of scopedUsers) {
        expected += expectedDailyHours(u.username);
        const dayEntries = entriesInPeriodCapped.filter((e) => e.user === u.username && e.date === key);
        worked += sumHours(dayEntries);
      }
    }
    const rate = expected ? (worked / expected) * 100 : 0;
    return { rate, expected, worked };
  })();

  const averageWorkMetrics = (() => {
    const total = sumHours(entriesInPeriodCapped);
    const count = scopedUsers.length || 1;
    return { hours: total / count };
  })();

  const saveEntries = (next) => {
    localStorage.setItem("tm_time_entries", JSON.stringify(next));
  };

  const seedRandomEntries = () => {
    if (!users.length) return;
    const targetUsers = scopedUsers.length ? scopedUsers : users;
    const base = new Date();
    const next = [];
    const daysToGenerate = 365;
    const randomMinutes = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const nextSchedules = { ...userSchedules };
    const nextContracts = { ...userContracts };

    for (const u of targetUsers) {
      if (!u?.username) continue;
      const amStart = `0${randomMinutes(8, 9)}`.slice(-2) + `:${pick(["00", "15", "30", "45"])}`;
      const amEnd = `12:${pick(["00", "15", "30"])}`;
      const pmStart = `13:${pick(["00", "15", "30", "45"])}`;
      const pmEnd = `1${randomMinutes(7, 8)}`.slice(-2) + `:${pick(["00", "15", "30"])}`;
      const graceMin = pick([10, 15, 20]);
      nextSchedules[u.username] = { amStart, amEnd, pmStart, pmEnd, graceMin };
      nextContracts[u.username] = pick(["CDI", "CDD", "Stage"]);
    }

    for (let i = 0; i < daysToGenerate; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      if (day === 0 || day === 6) continue;
      const dateKey = d.toISOString().slice(0, 10);

      for (const u of targetUsers) {
        if (!u?.username) continue;
        const sched = nextSchedules[u.username] || scheduleForUser(u.username);
        const amStart = parseTimeOnDate(dateKey, sched.amStart);
        const pmStart = parseTimeOnDate(dateKey, sched.pmStart);
        const pmEnd = parseTimeOnDate(dateKey, sched.pmEnd);
        const graceMin = sched.graceMin || 15;

        const lateIn = randomMinutes(-5, 25);
        const extraOut = randomMinutes(-10, 20);

        const clockIn = new Date(amStart);
        clockIn.setMinutes(clockIn.getMinutes() + lateIn);
        const clockOut = new Date(pmEnd);
        clockOut.setMinutes(clockOut.getMinutes() + extraOut);

        const scheduledStart = clockIn < pmStart ? amStart : pmStart;
        const lateMinutes = Math.max(
          0,
          Math.floor((clockIn.getTime() - (scheduledStart.getTime() + graceMin * 60000)) / 60000)
        );

        next.push({
          id: `${u.username}-${dateKey}-${randomMinutes(1000, 9999)}`,
          user: u.username,
          team: u.team || teamByUser.get(u.username) || null,
          date: dateKey,
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          scheduledStart: scheduledStart.toISOString(),
          lateMinutes,
        });
      }
    }

    saveSchedules(nextSchedules);
    saveContracts(nextContracts);
    saveEntries(next);
    window.location.reload();
  };

  const onClockIn = () => {
    if (!currentUser) return;
    if (activeEntry) return;
    setClockError("");
    const schedule = scheduleForUser(currentUser);
    const nowDate = new Date();
    const dateKey = nowDate.toISOString().slice(0, 10);
    const earliestStart = parseTimeOnDate(dateKey, "08:00");
    const amStart = parseTimeOnDate(dateKey, schedule.amStart);
    const pmStart = parseTimeOnDate(dateKey, schedule.pmStart);
    const pmEnd = parseTimeOnDate(dateKey, schedule.pmEnd);
    const graceMs = (schedule.graceMin || 15) * 60 * 1000;

    if (nowDate.getTime() < earliestStart.getTime()) {
      setClockError("Vous ne pouvez pas clock in.");
      return;
    }

    if (nowDate.getTime() >= pmEnd.getTime()) {
      setClockError("Vous ne pouvez pas clock in.");
      return;
    }

    const canClockInMorning = nowDate.getTime() <= amStart.getTime() + graceMs;
    const isBeforeAfternoon = nowDate.getTime() < pmStart.getTime();
    const isAfternoon = nowDate.getTime() >= pmStart.getTime();

    if (!canClockInMorning && isBeforeAfternoon) {
      setClockError("Vous ne pouvez pas clock in.");
      return;
    }

    let scheduledStart = amStart;
    if (!canClockInMorning && isAfternoon) {
      scheduledStart = pmStart;
    } else if (nowDate.getTime() >= pmStart.getTime()) {
      scheduledStart = pmStart;
    }

    const lateMinutes = Math.max(0, Math.floor((nowDate.getTime() - (scheduledStart.getTime() + graceMs)) / 60000));

    const next = [
      ...entries,
      {
        id: `${currentUser}-${Date.now()}`,
        user: currentUser,
        team: currentTeam || null,
        date: today,
        clockIn: new Date().toISOString(),
        clockOut: null,
        scheduledStart: scheduledStart.toISOString(),
        lateMinutes,
      },
    ];
    saveEntries(next);
  };

  const onClockOut = () => {
    if (!activeEntry) return;
    const schedule = scheduleForUser(currentUser);
    const dateKey = new Date().toISOString().slice(0, 10);
    const pmEnd = parseTimeOnDate(dateKey, schedule.pmEnd);
    if (Date.now() >= pmEnd.getTime()) {
      setClockError("Pointage fermé après 17h00.");
      return;
    }
    const next = entries.map((e) =>
      e.id === activeEntry.id ? { ...e, clockOut: new Date().toISOString() } : e
    );
    saveEntries(next);
  };

  const allUsers = useMemo(() => {
    if ((isAdmin || isManager) && users.length) {
      return users
        .filter((u) => (isManager && !isAdmin ? u.team === currentTeam : true))
        .map((u) => u.username)
        .filter(Boolean)
        .sort();
    }
    const set = new Set(
      entries
        .filter((e) => (isManager && !isAdmin && currentTeam ? e.team === currentTeam : true))
        .map((e) => e.user)
    );
    if (currentUser) set.add(currentUser);
    return Array.from(set).filter(Boolean).sort();
  }, [entries, currentUser, isAdmin, isManager, users, currentTeam]);

  const visibleDashboards = (() => {
    if (isAdmin || isManager) return allUsers.filter((u) => u !== currentUser);
    if (isEmployee) return currentUser ? [currentUser] : [];
    return [];
  })();

  const teamByUser = useMemo(() => {
    const map = new Map();
    for (const u of users) {
      if (u.username && u.team && !map.has(u.username)) {
        map.set(u.username, u.team);
      }
    }
    for (const e of entries) {
      if (e.user && e.team && !map.has(e.user)) {
        map.set(e.user, e.team);
      }
    }
    if (currentUser && currentTeam && !map.has(currentUser)) {
      map.set(currentUser, currentTeam);
    }
    return map;
  }, [entries, currentUser, currentTeam, users]);

  const allTeams = useMemo(() => {
    if (isManager && !isAdmin) return currentTeam ? [currentTeam] : [];
    const set = new Set(teams);
    for (const u of users) if (u.team) set.add(u.team);
    for (const e of entries) if (e.team) set.add(e.team);
    return Array.from(set).filter(Boolean).sort();
  }, [teams, entries, users, isAdmin, isManager, currentTeam]);

  const visibleUsersForTeam = useMemo(() => {
    if (isAdmin) return users;
    if (isManager) return users.filter((u) => u.team === currentTeam);
    return [];
  }, [users, isAdmin, isManager, currentTeam]);

  const saveCustomTeams = (next) => {
    localStorage.setItem("tm_custom_teams", JSON.stringify(next));
    setCustomTeams(next);
  };

  const renderLogin = () => (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <div style={{ width: 520, maxWidth: "100%", marginLeft: "auto", marginRight: "auto" }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Nom d’utilisateur
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder=""
          autoComplete="username"
          required
          style={{
            width: 520,
            maxWidth: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            boxSizing: "border-box",
          }}
        />
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", margin: "12px 0 6px" }}>
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={{
            width: 520,
            maxWidth: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 16,
            width: 520,
            maxWidth: "100%",
            border: "none",
            padding: "10px 12px",
            borderRadius: 8,
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
            boxSizing: "border-box",
          }}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </form>
  );

  const renderDashboard = () => (
    <div style={{ marginTop: 12 }}>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Équipe</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{currentTeam || "Dashboard"}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Utilisateur: {currentDisplayName || currentUser || "—"} · Rôles: {roles.length ? roles.join(", ") : "Aucun"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/profile")}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Mon profil
          </button>
          <button
            onClick={() => setShowClockModal(true)}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#111827",
              color: "white",
              cursor: "pointer",
            }}
          >
            Pointage
          </button>
          {(isAdmin || isManager) && (
            <button
              onClick={() => navigate("/dashboard/teams")}
              style={{
                border: "1px solid #e5e7eb",
                padding: "8px 12px",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Gestion teams
            </button>
          )}
          {(isAdmin || isManager) && (
            <button
              onClick={() => navigate("/dashboard/members")}
              style={{
                border: "1px solid #e5e7eb",
                padding: "8px 12px",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Gestion employés
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {[
          { key: "week", label: "Semaine" },
          { key: "month", label: "Mois" },
          { key: "year", label: "Année" },
        ].map((p) => {
          const active = period === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                border: "1px solid #e5e7eb",
                padding: "6px 12px",
                borderRadius: 999,
                background: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
        <div style={{ marginLeft: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>à</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          {(rangeStart || rangeEnd) && (
            <button
              onClick={() => { setRangeStart(""); setRangeEnd(""); }}
              style={{
                border: "1px solid #e5e7eb",
                padding: "6px 10px",
                borderRadius: 999,
                background: "#fff",
                color: "#111827",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <>
          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Taux de retard {isAdmin || isManager ? "moyen" : "personnel"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{formatHours(latenessMetrics.rate)}%</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur {latenessMetrics.shiftCount} pointages</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Temps travaillé {isAdmin || isManager ? "moyen" : "personnel"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{formatHours(averageWorkMetrics.hours)}h</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {isAdmin || isManager ? `Par collaborateur (${activeRange.label})` : `Sur ${activeRange.label}`}
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Taux d’assiduité</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{formatHours(attendanceMetrics.rate)}%</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {formatHours(attendanceMetrics.worked)}h / {formatHours(attendanceMetrics.expected)}h
            </div>
          </div>
        </>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            const rows = [
              ["user", "date", "clockIn", "clockOut"],
              ...entries.map((e) => [e.user, e.date, e.clockIn, e.clockOut || ""]),
            ];
            const csv = rows
              .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "timemanager-export.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Exporter CSV
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              localStorage.removeItem("tm_time_entries");
              localStorage.removeItem("tm_user_schedules");
              localStorage.removeItem("tm_user_contracts");
              localStorage.removeItem("tm_custom_teams");
              window.location.reload();
            }}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Reset données
          </button>
        )}
        {isAdmin && (
          <button
            onClick={seedRandomEntries}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Générer pointages
          </button>
        )}
        <button
          onClick={onLogout}
          style={{
            border: "none",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#ef4444",
            color: "white",
            cursor: "pointer",
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );

  const renderMembers = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Employees</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour dashboard
        </button>
      </div>
      {(isAdmin || isManager) ? (
        <div style={{ display: "grid", gap: 8 }}>
          {(isAdmin
            ? users
            : users
                .filter((u) => u.team === currentTeam)
                .filter((u) => {
                  const rolesList = u.roles || [];
                  if (!rolesList.length) return true;
                  return rolesList.includes("ROLE_EMPLOYEE") && !rolesList.includes("ROLE_MANAGER") && !rolesList.includes("ROLE_ADMIN");
                })
          ).map((u) => {
            const sched = userSchedules?.[u.username] || {};
            const contract = userContracts?.[u.username] || "";
            const isOpen = expandedUser === u.username;
            return (
              <div
                key={u.username}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <button
                  onClick={() => setExpandedUser(isOpen ? "" : u.username)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {u.displayName || u.username} {u.team ? `· ${u.team}` : ""}
                </button>

                {isOpen && (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Contrat</div>
                      <select
                        value={contract}
                        onChange={(e) => {
                          const next = { ...userContracts, [u.username]: e.target.value };
                          setUserContracts(next);
                        }}
                        style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", maxWidth: 180 }}
                      >
                        <option value="" disabled>
                          Choisir...
                        </option>
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="Stage">Stage</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Matin début</div>
                        <input
                          type="time"
                          value={sched.amStart || ""}
                          onChange={(e) => {
                            const next = { ...userSchedules, [u.username]: { ...sched, amStart: e.target.value } };
                            setUserSchedules(next);
                          }}
                          style={{ width: "100%", maxWidth: 160, padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Matin fin</div>
                        <input
                          type="time"
                          value={sched.amEnd || ""}
                          onChange={(e) => {
                            const next = { ...userSchedules, [u.username]: { ...sched, amEnd: e.target.value } };
                            setUserSchedules(next);
                          }}
                          style={{ width: "100%", maxWidth: 160, padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi début</div>
                        <input
                          type="time"
                          value={sched.pmStart || ""}
                          onChange={(e) => {
                            const next = { ...userSchedules, [u.username]: { ...sched, pmStart: e.target.value } };
                            setUserSchedules(next);
                          }}
                          style={{ width: "100%", maxWidth: 160, padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi fin</div>
                        <input
                          type="time"
                          value={sched.pmEnd || ""}
                          onChange={(e) => {
                            const next = { ...userSchedules, [u.username]: { ...sched, pmEnd: e.target.value } };
                            setUserSchedules(next);
                          }}
                          style={{ width: "100%", maxWidth: 160, padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button
              onClick={() => {
                saveSchedules(userSchedules);
                saveContracts(userContracts);
              }}
              style={{
                border: "1px solid #e5e7eb",
                padding: "8px 12px",
                borderRadius: 8,
                background: "#111827",
                color: "white",
                cursor: "pointer",
              }}
            >
              Appliquer
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Accès réservé aux managers.</div>
      )}
    </div>
  );

  const renderTeams = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Teams</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour dashboard
        </button>
      </div>
      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => navigate("/dashboard/teams/createteam")}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Créer une équipe
          </button>
        </div>
      )}
      {allTeams.length ? (
        <div>
          {allTeams.map((t) => (
            <div
              key={t}
              style={{
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginBottom: 8,
                background: "#f9fafb",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Aucune équipe configurée.</div>
      )}
      {customTeams
        .filter((t) => (isAdmin ? true : t.manager === currentUser))
        .length ? (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>Equipes créées</h4>
          {customTeams
            .filter((t) => (isAdmin ? true : t.manager === currentUser))
            .map((t) => (
            <div
              key={`${t.name}-${t.manager}`}
              style={{
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginBottom: 8,
                background: "#f9fafb",
                fontSize: 13,
              }}
            >
              {t.name} · Manager: {t.managerDisplayName || t.manager}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderCreateTeam = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Créer une équipe</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard/teams")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour équipes
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Nom de l’équipe
        </label>
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          required
          style={{
            width: "100%",
            maxWidth: 520,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Manager
        </label>
        <input
          value={currentDisplayName || currentUser || ""}
          readOnly
          disabled
          style={{
            width: "100%",
            maxWidth: 520,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            color: "#6b7280",
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Employés
        </label>
        <div style={{ display: "grid", gap: 8 }}>
          {visibleUsersForTeam.length ? (
            visibleUsersForTeam
              .filter((u) => u.username && u.username !== currentUser)
              .map((u) => {
                const checked = selectedMembers.includes(u.username);
                return (
                  <label key={u.username} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedMembers, u.username]
                          : selectedMembers.filter((m) => m !== u.username);
                        setSelectedMembers(next);
                      }}
                    />
                    <span style={{ fontSize: 13 }}>
                      {u.displayName || u.username}
                    </span>
                  </label>
                );
              })
          ) : (
            <div style={{ fontSize: 13, color: "#6b7280" }}>Aucun employé disponible.</div>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          const name = newTeamName.trim();
          if (!name) return;
          const next = [
            ...customTeams,
            {
              name,
              manager: currentUser || "",
              managerDisplayName: currentDisplayName || "",
              members: selectedMembers,
            },
          ];
          saveCustomTeams(next);
          setNewTeamName("");
          setSelectedMembers([]);
          navigate("/dashboard/teams");
        }}
        style={{
          width: "100%",
          border: "none",
          padding: "10px 12px",
          borderRadius: 8,
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        Créer l’équipe
      </button>
    </div>
  );

  const renderProfile = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Mon profil</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour
        </button>
      </div>
      <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        Utilisateur: {currentDisplayName || currentUser || "—"} | Team: {currentTeam || "—"}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Le changement de mot de passe se fait sur le serveur Windows.
        </div>
      </div>
    </div>
  );

  const renderLanding = () => (
    <div style={{ marginTop: 18 }}>
      <p style={{ color: "#374151" }}>
        Bienvenue sur TimeManager. Gérez le pointage et suivez les équipes en un seul endroit.
      </p>
      <button
        onClick={() => navigate("/sign-in")}
        style={{
          marginTop: 10,
          border: "none",
          padding: "10px 14px",
          borderRadius: 8,
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        Se connecter
      </button>
    </div>
  );

  let content = null;
  if (route === "/") content = renderLanding();
  else if (route === "/sign-in") content = renderLogin();
  else if (route === "/profile") content = renderProfile();
  else if (route === "/dashboard") content = renderDashboard();
  else if (route === "/dashboard/members") content = renderMembers();
  else if (route === "/dashboard/teams") content = renderTeams();
  else if (route === "/dashboard/teams/createteam") content = renderCreateTeam();
  else content = renderLanding();

  const isWideLayout = route.startsWith("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          maxWidth: isWideLayout ? 1100 : 620,
          margin: isWideLayout ? "40px auto" : "80px auto",
          background: "white",
          borderRadius: 12,
          padding: isWideLayout ? 28 : "28px 36px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>TimeManager</h1>
        <p style={{ marginTop: 6, color: "#6b7280" }}>
          {route === "/sign-in" || route === "/" ? "Connexion via Windows Server (LDAPS)" : "Tableau de bord"}
        </p>
        {content}
      </div>

      {showClockModal && (
        <div
          onClick={() => setShowClockModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Pointage</h3>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {new Date(now).toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {new Date(now).toLocaleTimeString("fr-FR")}
            </div>
            {clockError && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>
                {clockError}
              </div>
            )}
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  if (new Date().getHours() >= 17) {
                    setClockError("Vous ne pouvez pas clock in.");
                    return;
                  }
                  onClockIn();
                }}
                disabled={!!activeEntry}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: activeEntry ? "#9ca3af" : "#4b5563",
                  color: "white",
                  cursor: activeEntry ? "not-allowed" : "pointer",
                }}
              >
                Clock in
              </button>
              <button
                onClick={onClockOut}
                disabled={!activeEntry}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: !activeEntry ? "#9ca3af" : "#f59e0b",
                  color: "white",
                  cursor: !activeEntry ? "not-allowed" : "pointer",
                }}
              >
                Clock out
              </button>
            </div>
            <button
              onClick={() => setShowClockModal(false)}
              style={{
                marginTop: 12,
                width: "100%",
                border: "none",
                padding: "10px 12px",
                borderRadius: 8,
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
