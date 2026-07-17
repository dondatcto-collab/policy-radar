// localStorage + merge với DEFAULT_STATE — bài học kỹ thuật bắt buộc #1 (mục 9 SPEC):
// không bao giờ giả định trường tồn tại khi đọc state từ localStorage hoặc JSON repo.
import { LOCALSTORAGE_KEYS } from "./constants";

export function deepMerge(defaults, incoming) {
  if (incoming === null || incoming === undefined) return defaults;
  if (Array.isArray(defaults)) return Array.isArray(incoming) ? incoming : defaults;
  if (typeof defaults === "object" && defaults !== null) {
    if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) {
      return defaults;
    }
    const out = { ...defaults };
    for (const key of Object.keys(defaults)) {
      out[key] = deepMerge(defaults[key], incoming[key]);
    }
    // giữ thêm các field lạ mà incoming có nhưng default chưa biết — tránh mất dữ liệu tương lai
    for (const key of Object.keys(incoming)) {
      if (!(key in out)) out[key] = incoming[key];
    }
    return out;
  }
  return incoming;
}

export const DEFAULT_FEEDBACK = { schemaVersion: "1.0", entries: [] };
export const DEFAULT_DECISIONS = { schemaVersion: "1.0", entries: [] };
export const DEFAULT_PENDING_TASKS = { schemaVersion: "1.0", tasks: [] };

export function mergeFeedback(json) {
  return deepMerge(DEFAULT_FEEDBACK, json);
}
export function mergeDecisions(json) {
  return deepMerge(DEFAULT_DECISIONS, json);
}
export function mergePendingTasks(json) {
  return deepMerge(DEFAULT_PENDING_TASKS, json);
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return deepMerge(fallback, parsed);
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage đầy hoặc bị chặn (chế độ riêng tư) — bỏ qua, không crash app
  }
}

// --- Token ---
export function getToken() {
  try {
    return localStorage.getItem(LOCALSTORAGE_KEYS.token) || "";
  } catch {
    return "";
  }
}
export function setToken(token) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEYS.token, token);
  } catch {
    /* noop */
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(LOCALSTORAGE_KEYS.token);
    localStorage.removeItem(LOCALSTORAGE_KEYS.tokenExpiry);
  } catch {
    /* noop */
  }
}
export function getTokenExpiry() {
  try {
    return localStorage.getItem(LOCALSTORAGE_KEYS.tokenExpiry) || "";
  } catch {
    return "";
  }
}
export function setTokenExpiry(dateStr) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEYS.tokenExpiry, dateStr);
  } catch {
    /* noop */
  }
}

// --- Hysteresis state: { [signalId]: levelKey } ---
export function getHysteresisState() {
  return readLS(LOCALSTORAGE_KEYS.hysteresisState, {});
}
export function setHysteresisState(state) {
  writeLS(LOCALSTORAGE_KEYS.hysteresisState, state);
}

// --- Pending writes queue (offline / lỗi mạng) ---
export function getPendingWrites() {
  return readLS(LOCALSTORAGE_KEYS.pendingWrites, []);
}
export function setPendingWrites(list) {
  writeLS(LOCALSTORAGE_KEYS.pendingWrites, list);
}
export function addPendingWrite(item) {
  const list = getPendingWrites();
  list.push(item);
  setPendingWrites(list);
  return list;
}
export function removePendingWrite(localId) {
  const list = getPendingWrites().filter((w) => w.localId !== localId);
  setPendingWrites(list);
  return list;
}

// --- Task đã làm trong phiên/thiết bị này (che khỏi hộp nhiệm vụ trước khi
// pending-tasks.json được máy sinh lại) — bookkeeping thuần client, không phải schema ---
export function getDoneTaskIds() {
  return readLS(LOCALSTORAGE_KEYS.doneTasks, []);
}
export function markTaskDone(taskId) {
  const list = getDoneTaskIds();
  if (!list.includes(taskId)) list.push(taskId);
  writeLS(LOCALSTORAGE_KEYS.doneTasks, list);
  return list;
}
