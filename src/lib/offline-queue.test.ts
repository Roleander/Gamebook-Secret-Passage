import { describe, expect, it } from "vitest";
import {
  applyIdMap,
  classifyReplayStatus,
  makeSyntheticId,
} from "@/lib/offline-queue";

describe("classifyReplayStatus", () => {
  it("marks 2xx as done", () => {
    expect(classifyReplayStatus(200)).toBe("done");
    expect(classifyReplayStatus(201)).toBe("done");
    expect(classifyReplayStatus(204)).toBe("done");
  });

  it("keeps the queue on auth failures", () => {
    expect(classifyReplayStatus(401)).toBe("stop");
    expect(classifyReplayStatus(403)).toBe("stop");
  });

  it("drops stale or invalid mutations", () => {
    expect(classifyReplayStatus(400)).toBe("drop");
    expect(classifyReplayStatus(402)).toBe("drop");
    expect(classifyReplayStatus(404)).toBe("drop");
    expect(classifyReplayStatus(409)).toBe("drop");
    expect(classifyReplayStatus(422)).toBe("drop");
  });

  it("stops on server errors to retry later", () => {
    expect(classifyReplayStatus(500)).toBe("stop");
    expect(classifyReplayStatus(503)).toBe("stop");
  });
});

describe("applyIdMap", () => {
  it("returns the value unchanged when the map is empty", () => {
    expect(applyIdMap("body with offline-1-abc", new Map())).toBe(
      "body with offline-1-abc"
    );
  });

  it("replaces every occurrence of a synthetic id", () => {
    const map = new Map([["offline-1-aaa", "clxyz123"]]);
    const body = JSON.stringify({
      sourceId: "offline-1-aaa",
      targetId: "offline-1-aaa",
    });
    const result = applyIdMap(body, map);
    expect(result).not.toContain("offline-1-aaa");
    expect(result.split("clxyz123")).toHaveLength(3);
  });

  it("applies several mappings including the url", () => {
    const map = new Map([
      ["offline-1-a", "real1"],
      ["offline-2-b", "real2"],
    ]);
    expect(
      applyIdMap(`/api/links?sourceId=offline-1-a&targetId=offline-2-b`, map)
    ).toBe("/api/links?sourceId=real1&targetId=real2");
  });

  it("does not corrupt unrelated content", () => {
    const map = new Map([["offline-9-z", "keep"]]);
    expect(applyIdMap("passage number 12 untouched", map)).toBe(
      "passage number 12 untouched"
    );
  });
});

describe("makeSyntheticId", () => {
  it("creates unique prefixed ids", () => {
    const a = makeSyntheticId();
    const b = makeSyntheticId();
    expect(a).toMatch(/^offline-\d+-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});
