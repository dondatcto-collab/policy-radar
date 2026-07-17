// Luồng ghi/đọc GitHub Contents API — SPEC mục 8.
// Bài học bắt buộc #2 (mục 9): mọi call API retry backoff tối đa 3 lần cho 429/5xx.
import {
  API_BASE,
  RAW_BASE,
  GITHUB_BRANCH,
  RETRY_MAX_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
} from "./constants";
import {
  mergeFeedback,
  mergeDecisions,
  DEFAULT_FEEDBACK,
  DEFAULT_DECISIONS,
  getPendingWrites,
  addPendingWrite,
  removePendingWrite,
} from "./storage";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authHeaders(token) {
  const h = { Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function b64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUnicode(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
}

// Retry cho lỗi tạm thời (429 rate-limit / 5xx server) và lỗi mạng thật sự.
// Trả về Response cuối cùng nếu là lỗi HTTP (để caller tự đọc status); ném lỗi
// nếu là network failure đã hết lượt retry.
async function fetchWithRetry(url, options = {}, attempts = RETRY_MAX_ATTEMPTS) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 429 || res.status >= 500) && i < attempts - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (i + 1));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (i + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export async function testConnection(token) {
  try {
    const res = await fetchWithRetry(API_BASE, { headers: authHeaders(token) });
    if (!res.ok) return { ok: false, status: res.status };
    const json = await res.json();
    return { ok: true, status: res.status, private: json.private, fullName: json.full_name };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

async function getFile(path, token) {
  const res = await fetchWithRetry(
    `${API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: authHeaders(token) }
  );
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`GET ${path} thất bại: HTTP ${res.status}`);
  const json = await res.json();
  return { data: JSON.parse(b64DecodeUnicode(json.content)), sha: json.sha };
}

async function putFile(path, dataObj, sha, message, token) {
  const body = {
    message,
    content: b64EncodeUnicode(JSON.stringify(dataObj, null, 2) + "\n"),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  return fetchWithRetry(`${API_BASE}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Liệt kê file trong 1 thư mục (dùng để tìm các file radar-YYYY-MM-DD.json có thật,
// tránh đoán ngày — data/ không có ngày cuối tuần/lễ nên không thể suy ra từ lịch).
export async function listDir(path, token) {
  const res = await fetchWithRetry(
    `${API_BASE}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

// Đọc file JSON chỉ-đọc: ưu tiên raw.githubusercontent.com (public, không cần token);
// nếu lỗi và có token thì thử lại qua Contents API (trường hợp repo private).
export async function readJsonPublic(path, token) {
  try {
    const res = await fetchWithRetry(`${RAW_BASE}/${path}?_=${Date.now()}`);
    if (res.ok) return await res.json();
    if (res.status !== 404) throw new Error(`HTTP ${res.status}`);
    if (!token) return null;
  } catch (e) {
    if (!token) throw e;
  }
  const { data } = await getFile(path, token);
  return data;
}

const FILE_CONFIG = {
  feedback: { path: "feedback/feedback.json", mergeFn: mergeFeedback, defaultState: DEFAULT_FEEDBACK, listKey: "entries" },
  decisions: { path: "feedback/decisions.json", mergeFn: mergeDecisions, defaultState: DEFAULT_DECISIONS, listKey: "entries" },
};

// GET → merge DEFAULT_STATE → append entry → PUT. 409 (sha lệch) → GET lại, retry PUT 1 lần.
async function appendEntry(kind, entry, message, token) {
  const cfg = FILE_CONFIG[kind];
  const attempt = async () => {
    const { data, sha } = await getFile(cfg.path, token);
    const merged = data ? cfg.mergeFn(data) : structuredClone(cfg.defaultState);
    merged[cfg.listKey] = [...merged[cfg.listKey], entry];
    const res = await putFile(cfg.path, merged, sha, message, token);
    return { res, merged };
  };

  let { res } = await attempt();
  if (res.status === 409) {
    ({ res } = await attempt());
  }
  if (!res.ok) {
    throw new Error(`Ghi ${cfg.path} thất bại: HTTP ${res.status}`);
  }
  return true;
}

// Ghi 1 entry: thử ngay; lỗi mạng/API → xếp hàng localStorage (mục 8 bước 5).
export async function writeEntryOrQueue(kind, entry, message, token) {
  try {
    await appendEntry(kind, entry, message, token);
    return { queued: false };
  } catch (e) {
    addPendingWrite({ localId: crypto.randomUUID(), kind, entry, message, error: String(e) });
    return { queued: true, error: String(e) };
  }
}

// Thử ghi lại toàn bộ hàng đợi (gọi khi mở app hoặc người dùng bấm "thử lại")
export async function flushPendingWrites(token) {
  const queue = getPendingWrites();
  let succeeded = 0;
  for (const item of queue) {
    try {
      await appendEntry(item.kind, item.entry, item.message, token);
      removePendingWrite(item.localId);
      succeeded++;
    } catch {
      // giữ nguyên trong hàng đợi, thử lại lần sau
    }
  }
  return { succeeded, remaining: getPendingWrites().length };
}
