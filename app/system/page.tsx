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
      <main className="relative flex-1 overflow-hidden p-5 md:p-6">

        {/* ================= BACKGROUND GARIS ================= */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-60
          "
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
            mb-5
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            bg-gray-600
            px-4
            py-2.5
            font-medium
            text-white
            shadow-sm
            transition-all
            duration-200
            hover:bg-slate-50
            hover:text-slate-700
            hover:shadow-md
          "
        >
          <ArrowLeftCircle
            size={19}
            className="
              transition-transform
              duration-200
              group-hover:-translate-x-1
            "
          />

          Kembali
        </button>

        {/* ================= CENTER LOGO ================= */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            flex
            items-center
            justify-center
          "
        >
          <div className="flex flex-col items-center justify-center">

            {/* ================= LOGO ================= */}
            <div
              className="
                flex
                h-24
                w-24
                items-center
                justify-center
                rounded-3xl
                bg-blue-950
                shadow-xl
                ring-8
                ring-blue-100
              "
            >
              <Warehouse
                size={54}
                strokeWidth={1.7}
                className="text-white"
              />
            </div>

            {/* ================= ZEE-WMS ================= */}
            <h1
              className="
                mt-6
                text-4xl
                font-extrabold
                tracking-[0.22em]
                text-blue-950
                md:text-5xl
              "
            >
              ZEE-WMS
            </h1>

            {/* ================= SUBTITLE ================= */}
            <p
              className="
                mt-2
                text-xs
                font-medium
                uppercase
                tracking-[0.28em]
                text-slate-500
                md:text-sm
              "
            >
              Warehouse Management System
            </p>

          </div>
        </div>

      </main>
    </div>
  );
}