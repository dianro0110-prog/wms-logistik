
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  RefreshCw,
  Search,
  FileText,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type CheckingDetail = {
  id: number;
  receiving_id?: number;
  receiving_no: string;
  sku: string;
  quantity: number;
  deskripsi?: string | null;

  // User yang melakukan checking
  checked_by?: string | null;

  // Waktu checking
  checked_at?: string | null;
};

type Product = {
  sku: string;
  deskripsi?: string | null;
};

export default function CheckingReportPage() {
  const router = useRouter();

  const [data, setData] = useState<CheckingDetail[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);

  const [selectedReceiving, setSelectedReceiving] =
    useState("");

  const [search, setSearch] = useState("");

  // ============================
  // CLEAN VALUE
  // ============================
  function clean(value: any) {
    return (value ?? "")
      .toString()
      .trim()
      .toLowerCase();
  }

  // ============================
  // LOAD CHECKING REPORT
  // ============================
  async function loadCheckingReport() {
    setLoading(true);

    const { data: checkingData, error } = await supabase
      .from("checking_details")
      .select(`
        id,
        receiving_id,
        receiving_no,
        sku,
        quantity,
        deskripsi,
        checked_by,
        checked_at
      `)
      .order("checked_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Checking report error:",
        error
      );

      alert(
        `Gagal mengambil data checking: ${error.message}`
      );

      setLoading(false);
      return;
    }

    setData(checkingData || []);

    setLoading(false);
  }

  // ============================
  // LOAD PRODUCTS
  // ============================
  async function loadProducts() {
    const { data, error } = await supabase
      .from("product")
      .select("sku, deskripsi");

    if (error) {
      console.error(
        "Product error:",
        error
      );
      return;
    }

    setProducts(data || []);
  }

  // ============================
  // INITIAL LOAD
  // ============================
  useEffect(() => {
    loadCheckingReport();
    loadProducts();
  }, []);

  // ============================
  // GET DESCRIPTION
  // ============================
  function getDescription(
    row: CheckingDetail
  ) {
    if (row.deskripsi) {
      return row.deskripsi;
    }

    const product = products.find(
      (p) =>
        clean(p.sku) === clean(row.sku)
    );

    return product?.deskripsi || "-";
  }

  // ============================
  // RECEIVING LIST
  // ============================
  const receivingList = useMemo(() => {
    const values = data
      .map((item) => item.receiving_no)
      .filter(Boolean);

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // FILTER DATA
  // ============================
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchReceiving =
        !selectedReceiving ||
        item.receiving_no ===
          selectedReceiving;

      const keyword =
        search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        clean(item.sku).includes(keyword) ||
        clean(
          getDescription(item)
        ).includes(keyword) ||
        clean(
          item.checked_by
        ).includes(keyword);

      return (
        matchReceiving &&
        matchSearch
      );
    });
  }, [
    data,
    selectedReceiving,
    search,
    products,
  ]);

  // ============================
  // TOTAL QTY
  // ============================
  const totalQty = useMemo(() => {
    return filteredData.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0),
      0
    );
  }, [filteredData]);

  // ============================
  // FORMAT DATE
  // ============================
  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  }

  // ============================
  // REFRESH
  // ============================
  async function refresh() {
    await loadCheckingReport();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="max-w-7xl mx-auto space-y-5">

        {/* ================= HEADER ================= */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-center gap-3">

              <button
                onClick={() =>
                  router.back()
                }
                className="
                  flex
                  items-center
                  gap-2
                  bg-gray-600
                  hover:bg-gray-700
                  text-white
                  px-3
                  py-2
                  rounded-lg
                  transition
                "
              >
                <ArrowLeftCircle
                  size={19}
                />

                <span>
                  Back
                </span>
              </button>

              <div>
                <div className="flex items-center gap-2">

                  <FileText
                    size={24}
                    className="text-blue-600"
                  />

                  <h1 className="text-xl md:text-2xl font-bold">
                    Checking Report
                  </h1>

                </div>

                <p className="text-sm text-gray-500 mt-1">
                  Report hasil checking inbound
                </p>
              </div>

            </div>

            {/* REFRESH */}
            <button
              onClick={refresh}
              disabled={loading}
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-blue-600
                hover:bg-blue-700
                disabled:bg-gray-400
                text-white
                px-4
                py-2
                rounded-lg
              "
            >
              <RefreshCw
                size={18}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

          </div>

        </div>

        {/* ================= FILTER ================= */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {/* RECEIVING */}
            <select
              value={selectedReceiving}
              onChange={(e) =>
                setSelectedReceiving(
                  e.target.value
                )
              }
              className="
                border
                rounded-lg
                px-3
                py-2
                w-full
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            >
              <option value="">
                Semua Receiving
              </option>

              {receivingList.map(
                (receiving) => (
                  <option
                    key={receiving}
                    value={receiving}
                  >
                    {receiving}
                  </option>
                )
              )}
            </select>

            {/* SEARCH */}
            <div className="relative">

              <Search
                size={18}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Cari SKU, deskripsi, atau user..."
                className="
                  border
                  rounded-lg
                  pl-10
                  pr-3
                  py-2
                  w-full
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                "
              />

            </div>

          </div>

        </div>

        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Baris
            </p>

            <p className="text-2xl font-bold mt-1">
              {filteredData.length}
            </p>

          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Qty Checking
            </p>

            <p className="text-2xl font-bold mt-1">
              {totalQty}
            </p>

          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Receiving
            </p>

            <p className="text-2xl font-bold mt-1">
              {selectedReceiving
                ? selectedReceiving
                : receivingList.length}
            </p>

          </div>

        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="bg-gray-100">

                  <th className="border p-3 text-left">
                    No
                  </th>

                  <th className="border p-3 text-left">
                    Receiving No
                  </th>

                  <th className="border p-3 text-left">
                    SKU
                  </th>

                  <th className="border p-3 text-left">
                    Deskripsi
                  </th>

                  <th className="border p-3 text-right">
                    Qty
                  </th>

                  <th className="border p-3 text-left">
                    User Checking
                  </th>

                  <th className="border p-3 text-left whitespace-nowrap">
                    Waktu Checking
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="border p-8 text-center"
                    >
                      <div className="flex justify-center items-center gap-2 text-gray-500">

                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />

                        Loading data...

                      </div>
                    </td>

                  </tr>

                ) : filteredData.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="border p-8 text-center text-gray-500"
                    >
                      Tidak ada data checking
                    </td>

                  </tr>

                ) : (

                  filteredData.map(
                    (item, index) => (

                      <tr
                        key={item.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="border p-3">
                          {index + 1}
                        </td>

                        <td className="border p-3 font-medium">
                          {item.receiving_no}
                        </td>

                        <td className="border p-3 font-mono">
                          {item.sku}
                        </td>

                        <td className="border p-3">
                          {getDescription(
                            item
                          )}
                        </td>

                        <td className="border p-3 text-right font-semibold">
                          {Number(
                            item.quantity || 0
                          )}
                        </td>

                        <td className="border p-3">
                          {item.checked_by ||
                            "-"}
                        </td>

                        <td className="border p-3 whitespace-nowrap">
                          {formatDate(
                            item.checked_at
                          )}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}
