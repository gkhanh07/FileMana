import { describe, expect, it } from "vitest";
import { appLink, fileKind, formatSize, MAX_UPLOAD } from "./files";

describe("file display and upload limit", () => {
  it("formats zero, missing sizes and Vietnamese decimal commas", () => {
    expect(formatSize(null)).toBe("—");
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1536)).toBe("1,5 KB");
    expect(formatSize(1.5 * 1024 ** 2)).toBe("1,5 MB");
    expect(MAX_UPLOAD).toBe(104857600);
  });
  it("previews safe formats and treats HTML/SVG as escaped text", () => {
    expect(fileKind("PHOTO.JPG")).toBe("image");
    expect(fileKind("clip.webm")).toBe("video");
    expect(fileKind("readme.md")).toBe("text");
    expect(fileKind("page.html")).toBe("text");
    expect(fileKind("image.svg")).toBe("text");
    expect(fileKind("design.fig")).toBe("other");
  });
});
describe("app link chips", () => {
  const origin = "https://filemana.test";
  it("accepts app paths and same-origin URLs", () => {
    expect(appLink("/tasks/WEB-1", origin)).toEqual({ kind: "task", id: "WEB-1" });
    expect(appLink(`${origin}/projects/123?view=board`, origin)).toEqual({ kind: "project", id: "123" });
  });
  it("leaves external and malformed URLs alone", () => {
    expect(appLink("https://other.test/tasks/WEB-1", origin)).toBeNull();
    expect(appLink("javascript:alert(1)", origin)).toBeNull();
    expect(appLink("tasks/WEB-1", origin)).toBeNull();
  });
});
