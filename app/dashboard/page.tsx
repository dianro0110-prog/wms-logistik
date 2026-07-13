"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
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

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // KPI REAL DATA
  const [totalReceiving, setTotalReceiving] = useState(0);
  const [totalChecking, setTotalChecking] = useState(0);
  const [totalPutaway, setTotalPutaway] = useState(0);
  const [totalProduct, setTotalProduct] = useState(0);

  // CHART DATA REAL
  const [monthlyReceiving, setMonthlyReceiving] = useState<any[]>([]);
  const [monthlyPutaway, setMonthlyPutaway] = useState<any[]>([]);

  // ================= LOAD KPI =================
  async function loadKPI() {
    const [{ count: r }, { count: c }, { count: p }, { count: pr }] =
      await Promise.all([
        supabase.from("receivings").select("*", { count: "exact", head: true }),
        supabase.from("checking").select("*", { count: "exact", head: true }),
        supabase.from("putaways").select("*", { count: "exact", head: true }),
        supabase.from("product").select("*", { count: "exact", head: true }),
      ]);

    setTotalReceiving(r || 0);
    setTotalChecking(c || 0);
    setTotalPutaway(p || 0);
    setTotalProduct(pr || 0);
  }

  // ================= LOAD CHART RECEIVING =================
  async function loadMonthlyReceiving() {
    const { data } = await supabase
      .from("receivings")
      .select("created_at");

    const map: Record<string, number> = {};

    (data || []).forEach((d) => {
      const month = new Date(d.created_at).toLocaleString("id-ID", {
        month: "short",
      });

      map[month] = (map[month] || 0) + 1;
    });

    setMonthlyReceiving(
      Object.keys(map).map((m) => ({
        month: m,
        total: map[m],
      }))
    );
  }

  // ================= LOAD CHART PUTAWAY =================
  async function loadMonthlyPutaway() {
    const { data } = await supabase
      .from("putaways")
      .select("created_at");

    const map: Record<string, number> = {};

    (data || []).forEach((d) => {
      const month = new Date(d.created_at).toLocaleString("id-ID", {
        month: "short",
      });

      map[month] = (map[month] || 0) + 1;
    });

    setMonthlyPutaway(
      Object.keys(map).map((m) => ({
        month: m,
        total: map[m],
      }))
    );
  }

  // ================= REALTIME =================
  useEffect(() => {
    loadKPI();
    loadMonthlyReceiving();
    loadMonthlyPutaway();
    setLoading(false);

    const channel = supabase
      .channel("wms-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receivings" },
        () => {
          loadKPI();
          loadMonthlyReceiving();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "putaways" },
        () => {
          loadKPI();
          loadMonthlyPutaway();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checking" },
        () => {
          loadKPI();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="p-6 space-y-6">

          {/* HEADER */}
          <div>
            <h1 className="text-3xl font-bold">
              Dashboard WMS Realtime
            </h1>
            <p className="text-slate-500">
              Data langsung dari aktivitas Receiving, Checking, Putaway
            </p>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Receiving" value={totalReceiving} />
            <StatCard title="Checking" value={totalChecking} />
            <StatCard title="Putaway" value={totalPutaway} />
            <StatCard title="Products" value={totalProduct} />
          </div>

          {/* CHART REAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* RECEIVING CHART */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold mb-4">
                Receiving Activity (Realtime)
              </h2>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyReceiving}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PUTAWAY CHART */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold mb-4">
                Putaway Activity (Realtime)
              </h2>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyPutaway}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* STATUS VISUAL REAL */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-4">
              Workflow Status WMS
            </h2>

            <div className="space-y-4">

              <div>
                <div className="flex justify-between">
                  <span>Receiving</span>
                  <span>{totalReceiving}</span>
                </div>
                <div className="h-3 bg-slate-200 rounded">
                  <div
                    className="h-3 bg-blue-500 rounded"
                    style={{ width: `${Math.min(totalReceiving, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <span>Checking</span>
                  <span>{totalChecking}</span>
                </div>
                <div className="h-3 bg-slate-200 rounded">
                  <div
                    className="h-3 bg-yellow-500 rounded"
                    style={{ width: `${Math.min(totalChecking, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <span>Putaway</span>
                  <span>{totalPutaway}</span>
                </div>
                <div className="h-3 bg-slate-200 rounded">
                  <div
                    className="h-3 bg-green-500 rounded"
                    style={{ width: `${Math.min(totalPutaway, 100)}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  );
}