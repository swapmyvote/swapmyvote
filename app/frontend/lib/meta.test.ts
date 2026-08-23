import { afterEach, describe, expect, it } from "vitest";
import { readMeta } from "@/lib/meta";

function setMeta(name: string, content: string) {
  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

afterEach(() => {
  for (const meta of document.head.querySelectorAll("meta")) {
    meta.remove();
  }
});

describe("readMeta", () => {
  it("returns the content of a matching meta tag", () => {
    setMeta("smv-thing", "swapmyvote.uk");
    expect(readMeta("smv-thing")).toBe("swapmyvote.uk");
  });

  it("returns null when the tag is absent", () => {
    expect(readMeta("smv-thing")).toBeNull();
  });

  it("returns null when the content is blank", () => {
    setMeta("smv-thing", "   ");
    expect(readMeta("smv-thing")).toBeNull();
  });
});
