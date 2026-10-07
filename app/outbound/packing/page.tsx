"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  PackageCheck,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface OrderHeader {
  id: number;
  order_no: string;
  customer_name: string;
  status: string;
  created_at: string;
}

interface PickingRow {
  id: number;
  order_no: string;
  sku: string;
  qty_picked: number;
}

export default function PackingListPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // =========================================================
  // LOAD ORDER YANG SUDAH MEMILIKI HASIL PICKING
  // =========================================================
  const loadOrders = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        /*
         * =====================================================
         * 1. AMBIL SEMUA DATA PICKING
         *
         * TIDAK LAGI MENGGUNAKAN:
         *
         * .eq("status", "PICKED")
         *
         * Karena order sekarang masuk Packing berdasarkan
         * adanya hasil picking.
         * =====================================================
         */
        const { data: pickingData, error: pickingError } =
          await supabase
            .from("picking")
            .select(`
              id,
              order_no,
              sku,
              qty_picked
            `)
            .gt("qty_picked", 0)
            .order("id", {
              ascending: false,
            });

        if (pickingError) {
          console.error("Load picking error:", pickingError);
          throw pickingError;
        }

        const pickingRows = (pickingData || []) as PickingRow[];

        /*
         * =====================================================
         * 2. AMBIL ORDER_NO UNIK DARI PICKING
         * =====================================================
         */
        const orderNoMap = new Map<string, string>();

        pickingRows.forEach((row) => {
          const orderNo = String(row.order_no || "").trim();

          if (!orderNo) return;

          const key = orderNo.toUpperCase();

          if (!orderNoMap.has(key)) {
            orderNoMap.set(key, orderNo);
          }
        });

        const orderNos = Array.from(orderNoMap.values());

        /*
         * =====================================================
         * JIKA BELUM ADA PICKING
         * =====================================================
         */
        if (orderNos.length === 0) {
          setOrders([]);
          setLastRefresh(new Date());
          return;
        }

        /*
         * =====================================================
         * 3. AMBIL ORDER HEADER
         *
         * Kita hanya mengambil order yang memang sudah
         * mempunyai hasil picking.
         *
         * STATUS TIDAK DIGUNAKAN SEBAGAI FILTER.
         * =====================================================
         */
        const { data: orderData, error: orderError } =
          await supabase
            .from("order_header")
            .select(`
              id,
              order_no,
              customer_name,
              status,
              created_at
            `)
            .in("order_no", orderNos)
            .order("created_at", {
              ascending: false,
            });

        if (orderError) {
          console.error("Load order header error:", orderError);
          throw orderError;
        }

        const orderRows = (orderData || []) as OrderHeader[];

        /*
         * =====================================================
         * 4. FALLBACK
         *
         * Kalau ada data picking tetapi order_header belum
         * ditemukan, kita tetap tidak membuat order palsu.
         *
         * Hanya order yang benar-benar ada di order_header
         * yang ditampilkan.
         * =====================================================
         */
        setOrders(orderRows);

        setLastRefresh(new Date());
      } catch (err: any) {
        console.error("Packing list error:", err);

        if (showLoading) {
          alert(
            err?.message ||
              "Terjadi kesalahan saat mengambil data Packing."
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  // =========================================================
  // MANUAL REFRESH
  // =========================================================
  async function refreshData() {
    setRefreshing(true);

    try {
      await loadOrders(false);
    } finally {
      setRefreshing(false);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================
  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  // =========================================================
  // AUTO REFRESH
  //
  // Setiap 2 detik mengecek tabel picking.
  //
  // Jadi:
  //
  // PICKING CONFIRM
  //      ↓
  // INSERT picking
  //      ↓
  // Packing List membaca picking
  //      ↓
  // ORDER MUNCUL
  //
  // Tidak perlu Finish Picking.
  // =========================================================
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders(false);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [loadOrders]);

  // =========================================================
  // FORMAT LAST REFRESH
  // =========================================================
  function formatLastRefresh() {
    if (!lastRefresh) return "-";

    return lastRefresh.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-3 rounded-xl">
              <PackageCheck size={28} />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                Packing List
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Order otomatis muncul berdasarkan hasil Picking
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">

          {/* REFRESH */}
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="
              flex items-center justify-center gap-2
              bg-blue-600
              hover:bg-blue-700
              disabled:bg-blue-300
              text-white
              px-4
              py-2.5
              rounded-lg
              transition
              font-medium
            "
          >
            <RefreshCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {/* BACK */}
          <button
            onClick={() => router.back()}
            className="
              flex
              items-center
              gap-2
              bg-gray-500
              hover:bg-gray-600
              text-white
              px-4
              py-2.5
              rounded-lg
              transition
              font-medium
            "
          >
            <ArrowLeftCircle size={20} />
            <span>Back</span>
          </button>

        </div>
      </div>

      {/* =====================================================
          LIVE INFO
      ====================================================== */}
      <div className="
        mb-5
        bg-white
        border
        border-indigo-100
        rounded-xl
        p-4
        shadow-sm
      ">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          <div className="flex items-start gap-3">

            <div className="bg-green-100 text-green-700 p-2 rounded-lg">
              <ScanLine size={22} />
            </div>

            <div>
              <p className="font-semibold text-slate-800">
                Packing berjalan paralel dengan Picking
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Setelah item berhasil dipick, Order No langsung
                tersedia di menu Packing tanpa menunggu seluruh
                order selesai Picking.
              </p>
            </div>

          </div>

          <div className="
            text-xs
            text-slate-500
            bg-slate-100
            px-3
            py-2
            rounded-lg
            whitespace-nowrap
          ">
            Auto refresh: 2 detik
            <br />
            Update: {formatLastRefresh()}
          </div>

        </div>
      </div>

      {/* =====================================================
          ORDER COUNT
      ====================================================== */}
      <div className="mb-4">
        <div className="
          inline-flex
          items-center
          gap-2
          bg-white
          border
          rounded-lg
          px-4
          py-2
          shadow-sm
        ">
          <span className="text-sm text-slate-500">
            Order tersedia:
          </span>

          <span className="font-bold text-indigo-600">
            {orders.length}
          </span>
        </div>
      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px]">

            <thead className="bg-slate-200">

              <tr>

                <th className="border-b p-3 text-left text-sm font-semibold text-slate-700">
                  No
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold text-slate-700">
                  Order No
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold text-slate-700">
                  Customer
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold text-slate-700">
                  Status
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold text-slate-700">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {/* =================================================
                  LOADING
              ================================================== */}
              {loading ? (

                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-12"
                  >

                    <div className="flex flex-col items-center justify-center gap-3">

                      <RefreshCw
                        size={30}
                        className="animate-spin text-indigo-600"
                      />

                      <span className="text-slate-500">
                        Memuat Order Packing...
                      </span>

                    </div>

                  </td>
                </tr>

              ) : orders.length === 0 ? (

                /* ===============================================
                   EMPTY
                ================================================ */
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-12"
                  >

                    <div className="flex flex-col items-center justify-center">

                      <div className="
                        bg-slate-100
                        text-slate-400
                        p-4
                        rounded-full
                        mb-3
                      ">
                        <PackageCheck size={36} />
                      </div>

                      <p className="font-semibold text-slate-700">
                        Belum ada Order untuk Packing
                      </p>

                      <p className="text-sm text-slate-400 mt-1">
                        Order akan muncul otomatis setelah ada
                        hasil Picking.
                      </p>

                    </div>

                  </td>
                </tr>

              ) : (

                /* ===============================================
                   ORDERS
                ================================================ */
                orders.map((order, index) => (

                  <tr
                    key={order.id}
                    className="
                      hover:bg-indigo-50
                      transition
                    "
                  >

                    {/* NO */}
                    <td className="border-b p-3">
                      <span className="
                        inline-flex
                        items-center
                        justify-center
                        w-8
                        h-8
                        bg-slate-100
                        rounded-lg
                        font-semibold
                        text-slate-600
                      ">
                        {index + 1}
                      </span>
                    </td>

                    {/* ORDER NO */}
                    <td className="border-b p-3">

                      <div className="font-bold text-slate-800">
                        {order.order_no}
                      </div>

                      <div className="text-xs text-green-600 mt-1">
                        ✓ Ada hasil Picking
                      </div>

                    </td>

                    {/* CUSTOMER */}
                    <td className="border-b p-3">

                      <span className="text-slate-700">
                        {order.customer_name || "-"}
                      </span>

                    </td>

                    {/* STATUS */}
                    <td className="border-b p-3 text-center">

                      <span className="
                        bg-green-100
                        text-green-700
                        px-3
                        py-1.5
                        rounded-full
                        text-sm
                        font-semibold
                      ">
                        {order.status || "PICKING"}
                      </span>

                    </td>

                    {/* ACTION */}
                    <td className="border-b p-3 text-center">

                      <button
                        onClick={() =>
                          router.push(
                            `/outbound/packing/${encodeURIComponent(
                              order.order_no
                            )}`
                          )
                        }
                        className="
                          inline-flex
                          items-center
                          justify-center
                          gap-2
                          bg-indigo-600
                          hover:bg-indigo-700
                          text-white
                          px-4
                          py-2.5
                          rounded-lg
                          transition
                          font-medium
                        "
                      >

                        <PackageCheck size={18} />

                        Start Packing

                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* =====================================================
          FOOTER INFO
      ====================================================== */}
      <div className="mt-4 text-xs text-slate-400 text-center">
        Packing membaca data langsung dari tabel picking.
        Status PICKED pada order_header tidak diperlukan untuk
        menampilkan Order di sini.
      </div>

    </div>
  );
}