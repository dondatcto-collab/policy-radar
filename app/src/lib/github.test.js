// Test hàng đợi pendingWrites — 3 trường hợp bắt buộc (Việc 1):
// (a) trùng id → coi như đã đồng bộ, không ghi trùng
// (b) sha lệch (409) → lấy sha mới, gộp entry rồi ghi lại
// (c) lỗi mạng → giữ nguyên trong hàng đợi
import { describe, it, expect, beforeEach, vi } from "vitest";
import { writeEntryOrQueue, flushPendingWrites } from "./github";
import { getPendingWrites, addPendingWrite } from "./storage";

const FEEDBACK_PATH = "feedback/feedback.json";

function b64(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

function contentsResponse(dataObj, sha) {
  return jsonResponse({ content: b64(dataObj), sha });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("appendEntry qua flushPendingWrites — 3 trường hợp bắt buộc", () => {
  it("(a) trùng id trong file trên repo → coi như đã đồng bộ, xóa khỏi hàng đợi, KHÔNG PUT lại", async () => {
    const entry = { id: "fb-2026-01-01", date: "2026-01-01", reportId: "rpt-2026-01-01", rating: "on_target", note: "", createdAt: "2026-01-01T00:00:00.000Z" };
    addPendingWrite({ localId: "local-1", kind: "feedback", entry, message: "feedback: fb-2026-01-01" });

    const fetchMock = vi.fn(async (url, opts) => {
      if (String(url).includes(FEEDBACK_PATH) && (!opts || opts.method !== "PUT")) {
        // Entry đã tồn tại sẵn trên repo (ví dụ PUT trước đó thực ra đã thành công
        // nhưng client không nhận được phản hồi, hoặc thiết bị khác đã ghi hộ).
        return contentsResponse({ schemaVersion: "1.0", entries: [entry] }, "sha-1");
      }
      if (opts && opts.method === "PUT") {
        throw new Error("KHÔNG được gọi PUT khi entry đã tồn tại — sẽ tạo bản ghi trùng");
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushPendingWrites("tok");

    expect(result.deduped).toBe(1);
    expect(result.synced).toBe(0);
    expect(result.succeeded).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getPendingWrites()).toEqual([]);
    expect(fetchMock.mock.calls.some(([, opts]) => opts && opts.method === "PUT")).toBe(false);
  });

  it("(b) sha lệch (409) → GET lại lấy sha mới, gộp entry rồi PUT lại thành công", async () => {
    const entry = { id: "fb-2026-01-02", date: "2026-01-02", reportId: "rpt-2026-01-02", rating: "noise", note: "", createdAt: "2026-01-02T00:00:00.000Z" };
    addPendingWrite({ localId: "local-2", kind: "feedback", entry, message: "feedback: fb-2026-01-02" });

    let getCount = 0;
    const putShaSeen = [];
    const fetchMock = vi.fn(async (url, opts) => {
      if (opts && opts.method === "PUT") {
        const body = JSON.parse(opts.body);
        putShaSeen.push(body.sha);
        if (body.sha === "sha-old") {
          return jsonResponse({ message: "sha lệch" }, { status: 409 });
        }
        return jsonResponse({ content: body.content }, { status: 200 });
      }
      // GET — lần đầu trả sha cũ (chưa có entry), lần 2 (sau 409) trả sha mới
      // (mô phỏng máy khác vừa ghi thêm dữ liệu không liên quan trong lúc đó).
      getCount++;
      const sha = getCount === 1 ? "sha-old" : "sha-new";
      return contentsResponse({ schemaVersion: "1.0", entries: [] }, sha);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushPendingWrites("tok");

    expect(result.synced).toBe(1);
    expect(result.deduped).toBe(0);
    expect(getPendingWrites()).toEqual([]);
    // PUT đầu dùng sha cũ (bị 409), PUT sau phải dùng sha MỚI vừa GET lại — không
    // được lặp lại sha cũ đã biết chắc là lệch.
    expect(putShaSeen).toEqual(["sha-old", "sha-new"]);
  });

  it("(c) lỗi mạng → giữ nguyên trong hàng đợi, không mất entry, có lý do 'network'", async () => {
    const entry = { id: "fb-2026-01-03", date: "2026-01-03", reportId: "rpt-2026-01-03", rating: "on_target", note: "", createdAt: "2026-01-03T00:00:00.000Z" };
    addPendingWrite({ localId: "local-3", kind: "feedback", entry, message: "feedback: fb-2026-01-03" });

    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = flushPendingWrites("tok");
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.succeeded).toBe(0);
    expect(result.remaining).toBe(1);
    expect(result.firstReason).toBe("network");

    const queue = getPendingWrites();
    expect(queue).toHaveLength(1);
    expect(queue[0].entry.id).toBe("fb-2026-01-03");
    expect(queue[0].reason).toBe("network");
  });
});

describe("writeEntryOrQueue", () => {
  it("ghi thành công thì không xếp hàng đợi", async () => {
    const entry = { id: "fb-2026-01-04", date: "2026-01-04", reportId: "rpt-2026-01-04", rating: "on_target", note: "", createdAt: "2026-01-04T00:00:00.000Z" };
    const fetchMock = vi.fn(async (url, opts) => {
      if (opts && opts.method === "PUT") return jsonResponse({}, { status: 200 });
      return contentsResponse({ schemaVersion: "1.0", entries: [] }, "sha-1");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeEntryOrQueue("feedback", entry, "feedback: fb-2026-01-04", "tok");

    expect(result.queued).toBe(false);
    expect(getPendingWrites()).toEqual([]);
  });

  it("lỗi mạng thì xếp vào hàng đợi kèm lý do", async () => {
    const entry = { id: "fb-2026-01-05", date: "2026-01-05", reportId: "rpt-2026-01-05", rating: "on_target", note: "", createdAt: "2026-01-05T00:00:00.000Z" };
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));

    const resultPromise = writeEntryOrQueue("feedback", entry, "feedback: fb-2026-01-05", "tok");
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.queued).toBe(true);
    expect(result.reason).toBe("network");
    expect(getPendingWrites()).toHaveLength(1);
  });
});
