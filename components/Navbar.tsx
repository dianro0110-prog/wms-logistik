"use client";

import { useRouter } from "next/navigation";
import { Bell, Search, UserCircle, LogOut } from "lucide-react";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("wms_token");
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-6 py-4">

        <h1 className="text-xl font-bold">Dashboard Warehouse</h1>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500"
        >
          <LogOut size={18} />
          Logout
        </button>

      </div>
    </header>
  );
}