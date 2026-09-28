
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftCircle,
  X,
  Search,
  RefreshCcw,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import * as XLSX from "xlsx";

interface PackingReport {
  id: number;
  order_no: string;
  customer_name: string;
  sku: string;
  deskripsi?: string | null;
  qty: number;
  carton?: string | null;
  weight?: number | null;
  packing_at?: string | null;
  packed_by?: string | null;
}

export default function PackingReportPage() {
  const router = useRouter();

  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<PackingReport[]>([]);

  const [selectedRow, setSelectedRow] =
    useState<PackingReport | null>(null);

  const [showDetail, setShowDetail] =
    useState(false);

  // =====================================================
  // FILTER
  // =====================================================

  const [search, setSearch] = useState("");

  const [customer, setCustomer] = useState("");

  const [user, setUser] = useState("");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  // =====================================================
  // PAGINATION
  // =====================================================

  const [page, setPage] = useState(1);

  const pageSize = 10;

  // =====================================================
  // LOAD DATA
  // =====================================================

  async function loadData() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("packing")
        .select(
          `
          id,
          order_no,
          customer_name,
          sku,
          deskripsi,
          qty,
          carton,
          weight,
          packing_at,
          packed_by
          `
        )
        .order("packing_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);

        alert(error.message);

        return;
      }

      setRows(data || []);
    } catch (err) {
      console.error(err);

      alert("Gagal mengambil laporan packing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =====================================================
  // FILTER DATA
  // =====================================================

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const keyword =
        search.trim().toLowerCase();

      // -------------------------------------------------
      // SEARCH
      // -------------------------------------------------

      const matchSearch =
        keyword === "" ||
        row.order_no
          ?.toLowerCase()
          .includes(keyword) ||
        row.customer_name
          ?.toLowerCase()
          .includes(keyword) ||
        row.sku
          ?.toLowerCase()
          .includes(keyword) ||
        row.deskripsi
          ?.toLowerCase()
          .includes(keyword) ||
        row.carton
          ?.toLowerCase()
          .includes(keyword) ||
        row.packed_by
          ?.toLowerCase()
          .includes(keyword);

      // -------------------------------------------------
      // CUSTOMER
      // -------------------------------------------------

      const matchCustomer =
        customer === ""
          ? true
          : row.customer_name === customer;

      // -------------------------------------------------
      // USER
      // -------------------------------------------------

      const matchUser =
        user === ""
          ? true
          : row.packed_by === user;

      // -------------------------------------------------
      // DATE
      // -------------------------------------------------

      const packingDate = row.packing_at
        ? row.packing_at.slice(0, 10)
        : "";

      const matchDateFrom =
        dateFrom === ""
          ? true
          : packingDate >= dateFrom;

      const matchDateTo =
        dateTo === ""
          ? true
          : packingDate <= dateTo;

      return (
        matchSearch &&
        matchCustomer &&
        matchUser &&
        matchDateFrom &&
        matchDateTo
      );
    });
  }, [
    rows,
    search,
    customer,
    user,
    dateFrom,
    dateTo,
  ]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalPacking = filtered.length;

  const totalQty = filtered.reduce(
    (sum, item) =>
      sum + Number(item.qty || 0),
    0
  );

  const totalWeight = filtered.reduce(
    (sum, item) =>
      sum + Number(item.weight || 0),
    0
  );

  const totalOrder = new Set(
    filtered.map(
      (item) => item.order_no
    )
  ).size;

  const totalCarton = new Set(
    filtered
      .map((item) => item.carton)
      .filter(
        (carton) =>
          carton !== null &&
          carton !== undefined &&
          carton !== ""
      )
  ).size;

  const totalUser = new Set(
    filtered
      .map((item) => item.packed_by)
      .filter(
        (packedBy) =>
          packedBy !== null &&
          packedBy !== undefined &&
          packedBy !== ""
      )
  ).size;

  // =====================================================
  // CUSTOMER LIST
  // =====================================================

  const customerList = Array.from(
    new Set(
      rows
        .map(
          (item) =>
            item.customer_name
        )
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== ""
        )
    )
  ).sort();

  // =====================================================
  // USER LIST
  // =====================================================

  const userList = Array.from(
    new Set(
      rows
        .map(
          (item) =>
            item.packed_by
        )
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== ""
        )
    )
  ).sort();

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalPages = Math.ceil(
    filtered.length / pageSize
  );

  const currentRows = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    customer,
    user,
    dateFrom,
    dateTo,
  ]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  function exportExcel() {
    if (filtered.length === 0) {
      alert(
        "Tidak ada data untuk diexport."
      );

      return;
    }

    const exportData = filtered.map(
      (item, index) => ({
        No: index + 1,

        "Order No":
          item.order_no,

        Customer:
          item.customer_name,

        SKU:
          item.sku,

        Deskripsi:
          item.deskripsi || "",

        Qty:
          Number(item.qty || 0),

        Carton:
          item.carton || "",

        "Berat (Kg)":
          item.weight !== null &&
          item.weight !== undefined
            ? Number(item.weight)
            : "",

        User:
          item.packed_by || "",

        "Packing At":
          item.packing_at
            ? formatDate(
                item.packing_at
              )
            : "",
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Packing Report"
    );

    XLSX.writeFile(
      workbook,
      `Packing_Report_${
        new Date()
          .toISOString()
          .slice(0, 10)
      }.xlsx`
    );
  }

  // =====================================================
  // PRINT
  // =====================================================

  function printReport() {
    window.print();
  }

  // =====================================================
  // RESET FILTER
  // =====================================================

  function resetFilter() {
    setSearch("");
    setCustomer("");
    setUser("");
    setDateFrom("");
    setDateTo("");
  }

  // =====================================================
  // CLOSE DETAIL
  // =====================================================

  function closeDetail() {
    setShowDetail(false);
    setSelectedRow(null);
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              router.back()
            }
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
          >
            <ArrowLeftCircle
              size={18}
            />

            Back
          </button>

          <div>

            <h1 className="text-3xl font-bold text-gray-800">
              Packing Report
            </h1>

            <p className="text-gray-500 mt-1">
              Laporan hasil Packing Warehouse
            </p>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          {/* REFRESH */}

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <RefreshCcw
              size={18}
            />

            Refresh
          </button>

          {/* EXPORT */}

          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <FileSpreadsheet
              size={18}
            />

            Export Excel
          </button>

          {/* PRINT */}

          <button
            onClick={printReport}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
          >
            <Printer
              size={18}
            />

            Print
          </button>

        </div>

      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">

        {/* TOTAL PACKING */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Packing
          </p>

          <h2 className="text-3xl font-bold text-blue-600 mt-2">
            {totalPacking}
          </h2>

        </div>

        {/* TOTAL QTY */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Qty
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {totalQty}
          </h2>

        </div>

        {/* TOTAL ORDER */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Order
          </p>

          <h2 className="text-3xl font-bold text-purple-600 mt-2">
            {totalOrder}
          </h2>

        </div>

        {/* TOTAL CARTON */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Carton
          </p>

          <h2 className="text-3xl font-bold text-orange-600 mt-2">
            {totalCarton}
          </h2>

        </div>

        {/* TOTAL USER */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total User
          </p>

          <h2 className="text-3xl font-bold text-teal-600 mt-2">
            {totalUser}
          </h2>

        </div>

        {/* TOTAL WEIGHT */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Berat
          </p>

          <h2 className="text-3xl font-bold text-indigo-600 mt-2">
            {totalWeight.toFixed(2)} Kg
          </h2>

        </div>

      </div>

      {/* =================================================
          FILTER
      ================================================= */}

      <div className="bg-white rounded-xl shadow p-5">

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">

          {/* SEARCH */}

          <div className="relative lg:col-span-2">

            <Search
              size={18}
              className="absolute left-3 top-3 text-gray-400"
            />

            <input
              type="text"
              placeholder="Cari Order / Customer / SKU / Deskripsi / Carton / User"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="w-full border rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* CUSTOMER */}

          <select
            value={customer}
            onChange={(e) =>
              setCustomer(
                e.target.value
              )
            }
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option value="">
              Semua Customer
            </option>

            {customerList.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}

          </select>

          {/* USER */}

          <select
            value={user}
            onChange={(e) =>
              setUser(
                e.target.value
              )
            }
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >

            <option value="">
              Semua User
            </option>

            {userList.map(
              (item) => (
                <option
                  key={item}
                  
                >
                  {item}
                </option>
              )
            )}

          </select>

          {/* DATE FROM */}

          <input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              setDateFrom(
                e.target.value
              )
            }
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* DATE TO */}

          <input
            type="date"
            value={dateTo}
            onChange={(e) =>
              setDateTo(
                e.target.value
              )
            }
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

        {/* RESET */}

        <div className="flex justify-end mt-4">

          <button
            onClick={
              resetFilter
            }
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition"
          >
            Reset Filter
          </button>

        </div>

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">

        {loading ? (

          <div className="p-10 text-center">
            Loading...
          </div>

        ) : (

          <table className="min-w-full text-sm">

            <thead className="bg-blue-600 text-white">

              <tr>

                <th className="px-4 py-3 text-center">
                  No
                </th>

                <th className="px-4 py-3">
                  Packing Date
                </th>

                <th className="px-4 py-3">
                  Order No
                </th>

                <th className="px-4 py-3">
                  Customer
                </th>

                <th className="px-4 py-3">
                  SKU
                </th>

                <th className="px-4 py-3">
                  Deskripsi
                </th>

                <th className="px-4 py-3 text-center">
                  Qty
                </th>

                <th className="px-4 py-3">
                  Carton
                </th>

                <th className="px-4 py-3 text-center">
                  Berat
                </th>

                <th className="px-4 py-3">
                  User
                </th>

              </tr>

            </thead>

            <tbody>

              {currentRows.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={10}
                    className="text-center py-10 text-gray-500"
                  >
                    Tidak ada data packing.
                  </td>

                </tr>

              ) : (

                currentRows.map(
                  (row, index) => (

                    <tr
                      key={row.id}
                      onClick={() => {
                        setSelectedRow(
                          row
                        );

                        setShowDetail(
                          true
                        );
                      }}
                      className="border-b hover:bg-blue-50 cursor-pointer transition"
                    >

                      {/* NO */}

                      <td className="px-4 py-3 text-center">

                        {(page - 1) *
                          pageSize +
                          index +
                          1}

                      </td>

                      {/* DATE */}

                      <td className="px-4 py-3 whitespace-nowrap">

                        {formatDate(
                          row.packing_at
                        )}

                      </td>

                      {/* ORDER */}

                      <td className="px-4 py-3 font-medium">

                        {row.order_no}

                      </td>

                      {/* CUSTOMER */}

                      <td className="px-4 py-3">

                        {row.customer_name}

                      </td>

                      {/* SKU */}

                      <td className="px-4 py-3 font-medium text-blue-600">

                        {row.sku}

                      </td>

                      {/* DESCRIPTION */}

                      <td className="px-4 py-3">

                        {row.deskripsi ||
                          "-"}

                      </td>

                      {/* QTY */}

                      <td className="px-4 py-3 text-center font-semibold text-blue-600">

                        {Number(
                          row.qty || 0
                        )}

                      </td>

                      {/* CARTON */}

                      <td className="px-4 py-3">

                        {row.carton ||
                          "-"}

                      </td>

                      {/* WEIGHT */}

                      <td className="px-4 py-3 text-center">

                        {row.weight !==
                          null &&
                        row.weight !==
                          undefined
                          ? `${Number(
                              row.weight
                            ).toFixed(
                              2
                            )} Kg`
                          : "-"}

                      </td>

                      {/* USER */}

                      <td className="px-4 py-3 font-medium text-teal-600">

                        {row.packed_by ||
                          "-"}

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        )}

      </div>

      {/* =================================================
          PAGINATION
      ================================================= */}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

        <div className="text-sm text-gray-500">

          Total Data :{" "}
          {filtered.length}

        </div>

        <div className="flex items-center gap-2">

          <button
            disabled={
              page === 1
            }
            onClick={() =>
              setPage(
                (p) => p - 1
              )
            }
            className="flex items-center gap-1 px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >

            <ChevronLeft
              size={18}
            />

            Previous

          </button>

          <span className="px-4 text-sm">

            Page {page} of{" "}
            {totalPages || 1}

          </span>

          <button
            disabled={
              page >= totalPages ||
              totalPages === 0
            }
            onClick={() =>
              setPage(
                (p) => p + 1
              )
            }
            className="flex items-center gap-1 px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >

            Next

            <ChevronRight
              size={18}
            />

          </button>

        </div>

      </div>

      {/* =================================================
          DETAIL MODAL
      ================================================= */}

      {showDetail &&
        selectedRow && (

          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">

            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              {/* MODAL HEADER */}

              <div className="flex justify-between items-center border-b p-5">

                <h2 className="text-xl font-bold">
                  Detail Packing
                </h2>

                <button
                  onClick={
                    closeDetail
                  }
                  className="text-gray-500 hover:text-red-500 transition"
                >
                  <X size={22} />
                </button>

              </div>

              {/* MODAL CONTENT */}

              <div className="p-6">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* ORDER */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Order No
                    </label>

                    <div className="font-semibold mt-1">
                      {
                        selectedRow.order_no
                      }
                    </div>

                  </div>

                  {/* CUSTOMER */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Customer
                    </label>

                    <div className="font-semibold mt-1">
                      {
                        selectedRow.customer_name
                      }
                    </div>

                  </div>

                  {/* SKU */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      SKU
                    </label>

                    <div className="font-semibold text-blue-600 mt-1">
                      {
                        selectedRow.sku
                      }
                    </div>

                  </div>

                  {/* CARTON */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Carton
                    </label>

                    <div className="font-semibold mt-1">
                      {
                        selectedRow.carton ||
                        "-"
                      }
                    </div>

                  </div>

                  {/* DESCRIPTION */}

                  <div className="sm:col-span-2">

                    <label className="text-gray-500 text-sm">
                      Deskripsi
                    </label>

                    <div className="font-semibold mt-1">
                      {
                        selectedRow.deskripsi ||
                        "-"
                      }
                    </div>

                  </div>

                  {/* QTY */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Qty
                    </label>

                    <div className="font-semibold text-blue-600 text-lg mt-1">
                      {Number(
                        selectedRow.qty ||
                          0
                      )}
                    </div>

                  </div>

                  {/* WEIGHT */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Berat
                    </label>

                    <div className="font-semibold text-purple-600 text-lg mt-1">

                      {selectedRow.weight !==
                        null &&
                      selectedRow.weight !==
                        undefined
                        ? `${Number(
                            selectedRow.weight
                          ).toFixed(
                            2
                          )} Kg`
                        : "-"}

                    </div>

                  </div>

                  {/* USER */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Packed By / User
                    </label>

                    <div className="font-semibold text-teal-600 mt-1">
                      {
                        selectedRow.packed_by ||
                        "-"
                      }
                    </div>

                  </div>

                  {/* PACKING DATE */}

                  <div>

                    <label className="text-gray-500 text-sm">
                      Packing At
                    </label>

                    <div className="font-semibold mt-1">

                      {formatDate(
                        selectedRow.packing_at
                      )}

                    </div>

                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="border-t p-5 flex justify-end">

                <button
                  onClick={
                    closeDetail
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}
