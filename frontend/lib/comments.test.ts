import { describe, expect, it } from "vitest";
import { keptMentions, mentionAt, splitMentions, suggest } from "./comments";

const p = (id: string, name: string) => ({ id, name, avatarUrl: null });
const lan = p("1", "Lan"), lanAnh = p("2", "Lan Anh"), hung = p("3", "Hùng"), duc = p("4", "Đức");

describe("comments", () => {
  it("finds the @ before the caret", () => {
    expect(mentionAt("xem @hu", 7)).toEqual({ start: 4, query: "hu" });
    expect(mentionAt("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionAt("mail@x", 6)).toBeNull();
    expect(mentionAt("@a\nb", 4)).toBeNull();
  });

  it("suggests members first, ignoring diacritics", () => {
    expect(suggest([lan, hung, lanAnh], "", ["2"]).map((x) => x.id)).toEqual(["2", "1", "3"]);
    expect(suggest([lan, hung, duc], "hung", [])).toEqual([hung]);
    expect(suggest([lan, hung, duc], "duc", [])).toEqual([duc]);
  });

  it("keeps only mentions still in the text", () => {
    expect(keptMentions("@Hùng ơi", [hung, lan, hung])).toEqual([hung]);
  });

  it("splits out mentions, longest name first", () => {
    expect(splitMentions("@Lan Anh và @Lan.", [lan, lanAnh])).toEqual([
      { text: "@Lan Anh", person: lanAnh },
      { text: " và ", person: undefined },
      { text: "@Lan", person: lan },
      { text: ".", person: undefined },
    ]);
    expect(splitMentions("@Lan", [])).toEqual([{ text: "@Lan" }]);
  });
});
