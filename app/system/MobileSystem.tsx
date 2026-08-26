"use client";

import { useRouter } from "next/navigation";
import {
  Warehouse,
  ArrowLeftCircle,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";

export default function SystemPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* ================= SIDEBAR ================= */}
      <Sidebar />

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

        {/* ================= BACK BUTTON ================= */}
        <button
          type="button"
          onClick={() => router.push("/welcome")}
          className="
            relative
            z-20
            group
            mb-4
            flex
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

        {/* ================= CENTER CONTENT ================= */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            flex
            items-center
            justify-center
            px-5
          "
        >
          <div className="flex w-full max-w-md flex-col items-center justify-center">

            {/* ================= LOGO ================= */}
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

            {/* ================= ZEE-WMS ================= */}
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

            {/* ================= SUBTITLE ================= */}
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

            {/* ================= MOBILE DESCRIPTION ================= */}
            <div
              className="
                mt-7
                w-full
                max-w-xs
                rounded-2xl
                border
                border-slate-200
                bg-white/80
                px-5
                py-4
                text-center
                shadow-sm
                backdrop-blur-sm
                sm:hidden
              "
            >
              <p className="text-xs leading-relaxed text-slate-500">
                Sistem manajemen gudang untuk membantu
                mengelola aktivitas warehouse secara
                efisien dan terintegrasi.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}