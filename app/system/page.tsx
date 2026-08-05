"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../../components/Sidebar";

export default function SystemPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100">

      <Sidebar />

      <main className="flex-1 p-6">

        <button
          onClick={() => router.push("/welcome")}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg bg-white shadow hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
          Kembali
        </button>

        <h1 className="text-3xl font-bold">
          Warehouse Management System
        </h1>

        <p className="mt-2 text-slate-500">
          Pilih menu pada Sidebar untuk memulai pekerjaan.
        </p>

      </main>

    </div>
  );
}