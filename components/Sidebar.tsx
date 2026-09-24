

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
const [openreports, setOpenreports] = useState(false);
const [opencounting, setOpencounting] = useState(false);
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
  className={`min-h-screen bg-slate-100 text-slate-900 transition-all duration-300 flex flex-col ${
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
          className="text-slate-900 hover:bg-slate-800 p-2 rounded"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">

 

   

      {/* MASTER */}
     <button
  onClick={() => !collapsed && setOpenMaster(!openMaster)}
  title={collapsed ? "Master Data" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <Package size={18} />

    {!collapsed && "Master Data"}
  </div>

  {!collapsed && (
    <span>
      {openMaster ? "▲" : "▼"}
    </span>
  )}
</button>

{openMaster && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/products"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Products
    </Link>

    <Link
      href="/location"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Location
    </Link>

    <Link
      href="/categories"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Category
    </Link>
  </div>
)}

      {/* SUPPLIER */}
      <Link
  href="/suppliers"
  title={collapsed ? "Supplier" : ""}
  className={`flex items-center rounded hover:bg-slate-300 ${
    collapsed ? "justify-center px-2" : "gap-3 px-3"
  } py-2`}
>
  <Building2 size={18} />
  {!collapsed && "Supplier"}
</Link>

      {/* WAREHOUSE */}
      <Link
  href="/warehouse"
  title={collapsed ? "Supplier" : ""}
  className={`flex items-center rounded hover:bg-slate-300 ${
    collapsed ? "justify-center px-2" : "gap-3 px-3"
  } py-2`}
>
  <Building2 size={18} />
  {!collapsed && "warehouse"}
</Link>

      {/* INBOUND */}
      <button
  onClick={() => !collapsed && setOpenInbound(!openInbound)}
  title={collapsed ? "Inbound" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <ArrowDownCircle size={18} />

    {!collapsed && "Inbound"}
  </div>

  {!collapsed && (
    <span>
      {openInbound ? "▲" : "▼"}
    </span>
  )}
</button>

{openInbound && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/inbound/receiving"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Receiving
    </Link>

    <Link
      href="/inbound/checking"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Checking
    </Link>

    

    <Link
      href="/inbound/putaway"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Putaway
    </Link>

   
  </div>
)}

      {/* INVENTORY */}
      <button
  onClick={() => !collapsed && setOpenInventory(!openInventory)}
  title={collapsed ? "Inventory" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <Boxes size={18} />

    {!collapsed && "Inventory"}
  </div>

  {!collapsed && (
    <span>
      {openInventory ? "▲" : "▼"}
    </span>
  )}
</button>

{openInventory && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/inventory/inventory_list"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Inventory List
    </Link>

    <Link
      href="/inventory/movement"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Movement
    </Link>

    <Link
      href="/inventory/movement_list"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Movement List
    </Link>
  </div>
)}

      {/* OUTBOUND */}
      <button
  onClick={() => !collapsed && setOpenOutbound(!openOutbound)}
  title={collapsed ? "Outbound" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <ArrowUpCircle size={18} />

    {!collapsed && "Outbound"}
  </div>

  {!collapsed && (
    <span>
      {openOutbound ? "▲" : "▼"}
    </span>
  )}
</button>

{openOutbound && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/outbound/upload"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Upload Orders
    </Link>

    <Link
      href="/outbound/orders"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Order List
    </Link>

    <Link
      href="/outbound/picking"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Picking
    </Link>

    
    <Link
      href="/outbound/packing"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Packing
    </Link>

    <Link
      href="/outbound/handling-unit"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Handling Unit
    </Link>

    <Link
      href="/outbound/surat-jalan"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Surat Jalan
    </Link>
    
  </div>
)}

{/* SHIPMENT */}
<button
  onClick={() => !collapsed && setOpenshipment(!openshipment)}
  title={collapsed ? "Shipment" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <ArrowUpCircle size={18} />

    {!collapsed && "Shipment"}
  </div>

  {!collapsed && (
    <span>
      {openshipment ? "▲" : "▼"}
    </span>
  )}
</button>

{openshipment && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/shipment/online"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Shipment B2C
    </Link>

    <Link
      href="/shipment/online-report"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      B2C Report
    </Link>

    <Link
      href="/shipment/offline"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Shipment B2B
    </Link>

    <Link
      href="/shipment/offline-report"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      B2B Report
    </Link>
  </div>
)}




      {/* REPORT */}

<button
  onClick={() => !collapsed && setOpenreports(!openreports)}
  title={collapsed ? "reports" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <ArrowUpCircle size={18} />

    {!collapsed && "Reports"}
  </div>

  {!collapsed && (
    <span>
      {openreports ? "▲" : "▼"}
    </span>
  )}
</button>

{openreports && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/reports/checking-report"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Checking Report
    </Link>

    <Link
      href="/reports/putaway-report"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Putaway Report
    </Link>

    <Link
      href="/reports/picking-report"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Picking Report
    </Link>

    <Link
      href="/reports/packing-report"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Packing Report
    </Link>
  </div>
)}



      {/* COUNTING */}

<button
  onClick={() => !collapsed && setOpencounting(!opencounting)}
  title={collapsed ? "counting" : ""}
  className={`w-full flex items-center rounded hover:bg-slate-300 py-2 ${
    collapsed
      ? "justify-center px-2"
      : "justify-between px-3"
  }`}
>
  <div
    className={`flex items-center ${
      collapsed ? "" : "gap-3"
    }`}
  >
    <ArrowUpCircle size={18} />

    {!collapsed && "Counting"}
  </div>

  {!collapsed && (
    <span>
      {opencounting ? "▲" : "▼"}
    </span>
  )}
</button>

{opencounting && !collapsed && (
  <div className="ml-6 space-y-1">
    <Link
      href="/counting/firstcount"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
     First Count
    </Link>

    <Link
      href="/counting/secondcount"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Second Count
    </Link>

    <Link
      href="/counting/thirdcount"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Third Count
    </Link>

    <Link
      href="/counting/countingreports"
      className="block px-3 py-2 hover:bg-slate-300 rounded"
    >
      Counting Report
    </Link>
  </div>
)}

     {/* INVOICE */}
      <Link
  href="/invoice"
  title={collapsed ? "Invoice" : ""}
  className={`flex items-center rounded hover:bg-slate-300 ${
    collapsed ? "justify-center px-2" : "gap-3 px-3"
  } py-2`}
>
  <Building2 size={18} />
  {!collapsed && "Invoice"}
</Link>

 
  

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