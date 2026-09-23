"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import { supabase } from "../../../lib/supabase";

// =========================================================
// TYPE
// =========================================================

type Status = "MATCH" | "EXCESS" | "SHORTAGE" | null;

type CountingReportRow = {
  first_count_id: number | null;
  second_count_id: number | null;
  third_count_id: number | null;

  location: string | null;
  sku: string | null;
  deskripsi: string | null;

  stock_existing: number | null;

  first_qty: number | null;
  first_difference: number | null;
  first_status: Status;

  second_qty: number | null;
  second_difference: number | null;
  second_status: Status;

  third_qty: number | null;
  third_difference: number | null;
  third_status: Status;

  final_count: number | null;
  final_difference: number | null;
  final_status: Status;
};

// =========================================================
// HELPER
// =========================================================

function normalize(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function numberValue(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(number);
}

function getStatus(value: unknown): Status {
  const number = numberValue(value);

  if (number > 0) return "EXCESS";
  if (number < 0) return "SHORTAGE";

  return "MATCH";
}

function getStatusClass(status: Status) {
  switch (status) {
    case "EXCESS":
      return "bg-orange-100 text-orange-700 border-orange-200";

    case "SHORTAGE":
      return "bg-red-100 text-red-700 border-red-200";

    case "MATCH":
      return "bg-green-100 text-green-700 border-green-200";

    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

// =========================================================
// PAGE
// =========================================================

export default function CountingReportPage() {
  const router = useRouter();

  const [rows, setRows] = useState<CountingReportRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // =======================================================
  // LOAD REPORT
  // =======================================================

  async function loadReport() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("counting_report")
        .select("*")
        .order("location", {
          ascending: true,
        })
        .order("sku", {
          ascending: true,
        });

      if (error) {
        console.error(error);

        alert(
          "Gagal mengambil counting report:\n" +
            error.message
        );

        return;
      }

      setRows((data ?? []) as CountingReportRow[]);
    } catch (error) {
      console.error(error);

      alert("Terjadi kesalahan saat mengambil report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  // =======================================================
  // LOCATION LIST
  // =======================================================

  const locations = useMemo(() => {
    const values = new Set<string>();

    rows.forEach((row) => {
      const location = normalize(row.location);

      if (location) {
        values.add(location);
      }
    });

    return Array.from(values).sort();
  }, [rows]);

  // =======================================================
  // FILTER
  // =======================================================

  const filteredRows = useMemo(() => {
    const keyword = normalize(search);

    return rows.filter((row) => {
      const location = normalize(row.location);
      const sku = normalize(row.sku);
      const description = normalize(row.deskripsi);

      const searchMatch =
        !keyword ||
        location.includes(keyword) ||
        sku.includes(keyword) ||
        description.includes(keyword);

      const locationMatch =
        locationFilter === "ALL" ||
        location === locationFilter;

      const statusMatch =
        statusFilter === "ALL" ||
        row.final_status === statusFilter;

      return (
        searchMatch &&
        locationMatch &&
        statusMatch
      );
    });
  }, [
    rows,
    search,
    locationFilter,
    statusFilter,
  ]);

  // =======================================================
  // SUMMARY
  // =======================================================

  const summary = useMemo(() => {
    let match = 0;
    let excess = 0;
    let shortage = 0;

    let firstCounted = 0;
    let secondCounted = 0;
    let thirdCounted = 0;

    let totalStock = 0;
    let totalFinal = 0;
    let totalDifference = 0;

    filteredRows.forEach((row) => {
      if (row.final_status === "MATCH") {
        match++;
      }

      if (row.final_status === "EXCESS") {
        excess++;
      }

      if (row.final_status === "SHORTAGE") {
        shortage++;
      }

      if (row.first_qty !== null) {
        firstCounted++;
      }

      if (row.second_qty !== null) {
        secondCounted++;
      }

      if (row.third_qty !== null) {
        thirdCounted++;
      }

      totalStock += numberValue(
        row.stock_existing
      );

      totalFinal += numberValue(
        row.final_count
      );

      totalDifference += numberValue(
        row.final_difference
      );
    });

    return {
      total: filteredRows.length,
      match,
      excess,
      shortage,
      firstCounted,
      secondCounted,
      thirdCounted,
      totalStock,
      totalFinal,
      totalDifference,
    };
  }, [filteredRows]);

  // =======================================================
  // EXPORT EXCEL
  // =======================================================

  async function exportExcel() {
    try {
      if (filteredRows.length === 0) {
        alert("Tidak ada data untuk di-export.");
        return;
      }

      setExporting(true);

      const exportData = filteredRows.map(
        (row, index) => ({
          NO: index + 1,

          LOCATION: row.location ?? "",

          SKU: row.sku ?? "",

          DESKRIPSI: row.deskripsi ?? "",

          "STOCK EXISTING": nullableNumber(
            row.stock_existing
          ),

          "FIRST COUNT": nullableNumber(
            row.first_qty
          ),

          "FIRST DIFFERENCE": nullableNumber(
            row.first_difference
          ),

          "FIRST STATUS":
            row.first_status ?? "",

          "SECOND COUNT": nullableNumber(
            row.second_qty
          ),

          "SECOND DIFFERENCE": nullableNumber(
            row.second_difference
          ),

          "SECOND STATUS":
            row.second_status ?? "",

          "THIRD COUNT": nullableNumber(
            row.third_qty
          ),

          "THIRD DIFFERENCE": nullableNumber(
            row.third_difference
          ),

          "THIRD STATUS":
            row.third_status ?? "",

          "FINAL COUNT": nullableNumber(
            row.final_count
          ),

          "FINAL DIFFERENCE": nullableNumber(
            row.final_difference
          ),

          "FINAL STATUS":
            row.final_status ?? "",
        })
      );

      const worksheet =
        XLSX.utils.json_to_sheet(exportData);

      // ===================================================
      // COLUMN WIDTH
      // ===================================================

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 20 },
        { wch: 40 },

        { wch: 18 },

        { wch: 15 },
        { wch: 18 },
        { wch: 15 },

        { wch: 16 },
        { wch: 18 },
        { wch: 16 },

        { wch: 15 },
        { wch: 18 },
        { wch: 15 },

        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Counting Report"
      );

      const now = new Date();

      const date = now
        .toISOString()
        .slice(0, 10);

      const fileName =
        `COUNTING-REPORT-${date}.xlsx`;

      XLSX.writeFile(
        workbook,
        fileName
      );
    } catch (error) {
      console.error(error);

      alert(
        "Gagal export Excel."
      );
    } finally {
      setExporting(false);
    }
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                title="Kembali"
              >
                <ArrowLeftCircle size={28} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Counting Report
                </h1>

                <p className="text-sm text-gray-500">
                  Hasil First Count, Second Count dan Third Count
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadReport}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw size={17} />
                )}

                Refresh
              </button>

              <button
                type="button"
                onClick={exportExcel}
                disabled={
                  exporting ||
                  filteredRows.length === 0
                }
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={17} />
                )}

                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <main className="mx-auto max-w-[1600px] p-4">
        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <SummaryCard
            title="Total"
            value={summary.total}
          />

          <SummaryCard
            title="Match"
            value={summary.match}
          />

          <SummaryCard
            title="Excess"
            value={summary.excess}
          />

          <SummaryCard
            title="Shortage"
            value={summary.shortage}
          />

          <SummaryCard
            title="First Count"
            value={summary.firstCounted}
          />

          <SummaryCard
            title="Second Count"
            value={summary.secondCounted}
          />

          <SummaryCard
            title="Third Count"
            value={summary.thirdCounted}
          />
        </div>

        {/* ================================================= */}
        {/* TOTAL */}
        {/* ================================================= */}

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-medium text-gray-500">
              Total Stock Existing
            </div>

            <div className="mt-1 text-xl font-bold text-gray-900">
              {formatNumber(
                summary.totalStock
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-medium text-gray-500">
              Total Final Count
            </div>

            <div className="mt-1 text-xl font-bold text-gray-900">
              {formatNumber(
                summary.totalFinal
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-xs font-medium text-gray-500">
              Total Final Difference
            </div>

            <div className="mt-1 text-xl font-bold text-gray-900">
              {formatNumber(
                summary.totalDifference
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* FILTER */}
        {/* ================================================= */}

        <div className="mb-4 rounded-xl border bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            {/* SEARCH */}

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Cari location, SKU, deskripsi..."
                className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-400"
              />
            </div>

            {/* LOCATION */}

            <select
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value)
              }
              className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none"
            >
              <option value="ALL">
                Semua Location
              </option>

              {locations.map((location) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              ))}
            </select>

            {/* STATUS */}

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none"
            >
              <option value="ALL">
                Semua Status
              </option>

              <option value="MATCH">
                MATCH
              </option>

              <option value="EXCESS">
                EXCESS
              </option>

              <option value="SHORTAGE">
                SHORTAGE
              </option>
            </select>
          </div>
        </div>

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        <div className="overflow-hidden rounded-xl border bg-white">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Loading report...
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
              <CheckCircle2
                size={40}
                className="mb-3 text-gray-300"
              />

              <div className="font-semibold text-gray-700">
                Tidak ada data
              </div>

              <div className="mt-1 text-sm text-gray-400">
                Belum ada data counting yang sesuai filter.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1700px] w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 border-r px-3 py-3 text-left"
                    >
                      #
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r px-3 py-3 text-left"
                    >
                      Location
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r px-3 py-3 text-left"
                    >
                      SKU
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r px-3 py-3 text-left"
                    >
                      Deskripsi
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r px-3 py-3 text-right"
                    >
                      Stock
                    </th>

                    <th
                      colSpan={3}
                      className="border-r bg-blue-50 px-3 py-2 text-center"
                    >
                      FIRST COUNT
                    </th>

                    <th
                      colSpan={3}
                      className="border-r bg-yellow-50 px-3 py-2 text-center"
                    >
                      SECOND COUNT
                    </th>

                    <th
                      colSpan={3}
                      className="border-r bg-purple-50 px-3 py-2 text-center"
                    >
                      THIRD COUNT
                    </th>

                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center"
                    >
                      FINAL
                    </th>
                  </tr>

                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-right">
                      Qty
                    </th>

                    <th className="px-3 py-2 text-right">
                      Diff
                    </th>

                    <th className="border-r px-3 py-2 text-center">
                      Status
                    </th>

                    <th className="px-3 py-2 text-right">
                      Qty
                    </th>

                    <th className="px-3 py-2 text-right">
                      Diff
                    </th>

                    <th className="border-r px-3 py-2 text-center">
                      Status
                    </th>

                    <th className="px-3 py-2 text-right">
                      Qty
                    </th>

                    <th className="px-3 py-2 text-right">
                      Diff
                    </th>

                    <th className="border-r px-3 py-2 text-center">
                      Status
                    </th>

                    <th className="px-3 py-2 text-right">
                      Qty
                    </th>

                    <th className="px-3 py-2 text-right">
                      Diff
                    </th>

                    <th className="px-3 py-2 text-center">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map(
                    (row, index) => (
                      <tr
                        key={
                          row.first_count_id ??
                          `${row.location}-${row.sku}-${index}`
                        }
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="sticky left-0 z-10 border-r bg-white px-3 py-3 text-gray-500">
                          {index + 1}
                        </td>

                        <td className="border-r px-3 py-3 font-medium">
                          {row.location || "-"}
                        </td>

                        <td className="border-r px-3 py-3 font-semibold">
                          {row.sku || "-"}
                        </td>

                        <td className="border-r px-3 py-3">
                          {row.deskripsi || "-"}
                        </td>

                        <td className="border-r px-3 py-3 text-right font-semibold">
                          {formatNumber(
                            row.stock_existing
                          )}
                        </td>

                        {/* FIRST */}

                        <td className="px-3 py-3 text-right">
                          {row.first_qty === null
                            ? "-"
                            : formatNumber(
                                row.first_qty
                              )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {row.first_difference === null
                            ? "-"
                            : formatNumber(
                                row.first_difference
                              )}
                        </td>

                        <td className="border-r px-3 py-3 text-center">
                          <StatusBadge
                            status={
                              row.first_status
                            }
                          />
                        </td>

                        {/* SECOND */}

                        <td className="px-3 py-3 text-right">
                          {row.second_qty === null
                            ? "-"
                            : formatNumber(
                                row.second_qty
                              )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {row.second_difference === null
                            ? "-"
                            : formatNumber(
                                row.second_difference
                              )}
                        </td>

                        <td className="border-r px-3 py-3 text-center">
                          <StatusBadge
                            status={
                              row.second_status
                            }
                          />
                        </td>

                        {/* THIRD */}

                        <td className="px-3 py-3 text-right">
                          {row.third_qty === null
                            ? "-"
                            : formatNumber(
                                row.third_qty
                              )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          {row.third_difference === null
                            ? "-"
                            : formatNumber(
                                row.third_difference
                              )}
                        </td>

                        <td className="border-r px-3 py-3 text-center">
                          <StatusBadge
                            status={
                              row.third_status
                            }
                          />
                        </td>

                        {/* FINAL */}

                        <td className="px-3 py-3 text-right font-bold">
                          {formatNumber(
                            row.final_count
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-bold">
                          {formatNumber(
                            row.final_difference
                          )}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <StatusBadge
                            status={
                              row.final_status
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        {!loading &&
          filteredRows.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
              <span>
                Menampilkan{" "}
                <b className="text-gray-700">
                  {filteredRows.length}
                </b>{" "}
                dari{" "}
                <b className="text-gray-700">
                  {rows.length}
                </b>{" "}
                data
              </span>

              <span>
                Final Difference:{" "}
                <b className="text-gray-700">
                  {formatNumber(
                    summary.totalDifference
                  )}
                </b>
              </span>
            </div>
          )}
      </main>
    </div>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs font-medium text-gray-500">
        {title}
      </div>

      <div className="mt-1 text-xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({
  status,
}: {
  status: Status;
}) {
  if (!status) {
    return (
      <span className="text-gray-300">
        -
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      {status}
    </span>
  );
}