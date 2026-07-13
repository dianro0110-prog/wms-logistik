"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Building2,
  Warehouse,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Boxes,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const [openMaster, setOpenMaster] = useState(false);
  const [openInbound, setOpenInbound] = useState(false);
  const [openInventory, setOpenInventory] = useState(false);
  const [openOutbound, setOpenOutbound] = useState(false);

  // ✅ NEW: sidebar collapse
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`min-h-screen bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* HEADER */}
      <div className="p-5 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold">WMS LOGISTIK</h1>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800 p-2 rounded"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <nav className="p-4 space-y-2">

        {/* DASHBOARD */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <LayoutDashboard size={18} />
          {!collapsed && "Dashboard"}
        </Link>

        {/* MASTER */}
        <button
          onClick={() => setOpenMaster(!openMaster)}
          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <Package size={18} />
            {!collapsed && "Master Data"}
          </div>
          {!collapsed && <span>{openMaster ? "▲" : "▼"}</span>}
        </button>

        {!collapsed && openMaster && (
          <div className="ml-6 space-y-1">
            <Link href="/products" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Products
            </Link>
            <Link href="/location" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Location
            </Link>
            <Link href="/categories" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Category
            </Link>
          </div>
        )}

        {/* SUPPLIER */}
        <Link
          href="/suppliers"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <Building2 size={18} />
          {!collapsed && "Supplier"}
        </Link>

        {/* WAREHOUSE */}
        <Link
          href="/warehouses"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <Warehouse size={18} />
          {!collapsed && "Gudang"}
        </Link>

        {/* INBOUND */}
        <button
          onClick={() => setOpenInbound(!openInbound)}
          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <ArrowDownCircle size={18} />
            {!collapsed && "Barang Masuk"}
          </div>
          {!collapsed && <span>{openInbound ? "▲" : "▼"}</span>}
        </button>

        {!collapsed && openInbound && (
          <div className="ml-6 space-y-1">
            <Link href="/inbound/receiving" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Receiving
            </Link>
            <Link href="/inbound/checking" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Checking
            </Link>
            <Link href="/inbound/putaway" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Putaway
            </Link>
          </div>
        )}

        {/* INVENTORY */}
        <button
          onClick={() => setOpenInventory(!openInventory)}
          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <Boxes size={18} />
            {!collapsed && "Inventory"}
          </div>
          {!collapsed && <span>{openInventory ? "▲" : "▼"}</span>}
        </button>

        {!collapsed && openInventory && (
          <div className="ml-6 space-y-1">
            <Link href="/inventory/inventory_list" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Inventory List
            </Link>
            <Link href="/inventory/movement" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Movement
            </Link>
            <Link href="/inventory/movement_list" className="block px-3 py-2 hover:bg-slate-800 rounded">
              Movement List
            </Link>
          </div>
        )}

        {/* OUTBOUND */}
<button
  onClick={() => setOpenOutbound(!openOutbound)}
  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
>
  <div className="flex items-center gap-3">
    <ArrowUpCircle size={18} />
    {!collapsed && "Barang Keluar"}
  </div>
  {!collapsed && <span>{openOutbound ? "▲" : "▼"}</span>}
</button>

{!collapsed && openOutbound && (
  <div className="ml-6 space-y-1">

    <Link
      href="/outbound/upload"
      className="block px-3 py-2 hover:bg-slate-800 rounded"
    >
      Upload Orders
    </Link>

<Link href="/outbound/orders">
  <div className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded">
    Order List
  </div>
</Link>


    <Link
      href="/outbound/picking"
      className="block px-3 py-2 hover:bg-slate-800 rounded"
    >
      Picking
    </Link>

    <Link
      href="/outbound/packing"
      className="block px-3 py-2 hover:bg-slate-800 rounded"
    >
      Packing
    </Link>

  </div>
)}
        {/* REPORT */}
        <Link
          href="/reports"
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
        >
          <FileText size={18} />
          {!collapsed && "Laporan"}
        </Link>

      </nav>
    </aside>
  );
}