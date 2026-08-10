"use client";

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

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
  UserCircle,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState(false);
  const [openMaster, setOpenMaster] = useState(false);
  const [openInbound, setOpenInbound] = useState(false);
  const [openInventory, setOpenInventory] = useState(false);
  const [openOutbound, setOpenOutbound] = useState(false);
  const [openshipment, setOpenshipment] = useState(false);
const router = useRouter();

const [userName, setUserName] = useState("Loading...");
  // ✅ NEW: sidebar collapse
  const [collapsed, setCollapsed] = useState(false);

useEffect(() => {
  const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setUserName("Guest");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profile) {
    setUserName(profile.username);
  } else {
    setUserName(user.email ?? "User");
  }
};

  getUser();
}, []);

const handleLogout = async () => {
  await supabase.auth.signOut();

  localStorage.removeItem("wms_token");

  router.push("/login");
};

  return (
    <aside
  className={`min-h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col ${
    collapsed ? "w-20" : "w-64"
  }`}
>
    
      {/* HEADER */}
      <div className="p-5 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold">🚀 Let's Rock</h1>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800 p-2 rounded"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">

 

    <div className="ml-4 space-y-2">

      {/* MASTER */}
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
        Supplier
      </Link>

      {/* WAREHOUSE */}
      <Link
        href="/warehouses"
        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
      >
        <Warehouse size={18} />
        Warehouse
      </Link>

      {/* INBOUND */}
      <button
        onClick={() => setOpenInbound(!openInbound)}
        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
      >
        <div className="flex items-center gap-3">
          <ArrowDownCircle size={18} />
          Inbound
        </div>
        <span>{openInbound ? "▲" : "▼"}</span>
      </button>

      {openInbound && (
        <div className="ml-6 space-y-1">
          <Link href="/inbound/receiving" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Receiving
          </Link>
          <Link href="/inbound/checking" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Checking
          </Link>
          <Link href="/inbound/putaway" className="block px-3 py-2 hover:bg-slate-800 rounded">
          Checking Report
          </Link>
          <Link href="/inbound/putaway" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Putaway
          </Link>
          <Link href="/inbound/putaway" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Putaway Report
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
          Inventory
        </div>
        <span>{openInventory ? "▲" : "▼"}</span>
      </button>

      {openInventory && (
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
          Outbound
        </div>
        <span>{openOutbound ? "▲" : "▼"}</span>
      </button>

      {openOutbound && (
        <div className="ml-6 space-y-1">
          <Link href="/outbound/upload" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Upload Orders
          </Link>

          <Link href="/outbound/orders" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Order List
          </Link>

          <Link href="/outbound/picking" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Picking
          </Link>
          <Link href="/outbound/picking-report" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Picking Report
          </Link>

          <Link href="/outbound/packing" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Packing
          </Link>
          <Link href="/outbound/packing-report" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Packing Report
          </Link>
        </div>
      )}

{/* SHIPMENT */}
<button
        onClick={() => setOpenshipment(!openshipment)}
        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800"
      >
        <div className="flex items-center gap-3">
          <ArrowUpCircle size={18} />
          Shipment
        </div>
        <span>{openshipment ? "▲" : "▼"}</span>
      </button>

      {openshipment && (
        <div className="ml-6 space-y-1">
          <Link href="/shipment/online" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Shipment Online
          </Link>

          <Link href="/shipment/online-report" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Shipment Online Report
          </Link>

          <Link href="/shipment/offline" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Shipment Offline
          </Link>
          <Link href="/shipment/offline-report" className="block px-3 py-2 hover:bg-slate-800 rounded">
            Shipment Offline Report
          </Link>

          
        </div>
      )}

      {/* REPORT */}
      <Link
        href="/reports"
        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800"
      >
        <FileText size={18} />
        Laporan
      </Link>

    </div>
  

</nav>

<div className="border-t border-slate-700 p-4">

  {!collapsed && (
    <div className="flex items-center gap-3 mb-4">
      <UserCircle size={40} />

      <div>
        <div className="text-xs text-slate-400">
          Users Login
        </div>

        <div className="font-semibold text-sm break-all">
          {userName}
        </div>
      </div>
    </div>
  )}

  <button
    onClick={handleLogout}
    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 py-2 rounded-lg transition"
  >
    <LogOut size={18} />

    {!collapsed && "Logout"}
  </button>

</div>
    </aside>
  );
}