"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Warehouse,
  ArrowLeftCircle,
  PackagePlus,
  PackageCheck,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  PackageOpen,
  ScanLine,
  Box,
  ArrowLeft,
  MoveRight,
  UserCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabase";

// =========================================================
// TYPE
// =========================================================

type MobileMenu =
  | "main"
  | "inbound"
  | "outbound"
  | "inventory"
  | "counting";

// =========================================================
// PAGE
// =========================================================

export default function SystemPage() {
  const router = useRouter();

  const [mobileMenu, setMobileMenu] = useState<MobileMenu>("main");
  const [userName, setUserName] = useState("User");

  // =======================================================
  // GET USER
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        setUserName(name);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const user = session.user;

        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        setUserName(name);
      } else {
        setUserName("User");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =======================================================
  // LOGOUT
  // =======================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // =======================================================
  // MOBILE NAVIGATION
  // =======================================================

  const goTo = (path: string) => {
    router.push(path);
  };

  const backToMain = () => {
    setMobileMenu("main");
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ===================================================
          DESKTOP SIDEBAR
      =================================================== */}

      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* ===================================================
          DESKTOP CONTENT
      =================================================== */}

      <main className="hidden min-h-screen md:ml-64 md:block">
        <div className="relative flex min-h-screen items-center justify-center px-8">
          {/* BACK BUTTON */}

          <button
            type="button"
            onClick={() => router.push("/welcome")}
            className="
              absolute
              left-8
              top-8
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-sm
              font-semibold
              text-slate-700
              shadow-sm
              transition
              hover:bg-slate-50
            "
          >
            <ArrowLeftCircle size={20} />
            Kembali
          </button>

          {/* LOGO / TITLE */}

          <div className="text-center">
            <div
              className="
                mx-auto
                mb-6
                flex
                h-24
                w-24
                items-center
                justify-center
                rounded-3xl
                bg-slate-900
                text-white
                shadow-xl
              "
            >
              <Warehouse size={48} strokeWidth={1.8} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Zee-WMS
            </h1>

            <p className="mt-2 text-lg font-medium text-slate-500">
              Warehouse Management System
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Silakan pilih menu melalui sidebar
            </p>
          </div>
        </div>
      </main>

      {/* ===================================================
          MOBILE
      =================================================== */}

      <main className="min-h-screen bg-slate-100 md:hidden">
        <div className="px-4 pb-8 pt-6">
          {/* =================================================
              MOBILE HEADER
          ================================================= */}

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-900
                  text-white
                  shadow-md
                "
              >
                <Warehouse size={25} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Zee-WMS
                </h1>

                <p className="text-xs text-slate-500">
                  Warehouse Management
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/welcome")}
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-white
                text-slate-600
                shadow-sm
                ring-1
                ring-slate-200
              "
            >
              <ArrowLeft size={19} />
            </button>
          </div>

          {/* =================================================
              MAIN MENU
          ================================================= */}

          {mobileMenu === "main" && (
            <>
              {/* USER */}

              <div
                className="
                  mb-5
                  flex
                  items-center
                  justify-between
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-3
                  shadow-sm
                "
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-slate-100
                      text-slate-600
                    "
                  >
                    <UserCircle size={23} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400">
                      Login sebagai
                    </p>

                    <p className="truncate text-sm font-semibold text-slate-800">
                      {userName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    text-red-500
                    transition
                    hover:bg-red-50
                  "
                  title="Logout"
                >
                  <LogOut size={19} />
                </button>
              </div>

              {/* MENU */}

              <div className="space-y-3">
                {/* INBOUND */}

                <button
                  type="button"
                  onClick={() => setMobileMenu("inbound")}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-sm
                    transition
                    active:scale-[0.99]
                    hover:bg-slate-50
                  "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-50
                        text-blue-600
                      "
                    >
                      <PackagePlus size={25} />
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">
                        Inbound
                      </p>

                      <p className="text-xs text-slate-400">
                        Proses barang masuk
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={21}
                    className="text-slate-400"
                  />
                </button>

                {/* OUTBOUND */}

                <button
                  type="button"
                  onClick={() => setMobileMenu("outbound")}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-sm
                    transition
                    active:scale-[0.99]
                    hover:bg-slate-50
                  "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-orange-50
                        text-orange-600
                      "
                    >
                      <PackageCheck size={25} />
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">
                        Outbound
                      </p>

                      <p className="text-xs text-slate-400">
                        Proses barang keluar
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={21}
                    className="text-slate-400"
                  />
                </button>

                {/* INVENTORY */}

                <button
                  type="button"
                  onClick={() => setMobileMenu("inventory")}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-sm
                    transition
                    active:scale-[0.99]
                    hover:bg-slate-50
                  "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-50
                        text-emerald-600
                      "
                    >
                      <Boxes size={25} />
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">
                        Inventory
                      </p>

                      <p className="text-xs text-slate-400">
                        Kelola stok barang
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={21}
                    className="text-slate-400"
                  />
                </button>

                {/* COUNTING */}

                <button
                  type="button"
                  onClick={() => setMobileMenu("counting")}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-sm
                    transition
                    active:scale-[0.99]
                    hover:bg-slate-50
                  "
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-violet-50
                        text-violet-600
                      "
                    >
                      <ClipboardCheck size={25} />
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">
                        Counting
                      </p>

                      <p className="text-xs text-slate-400">
                        Proses stock counting
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={21}
                    className="text-slate-400"
                  />
                </button>
              </div>
            </>
          )}

          {/* =================================================
              INBOUND SUBMENU
          ================================================= */}

          {mobileMenu === "inbound" && (
            <MobileSubMenu
              title="Inbound"
              description="Pilih proses inbound"
              icon={<PackagePlus size={24} />}
              iconClass="bg-blue-50 text-blue-600"
              onBack={backToMain}
              items={[
                {
                  title: "Checking",
                  description: "Pemeriksaan barang masuk",
                  icon: <ClipboardCheck size={22} />,
                  onClick: () => goTo("/inbound/checking"),
                },
                {
                  title: "Putaway",
                  description: "Penempatan barang ke lokasi",
                  icon: <PackageOpen size={22} />,
                  onClick: () => goTo("/inbound/putaway"),
                },
              ]}
            />
          )}

          {/* =================================================
              OUTBOUND SUBMENU
          ================================================= */}

          {mobileMenu === "outbound" && (
            <MobileSubMenu
              title="Outbound"
              description="Pilih proses outbound"
              icon={<PackageCheck size={24} />}
              iconClass="bg-orange-50 text-orange-600"
              onBack={backToMain}
              items={[
                {
                  title: "Picking",
                  description: "Pengambilan barang",
                  icon: <ClipboardList size={22} />,
                  onClick: () => goTo("/outbound/picking"),
                },
                {
                  title: "Packing",
                  description: "Proses packing barang",
                  icon: <Box size={22} />,
                  onClick: () => goTo("/outbound/packing"),
                },
              ]}
            />
          )}

          {/* =================================================
              INVENTORY SUBMENU
          ================================================= */}

          {mobileMenu === "inventory" && (
            <MobileSubMenu
              title="Inventory"
              description="Pilih proses inventory"
              icon={<Boxes size={24} />}
              iconClass="bg-emerald-50 text-emerald-600"
              onBack={backToMain}
              items={[
                {
                  title: "Movement",
                  description: "Perpindahan stok antar lokasi",
                  icon: <MoveRight size={22} />,
                  onClick: () => goTo("/inventory/movement"),
                },
              ]}
            />
          )}

          {/* =================================================
              COUNTING SUBMENU
          ================================================= */}

          {mobileMenu === "counting" && (
            <MobileSubMenu
              title="Counting"
              description="Pilih tahap stock counting"
              icon={<ClipboardCheck size={24} />}
              iconClass="bg-violet-50 text-violet-600"
              onBack={backToMain}
              items={[
                {
                  title: "First Count",
                  description: "Perhitungan fisik pertama",
                  icon: <ClipboardCheck size={22} />,
                  onClick: () => goTo("/counting/firstcount"),
                },
                {
                  title: "Second Count",
                  description: "Perhitungan ulang selisih",
                  icon: <ClipboardList size={22} />,
                  onClick: () => goTo("/counting/secondcount"),
                },
                {
                  title: "Third Count",
                  description: "Perhitungan akhir selisih",
                  icon: <ScanLine size={22} />,
                  onClick: () => goTo("/counting/thirdcount"),
                },
              ]}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// =========================================================
// MOBILE SUBMENU COMPONENT
// =========================================================

type SubMenuItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
};

type MobileSubMenuProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  onBack: () => void;
  items: SubMenuItem[];
};

function MobileSubMenu({
  title,
  description,
  icon,
  iconClass,
  onBack,
  items,
}: MobileSubMenuProps) {
  return (
    <>
      {/* HEADER SUBMENU */}

      <div
        className="
          mb-5
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-4
          shadow-sm
        "
      >
        <button
          type="button"
          onClick={onBack}
          className="
            mb-4
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-500
          "
        >
          <ArrowLeft size={18} />
          Kembali ke Menu
        </button>

        <div className="flex items-center gap-4">
          <div
            className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              ${iconClass}
            `}
          >
            {icon}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            <p className="text-xs text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* SUBMENU ITEMS */}

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="
              flex
              w-full
              items-center
              justify-between
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-4
              text-left
              shadow-sm
              transition
              active:scale-[0.99]
              hover:bg-slate-50
            "
          >
            <div className="flex items-center gap-4">
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-100
                  text-slate-600
                "
              >
                {item.icon}
              </div>

              <div>
                <p className="font-bold text-slate-800">
                  {item.title}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>

            <ChevronRight
              size={20}
              className="text-slate-400"
            />
          </button>
        ))}
      </div>
    </>
  );
}