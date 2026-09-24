import { describe, expect, it, vi } from "vitest";
import { runSaveFlow } from "@/lib/admin/save-flow";
import { MESSAGES } from "@/lib/config";
import { graveFormSchema, toFieldErrors } from "@/lib/validation";

const saved = { status: "success" as const, message: "Data makam berhasil disimpan.", data: { id: "g1", grave_code: "A-032" } };

describe("foto opsional & isolasi kegagalan (FR-010, NFR-005, AC-ADM-04)", () => {
  it("simpan tanpa foto tetap berhasil", async () => {
    const flow = await runSaveFlow({ save: async () => saved });
    expect(flow.result.status).toBe("success");
    expect(flow.photo).toBe("none");
  });

  it("upload gagal (error storage) TIDAK menggagalkan data utama", async () => {
    const flow = await runSaveFlow({
      save: async () => saved,
      uploadPhoto: async () => ({ status: "error", message: "Bucket penuh" }),
    });
    expect(flow.result.status).toBe("success");
    expect(flow.photo).toBe("failed");
    expect(flow.photoMessage).toBe(MESSAGES.photoUploadFailed);
  });

  it("upload melempar exception (jaringan putus) tetap tidak menggagalkan data utama", async () => {
    const flow = await runSaveFlow({
      save: async () => saved,
      uploadPhoto: async () => {
        throw new Error("network");
      },
    });
    expect(flow.result.status).toBe("success");
    expect(flow.photo).toBe("failed");
  });

  it("foto baru diunggah SETELAH data utama tersimpan, memakai id hasil simpan", async () => {
    const order: string[] = [];
    const upload = vi.fn(async (id: string) => {
      order.push(`upload:${id}`);
      return { status: "success" as const, message: "ok" };
    });
    await runSaveFlow({
      save: async () => {
        order.push("save");
        return saved;
      },
      uploadPhoto: upload,
    });
    expect(order).toEqual(["save", "upload:g1"]);
  });

  it("bila data utama gagal disimpan, foto tidak diunggah", async () => {
    const upload = vi.fn();
    const flow = await runSaveFlow({ save: async () => ({ status: "error", message: "gagal" }), uploadPhoto: upload });
    expect(flow.result.status).toBe("error");
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("validasi form makam (client + server memakai skema yang sama)", () => {
  const valid = {
    deceased_name: "  Rita   Mangsari ",
    death_date: "2021-03-12",
    date_semantics: "WAFAT",
    heir_name: "",
    heir_phone: "0812 3456 7890",
    heir_address: "",
    block_id: "6f1c2a4e-8b3d-4c5e-9f60-1a2b3c4d5e6f",
    grave_number: "32",
    visual_row: "",
    visual_column: "",
    visual_x: "",
    visual_y: "",
    is_public: "on",
    transcription_notes: "",
    verify_death_date: "on",
  };

  it("menerima data valid, merapikan spasi, dan flag checkbox", () => {
    const result = graveFormSchema.parse(valid);
    expect(result.deceased_name).toBe("Rita Mangsari");
    expect(result.grave_number).toBe(32);
    expect(result.heir_name).toBeNull();
    expect(result.verify_death_date).toBe(true);
    expect(result.verify_heir_address).toBe(false);
    expect(result.is_public).toBe(true);
  });

  it("tanggal wafat boleh kosong (data staging), tetapi tidak boleh di masa depan", () => {
    expect(graveFormSchema.parse({ ...valid, death_date: "" }).death_date).toBeNull();
    const future = graveFormSchema.safeParse({ ...valid, death_date: "2999-01-01" });
    expect(future.success).toBe(false);
  });

  it("pesan error sederhana per field", () => {
    const result = graveFormSchema.safeParse({ ...valid, deceased_name: " ", grave_number: "abc", heir_phone: "12" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      expect(errors.deceased_name).toBe("Nama yang dimakamkan wajib diisi.");
      expect(errors.grave_number).toMatch(/angka/);
      expect(errors.heir_phone).toMatch(/pendek/);
    }
  });

  it("baris & kolom harus diisi bersamaan", () => {
    const result = graveFormSchema.safeParse({ ...valid, visual_row: "3" });
    expect(result.success).toBe(false);
  });
});
