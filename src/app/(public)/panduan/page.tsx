import type { Metadata } from "next";
import { ChevronDown, FileText, Map as MapIcon, MapPin, Search } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { LinkButton } from "@/components/ui/button";
import { Card, IconBadge, SectionHeading } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Panduan",
  description: "Cara mencari makam dan menemukan posisinya di TPU Astana Pratiksha Cianjur.",
};

const STEPS = [
  { icon: Search, title: "Cari nama yang dimakamkan", text: "Ketik sebagian nama di kolom pencarian. Nama lengkap tidak wajib." },
  { icon: FileText, title: "Lihat detail makam", text: "Pilih hasil pencarian untuk melihat tanggal wafat, blok, nomor, dan kode makam." },
  { icon: MapPin, title: "Buka petunjuk ke TPU", text: "Tekan \"Petunjuk ke TPU\" untuk membuka rute menuju TPU di Google Maps." },
  { icon: MapIcon, title: "Cek denah posisi makam", text: "Setelah tiba, tekan \"Lihat Posisi Makam\". Makam tujuan ditandai hijau pada denah." },
] as const;

const FAQ = [
  {
    q: "Bagaimana cara mencari makam?",
    a: "Buka menu Cari Makam, lalu ketik minimal 2 huruf dari nama yang dimakamkan, misalnya \"Rita\". Hasil muncul otomatis. Anda juga dapat mengetik kode makam seperti A-032.",
  },
  {
    q: "Nama yang saya cari tidak ditemukan. Apa yang harus dilakukan?",
    a: "Coba ketik sebagian nama saja atau ejaan lain. Data berasal dari catatan tulisan tangan yang sedang diverifikasi petugas. Bila tetap tidak ditemukan, silakan hubungi petugas TPU.",
  },
  {
    q: "Apakah saya bisa melihat denah lokasi makam?",
    a: "Ya. Pada halaman detail makam, tekan \"Lihat Posisi Makam\". Denah bisa digeser dan diperbesar. Makam tujuan berwarna hijau, makam lain abu-abu.",
  },
  {
    q: "Apakah tersedia petunjuk rute ke TPU?",
    a: "Ya. Tombol \"Petunjuk ke TPU\" membuka Google Maps menuju lokasi TPU Astana Pratiksha Cianjur.",
  },
  {
    q: "Apakah data ahli waris ditampilkan?",
    a: "Tidak. Data ahli waris (nama, telepon, alamat) bersifat internal dan hanya dapat diakses petugas.",
  },
] as const;

export default function PanduanPage() {
  return (
    <>
      <PageHero
        eyebrow="Panduan Penggunaan"
        title="Cara Menggunakan"
        accent="TPU Astana Pratiksha Cianjur"
        description="Ikuti langkah berikut untuk menemukan lokasi makam dengan lebih cepat, akurat, dan mudah."
        crumbs={[{ label: "Panduan" }]}
      />
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6">
        <section className="space-y-8">
          <SectionHeading eyebrow="Langkah Mudah" title="Temukan Lokasi Makam dalam 4 Langkah" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Card className="relative h-full p-5 pt-6">
                  <span className="absolute -top-3 left-5 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <IconBadge className="mb-4 size-12">
                    <step.icon className="size-5" />
                  </IconBadge>
                  <h3 className="font-serif text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-[0.95rem] text-muted">{step.text}</p>
                </Card>
              </li>
            ))}
          </ol>
          <div className="flex justify-center">
            <LinkButton href="/cari-makam" size="lg" icon={<Search className="size-5" aria-hidden="true" />}>
              Mulai Cari Makam
            </LinkButton>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-6">
          <SectionHeading eyebrow="Pertanyaan Umum" title="FAQ (Pertanyaan yang Sering Diajukan)" />
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-line bg-white">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-5 pb-4 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
