"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/Statcard";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Package,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  TrendingUp,
  Warehouse,
  CircleDot,
  ScanLine,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type ActivityType =
  | "Receiving"
  | "Checking"
  | "Putaway"
  | "Picking"
  | "Packing";

type ActivityFilter = "ALL" | ActivityType;

type ActivityItem = {
  id: string | number;
  type: ActivityType;
  title: string;
  description: string;
  created_at: string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthLabel(date: Date) {
  return date.toLocaleString("id-ID", {
    month: "short",
  });
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     KPI
  ===================================================== */

  const [totalReceiving, setTotalReceiving] = useState(0);
  const [totalChecking, setTotalChecking] = useState(0);
  const [totalPutaway, setTotalPutaway] = useState(0);
  const [totalProduct, setTotalProduct] = useState(0);

  /* =====================================================
     COUNTING
  ===================================================== */

  const [totalCountingSession, setTotalCountingSession] = useState(0);
  const [activeCounting, setActiveCounting] = useState(0);
  const [completedCounting, setCompletedCounting] = useState(0);

  /* =====================================================
     CHART
  ===================================================== */

  const [monthlyReceiving, setMonthlyReceiving] = useState<any[]>([]);
  const [monthlyPutaway, setMonthlyPutaway] = useState<any[]>([]);
  const [monthlyOutbound, setMonthlyOutbound] = useState<any[]>([]);

  /* =====================================================
     ACTIVITY
  ===================================================== */

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  /*
    NULL = belum memilih filter
    ALL  = semua aktivitas
  */
  const [activityFilter, setActivityFilter] =
    useState<ActivityFilter | null>(null);

  /* =====================================================
     LOAD KPI
  ===================================================== */

  const loadKPI = useCallback(async () => {
    const [
      { count: receiving },
      { count: checking },
      { count: putaway },
      { count: product },
    ] = await Promise.all([
      supabase
        .from("receivings")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("checking")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("putaways")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("product")
        .select("*", {
          count: "exact",
          head: true,
        }),
    ]);

    setTotalReceiving(receiving || 0);
    setTotalChecking(checking || 0);
    setTotalPutaway(putaway || 0);
    setTotalProduct(product || 0);
  }, []);

  /* =====================================================
     LOAD COUNTING
  ===================================================== */

  const loadCounting = useCallback(async () => {
    const { data, error } = await supabase
      .from("counting_report")
      .select(
        "final_status, first_count_id, second_count_id, third_count_id"
      );

    if (error) {
      console.error("Counting dashboard error:", error);
      return;
    }

    const rows = data || [];

    setTotalCountingSession(rows.length);

    const completed = rows.filter(
      (row) =>
        row.final_status === "COMPLETED" ||
        row.third_count_id !== null
    ).length;

    const active = rows.filter(
      (row) =>
        row.final_status !== "COMPLETED" &&
        row.third_count_id === null
    ).length;

    setCompletedCounting(completed);
    setActiveCounting(active);
  }, []);

  /* =====================================================
     GENERIC MONTHLY DATA
  ===================================================== */

  const buildMonthlyData = (
    rows: { created_at: string | null }[]
  ) => {
    const map: Record<string, number> = {};

    rows.forEach((item) => {
      if (!item.created_at) return;

      const date = new Date(item.created_at);

      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;

      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort(([a], [b]) => {
        const [ay, am] = a.split("-").map(Number);
        const [by, bm] = b.split("-").map(Number);

        return (
          new Date(ay, am, 1).getTime() -
          new Date(by, bm, 1).getTime()
        );
      })
      .slice(-12);
  };

  /* =====================================================
     MONTHLY RECEIVING
  ===================================================== */

  const loadMonthlyReceiving = useCallback(async () => {
    const { data, error } = await supabase
      .from("receivings")
      .select("created_at");

    if (error) {
      console.error("Receiving chart error:", error);
      return;
    }

    const monthly = buildMonthlyData(data || []);

    const result = monthly.map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);

      return {
        month: monthLabel(new Date(year, month, 1)),
        total,
      };
    });

    setMonthlyReceiving(result);
  }, []);

  /* =====================================================
     MONTHLY PUTAWAY
  ===================================================== */

  const loadMonthlyPutaway = useCallback(async () => {
    const { data, error } = await supabase
      .from("putaways")
      .select("created_at");

    if (error) {
      console.error("Putaway chart error:", error);
      return;
    }

    const monthly = buildMonthlyData(data || []);

    const result = monthly.map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);

      return {
        month: monthLabel(new Date(year, month, 1)),
        total,
      };
    });

    setMonthlyPutaway(result);
  }, []);

  /* =====================================================
     MONTHLY OUTBOUND
     PICKING + PACKING
  ===================================================== */

  const loadMonthlyOutbound = useCallback(async () => {
    const [
      pickingResult,
      packingResult,
    ] = await Promise.all([
      supabase
        .from("picking")
        .select("picked_at"),

      supabase
        .from("packing")
        .select("packed_at"),
    ]);

    if (pickingResult.error) {
      console.error(
        "Picking chart error:",
        pickingResult.error
      );
    }

   

    const map: Record<
      string,
      {
        picking: number;
        packing: number;
      }
    > = {};

    (pickingResult.data || []).forEach((item) => {
      if (!item.picked_at) return;

      const date = new Date(item.picked_at);

      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!map[key]) {
        map[key] = {
          picking: 0,
          packing: 0,
        };
      }

      map[key].picking += 1;
    });

    (packingResult.data || []).forEach((item) => {
      if (!item.packed_at) return;

      const date = new Date(item.packed_at);

      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!map[key]) {
        map[key] = {
          picking: 0,
          packing: 0,
        };
      }

      map[key].packing += 1;
    });

    const result = Object.entries(map)
      .sort(([a], [b]) => {
        const [ay, am] = a.split("-").map(Number);
        const [by, bm] = b.split("-").map(Number);

        return (
          new Date(ay, am, 1).getTime() -
          new Date(by, bm, 1).getTime()
        );
      })
      .slice(-12)
      .map(([key, values]) => {
        const [year, month] = key.split("-").map(Number);

        return {
          month: monthLabel(
            new Date(year, month, 1)
          ),
          picking: values.picking,
          packing: values.packing,
        };
      });

    setMonthlyOutbound(result);
  }, []);

  /* =====================================================
     LOAD RECENT ACTIVITY
  ===================================================== */

  const loadActivities = useCallback(async () => {
    const [
      receivingResult,
      checkingResult,
      putawayResult,
      pickingResult,
      packingResult,
    ] = await Promise.all([
      supabase
        .from("receivings")
        .select("id, created_at")
        .order("created_at", {
          ascending: false,
        })
        .limit(20),

      supabase
        .from("checking")
        .select("id, created_at")
        .order("created_at", {
          ascending: false,
        })
        .limit(20),

      supabase
        .from("putaways")
        .select("id, created_at")
        .order("created_at", {
          ascending: false,
        })
        .limit(20),

      supabase
        .from("picking")
        .select("id, picked_at")
        .order("picked_at", {
          ascending: false,
        })
        .limit(20),

      supabase
        .from("packing")
        .select("id, packed_at")
        .order("packed_at", {
          ascending: false,
        })
        .limit(20),
    ]);

    const result: ActivityItem[] = [];

    /* RECEIVING */

    (receivingResult.data || []).forEach(
      (item) => {
        if (!item.created_at) return;

        result.push({
          id: `receiving-${item.id}`,
          type: "Receiving",
          title: "Receiving baru",
          description:
            "Aktivitas receiving masuk ke sistem",
          created_at: item.created_at,
        });
      }
    );

    /* CHECKING */

    (checkingResult.data || []).forEach(
      (item) => {
        if (!item.created_at) return;

        result.push({
          id: `checking-${item.id}`,
          type: "Checking",
          title: "Checking dilakukan",
          description:
            "Aktivitas checking inbound",
          created_at: item.created_at,
        });
      }
    );

    /* PUTAWAY */

    (putawayResult.data || []).forEach(
      (item) => {
        if (!item.created_at) return;

        result.push({
          id: `putaway-${item.id}`,
          type: "Putaway",
          title: "Putaway dilakukan",
          description:
            "Barang diproses ke lokasi storage",
          created_at: item.created_at,
        });
      }
    );

    /* PICKING */

    (pickingResult.data || []).forEach(
      (item) => {
        if (!item.picked_at) return;

        result.push({
          id: `picking-${item.id}`,
          type: "Picking",
          title: "Picking dilakukan",
          description:
            "Barang diambil dari lokasi storage untuk outbound",
          created_at: item.picked_at,
        });
      }
    );

    /* PACKING */

    (packingResult.data || []).forEach(
      (item) => {
        if (!item.packed_at) return;

        result.push({
          id: `packing-${item.id}`,
          type: "Packing",
          title: "Packing dilakukan",
          description:
            "Barang diproses dan disiapkan untuk pengiriman",
          created_at: item.packed_at,
        });
      }
    );

    result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    setActivities(result.slice(0, 50));
  }, []);

  /* =====================================================
     FILTERED ACTIVITY
  ===================================================== */

  const filteredActivities = useMemo(() => {
    if (!activityFilter) {
      return [];
    }

    if (activityFilter === "ALL") {
      return activities.slice(0, 10);
    }

    return activities
      .filter(
        (item) =>
          item.type === activityFilter
      )
      .slice(0, 10);
  }, [activities, activityFilter]);

  /* =====================================================
     FILTER OPTIONS
  ===================================================== */

  const activityFilters: {
    value: ActivityFilter;
    label: string;
  }[] = [
    {
      value: "ALL",
      label: "Semua",
    },
    {
      value: "Receiving",
      label: "Receiving",
    },
    {
      value: "Checking",
      label: "Checking",
    },
    {
      value: "Putaway",
      label: "Putaway",
    },
    {
      value: "Picking",
      label: "Picking",
    },
    {
      value: "Packing",
      label: "Packing",
    },
  ];

  /* =====================================================
     LOAD ALL
  ===================================================== */

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([
      loadKPI(),
      loadCounting(),
      loadMonthlyReceiving(),
      loadMonthlyPutaway(),
      loadMonthlyOutbound(),
      loadActivities(),
    ]);

    setLoading(false);
    setRefreshing(false);
  }, [
    loadKPI,
    loadCounting,
    loadMonthlyReceiving,
    loadMonthlyPutaway,
    loadMonthlyOutbound,
    loadActivities,
  ]);

  /* =====================================================
     REALTIME
  ===================================================== */

  useEffect(() => {
    loadDashboard();

    const channel = supabase
      .channel("wms-dashboard-realtime")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receivings",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checking",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "putaways",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "picking",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "packing",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product",
        },
        () => {
          loadDashboard();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "counting_session",
        },
        () => {
          loadDashboard();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  /* =====================================================
     WORKFLOW TOTAL
  ===================================================== */

  const workflowTotal = useMemo(() => {
    return (
      totalReceiving +
      totalChecking +
      totalPutaway
    );
  }, [
    totalReceiving,
    totalChecking,
    totalPutaway,
  ]);

  /* =====================================================
     OUTBOUND TOTAL
  ===================================================== */

  const outboundTotal = useMemo(() => {
    return monthlyOutbound.reduce(
      (total, item) =>
        total +
        Number(item.picking || 0) +
        Number(item.packing || 0),
      0
    );
  }, [monthlyOutbound]);

  /* =====================================================
     FILTER STATE HELPERS
  ===================================================== */

  const filterSelected =
    activityFilter !== null;

  const showAll =
    activityFilter === "ALL";

  const showReceiving =
    activityFilter === "Receiving" ||
    showAll;

  const showChecking =
    activityFilter === "Checking" ||
    showAll;

  const showPutaway =
    activityFilter === "Putaway" ||
    showAll;

  const showPicking =
    activityFilter === "Picking" ||
    showAll;

  const showPacking =
    activityFilter === "Packing" ||
    showAll;

  const showOutbound =
    showPicking || showPacking;

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw
            size={28}
            className="animate-spin text-blue-600"
          />

          <p className="text-sm font-medium text-slate-500">
            Loading WMS Dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-100">
      <Navbar />

      <main className="space-y-6 p-4 md:p-6 lg:p-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <Warehouse
                size={24}
                className="text-blue-700"
              />

              <span className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                ZEE-WMS
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
              Warehouse Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Monitoring seluruh aktivitas warehouse secara realtime.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-slate-700
              shadow-sm
              transition
              hover:bg-slate-50
              disabled:opacity-60
            "
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* =================================================
            GLOBAL ACTIVITY FILTER
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">

                <Activity
                  size={18}
                  className="text-blue-600"
                />

                <h2 className="font-bold text-slate-800">
                  Filter Aktivitas Dashboard
                </h2>

              </div>

              <p className="text-xs text-slate-400">
                Pilih aktivitas warehouse yang ingin kamu lihat.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2 p-4">

            {activityFilters.map(
              (filter) => {
                const active =
                  activityFilter ===
                  filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setActivityFilter(
                        filter.value
                      )
                    }
                    className={`
                      rounded-xl
                      px-4
                      py-2
                      text-xs
                      font-semibold
                      transition-all
                      duration-200
                      ${
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      }
                    `}
                  >
                    {filter.label}
                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* =================================================
            FILTER EMPTY STATE
        ================================================= */}

        {!filterSelected && (
          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">

            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ScanLine size={30} />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                Pilih Filter Aktivitas
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Silakan pilih aktivitas di atas untuk
                menampilkan data, chart, dan aktivitas
                warehouse.
              </p>

              <div className="mt-5 flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2">
                <CircleDot
                  size={13}
                  className="text-blue-500"
                />

                <span className="text-xs font-medium text-slate-500">
                  Belum ada filter yang dipilih
                </span>
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            KPI CARDS
            Tetap tampil walaupun filter belum dipilih
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Receiving"
            value={totalReceiving}
          />

          <StatCard
            title="Checking"
            value={totalChecking}
          />

          <StatCard
            title="Putaway"
            value={totalPutaway}
          />

          <StatCard
            title="Products"
            value={totalProduct}
          />

        </div>

        {/* =================================================
            WMS OPERATION SUMMARY
            Tetap tampil seperti sebelumnya
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

          {/* INBOUND */}

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ArrowDownToLine size={22} />
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                INBOUND
              </span>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Receiving
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {formatNumber(totalReceiving)}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Total receiving transaction
            </p>

          </div>

          {/* STORAGE */}

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <PackageOpen size={22} />
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                STORAGE
              </span>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Putaway
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {formatNumber(totalPutaway)}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Total putaway transaction
            </p>

          </div>

          {/* OUTBOUND */}

          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <ArrowUpFromLine size={22} />
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                OUTBOUND
              </span>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Picking & Packing
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {formatNumber(outboundTotal)}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Aktivitas outbound 12 bulan
            </p>

          </div>

          {/* COUNTING */}

          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <ClipboardCheck size={22} />
              </div>

              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                COUNTING
              </span>

            </div>

            <p className="mt-5 text-sm text-slate-500">
              Counting Session
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {formatNumber(
                totalCountingSession
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {activeCounting} aktif ·{" "}
              {completedCounting} selesai
            </p>

          </div>

        </div>

        {/* =================================================
            CHARTS
            HANYA MUNCUL SETELAH FILTER DIPILIH
        ================================================= */}

        {filterSelected && (
          <>
            {/* =================================================
                RECEIVING CHART
            ================================================= */}

            {showReceiving && (
              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">

                <div className="mb-5 flex items-center justify-between">

                  <div>
                    <h2 className="font-bold text-slate-800">
                      Receiving Activity
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Aktivitas receiving per bulan
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <TrendingUp size={18} />
                  </div>

                </div>

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={monthlyReceiving}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -10,
                      bottom: 0,
                    }}
                  >

                    <defs>
                      <linearGradient
                        id="receivingGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                        />

                        <stop
                          offset="100%"
                          stopColor="#93c5fd"
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: "#eff6ff",
                      }}
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #e2e8f0",
                        boxShadow:
                          "0 10px 25px rgba(15,23,42,0.08)",
                      }}
                    />

                    <Bar
                      dataKey="total"
                      name="Receiving"
                      fill="url(#receivingGradient)"
                      radius={[
                        8,
                        8,
                        0,
                        0,
                      ]}
                      maxBarSize={42}
                    />

                  </BarChart>
                </ResponsiveContainer>

              </div>
            )}

            {/* =================================================
                PUTAWAY CHART
            ================================================= */}

            {showPutaway && (
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">

                <div className="mb-5 flex items-center justify-between">

                  <div>
                    <h2 className="font-bold text-slate-800">
                      Putaway Activity
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Aktivitas putaway per bulan
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <PackageCheck size={18} />
                  </div>

                </div>

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <AreaChart
                    data={monthlyPutaway}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -10,
                      bottom: 0,
                    }}
                  >

                    <defs>
                      <linearGradient
                        id="putawayGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#10b981"
                          stopOpacity={0.45}
                        />

                        <stop
                          offset="100%"
                          stopColor="#d1fae5"
                          stopOpacity={0.08}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #e2e8f0",
                        boxShadow:
                          "0 10px 25px rgba(15,23,42,0.08)",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Putaway"
                      stroke="#10b981"
                      fill="url(#putawayGradient)"
                      strokeWidth={3}
                      activeDot={{
                        r: 6,
                      }}
                    />

                  </AreaChart>
                </ResponsiveContainer>

              </div>
            )}

            {/* =================================================
                OUTBOUND CHART
            ================================================= */}

            {showOutbound && (
              <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">

                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        <ArrowUpFromLine size={20} />
                      </div>

                      <div>

                        <h2 className="font-bold text-slate-800">
                          Outbound Activity
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                          Perbandingan aktivitas Picking dan Packing per bulan
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2">

                    <ScanLine
                      size={17}
                      className="text-orange-600"
                    />

                    <span className="text-xs font-semibold text-orange-700">
                      {formatNumber(
                        outboundTotal
                      )}{" "}
                      aktivitas
                    </span>

                  </div>

                </div>

                <ResponsiveContainer
                  width="100%"
                  height={340}
                >
                  <BarChart
                    data={monthlyOutbound}
                    margin={{
                      top: 10,
                      right: 20,
                      left: -10,
                      bottom: 0,
                    }}
                    barGap={8}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: "#fff7ed",
                      }}
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #fed7aa",
                        boxShadow:
                          "0 10px 25px rgba(15,23,42,0.08)",
                      }}
                    />

                    <Legend />

                    {showPicking && (
                      <Bar
                        dataKey="picking"
                        name="Picking"
                        fill="#f97316"
                        radius={[
                          7,
                          7,
                          0,
                          0,
                        ]}
                        maxBarSize={32}
                      />
                    )}

                    {showPacking && (
                      <Bar
                        dataKey="packing"
                        name="Packing"
                        fill="#fb923c"
                        radius={[
                          7,
                          7,
                          0,
                          0,
                        ]}
                        maxBarSize={32}
                      />
                    )}

                  </BarChart>
                </ResponsiveContainer>

              </div>
            )}
          </>
        )}

        {/* =================================================
            WORKFLOW STATUS
        ================================================= */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* WORKFLOW */}

          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h2 className="font-bold text-slate-800">
                  WMS Workflow
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Distribusi aktivitas inbound dan storage
                </p>
              </div>

              <Activity
                size={20}
                className="text-slate-400"
              />

            </div>

            <div className="space-y-6">

              {/* RECEIVING */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <ArrowDownToLine
                      size={17}
                      className="text-blue-600"
                    />

                    <span className="text-sm font-medium text-slate-700">
                      Receiving
                    </span>

                  </div>

                  <span className="text-sm font-bold text-slate-800">
                    {formatNumber(
                      totalReceiving
                    )}
                  </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        workflowTotal
                          ? (totalReceiving /
                              workflowTotal) *
                            100
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>

              {/* CHECKING */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <ClipboardCheck
                      size={17}
                      className="text-yellow-600"
                    />

                    <span className="text-sm font-medium text-slate-700">
                      Checking
                    </span>

                  </div>

                  <span className="text-sm font-bold text-slate-800">
                    {formatNumber(
                      totalChecking
                    )}
                  </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-yellow-500 transition-all"
                    style={{
                      width: `${
                        workflowTotal
                          ? (totalChecking /
                              workflowTotal) *
                            100
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>

              {/* PUTAWAY */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <PackageOpen
                      size={17}
                      className="text-emerald-600"
                    />

                    <span className="text-sm font-medium text-slate-700">
                      Putaway
                    </span>

                  </div>

                  <span className="text-sm font-bold text-slate-800">
                    {formatNumber(
                      totalPutaway
                    )}
                  </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        workflowTotal
                          ? (totalPutaway /
                              workflowTotal) *
                            100
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>

            </div>

          </div>

          {/* COUNTING STATUS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-6">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="font-bold text-slate-800">
                    Counting Status
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Stock opname session
                  </p>

                </div>

                <ClipboardCheck
                  size={20}
                  className="text-purple-500"
                />

              </div>

            </div>

            <div className="space-y-4">

              {/* ACTIVE */}

              <div className="flex items-center justify-between rounded-xl bg-purple-50 p-4">

                <div className="flex items-center gap-3">

                  <Clock3
                    size={20}
                    className="text-purple-600"
                  />

                  <div>

                    <p className="text-xs text-slate-500">
                      Active
                    </p>

                    <p className="text-xl font-bold text-purple-700">
                      {activeCounting}
                    </p>

                  </div>

                </div>

                <CircleDot
                  size={18}
                  className="text-purple-500"
                />

              </div>

              {/* COMPLETED */}

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">

                <div className="flex items-center gap-3">

                  <CheckCircle2
                    size={20}
                    className="text-emerald-600"
                  />

                  <div>

                    <p className="text-xs text-slate-500">
                      Completed
                    </p>

                    <p className="text-xl font-bold text-emerald-700">
                      {completedCounting}
                    </p>

                  </div>

                </div>

                <CheckCircle2
                  size={18}
                  className="text-emerald-500"
                />

              </div>

              {/* TOTAL */}

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <Boxes
                    size={20}
                    className="text-slate-600"
                  />

                  <div>

                    <p className="text-xs text-slate-500">
                      Total Session
                    </p>

                    <p className="text-xl font-bold text-slate-800">
                      {totalCountingSession}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            RECENT ACTIVITY
            TIDAK MUNCUL SEBELUM FILTER DIPILIH
        ================================================= */}

        {filterSelected && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="font-bold text-slate-800">
                    Recent Warehouse Activity
                  </h2>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">
                    {activityFilter ===
                    "ALL"
                      ? "ALL"
                      : activityFilter?.toUpperCase()}
                  </span>

                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Menampilkan aktivitas terbaru berdasarkan filter.
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">

                <CircleDot
                  size={12}
                  className="text-emerald-500"
                />

                Realtime

              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {filteredActivities.length ===
              0 ? (

                <div className="flex flex-col items-center justify-center py-12">

                  <Package
                    size={36}
                    className="text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Tidak ada aktivitas
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Belum ada data untuk filter{" "}
                    {activityFilter ===
                    "ALL"
                      ? "yang dipilih"
                      : activityFilter}
                  </p>

                </div>

              ) : (

                filteredActivities.map(
                  (item) => {

                    const icon =
                      item.type ===
                      "Receiving"
                        ? ArrowDownToLine
                        : item.type ===
                          "Checking"
                        ? ClipboardCheck
                        : item.type ===
                          "Putaway"
                        ? PackageOpen
                        : item.type ===
                          "Picking"
                        ? ArrowUpFromLine
                        : PackageCheck;

                    const Icon = icon;

                    const iconClass =
                      item.type ===
                      "Receiving"
                        ? "bg-blue-100 text-blue-600"
                        : item.type ===
                          "Checking"
                        ? "bg-yellow-100 text-yellow-600"
                        : item.type ===
                          "Putaway"
                        ? "bg-emerald-100 text-emerald-600"
                        : item.type ===
                          "Picking"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-red-100 text-red-600";

                    const badgeClass =
                      item.type ===
                      "Receiving"
                        ? "bg-blue-50 text-blue-600"
                        : item.type ===
                          "Checking"
                        ? "bg-yellow-50 text-yellow-700"
                        : item.type ===
                          "Putaway"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.type ===
                          "Picking"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-red-50 text-red-700";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 transition hover:bg-slate-50"
                      >

                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${iconClass}
                          `}
                        >
                          <Icon size={19} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                            <p className="text-sm font-semibold text-slate-800">
                              {item.title}
                            </p>

                            <span className="text-[11px] text-slate-400">
                              {formatDate(
                                item.created_at
                              )}
                            </span>

                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.description}
                          </p>

                        </div>

                        <span
                          className={`
                            hidden
                            rounded-full
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            sm:block
                            ${badgeClass}
                          `}
                        >
                          {item.type}
                        </span>

                      </div>
                    );
                  }
                )

              )}

            </div>

          </div>
        )}

        {/* =================================================
            SYSTEM STATUS
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* SYSTEM */}

          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">

            <CheckCircle2
              size={22}
              className="text-emerald-600"
            />

            <div>

              <p className="text-xs text-emerald-700">
                System
              </p>

              <p className="text-sm font-bold text-emerald-800">
                Online
              </p>

            </div>

          </div>

          {/* REALTIME */}

          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">

            <Activity
              size={22}
              className="text-blue-600"
            />

            <div>

              <p className="text-xs text-blue-700">
                Realtime
              </p>

              <p className="text-sm font-bold text-blue-800">
                Connected
              </p>

            </div>

          </div>

          {/* WAREHOUSE */}

          <div className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4">

            <Warehouse
              size={22}
              className="text-purple-600"
            />

            <div>

              <p className="text-xs text-purple-700">
                Warehouse
              </p>

              <p className="text-sm font-bold text-purple-800">
                Active
              </p>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
