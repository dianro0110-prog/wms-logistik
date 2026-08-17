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

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="relative flex-1 p-5 md:p-6">

        {/* Back Button */}
        <button
          onClick={() => router.push("/welcome")}
          className="
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
            className="transition-transform group-hover:-translate-x-1"
          />

          Kembali
        </button>

        {/* CENTER LOGO + ZEE-WMS */}
        <div className="absolute inset-0 flex items-center justify-center">

          <div className="flex flex-col items-center justify-center">

            {/* Logo */}
            <div
              className="
                flex
                h-28
                w-28
                items-center
                justify-center
                rounded-3xl
                bg-blue-950
                shadow-2xl
                ring-8
                ring-blue-100
              "
            >
              <Warehouse
                size={64}
                strokeWidth={1.7}
                className="text-white"
              />
            </div>

            {/* ZEE-WMS */}
            <h1
              className="
                mt-7
                text-5xl
                font-extrabold
                tracking-[0.25em]
                text-blue-950
                md:text-6xl
              "
            >
              ZEE-WMS
            </h1>

            {/* Subtitle */}
            <p
              className="
                mt-3
                text-sm
                font-medium
                uppercase
                tracking-[0.3em]
                text-slate-500
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