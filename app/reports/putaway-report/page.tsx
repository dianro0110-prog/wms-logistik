
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

type PutawayDetail = {
  id: number;
  putaway_id?: number | null;
  receiving_no: string;
  sku: string;
  quantity: number;
  deskripsi?: string | null;
  location?: string | null;
  putaway_by?: string | null;
  putaway_at?: string | null;
};

type Product = {
  sku: string;
  deskripsi?: string | null;
};

export default function PutawayReportPage() {
  const router = useRouter();

  // ============================
  // STATE
  // ============================

  const [data, setData] = useState<PutawayDetail[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedRow, setSelectedRow] =
    useState<PutawayDetail | null>(null);

  const [showDetail, setShowDetail] =
    useState(false);

  const [selectedReceiving, setSelectedReceiving] =
    useState("");

  const [selectedLocation, setSelectedLocation] =
    useState("");

  const [search, setSearch] = useState("");

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
  // LOAD PUTAWAY REPORT
  // ============================

  async function loadPutawayReport() {
    try {
      setLoading(true);

      const { data: putawayData, error } =
        await supabase
          .from("putaway_details")
          .select(`
            id,
            putaway_id,
            receiving_no,
            sku,
            quantity,
            deskripsi,
            location,
            putaway_by,
            putaway_at
          `)
          .order("putaway_at", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Putaway report error:",
          error
        );

        alert(
          `Gagal mengambil data putaway: ${error.message}`
        );

        return;
      }

      setData(putawayData || []);
    } catch (error) {
      console.error(
        "Load putaway error:",
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
    loadPutawayReport();
    loadProducts();
  }, []);

  // ============================
  // GET DESCRIPTION
  // ============================

  function getDescription(
    row: PutawayDetail
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
  // LOCATION LIST
  // ============================

  const locationList = useMemo(() => {
    const values = data
      .map(
        (item) =>
          item.location
      )
      .filter(Boolean) as string[];

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // PUTAWAY USER LIST
  // ============================

  const putawayUserList = useMemo(() => {
    const values = data
      .map(
        (item) =>
          item.putaway_by
      )
      .filter(Boolean) as string[];

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // SELECTED USER
  // ============================

  const [selectedUser, setSelectedUser] =
    useState("");

  // ============================
  // FILTER DATA
  // ============================

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keyword =
        search.trim().toLowerCase();

      const description =
        getDescription(item);

      const matchReceiving =
        selectedReceiving === "" ||
        item.receiving_no ===
          selectedReceiving;

      const matchLocation =
        selectedLocation === "" ||
        clean(item.location) ===
          clean(selectedLocation);

      const matchUser =
        selectedUser === "" ||
        item.putaway_by === selectedUser;

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
        clean(item.location).includes(
          keyword
        ) ||
        clean(item.putaway_by).includes(
          keyword
        );

      const putawayDate =
        item.putaway_at
          ? item.putaway_at.slice(0, 10)
          : "";

      const matchDateFrom =
        dateFrom === ""
          ? true
          : putawayDate >= dateFrom;

      const matchDateTo =
        dateTo === ""
          ? true
          : putawayDate <= dateTo;

      return (
        matchReceiving &&
        matchLocation &&
        matchUser &&
        matchSearch &&
        matchDateFrom &&
        matchDateTo
      );
    });
  }, [
    data,
    products,
    selectedReceiving,
    selectedLocation,
    selectedUser,
    search,
    dateFrom,
    dateTo,
  ]);

  // ============================
  // RESET PAGE
  // ============================

  useEffect(() => {
    setPage(1);
  }, [
    search,
    selectedReceiving,
    selectedLocation,
    selectedUser,
    dateFrom,
    dateTo,
  ]);

  // ============================
  // SUMMARY
  // ============================

  const totalPutaway =
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

  const totalLocation = new Set(
    filteredData
      .map(
        (item) =>
          item.location
      )
      .filter(Boolean)
      .map((location) =>
        clean(location)
      )
  ).size;

  // ============================
  // TOTAL SKU
  // ============================

  const totalSku = new Set(
    filteredData
      .map(
        (item) =>
          item.sku
      )
      .filter(Boolean)
      .map((sku) =>
        clean(sku)
      )
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
    setSelectedLocation("");
    setSelectedUser("");
    setDateFrom("");
    setDateTo("");
  }

  // ============================
  // REFRESH
  // ============================

  async function refresh() {
    await loadPutawayReport();
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

          "Qty Putaway":
            item.quantity,

          Location:
            item.location || "-",

          "Putaway By":
            item.putaway_by || "-",

          "Putaway At":
            formatDate(
              item.putaway_at
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
      "Putaway Report"
    );

    XLSX.writeFile(
      workbook,
      `Putaway_Report_${
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
    row: PutawayDetail
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
  // RENDER
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
                className="text-purple-600"
              />

              <h1 className="text-3xl font-bold text-gray-800">
                Putaway Report
              </h1>

            </div>

            <p className="text-gray-500 mt-1">
              Laporan hasil Putaway Warehouse
            </p>

          </div>

        </div>

        {/* ACTION */}

        <div className="flex flex-wrap gap-2">

          <button
            onClick={refresh}
            disabled={loading}
            className="
              flex
              items-center
              gap-2
              bg-purple-600
              hover:bg-purple-700
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

        {/* TOTAL PUTAWAY */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Putaway
          </p>

          <h2 className="text-3xl font-bold text-purple-600 mt-2">
            {totalPutaway}
          </h2>

        </div>

        {/* TOTAL QTY */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Qty Putaway
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

          <h2 className="text-3xl font-bold text-blue-600 mt-2">
            {totalReceiving}
          </h2>

        </div>

        {/* TOTAL LOCATION */}

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Location
          </p>

          <h2 className="text-3xl font-bold text-orange-600 mt-2">
            {totalLocation}
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
              placeholder="Cari Receiving / SKU / Deskripsi / Location"
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
                focus:ring-purple-500
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
              focus:ring-purple-500
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

          {/* LOCATION */}

          <select
            value={selectedLocation}
            onChange={(e) =>
              setSelectedLocation(
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
              focus:ring-purple-500
            "
          >

            <option value="">
              Semua Location
            </option>

            {locationList.map(
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
            value={selectedUser}
            onChange={(e) =>
              setSelectedUser(
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
              focus:ring-purple-500
            "
          >

            <option value="">
              Semua User
            </option>

            {putawayUserList.map(
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

        </div>

        {/* DATE */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">

          <div className="flex flex-wrap items-center gap-3">

            <div className="flex items-center gap-2">

              <label className="text-sm text-gray-500">
                Dari:
              </label>

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
                  focus:ring-purple-500
                "
              />

            </div>

            <div className="flex items-center gap-2">

              <label className="text-sm text-gray-500">
                Sampai:
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
                  focus:ring-purple-500
                "
              />

            </div>

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

            <thead className="bg-purple-600 text-white">

              <tr>

                <th className="px-4 py-3 text-center">
                  No
                </th>

                <th className="px-4 py-3">
                  Putaway Date
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
                  Qty Putaway
                </th>

                <th className="px-4 py-3">
                  Location
                </th>

                <th className="px-4 py-3">
                  Putaway By
                </th>

              </tr>

            </thead>

            <tbody>

              {currentRows.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="
                      text-center
                      py-10
                      text-gray-500
                    "
                  >
                    Tidak ada data putaway.
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
                        hover:bg-purple-50
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
                          row.putaway_at
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
                        text-purple-600
                      ">

                        {Number(
                          row.quantity || 0
                        )}

                      </td>

                      {/* LOCATION */}

                      <td className="
                        px-4
                        py-3
                        font-medium
                      ">

                        {row.location ||
                          "-"}

                      </td>

                      {/* USER */}

                      <td className="px-4 py-3">

                        {row.putaway_by ||
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

      <div className="
        flex
        flex-col
        md:flex-row
        md:items-center
        md:justify-between
        gap-3
      ">

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
                      className="text-purple-600"
                    />

                    <h2 className="text-xl font-bold">
                      Detail Putaway
                    </h2>

                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Detail hasil putaway inbound
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

                  {/* PUTAWAY BY */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Putaway By
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {selectedRow.putaway_by ||
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

                  {/* LOCATION */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Location
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {selectedRow.location ||
                        "-"}
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

                  {/* QTY */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Qty Putaway
                    </label>

                    <div className="
                      font-semibold
                      text-purple-600
                      text-lg
                      mt-1
                    ">
                      {Number(
                        selectedRow.quantity ||
                          0
                      )}
                    </div>

                  </div>

                  {/* PUTAWAY ID */}

                  <div>

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Putaway ID
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {selectedRow.putaway_id ??
                        "-"}
                    </div>

                  </div>

                  {/* PUTAWAY AT */}

                  <div className="md:col-span-2">

                    <label className="
                      text-gray-500
                      text-sm
                    ">
                      Putaway At
                    </label>

                    <div className="
                      font-semibold
                      mt-1
                    ">
                      {formatDate(
                        selectedRow.putaway_at
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
                    bg-purple-600
                    hover:bg-purple-700
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
