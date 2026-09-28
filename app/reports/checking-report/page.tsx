"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  RefreshCcw,
  Search,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import * as XLSX from "xlsx";

type CheckingDetail = {
  id: number;
  receiving_id?: number;
  receiving_no: string;
  sku: string;
  quantity: number;
  deskripsi?: string | null;
  checked_by?: string | null;
  checked_at?: string | null;
};

type Product = {
  sku: string;
  deskripsi?: string | null;
};

export default function CheckingReportPage() {
  const router = useRouter();

  // ============================
  // STATE
  // ============================

  const [data, setData] = useState<CheckingDetail[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedRow, setSelectedRow] =
    useState<CheckingDetail | null>(null);

  const [showDetail, setShowDetail] =
    useState(false);

  const [search, setSearch] = useState("");

  const [selectedReceiving, setSelectedReceiving] =
    useState("");

  const [checker, setChecker] = useState("");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);

  const pageSize = 10;

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
  // LOAD CHECKING
  // ============================

  async function loadCheckingReport() {
    try {
      setLoading(true);

      const { data: checkingData, error } =
        await supabase
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

        return;
      }

      setData(checkingData || []);
    } catch (error) {
      console.error(
        "Load checking error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================
  // LOAD PRODUCTS
  // ============================

  async function loadProducts() {
    try {
      const { data, error } =
        await supabase
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
    } catch (error) {
      console.error(
        "Load product error:",
        error
      );
    }
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
    if (
      row.deskripsi &&
      row.deskripsi.trim() !== ""
    ) {
      return row.deskripsi;
    }

    const product = products.find(
      (item) =>
        clean(item.sku) ===
        clean(row.sku)
    );

    return product?.deskripsi || "-";
  }

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
  // RECEIVING LIST
  // ============================

  const receivingList = useMemo(() => {
    const values = data
      .map(
        (item) =>
          item.receiving_no
      )
      .filter(Boolean);

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // CHECKER LIST
  // ============================

  const checkerList = useMemo(() => {
    const values = data
      .map(
        (item) =>
          item.checked_by
      )
      .filter(Boolean) as string[];

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // FILTER
  // ============================

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keyword =
        search.trim().toLowerCase();

      const description =
        getDescription(item);

      const matchSearch =
        !keyword ||
        clean(item.receiving_no).includes(
          keyword
        ) ||
        clean(item.sku).includes(
          keyword
        ) ||
        clean(description).includes(
          keyword
        ) ||
        clean(item.checked_by).includes(
          keyword
        );

      const matchReceiving =
        selectedReceiving === "" ||
        item.receiving_no ===
          selectedReceiving;

      const matchChecker =
        checker === "" ||
        item.checked_by === checker;

      const checkedDate =
        item.checked_at
          ? item.checked_at.slice(0, 10)
          : "";

      const matchDateFrom =
        dateFrom === ""
          ? true
          : checkedDate >= dateFrom;

      const matchDateTo =
        dateTo === ""
          ? true
          : checkedDate <= dateTo;

      return (
        matchSearch &&
        matchReceiving &&
        matchChecker &&
        matchDateFrom &&
        matchDateTo
      );
    });
  }, [
    data,
    products,
    search,
    selectedReceiving,
    checker,
    dateFrom,
    dateTo,
  ]);

  // ============================
  // RESET PAGE WHEN FILTER CHANGE
  // ============================

  useEffect(() => {
    setPage(1);
  }, [
    search,
    selectedReceiving,
    checker,
    dateFrom,
    dateTo,
  ]);

  // ============================
  // SUMMARY
  // ============================

  const totalChecking =
    filteredData.length;

  const totalQty = filteredData.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const totalReceiving = new Set(
    filteredData.map(
      (item) =>
        item.receiving_no
    )
  ).size;

  const totalChecker = new Set(
    filteredData
      .map(
        (item) =>
          item.checked_by
      )
      .filter(Boolean)
  ).size;

  // ============================
  // PAGINATION
  // ============================

  const totalPages = Math.ceil(
    filteredData.length / pageSize
  );

  const currentRows =
    filteredData.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

  // ============================
  // RESET FILTER
  // ============================

  function resetFilter() {
    setSearch("");
    setSelectedReceiving("");
    setChecker("");
    setDateFrom("");
    setDateTo("");
  }

  // ============================
  // REFRESH
  // ============================

  async function refresh() {
    await loadCheckingReport();
    await loadProducts();
  }

  // ============================
  // EXPORT EXCEL
  // ============================

  function exportExcel() {
    if (filteredData.length === 0) {
      alert(
        "Tidak ada data untuk diexport."
      );

      return;
    }

    const exportData =
      filteredData.map(
        (item, index) => ({
          No: index + 1,

          "Receiving No":
            item.receiving_no,

          SKU: item.sku,

          Deskripsi:
            getDescription(item),

          Qty: item.quantity,

          Checker:
            item.checked_by || "-",

          "Waktu Checking":
            formatDate(
              item.checked_at
            ),
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
      "Checking Report"
    );

    XLSX.writeFile(
      workbook,
      `Checking_Report_${
        new Date()
          .toISOString()
          .slice(0, 10)
      }.xlsx`
    );
  }

  // ============================
  // PRINT
  // ============================

  function printReport() {
    window.print();
  }

  // ============================
  // OPEN DETAIL
  // ============================

  function openDetail(
    row: CheckingDetail
  ) {
    setSelectedRow(row);
    setShowDetail(true);
  }

  // ============================
  // CLOSE DETAIL
  // ============================

  function closeDetail() {
    setShowDetail(false);
    setSelectedRow(null);
  }

  // ============================
  // RETURN UI
  // ============================

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* ================= HEADER ================= */}

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
              px-4
              py-2
              rounded-lg
              transition
            "
          >
            <ArrowLeftCircle
              size={18}
            />

            Back
          </button>

          <div>

            <div className="flex items-center gap-2">

              <FileText
                size={26}
                className="text-blue-600"
              />

              <h1 className="text-3xl font-bold text-gray-800">
                Checking Report
              </h1>

            </div>

            <p className="text-gray-500 mt-1">
              Laporan hasil Checking Warehouse
            </p>

          </div>

        </div>

        {/* ACTION BUTTON */}

        <div className="flex flex-wrap gap-2">

          <button
            onClick={refresh}
            disabled={loading}
            className="
              flex
              items-center
              gap-2
              bg-blue-600
              hover:bg-blue-700
              disabled:bg-gray-400
              text-white
              px-4
              py-2
              rounded-lg
              transition
            "
          >

            <RefreshCcw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>

          <button
            onClick={exportExcel}
            className="
              flex
              items-center
              gap-2
              bg-green-600
              hover:bg-green-700
              text-white
              px-4
              py-2
              rounded-lg
              transition
            "
          >

            <FileSpreadsheet
              size={18}
            />

            Export Excel

          </button>

          <button
            onClick={printReport}
            className="
              flex
              items-center
              gap-2
              bg-gray-700
              hover:bg-gray-800
              text-white
              px-4
              py-2
              rounded-lg
              transition
            "
          >

            <Printer
              size={18}
            />

            Print

          </button>

        </div>

      </div>

      {/* ================= SUMMARY ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* TOTAL CHECKING */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Checking
          </p>

          <h2 className="text-3xl font-bold text-blue-600 mt-2">
            {totalChecking}
          </h2>

        </div>

        {/* TOTAL QTY */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Qty Checking
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {totalQty}
          </h2>

        </div>

        {/* TOTAL RECEIVING */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Receiving
          </p>

          <h2 className="text-3xl font-bold text-purple-600 mt-2">
            {totalReceiving}
          </h2>

        </div>

        {/* TOTAL CHECKER */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Checker
          </p>

          <h2 className="text-3xl font-bold text-orange-600 mt-2">
            {totalChecker}
          </h2>

        </div>

      </div>

      {/* ================= FILTER ================= */}

      <div className="bg-white rounded-xl shadow p-5">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* SEARCH */}

          <div className="relative lg:col-span-2">

            <Search
              size={18}
              className="
                absolute
                left-3
                top-3
                text-gray-400
              "
            />

            <input
              type="text"
              placeholder="Cari Receiving / SKU / Deskripsi / Checker"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="
                w-full
                border
                rounded-lg
                pl-10
                pr-3
                py-2
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />

          </div>

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
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          >

            <option value="">
              Semua Receiving
            </option>

            {receivingList.map(
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

          {/* CHECKER */}

          <select
            value={checker}
            onChange={(e) =>
              setChecker(
                e.target.value
              )
            }
            className="
              border
              rounded-lg
              px-3
              py-2
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          >

            <option value="">
              Semua Checker
            </option>

            {checkerList.map(
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

          {/* DATE FROM */}

          <input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              setDateFrom(
                e.target.value
              )
            }
            className="
              border
              rounded-lg
              px-3
              py-2
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
          />

        </div>

        {/* SECOND FILTER ROW */}

        <div className="flex flex-col md:flex-row md:justify-between gap-3 mt-4">

          <div className="flex items-center gap-2">

            <label className="text-sm text-gray-500 whitespace-nowrap">
              Sampai tanggal:
            </label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(
                  e.target.value
                )
              }
              className="
                border
                rounded-lg
                px-3
                py-2
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />

          </div>

          <button
            onClick={resetFilter}
            className="
              bg-red-500
              hover:bg-red-600
              text-white
              px-5
              py-2
              rounded-lg
              transition
            "
          >
            Reset Filter
          </button>

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">

        {loading ? (

          <div className="p-10 text-center">

            <div className="flex justify-center items-center gap-2 text-gray-500">

              <RefreshCcw
                size={20}
                className="animate-spin"
              />

              Loading data...

            </div>

          </div>

        ) : (

          <table className="min-w-full text-sm">

            <thead className="bg-blue-600 text-white">

              <tr>

                <th className="px-4 py-3 text-center">
                  No
                </th>

                <th className="px-4 py-3">
                  Checking Date
                </th>

                <th className="px-4 py-3">
                  Receiving No
                </th>

                <th className="px-4 py-3">
                  SKU
                </th>

                <th className="px-4 py-3">
                  Deskripsi
                </th>

                <th className="px-4 py-3 text-center">
                  Qty Checking
                </th>

                <th className="px-4 py-3">
                  Checker
                </th>

              </tr>

            </thead>

            <tbody>

              {currentRows.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="
                      text-center
                      py-10
                      text-gray-500
                    "
                  >
                    Tidak ada data checking.
                  </td>

                </tr>

              ) : (

                currentRows.map(
                  (row, index) => (

                    <tr
                      key={row.id}
                      onClick={() =>
                        openDetail(row)
                      }
                      className="
                        border-b
                        hover:bg-blue-50
                        cursor-pointer
                        transition
                      "
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
                          row.checked_at
                        )}

                      </td>

                      {/* RECEIVING */}

                      <td className="px-4 py-3 font-medium">

                        {row.receiving_no}

                      </td>

                      {/* SKU */}

                      <td className="px-4 py-3">

                        {row.sku}

                      </td>

                      {/* DESCRIPTION */}

                      <td className="px-4 py-3">

                        {getDescription(
                          row
                        )}

                      </td>

                      {/* QTY */}

                      <td className="
                        px-4
                        py-3
                        text-center
                        font-semibold
                        text-blue-600
                      ">

                        {Number(
                          row.quantity || 0
                        )}

                      </td>

                      {/* CHECKER */}

                      <td className="px-4 py-3">

                        {row.checked_by ||
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

      {/* ================= PAGINATION ================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        <div className="text-sm text-gray-500">

          Total Data :{" "}
          {filteredData.length}

        </div>

        <div className="flex items-center gap-2">

          <button
            disabled={page === 1}
            onClick={() =>
              setPage(
                (p) => p - 1
              )
            }
            className="
              flex
              items-center
              gap-1
              px-3
              py-2
              rounded
              bg-gray-200
              hover:bg-gray-300
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
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
              page >= totalPages
            }
            onClick={() =>
              setPage(
                (p) => p + 1
              )
            }
            className="
              flex
              items-center
              gap-1
              px-3
              py-2
              rounded
              bg-gray-200
              hover:bg-gray-300
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >

            Next

            <ChevronRight
              size={18}
            />

          </button>

        </div>

      </div>

      {/* ================= DETAIL MODAL ================= */}

      {showDetail &&
        selectedRow && (

          <div className="
            fixed
            inset-0
            bg-black/40
            flex
            justify-center
            items-center
            z-50
            p-4
          ">

            <div className="
              bg-white
              rounded-xl
              shadow-xl
              w-full
              max-w-2xl
              max-h-[90vh]
              overflow-y-auto
            ">

              {/* MODAL HEADER */}

              <div className="
                flex
                justify-between
                items-center
                border-b
                p-5
              ">

                <div>

                  <div className="flex items-center gap-2">

                    <FileText
                      size={22}
                      className="text-blue-600"
                    />

                    <h2 className="text-xl font-bold">

                      Detail Checking

                    </h2>

                  </div>

                  <p className="text-sm text-gray-500 mt-1">

                    Detail hasil checking inbound

                  </p>

                </div>

                <button
                  onClick={
                    closeDetail
                  }
                  className="
                    p-2
                    rounded-lg
                    hover:bg-gray-100
                    transition
                  "
                >

                  <X
                    size={22}
                  />

                </button>

              </div>

              {/* MODAL BODY */}

              <div className="p-6 space-y-5">

                <div className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-5
                ">

                  {/* RECEIVING */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Receiving No
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {selectedRow.receiving_no}
                    </div>

                  </div>

                  {/* CHECKER */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Checker
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {selectedRow.checked_by ||
                        "-"}
                    </div>

                  </div>

                  {/* SKU */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      SKU
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {selectedRow.sku}
                    </div>

                  </div>

                  {/* QTY */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Qty Checking
                    </label>

                    <div className="
                      font-semibold
                      text-blue-600
                      text-lg
                      mt-1
                    ">
                      {Number(
                        selectedRow.quantity ||
                          0
                      )}
                    </div>

                  </div>

                  {/* DESCRIPTION */}

                  <div className="md:col-span-2">

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Description
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {getDescription(
                        selectedRow
                      )}
                    </div>

                  </div>

                  {/* CHECKED AT */}

                  <div className="md:col-span-2">

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Checked At
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {formatDate(
                        selectedRow.checked_at
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}

              <div className="
                border-t
                p-5
                flex
                justify-end
              ">

                <button
                  onClick={
                    closeDetail
                  }
                  className="
                    bg-blue-600
                    hover:bg-blue-700
                    text-white
                    px-5
                    py-2
                    rounded-lg
                    transition
                  "
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