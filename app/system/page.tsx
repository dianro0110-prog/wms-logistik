
"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Warehouse,
  Boxes,
  PackageCheck,
  ScanLine,
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
      <main className="flex-1 p-5 md:p-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/welcome")}
          className="group flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl
          bg-gray-600 border border-slate-200 shadow-sm
          text-white font-medium
          hover:bg-slate-50 hover:shadow-md
          transition-all duration-200"
        >
          <ArrowLeftCircle
            size={19}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Kembali
        </button>

        {/* Hero Section */}
        <section className="relative min-h-[calc(100vh-120px)] overflow-hidden rounded-3xl shadow-xl border border-white/60">
          
          {/* Warehouse Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('/images/warehouse-racking.png')",
            }}
          />

          {/* Dark / Blue Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/65 to-blue-950/60" />

          {/* Soft Light Effect */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />

          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 min-h-[calc(100vh-120px)] flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12">
            
            {/* Header Badge */}
            <div className="mb-6">
              <div
                className="inline-flex items-center gap-2 px-4 py-2
                rounded-full bg-white/10 border border-white/20
                backdrop-blur-md text-white text-sm font-medium"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>

                Warehouse System Online
              </div>
            </div>

            {/* Main Title */}
            <div className="max-w-4xl">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="flex items-center justify-center
                  w-14 h-14 rounded-2xl
                  bg-white/10 border border-white/20
                  backdrop-blur-md"
                >
                  <Warehouse
                    size={30}
                    className="text-white"
                  />
                </div>

                <div>
                  <p className="text-blue-200 text-sm font-semibold uppercase tracking-[0.25em]">
                    zee-wms
                  </p>

                  <p className="text-white/60 text-sm">
                    Warehouse Management System
                  </p>
                </div>
              </div>

              <h1
                className="text-4xl md:text-5xl lg:text-6xl
                font-bold tracking-tight text-white leading-tight"
              >
                Warehouse
                <span className="block text-blue-300">
                  Management System
                </span>
              </h1>

              <p
                className="mt-6 max-w-2xl
                text-base md:text-lg
                leading-relaxed text-slate-200/90"
              >
                Manage your warehouse operations efficiently.
                Select a menu from the sidebar to start receiving,
                checking, putaway, allocation, and picking activities.
              </p>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-4xl">

              {/* Receiving */}
              <div
                className="group p-5 rounded-2xl
                bg-white/10 border border-white/15
                backdrop-blur-md
                hover:bg-white/15
                hover:-translate-y-1
                transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl
                    bg-blue-900
                    flex items-center justify-center"
                  >
                    <Boxes
                      size={21}
                      className="text-blue-300"
                    />
                  </div>

                  <div>
                    <p className="text-white font-semibold">
                      Inbound
                    </p>

                    <p className="text-white/50 text-xs">
                      Receiving, Checking, & Putaway
                    </p>
                  </div>
                </div>
              </div>

              {/* Checking */}
              <div
                className="group p-5 rounded-2xl
                bg-white/10 border border-white/15
                backdrop-blur-md
                hover:bg-white/15
                hover:-translate-y-1
                transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl
                    bg-emerald-900
                    flex items-center justify-center"
                  >
                    <PackageCheck
                      size={21}
                      className="text-emerald-300"
                    />
                  </div>

                  <div>
                    <p className="text-white font-semibold">
                      Inventory
                    </p>

                    <p className="text-white/50 text-xs">
                      Inventory List & Movement
                    </p>
                  </div>
                </div>
              </div>

              {/* Picking */}
              <div
                className="group p-5 rounded-2xl
                bg-white/10 border border-white/15
                backdrop-blur-md
                hover:bg-white/15
                hover:-translate-y-1
                transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl
                    bg-orange-900
                    flex items-center justify-center"
                  >
                    <ScanLine
                      size={21}
                      className="text-orange-300"
                    />
                  </div>

                  <div>
                    <p className="text-white font-semibold">
                      Outbound
                    </p>

                    <p className="text-white/50 text-xs">
                      Picking, Packing & Shipment
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Text */}
            <div className="mt-10 flex items-center gap-3 text-white/50 text-sm">
              <div className="h-px w-10 bg-white/20" />

              <span>
                Select a menu from the sidebar to start work
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

