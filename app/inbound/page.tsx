"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/Statcard";

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">

        {/* TOP NAVBAR */}
        <Navbar />

        {/* CONTENT */}
        <main className="p-6 space-y-6">
         <div className="bg-red-500 text-white p-4">
  TEST TOMBOL
</div>
          {/* HEADER */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Dashboard WMS
              </h1>
              <p className="text-slate-500">
                Ringkasan aktivitas warehouse
              </p>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <StatCard
              title="Total Barang"
              value="250"
            />

            <StatCard
              title="Stok"
              value="12.500"
            />

            <StatCard
              title="Barang Masuk"
              value="320"
            />

            <StatCard
              title="Barang Keluar"
              value="180"
            />

          </div>

        </main>

      </div>
    </div>
  );
}