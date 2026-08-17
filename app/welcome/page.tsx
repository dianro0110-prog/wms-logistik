"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  Warehouse,
  Boxes,
  PackageCheck,
  ScanLine,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("Loading...");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setUsername(profile?.username || user.email || "User");
    };

    loadUser();
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500">

      {/* ================= BACKGROUND ================= */}

      <div className="absolute inset-0">

        {/* Blue glow */}
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "45px 45px",
          }}
        />

      </div>

      {/* ================= CONTENT ================= */}

      <main className="relative z-10 min-h-screen">

        <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col justify-center px-8 py-12 lg:px-12">

          {/* ================= ONLINE BADGE ================= */}

          <div className="mb-6">

            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-white/25
                bg-white/10
                px-4
                py-2
                text-sm
                font-semibold
                text-white
                shadow-lg
                backdrop-blur-md
              "
            >

              <span className="relative flex h-2.5 w-2.5">

                <span
                  className="
                    absolute
                    inline-flex
                    h-full
                    w-full
                    animate-ping
                    rounded-full
                    bg-emerald-400
                    opacity-75
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    h-2.5
                    w-2.5
                    rounded-full
                    bg-emerald-400
                  "
                />

              </span>

              Warehouse System Online

            </div>

          </div>

          {/* ================= BRAND ================= */}

          <div className="mb-6 flex items-center gap-4">

            <div
              className="
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                border
                border-white/25
                bg-white/10
                shadow-lg
                backdrop-blur-md
              "
            >

              <Warehouse
                size={30}
                className="text-white"
              />

            </div>

            <div>

              <p
                className="
                  text-sm
                  font-bold
                  tracking-[0.25em]
                  text-blue-200
                "
              >
                ZEE-WMS
              </p>

              <p className="text-sm text-white/70">
                Warehouse Management System
              </p>

            </div>

          </div>

          {/* ================= HERO ================= */}

          <div className="max-w-4xl">

            <h1
              className="
                text-5xl
                font-bold
                leading-tight
                tracking-tight
                text-white
                md:text-6xl
                lg:text-7xl
              "
            >

              Let's Growt 🚀

            </h1>

            <p
              className="
                mt-7
                max-w-2xl
                text-base
                leading-relaxed
                text-white/80
                md:text-lg
              "
            >
              Manage your warehouse operations efficiently.
              Select a menu from the sidebar to start receiving,
              checking, putaway, allocation, and picking activities.
            </p>

          </div>

          {/* ================= USER ================= */}

          <div className="mt-5">

            <p className="text-sm text-white/60">
              Welcome back,
            </p>

            <p className="text-xl font-bold text-white">
              {username}
            </p>

          </div>

          {/* ================= QUICK MODULE ================= */}

          <div
            className="
              mt-9
              grid
              max-w-5xl
              grid-cols-1
              gap-4
              sm:grid-cols-3
            "
          >

            {/* INBOUND */}

            <div
              className="
                group
                rounded-2xl
                border
                border-blue-400/20
                bg-blue-950/90
                p-4
                shadow-lg
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-blue-900
              "
            >

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-800
                  "
                >

                  <Boxes
                    size={21}
                    className="text-blue-300"
                  />

                </div>

                <div>

                  <p className="text-sm font-bold text-white">
                    Inbound
                  </p>

                  <p className="text-xs text-blue-200">
                    Receiving, Checking, & Putaway
                  </p>

                </div>

              </div>

            </div>

            {/* INVENTORY */}

            <div
              className="
                group
                rounded-2xl
                border
                border-emerald-400/20
                bg-emerald-950/90
                p-4
                shadow-lg
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-emerald-900
              "
            >

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-emerald-800
                  "
                >

                  <PackageCheck
                    size={21}
                    className="text-emerald-300"
                  />

                </div>

                <div>

                  <p className="text-sm font-bold text-white">
                    Inventory
                  </p>

                  <p className="text-xs text-emerald-200">
                    Inventory List & Movement
                  </p>

                </div>

              </div>

            </div>

            {/* OUTBOUND */}

            <div
              className="
                group
                rounded-2xl
                border
                border-red-400/20
                bg-red-950/90
                p-4
                shadow-lg
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-red-900
              "
            >

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-800
                  "
                >

                  <ScanLine
                    size={21}
                    className="text-orange-300"
                  />

                </div>

                <div>

                  <p className="text-sm font-bold text-white">
                    Outbound
                  </p>

                  <p className="text-xs text-red-200">
                    Picking, Packing & Shipment
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ================= BUTTONS ================= */}

          <div
            className="
              mt-9
              flex
              flex-col
              gap-4
              sm:flex-row
            "
          >

            {/* DASHBOARD */}

            <button
              onClick={() => router.push("/dashboard")}
              className="
                group
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                bg-white
                px-7
                py-3.5
                font-bold
                text-slate-800
                shadow-xl
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-blue-50
              "
            >

              <LayoutDashboard
                size={20}
                className="text-blue-700"
              />

              Dashboard

              <ArrowRight
                size={18}
                className="
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />

            </button>

            {/* LET'S GO */}

            <button
              onClick={() => router.push("/system")}
              className="
                group
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                bg-blue-600
                px-7
                py-3.5
                font-bold
                text-white
                shadow-xl
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-blue-500
              "
            >

              🚀

              Let's Go

              <ArrowRight
                size={18}
                className="
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />

            </button>

          </div>

          {/* ================= FOOTER ================= */}

          <div
            className="
              mt-10
              flex
              items-center
              gap-3
              text-sm
              text-white/50
            "
          >

            <div className="h-px w-10 bg-white/20" />

            <span>
              Warehouse Management System
            </span>

            <span className="text-white/30">
              •
            </span>

            <span>
              Version 1.0
            </span>

          </div>

        </div>

      </main>

    </div>
  );
}