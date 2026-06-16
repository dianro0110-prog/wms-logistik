"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/Statcard";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const produkKeluarData = [
  { bulan: "Jan", qty: 120 },
  { bulan: "Feb", qty: 180 },
  { bulan: "Mar", qty: 250 },
  { bulan: "Apr", qty: 210 },
  { bulan: "Mei", qty: 320 },
  { bulan: "Jun", qty: 280 },
];

const stokData = [
  { bulan: "Jan", stok: 1200 },
  { bulan: "Feb", stok: 1800 },
  { bulan: "Mar", stok: 1600 },
  { bulan: "Apr", stok: 2200 },
  { bulan: "Mei", stok: 2400 },
  { bulan: "Jun", stok: 2600 },
];

const kategoriData = [
  { name: "Elektronik", value: 35 },
  { name: "Sparepart", value: 25 },
  { name: "Aksesoris", value: 20 },
  { name: "Lainnya", value: 20 },
];

const COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wms_token");

    if (!token) {
      router.replace("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="p-6 space-y-6">

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Dashboard Warehouse
            </h1>

            <p className="text-slate-500">
              Monitoring aktivitas gudang secara realtime
            </p>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Produk" value="250" />
            <StatCard title="Total Stok" value="12.500" />
            <StatCard title="Barang Masuk" value="320" />
            <StatCard title="Barang Keluar" value="180" />
          </div>

          {/* Aktivitas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Aktivitas Gudang Hari Ini
              </h2>

              <div className="space-y-5">

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Receiving</span>
                    <span>85%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full">
                    <div className="h-3 w-[85%] bg-blue-500 rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Putaway</span>
                    <span>70%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full">
                    <div className="h-3 w-[70%] bg-green-500 rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Picking</span>
                    <span>55%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full">
                    <div className="h-3 w-[55%] bg-yellow-500 rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Shipping</span>
                    <span>40%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full">
                    <div className="h-3 w-[40%] bg-red-500 rounded-full"></div>
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Ringkasan Operasional
              </h2>

              <div className="grid grid-cols-2 gap-4">

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Receiving</p>
                  <p className="text-2xl font-bold text-blue-600">125</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Putaway</p>
                  <p className="text-2xl font-bold text-green-600">98</p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Picking</p>
                  <p className="text-2xl font-bold text-yellow-600">76</p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500">Shipping</p>
                  <p className="text-2xl font-bold text-red-600">54</p>
                </div>

              </div>
            </div>

          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Produk Keluar per Bulan
              </h2>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={produkKeluarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="qty"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Trend Stok Gudang
              </h2>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stokData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="stok"
                      stroke="#10b981"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Distribusi Kategori Produk
            </h2>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kategoriData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label
                  >
                    {kategoriData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}