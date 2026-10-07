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
     * Order masuk Packing berdasarkan adanya hasil picking.
     *
     * TIDAK menggunakan status PICKED sebagai sumber utama.
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
     * Order yang statusnya PACKED TIDAK DITAMPILKAN.
     *
     * Finish Packing pada halaman detail sudah melakukan:
     *
     * status: "PACKED"
     *
     * Jadi setelah kembali ke halaman ini, order otomatis
     * hilang dari list.
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
        .neq("status", "PACKED")
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
     * 4. SET ORDER
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
// Setiap 2 detik mengecek tabel picking + order_header.
//
// Jika status order berubah menjadi PACKED,
// order otomatis hilang dari list.
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
return ( <div className="min-h-screen bg-slate-100 p-3 sm:p-4 md:p-6">

```
  {/* =====================================================
      HEADER
  ====================================================== */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-5 md:mb-6">

    <div>
      <div className="flex items-center gap-2 sm:gap-3">

        <div className="bg-indigo-600 text-white p-2 sm:p-3 rounded-xl">
          <PackageCheck size={24} className="sm:w-7 sm:h-7" />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Packing List
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
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
          px-3 sm:px-4
          py-2 sm:py-2.5
          rounded-lg
          transition
          font-medium
          text-sm sm:text-base
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
          px-3 sm:px-4
          py-2 sm:py-2.5
          rounded-lg
          transition
          font-medium
          text-sm sm:text-base
        "
      >
        <ArrowLeftCircle size={18} className="sm:w-5 sm:h-5" />
        <span>Back</span>
      </button>

    </div>
  </div>

  {/* =====================================================
      LIVE INFO
  ====================================================== */}
  <div
    className="
      mb-4 md:mb-5
      bg-white
      border
      border-indigo-100
      rounded-xl
      p-3 sm:p-4
      shadow-sm
    "
  >

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

      <div className="flex items-start gap-2 sm:gap-3">

        <div className="bg-green-100 text-green-700 p-2 rounded-lg shrink-0">
          <ScanLine size={20} className="sm:w-[22px] sm:h-[22px]" />
        </div>

        <div>
          <p className="font-semibold text-sm sm:text-base text-slate-800">
            Packing berjalan paralel dengan Picking
          </p>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Setelah item berhasil dipick, Order No langsung
            tersedia di menu Packing tanpa menunggu seluruh
            order selesai Picking.
          </p>
        </div>

      </div>

      <div
        className="
          text-xs
          text-slate-500
          bg-slate-100
          px-3
          py-2
          rounded-lg
          whitespace-nowrap
        "
      >
        Auto refresh: 2 detik
        <br />
        Update: {formatLastRefresh()}
      </div>

    </div>
  </div>

  {/* =====================================================
      ORDER COUNT
  ====================================================== */}
  <div className="mb-3 md:mb-4">
    <div
      className="
        inline-flex
        items-center
        gap-2
        bg-white
        border
        rounded-lg
        px-3 sm:px-4
        py-2
        shadow-sm
      "
    >
      <span className="text-xs sm:text-sm text-slate-500">
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

    <div className="w-full overflow-x-auto">

      <table className="w-full">

        <thead className="bg-slate-200">

          <tr>

            <th className="border-b p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
              No
            </th>

            <th className="border-b p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
              Order No
            </th>

            <th className="border-b p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold text-slate-700">
              Customer
            </th>

            <th className="border-b p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
              Status
            </th>

            <th className="border-b p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
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
                className="text-center p-8 sm:p-12"
              >

                <div className="flex flex-col items-center justify-center gap-3">

                  <RefreshCw
                    size={30}
                    className="animate-spin text-indigo-600"
                  />

                  <span className="text-slate-500 text-sm sm:text-base">
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
                className="text-center p-8 sm:p-12"
              >

                <div className="flex flex-col items-center justify-center">

                  <div
                    className="
                      bg-slate-100
                      text-slate-400
                      p-3 sm:p-4
                      rounded-full
                      mb-3
                    "
                  >
                    <PackageCheck size={32} className="sm:w-9 sm:h-9" />
                  </div>

                  <p className="font-semibold text-sm sm:text-base text-slate-700">
                    Belum ada Order untuk Packing
                  </p>

                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
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
                <td className="border-b p-2 sm:p-3">

                  <span
                    className="
                      inline-flex
                      items-center
                      justify-center
                      w-7 sm:w-8
                      h-7 sm:h-8
                      bg-slate-100
                      rounded-lg
                      font-semibold
                      text-xs sm:text-sm
                      text-slate-600
                    "
                  >
                    {index + 1}
                  </span>

                </td>

                {/* ORDER NO */}
                <td className="border-b p-2 sm:p-3">

                  <div className="font-bold text-sm sm:text-base text-slate-800 whitespace-nowrap">
                    {order.order_no}
                  </div>

                  <div className="text-[10px] sm:text-xs text-green-600 mt-1 whitespace-nowrap">
                    ✓ Ada hasil Picking
                  </div>

                </td>

                {/* CUSTOMER */}
                <td className="border-b p-2 sm:p-3">

                  <span className="text-xs sm:text-sm text-slate-700">
                    {order.customer_name || "-"}
                  </span>

                </td>

                {/* STATUS */}
                <td className="border-b p-2 sm:p-3 text-center">

                  <span
                    className="
                      bg-green-100
                      text-green-700
                      px-2 sm:px-3
                      py-1 sm:py-1.5
                      rounded-full
                      text-[10px] sm:text-sm
                      font-semibold
                      whitespace-nowrap
                    "
                  >
                    {order.status || "PICKING"}
                  </span>

                </td>

                {/* ACTION */}
                <td className="border-b p-2 sm:p-3 text-center">

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
                      gap-1 sm:gap-2
                      bg-indigo-600
                      hover:bg-indigo-700
                      text-white
                      px-2 sm:px-4
                      py-2 sm:py-2.5
                      rounded-lg
                      transition
                      font-medium
                      text-xs sm:text-sm
                      whitespace-nowrap
                    "
                  >

                    <PackageCheck size={16} className="sm:w-[18px] sm:h-[18px]" />

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
    Order dengan status PACKED tidak ditampilkan kembali.
  </div>

</div>


);
}
