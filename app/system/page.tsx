
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../../components/Sidebar";

export default function SystemPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-6 relative">
        {/* Tombol Kembali */}
        <button
          onClick={() => router.push("/welcome")}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg bg-white shadow hover:bg-gray-100 transition"
        >
          <ArrowLeft size={20} />
          Kembali
        </button>

        {/* Area Welcome */}
        <div className="relative flex flex-col items-center justify-center h-[75vh] text-center overflow-hidden rounded-2xl bg-white shadow-sm">
          
          {/* Background gambar racking gudang */}
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-15"
            style={{
              backgroundImage: "url('/images/warehouse-racking.png')",
            }}
          />

          {/* Overlay agar gambar lebih lembut */}
          <div className="absolute inset-0 bg-white/50" />

          {/* Konten */}
          <div className="relative z-10 px-6">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800">
              Warehouse Management System
            </h1>

            <p className="mt-4 text-lg text-slate-500">
              Select the menu on the Sidebar to start work.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
