import { describe, expect, it } from "vitest";
import { errorMessage } from "@/lib/strings";
import { ApiError, readApiError } from "./error";

describe("readApiError", () => {
  it("parses the { statusCode, code, message } shape", async () => {
    const res = Response.json(
      { statusCode: 401, code: "INVALID_CREDENTIALS", message: "x" },
      { status: 401 },
    );
    const err = await readApiError(res);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  it("falls back to INTERNAL_ERROR on a non-JSON body", async () => {
    const err = await readApiError(new Response("oops", { status: 502 }));
    expect(err).toMatchObject({ statusCode: 502, code: "INTERNAL_ERROR" });
  });
});

describe("errorMessage", () => {
  it("maps known codes to Vietnamese and unknown codes to the generic message", () => {
    expect(errorMessage("INVALID_CREDENTIALS")).toBe("Email hoặc mật khẩu không đúng.");
    expect(errorMessage("SOMETHING_NEW")).toBe(errorMessage("INTERNAL_ERROR"));
    expect(errorMessage(undefined)).toBe(errorMessage("INTERNAL_ERROR"));
  });
});
