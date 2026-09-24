import { describe, expect, it } from "vitest";
import { formatGraveCode, normalizeGraveCodeParam, parseGraveCode } from "@/lib/graves/code";
import {
  ALL_VERIFIED,
  computeVerificationStatus,
  flaggedFields,
  pickFlags,
  VERIFY_FIELD_KEYS,
} from "@/lib/graves/verification";

describe("kode makam (BLOK + NOMOR)", () => {
  it("A + 32 => A-032", () => {
    expect(formatGraveCode("A", 32)).toBe("A-032");
    expect(formatGraveCode("a", 1)).toBe("A-001");
    expect(formatGraveCode("B", 149)).toBe("B-149");
  });

  it("nomor >= 1000 tidak terpotong", () => {
    expect(formatGraveCode("A", 1000)).toBe("A-1000");
    expect(formatGraveCode("C", 12345)).toBe("C-12345");
  });

  it("mengenali input kode makam dari pengguna", () => {
    expect(parseGraveCode("A-032")).toBe("A-032");
    expect(parseGraveCode("a32")).toBe("A-032");
    expect(parseGraveCode(" A 032 ")).toBe("A-032");
    expect(parseGraveCode("Rita")).toBeNull();
    expect(parseGraveCode("A-0")).toBeNull();
  });

  it("normalisasi parameter URL", () => {
    expect(normalizeGraveCodeParam("a-032")).toBe("A-032");
    expect(normalizeGraveCodeParam("A%2D032")).toBe("A-032");
    expect(normalizeGraveCodeParam("%E0%A4%A")).toBeNull();
  });
});

describe("verifikasi per field", () => {
  it("record NEEDS_VERIFICATION bila minimal satu field perlu dicek", () => {
    expect(computeVerificationStatus(ALL_VERIFIED)).toBe("VERIFIED");
    expect(computeVerificationStatus({ ...ALL_VERIFIED, verify_heir_address: true })).toBe("NEEDS_VERIFICATION");
  });

  it("AC-ADM-02: hanya alamat ahli waris yang ditandai bila verify_heir_address=true", () => {
    const flagged = flaggedFields({ ...ALL_VERIFIED, verify_heir_address: true });
    expect(flagged.map((f) => f.key)).toEqual(["verify_heir_address"]);
  });

  it("AC-ADM-03: setelah field ditandai benar, status dihitung ulang menjadi VERIFIED", () => {
    const before = pickFlags({ verify_death_date: true, verify_heir_address: true });
    expect(computeVerificationStatus(before)).toBe("NEEDS_VERIFICATION");
    const after = { ...before, verify_death_date: false, verify_heir_address: false };
    expect(computeVerificationStatus(after)).toBe("VERIFIED");
    expect(flaggedFields(after)).toHaveLength(0);
  });

  it("pickFlags hanya menerima true eksplisit (null/undefined => sudah benar)", () => {
    const flags = pickFlags({ verify_deceased_name: null, verify_location: true });
    expect(flags.verify_deceased_name).toBe(false);
    expect(flags.verify_location).toBe(true);
    expect(Object.keys(flags).sort()).toEqual([...VERIFY_FIELD_KEYS].sort());
  });
});
