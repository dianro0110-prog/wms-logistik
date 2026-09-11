
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
  PackageOpen,
  ScanLine,
  Box,
  ArrowLeft,
  MoveRight,
  UserCircle,
  LogOut,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabase";

export default function SystemPage() {
  const router = useRouter();

  const [mobileMenu, setMobileMenu] = useState<
    "main" | "inbound" | "outbound" | "inventory"
  >("main");

  const [userEmail, setUserEmail] = useState<string>("");

  /* ====================================================== */
  /* ================= GET LOGIN USER ===================== */
  /* ====================================================== */

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || "");
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
      } else {
        setUserEmail("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* ====================================================== */
  /* ======================= LOGOUT ======================= */
  /* ====================================================== */

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* ================= SIDEBAR ================= */}
      {/* Hanya tampil di WEB / DESKTOP */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <main className="relative flex-1 overflow-hidden p-3 sm:p-5 md:p-6">

        {/* ================= BACKGROUND GRID ================= */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundColor: "#f8fafc",
            backgroundImage: `
              linear-gradient(
                rgba(15, 23, 42, 0.06) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(15, 23, 42, 0.06) 1px,
                transparent 1px
              )
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* ================================================== */}
        {/* ================= USER LOGIN ===================== */}
        {/* ================================================== */}

        <div
          className="
            absolute
            right-3
            top-3
            z-50
            flex
            items-center
            gap-2
            sm:right-5
            sm:top-5
            md:right-6
            md:top-6
          "
        >
          {/* USER INFO */}
          <div
            className="
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              py-2
              shadow-sm
            "
          >
            <UserCircle
              size={25}
              strokeWidth={1.7}
              className="text-blue-950"
            />

            <div className="hidden sm:block">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Logged in
              </p>

              <p className="max-w-[180px] truncate text-xs font-semibold text-slate-700">
                {userEmail || "User"}
              </p>
            </div>
          </div>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-red-100
              bg-white
              text-red-500
              shadow-sm
              transition-all
              duration-200
              hover:border-red-200
              hover:bg-red-50
              hover:text-red-600
              hover:shadow-md
              active:scale-95
              sm:h-11
              sm:w-11
            "
          >
            <LogOut size={19} strokeWidth={1.8} />
          </button>
        </div>

        {/* ================= BACK BUTTON ================= */}
        {/* Hanya tampil di DESKTOP */}
        <button
          type="button"
          onClick={() => router.push("/welcome")}
          className="
            relative
            z-20
            group
            mb-4
            hidden
            items-center
            gap-1.5
            rounded-lg
            border
            border-slate-200
            bg-gray-600
            px-3
            py-2
            text-sm
            font-medium
            text-white
            shadow-sm
            transition-all
            duration-200
            hover:bg-slate-50
            hover:text-slate-700
            hover:shadow-md
            sm:mb-5
            sm:gap-2
            sm:rounded-xl
            sm:px-4
            sm:py-2.5
            sm:text-base
            md:flex
          "
        >
          <ArrowLeftCircle
            size={17}
            className="
              transition-transform
              duration-200
              group-hover:-translate-x-1
              sm:h-[19px]
              sm:w-[19px]
            "
          />

          <span>Kembali</span>
        </button>

        {/* ====================================================== */}
        {/* ================= DESKTOP VERSION ==================== */}
        {/* ====================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            hidden
            items-center
            justify-center
            px-5
            md:flex
          "
        >
          <div className="flex w-full max-w-md flex-col items-center justify-center">

            {/* LOGO */}
            <div
              className="
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-2xl
                bg-blue-950
                shadow-xl
                ring-6
                ring-blue-100
                sm:h-24
                sm:w-24
                sm:rounded-3xl
                sm:ring-8
              "
            >
              <Warehouse
                size={44}
                strokeWidth={1.7}
                className="text-white sm:h-[54px] sm:w-[54px]"
              />
            </div>

            {/* ZEE-WMS */}
            <h1
              className="
                mt-5
                text-3xl
                font-extrabold
                tracking-[0.16em]
                text-blue-950
                sm:mt-6
                sm:text-4xl
                sm:tracking-[0.22em]
                md:text-5xl
              "
            >
              ZEE-WMS
            </h1>

            {/* SUBTITLE */}
            <p
              className="
                mt-2
                text-center
                text-[9px]
                font-medium
                uppercase
                tracking-[0.18em]
                text-slate-500
                sm:text-xs
                sm:tracking-[0.28em]
                md:text-sm
              "
            >
              Warehouse Management System
            </p>

          </div>
        </div>

        {/* ====================================================== */}
        {/* ================= MOBILE VERSION ===================== */}
        {/* ====================================================== */}

        <div
          className="
            relative
            z-10
            flex
            min-h-[calc(100vh-40px)]
            flex-col
            justify-center
            px-2
            md:hidden
          "
        >

          {/* ================================================== */}
          {/* ================= MAIN MOBILE ==================== */}
          {/* ================================================== */}

          {mobileMenu === "main" && (
            <>
              {/* MOBILE HEADER */}
              <div className="mb-7 text-center">

                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-blue-950
                    shadow-lg
                    ring-4
                    ring-blue-100
                  "
                >
                  <Warehouse
                    size={34}
                    strokeWidth={1.7}
                    className="text-white"
                  />
                </div>

                <h1
                  className="
                    mt-4
                    text-2xl
                    font-extrabold
                    tracking-[0.14em]
                    text-blue-950
                  "
                >
                  ZEE-WMS
                </h1>

                <p
                  className="
                    mt-1
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.2em]
                    text-slate-500
                  "
                >
                  Warehouse Management System
                </p>

                {/* MOBILE USER */}
                <div
                  className="
                    mx-auto
                    mt-4
                    flex
                    w-fit
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    shadow-sm
                  "
                >
                  <UserCircle
                    size={20}
                    className="text-blue-950"
                  />

                  <span className="max-w-[180px] truncate text-xs font-medium text-slate-600">
                    {userEmail || "User"}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Logout"
                    className="
                      ml-1
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      text-red-500
                      transition
                      hover:bg-red-50
                    "
                  >
                    <LogOut size={15} />
                  </button>
                </div>

              </div>

              {/* MOBILE MENU */}
              <div className="mx-auto w-full max-w-sm space-y-4">

                {/* INBOUND */}
                <button
                  type="button"
                  onClick={() => setMobileMenu("inbound")}
                  className="
                    group
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    duration-200
                    active:scale-[0.98]
                    hover:-translate-y-0.5
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-100
                      text-blue-800
                    "
                  >
                    <PackagePlus size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Inbound
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Receiving & Putaway
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

                {/* OUTBOUND */}
                <button
                  type="button"
                  onClick={() => setMobileMenu("outbound")}
                  className="
                    group
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    duration-200
                    active:scale-[0.98]
                    hover:-translate-y-0.5
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-orange-100
                      text-orange-700
                    "
                  >
                    <PackageCheck size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Outbound
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Allocation & Picking
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

                {/* INVENTORY */}
                <button
                  type="button"
                  onClick={() => setMobileMenu("inventory")}
                  className="
                    group
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    duration-200
                    active:scale-[0.98]
                    hover:-translate-y-0.5
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-emerald-100
                      text-emerald-700
                    "
                  >
                    <Boxes size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Inventory
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Stock & Location
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

              </div>

              {/* MOBILE FOOTER */}
              <p className="mt-8 text-center text-[10px] text-slate-400">
                ZEE-WMS Mobile
              </p>
            </>
          )}

          {/* ================================================== */}
          {/* ================= INBOUND MOBILE ================= */}
          {/* ================================================== */}

          {mobileMenu === "inbound" && (
            <>
              <div className="mb-7 text-center">

                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-blue-950
                    text-white
                    shadow-lg
                    ring-4
                    ring-blue-100
                  "
                >
                  <PackagePlus size={34} strokeWidth={1.7} />
                </div>

                <h1 className="mt-4 text-2xl font-extrabold text-blue-950">
                  Inbound
                </h1>

                <p className="mt-1 text-xs text-slate-500">
                  Receiving & Putaway
                </p>

              </div>

              <div className="mx-auto w-full max-w-sm space-y-4">

                {/* CHECKING */}
                <button
                  type="button"
                  onClick={() => router.push("/inbound/checking")}
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    active:scale-[0.98]
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-100
                      text-blue-800
                    "
                  >
                    <ClipboardCheck size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Checking
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Receiving & Checking
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

                {/* PUTAWAY */}
                <button
                  type="button"
                  onClick={() => router.push("/inbound/putaway")}
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    active:scale-[0.98]
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-indigo-100
                      text-indigo-700
                    "
                  >
                    <PackageOpen size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Putaway
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Putaway & Location
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

              </div>

              <button
                type="button"
                onClick={() => setMobileMenu("main")}
                className="
                  mx-auto
                  mt-7
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-slate-500
                  transition
                  hover:bg-slate-200
                  hover:text-slate-800
                "
              >
                <ArrowLeft size={17} />
                Kembali ke Menu
              </button>
            </>
          )}

          {/* ================================================== */}
          {/* ================= OUTBOUND MOBILE ================ */}
          {/* ================================================== */}

          {mobileMenu === "outbound" && (
            <>
              <div className="mb-7 text-center">

                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-orange-600
                    text-white
                    shadow-lg
                    ring-4
                    ring-orange-100
                  "
                >
                  <PackageCheck size={34} strokeWidth={1.7} />
                </div>

                <h1 className="mt-4 text-2xl font-extrabold text-orange-700">
                  Outbound
                </h1>

                <p className="mt-1 text-xs text-slate-500">
                  Picking & Packing
                </p>

              </div>

              <div className="mx-auto w-full max-w-sm space-y-4">

                {/* PICKING */}
                <button
                  type="button"
                  onClick={() => router.push("/outbound/picking")}
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    active:scale-[0.98]
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-orange-100
                      text-orange-700
                    "
                  >
                    <ScanLine size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Picking
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Picking Order
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

                {/* PACKING */}
                <button
                  type="button"
                  onClick={() => router.push("/outbound/packing")}
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    active:scale-[0.98]
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-amber-100
                      text-amber-700
                    "
                  >
                    <Box size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Packing
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Packing Order
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

              </div>

              <button
                type="button"
                onClick={() => setMobileMenu("main")}
                className="
                  mx-auto
                  mt-7
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-slate-500
                  transition
                  hover:bg-slate-200
                  hover:text-slate-800
                "
              >
                <ArrowLeft size={17} />
                Kembali ke Menu
              </button>
            </>
          )}

          {/* ================================================== */}
          {/* ================= INVENTORY MOBILE =============== */}
          {/* ================================================== */}

          {mobileMenu === "inventory" && (
            <>
              <div className="mb-7 text-center">

                <div
                  className="
                    mx-auto
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-emerald-600
                    text-white
                    shadow-lg
                    ring-4
                    ring-emerald-100
                  "
                >
                  <Boxes size={34} strokeWidth={1.7} />
                </div>

                <h1 className="mt-4 text-2xl font-extrabold text-emerald-700">
                  Inventory
                </h1>

                <p className="mt-1 text-xs text-slate-500">
                  Stock & Location
                </p>

              </div>

              <div className="mx-auto w-full max-w-sm">

                {/* MOVEMENT */}
                <button
                  type="button"
                  onClick={() => router.push("/inventory/movement")}
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    shadow-md
                    transition-all
                    active:scale-[0.98]
                    hover:shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-emerald-100
                      text-emerald-700
                    "
                  >
                    <MoveRight size={28} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Movement
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Stock Movement
                    </p>
                  </div>

                  <span className="ml-auto text-xl text-slate-300">
                    ›
                  </span>
                </button>

              </div>

              <button
                type="button"
                onClick={() => setMobileMenu("main")}
                className="
                  mx-auto
                  mt-7
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-slate-500
                  transition
                  hover:bg-slate-200
                  hover:text-slate-800
                "
              >
                <ArrowLeft size={17} />
                Kembali ke Menu
              </button>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
