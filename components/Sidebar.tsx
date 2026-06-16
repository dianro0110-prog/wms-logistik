"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Tags,
  Building2,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
} from "lucide-react";

export default function Sidebar() {
  const [openMaster, setOpenMaster] = useState(false);
  const [openInbound, setOpenInbound] = useState(false);
  const [openOutbound, setOpenOutbound] = useState(false);

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white">

      {/* LOGO */}
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-xl font-bold">WMS LOGISTIK</h1>
      </div>

      <nav className="p-4 space-y-2">

        {/* ================= DASHBOARD ================= */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        {/* ================= MASTER DATA ================= */}
        <button
          onClick={() => setOpenMaster(!openMaster)}
          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <Package size={18} />
            Master Data
          </div>
          <span>{openMaster ? "▲" : "▼"}</span>
        </button>

        {openMaster && (
          <div className="ml-6 space-y-1">

            <Link
              href="/products"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Products
            </Link>

            <Link
              href="/location"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Location
            </Link>

            <Link
              href="/categories"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Category
            </Link>

          </div>
        )}

        {/* ================= SUPPLIER ================= */}
        <Link
          href="/suppliers"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <Building2 size={18} />
          Supplier
        </Link>

        {/* ================= WAREHOUSE ================= */}
        <Link
          href="/warehouses"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <Warehouse size={18} />
          Gudang
        </Link>

        {/* ================= BARANG MASUK ================= */}
        <button
          onClick={() => setOpenInbound(!openInbound)}
          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <ArrowDownCircle size={18} />
            Barang Masuk
          </div>
          <span>{openInbound ? "▲" : "▼"}</span>
        </button>

        {openInbound && (
          <div className="ml-6 space-y-1">

            <Link
              href="/inbound/receiving"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Receiving
            </Link>

            <Link
              href="/inbound/checking"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Checking
            </Link>

            <Link
              href="/inbound/putaway"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Putaway
            </Link>

          </div>
        )}

        {/* ================= BARANG KELUAR ================= */}
        <button
          onClick={() => setOpenOutbound(!openOutbound)}
          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <ArrowUpCircle size={18} />
            Barang Keluar
          </div>
          <span>{openOutbound ? "▲" : "▼"}</span>
        </button>

        {openOutbound && (
          <div className="ml-6 space-y-1">

            <Link
              href="/outbound/picking"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Picking
            </Link>

            <Link
              href="/outbound/packing"
              className="block px-3 py-2 rounded hover:bg-slate-800"
            >
              Packing
            </Link>

          </div>
        )}

        {/* ================= REPORT ================= */}
        <Link
          href="/reports"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <FileText size={18} />
          Laporan
        </Link>

      </nav>
    </aside>
  );
}

