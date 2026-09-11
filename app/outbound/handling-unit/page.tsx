
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../../lib/supabase";

interface PackingRow {
  id: number;
  order_no: string;
  customer_name: string | null;
  sku: string;
  deskripsi: string | null;
  qty: number;
  carton: string;
  weight: number | null;
  packing_at: string | null;
}

interface HandlingItem {
  sku: string;
  deskripsi: string;
  qty: number;
}

interface HandlingUnit {
  order_no: string;
  customer_name: string;
  carton: string;
  items: HandlingItem[];
  total_qty: number;
  total_sku: number;
  total_weight: number;
}

export default function HandlingUnitPage() {
  const router = useRouter();

  const [data, setData] = useState<HandlingUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const [orderFilter, setOrderFilter] = useState("");
  const [cartonFilter, setCartonFilter] = useState("");

  const [expanded, setExpanded] = useState<string | null>(null);

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    loadHandlingUnit();
  }, []);

  async function loadHandlingUnit() {
    try {
      setLoading(true);

      const {
        data: packingData,
        error,
      } = await supabase
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
          packing_at
          `
        )
        .order("packing_at", {
          ascending: false,
        });

      if (error) {
        console.error("Handling Unit error:", error);

        alert(error.message);
        return;
      }

      // =================================================
      // GROUPING HANDLING UNIT
      // ORDER NO + CARTON
      // =================================================

      const grouped: Record<string, HandlingUnit> = {};

      (packingData || []).forEach((row: PackingRow) => {
        const orderNo = String(row.order_no || "").trim();
        const carton = String(row.carton || "").trim();
        const sku = String(row.sku || "").trim();

        if (!orderNo || !carton || !sku) {
          return;
        }

        const huKey =
          `${orderNo}___${carton}`.toUpperCase();

        // =================================================
        // BUAT HANDLING UNIT BARU
        // =================================================

        if (!grouped[huKey]) {
          grouped[huKey] = {
            order_no: orderNo,
            customer_name: row.customer_name || "",
            carton: carton,
            items: [],
            total_qty: 0,
            total_sku: 0,
            total_weight: 0,
          };
        }

        // =================================================
        // TOTAL WEIGHT
        // =================================================

        grouped[huKey].total_weight += Number(
          row.weight || 0
        );

        // =================================================
        // CEK SKU YANG SAMA
        // =================================================

        const existingItem =
          grouped[huKey].items.find(
            (item) =>
              item.sku.trim().toUpperCase() ===
              sku.trim().toUpperCase()
          );

        // =================================================
        // JIKA SKU SUDAH ADA
        // =================================================

        if (existingItem) {
          existingItem.qty += Number(
            row.qty || 0
          );
        } else {
          // =================================================
          // SKU BARU
          // =================================================

          grouped[huKey].items.push({
            sku: row.sku,
            deskripsi: row.deskripsi || "",
            qty: Number(row.qty || 0),
          });
        }

        // =================================================
        // TOTAL QTY
        // =================================================

        grouped[huKey].total_qty += Number(
          row.qty || 0
        );
      });

      // =================================================
      // TOTAL SKU
      // =================================================

      Object.values(grouped).forEach((hu) => {
        hu.total_sku = hu.items.length;
      });

      // =================================================
      // SORTING
      // =================================================

      const result = Object.values(grouped).sort(
        (a, b) => {
          const orderCompare =
            a.order_no.localeCompare(
              b.order_no
            );

          if (orderCompare !== 0) {
            return orderCompare;
          }

          return a.carton.localeCompare(
            b.carton
          );
        }
      );

      setData(result);
    } catch (error) {
      console.error(error);

      alert(
        "Terjadi kesalahan saat mengambil data Handling Unit."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FILTER
  // =====================================================

  const filteredData = useMemo(() => {
    const order =
      orderFilter
        .trim()
        .toUpperCase();

    const carton =
      cartonFilter
        .trim()
        .toUpperCase();

    return data.filter((item) => {
      const matchOrder =
        !order ||
        item.order_no
          .toUpperCase()
          .includes(order);

      const matchCarton =
        !carton ||
        item.carton
          .toUpperCase()
          .includes(carton);

      return (
        matchOrder &&
        matchCarton
      );
    });
  }, [
    data,
    orderFilter,
    cartonFilter,
  ]);

  // =====================================================
  // RESET FILTER
  // =====================================================

  function resetFilter() {
    setOrderFilter("");
    setCartonFilter("");
  }

  // =====================================================
  // TOGGLE DETAIL
  // =====================================================

  function toggleDetail(key: string) {
    setExpanded(
      expanded === key
        ? null
        : key
    );
  }

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  function exportExcel() {
    if (filteredData.length === 0) {
      alert(
        "Tidak ada data yang dapat diexport."
      );
      return;
    }

    const excelData: any[] = [];

    filteredData.forEach((hu) => {
      hu.items.forEach(
        (item, index) => {
          excelData.push({
            "No Order":
              hu.order_no,

            Customer:
              hu.customer_name ||
              "-",

            "No Carton":
              hu.carton,

            "No SKU":
              index + 1,

            SKU:
              item.sku,

            Deskripsi:
              item.deskripsi ||
              "-",

            Qty:
              item.qty,

            "Total SKU":
              hu.total_sku,

            "Total Qty Carton":
              hu.total_qty,

            "Total Weight":
              hu.total_weight,
          });
        }
      );
    });

    // =================================================
    // CREATE WORKSHEET
    // =================================================

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    // =================================================
    // COLUMN WIDTH
    // =================================================

    worksheet["!cols"] = [
      {
        wch: 18,
      },
      {
        wch: 25,
      },
      {
        wch: 18,
      },
      {
        wch: 10,
      },
      {
        wch: 20,
      },
      {
        wch: 40,
      },
      {
        wch: 12,
      },
      {
        wch: 12,
      },
      {
        wch: 18,
      },
      {
        wch: 15,
      },
    ];

    // =================================================
    // CREATE WORKBOOK
    // =================================================

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Handling Unit"
    );

    // =================================================
    // FILE NAME
    // =================================================

    const now =
      new Date();

    const dateString =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

    XLSX.writeFile(
      workbook,
      `Handling_Unit_${dateString}.xlsx`
    );
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHtml(
    value: string
  ) {
    return value
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  // =====================================================
  // PRINT PER CARTON
  // =====================================================

  function printCarton(
    hu: HandlingUnit
  ) {
    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=700"
      );

    if (!printWindow) {
      alert(
        "Popup diblokir browser. Silakan izinkan popup untuk melakukan print."
      );

      return;
    }

    // =================================================
    // ITEM ROW
    // =================================================

    const itemRows =
      hu.items
        .map(
          (
            item,
            index
          ) => `
            <tr>
              <td>${index + 1}</td>

              <td class="sku">
                ${escapeHtml(
                  item.sku
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.deskripsi ||
                    "-"
                )}
              </td>

              <td class="qty">
                ${item.qty}
              </td>
            </tr>
          `
        )
        .join("");

    const printDate =
      new Date().toLocaleString(
        "id-ID"
      );

    // =================================================
    // PRINT HTML
    // =================================================

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            Handling Unit -
            ${escapeHtml(
              hu.order_no
            )} -
            ${escapeHtml(
              hu.carton
            )}
          </title>

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              margin: 0;

              padding: 30px;

              color: #1e293b;

              background: white;
            }

            .header {
              display: flex;

              justify-content:
                space-between;

              align-items:
                flex-start;

              border-bottom:
                2px solid #1e293b;

              padding-bottom:
                15px;

              margin-bottom:
                20px;
            }

            .title {
              font-size: 24px;

              font-weight:
                bold;

              margin-bottom:
                5px;
            }

            .subtitle {
              color:
                #64748b;

              font-size:
                13px;
            }

            .carton {
              font-size:
                22px;

              font-weight:
                bold;

              border:
                2px solid #2563eb;

              color:
                #2563eb;

              padding:
                10px 18px;

              border-radius:
                8px;
            }

            .info {
              display:
                grid;

              grid-template-columns:
                repeat(3, 1fr);

              gap:
                12px;

              margin-bottom:
                25px;
            }

            .info-box {
              border:
                1px solid #cbd5e1;

              border-radius:
                6px;

              padding:
                12px;
            }

            .label {
              color:
                #64748b;

              font-size:
                11px;

              margin-bottom:
                5px;
            }

            .value {
              font-size:
                15px;

              font-weight:
                bold;
            }

            table {
              width: 100%;

              border-collapse:
                collapse;

              margin-top:
                15px;
            }

            th {
              background:
                #f1f5f9;

              border:
                1px solid #cbd5e1;

              padding:
                10px;

              text-align:
                left;

              font-size:
                12px;
            }

            td {
              border:
                1px solid #cbd5e1;

              padding:
                10px;

              font-size:
                12px;
            }

            td:first-child {
              text-align:
                center;

              width:
                50px;
            }

            .sku {
              font-weight:
                bold;
            }

            .qty {
              text-align:
                right;

              font-weight:
                bold;

              width:
                100px;
            }

            .total {
              margin-top:
                20px;

              display:
                flex;

              justify-content:
                flex-end;
            }

            .total-box {
              border:
                2px solid #1e293b;

              padding:
                12px 20px;

              min-width:
                220px;

              display:
                flex;

              justify-content:
                space-between;

              gap:
                30px;

              font-weight:
                bold;
            }

            .footer {
              margin-top:
                40px;

              display:
                flex;

              justify-content:
                space-between;

              font-size:
                11px;

              color:
                #64748b;
            }

            @media print {

              body {
                padding:
                  15mm;
              }

              @page {
                size:
                  A4 portrait;

                margin:
                  10mm;
              }

              .no-print {
                display:
                  none !important;
              }

            }

          </style>

        </head>

        <body>

          <div class="header">

            <div>

              <div class="title">
                HANDLING UNIT
              </div>

              <div class="subtitle">
                Packing Detail
              </div>

            </div>

            <div class="carton">
              ${escapeHtml(
                hu.carton
              )}
            </div>

          </div>

          <div class="info">

            <div class="info-box">

              <div class="label">
                NO ORDER
              </div>

              <div class="value">
                ${escapeHtml(
                  hu.order_no
                )}
              </div>

            </div>

            <div class="info-box">

              <div class="label">
                CUSTOMER
              </div>

              <div class="value">
                ${escapeHtml(
                  hu.customer_name ||
                    "-"
                )}
              </div>

            </div>

            <div class="info-box">

              <div class="label">
                NO CARTON
              </div>

              <div class="value">
                ${escapeHtml(
                  hu.carton
                )}
              </div>

            </div>

          </div>

          <table>

            <thead>

              <tr>

                <th>
                  No
                </th>

                <th>
                  SKU
                </th>

                <th>
                  Deskripsi
                </th>

                <th style="text-align:right">
                  Qty
                </th>

              </tr>

            </thead>

            <tbody>
              ${itemRows}
            </tbody>

          </table>

          <div class="total">

            <div class="total-box">

              <span>
                TOTAL QTY
              </span>

              <span>
                ${hu.total_qty}
              </span>

            </div>

          </div>

          <div class="footer">

            <div>
              Total SKU:
              ${hu.total_sku}
            </div>

            <div>
              Total Weight:
              ${hu.total_weight}
            </div>

            <div>
              Printed:
              ${escapeHtml(
                printDate
              )}
            </div>

          </div>

          <script>

            window.onload =
              function() {

                window.print();

                window.onafterprint =
                  function() {

                    window.close();

                  };

              };

          </script>

        </body>

      </html>
    `);

    printWindow.document.close();
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalHU =
    filteredData.length;

  const totalQty =
    filteredData.reduce(
      (sum, hu) =>
        sum + hu.total_qty,
      0
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">

      {/* =================================================
          TOMBOL KEMBALI
      ================================================= */}

      <div className="mb-4">

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition shadow-sm"
        >
          <ArrowLeft
            size={18}
          />

          Kembali
        </button>

      </div>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div className="flex items-center gap-3">

          <div className="bg-blue-600 text-white p-3 rounded-xl shadow-sm">

            <Package
              size={24}
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-slate-800">
              Handling Unit
            </h1>

            <p className="text-sm text-slate-500">
              Packing berdasarkan
              Order No dan Carton
            </p>

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          {/* =================================================
              EXPORT EXCEL
          ================================================= */}

          <button
            onClick={
              exportExcel
            }
            disabled={
              loading ||
              filteredData.length ===
                0
            }
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >

            <FileSpreadsheet
              size={18}
            />

            Export Excel

          </button>

          {/* =================================================
              REFRESH
          ================================================= */}

          <button
            onClick={
              loadHandlingUnit
            }
            disabled={
              loading
            }
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
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

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* TOTAL HU */}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-500">
                Total Handling Unit
              </p>

              <p className="text-2xl font-bold text-slate-800 mt-1">
                {totalHU}
              </p>

            </div>

            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">

              <Package
                size={22}
              />

            </div>

          </div>

        </div>

        {/* TOTAL QTY */}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-500">
                Total Quantity
              </p>

              <p className="text-2xl font-bold text-slate-800 mt-1">
                {totalQty}
              </p>

            </div>

            <div className="bg-green-50 text-green-600 p-3 rounded-lg">

              <Package
                size={22}
              />

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          FILTER
      ================================================= */}

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ORDER */}

          <div>

            <label className="block text-sm font-medium text-slate-600 mb-2">
              No Order
            </label>

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  orderFilter
                }
                onChange={(e) =>
                  setOrderFilter(
                    e.target.value
                  )
                }
                placeholder="Filter No Order..."
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

          {/* CARTON */}

          <div>

            <label className="block text-sm font-medium text-slate-600 mb-2">
              No Carton
            </label>

            <div className="relative">

              <Package
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  cartonFilter
                }
                onChange={(e) =>
                  setCartonFilter(
                    e.target.value
                  )
                }
                placeholder="Filter No Carton..."
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

          {/* RESET */}

          <div className="flex items-end">

            <button
              onClick={
                resetFilter
              }
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg transition"
            >

              <X
                size={18}
              />

              Reset

            </button>

          </div>

        </div>

      </div>

      {/* =================================================
          RESULT
      ================================================= */}

      {loading ? (

        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">

          <RefreshCw
            size={28}
            className="mx-auto text-blue-600 animate-spin"
          />

          <p className="mt-3 text-slate-500">
            Loading Handling Unit...
          </p>

        </div>

      ) : filteredData.length ===
        0 ? (

        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">

          <Package
            size={40}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-3 font-semibold text-slate-700">
            Tidak ada Handling Unit
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Data belum tersedia atau
            tidak sesuai filter.
          </p>

        </div>

      ) : (

        <div className="space-y-4">

          {filteredData.map(
            (hu) => {

              const key =
                `${hu.order_no}___${hu.carton}`;

              const isExpanded =
                expanded ===
                key;

              return (

                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                >

                  {/* =================================================
                      HEADER HU
                  ================================================= */}

                  <div className="p-5">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                      {/* ORDER */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleDetail(
                            key
                          )
                        }
                        className="flex-1 text-left hover:opacity-80 transition"
                      >

                        <div className="flex items-start gap-4">

                          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">

                            <Package
                              size={24}
                            />

                          </div>

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="text-lg font-bold text-slate-800">
                                {
                                  hu.order_no
                                }
                              </h2>

                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                {
                                  hu.carton
                                }
                              </span>

                            </div>

                            <p className="text-sm text-slate-500 mt-1">

                              Customer:{" "}

                              <span className="font-medium text-slate-700">

                                {
                                  hu.customer_name ||
                                  "-"
                                }

                              </span>

                            </p>

                          </div>

                        </div>

                      </button>

                      {/* SUMMARY + ACTION */}

                      <div className="flex flex-wrap items-center gap-4">

                        <div>

                          <p className="text-xs text-slate-400">
                            SKU
                          </p>

                          <p className="font-bold text-slate-800">
                            {
                              hu.total_sku
                            }
                          </p>

                        </div>

                        <div>

                          <p className="text-xs text-slate-400">
                            Qty
                          </p>

                          <p className="font-bold text-blue-600">
                            {
                              hu.total_qty
                            }
                          </p>

                        </div>

                        {/* PRINT */}

                        <button
                          type="button"
                          onClick={() =>
                            printCarton(
                              hu
                            )
                          }
                          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition"
                        >

                          <Printer
                            size={17}
                          />

                          Print

                        </button>

                        {/* EXPAND */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleDetail(
                              key
                            )
                          }
                          className="text-slate-400 hover:text-slate-700 p-2"
                        >

                          {isExpanded ? (
                            <ChevronUp
                              size={22}
                            />
                          ) : (
                            <ChevronDown
                              size={22}
                            />
                          )}

                        </button>

                      </div>

                    </div>

                  </div>

                  {/* =================================================
                      DETAIL
                  ================================================= */}

                  {isExpanded && (

                    <div className="border-t border-slate-100">

                      {/* INFO */}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-5 bg-slate-50">

                        <div className="bg-white border border-slate-200 rounded-lg p-4">

                          <p className="text-xs text-slate-400">
                            No Order
                          </p>

                          <p className="font-bold text-slate-800 mt-1">
                            {
                              hu.order_no
                            }
                          </p>

                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-4">

                          <p className="text-xs text-slate-400">
                            Nama Customer
                          </p>

                          <p className="font-bold text-slate-800 mt-1">
                            {
                              hu.customer_name ||
                              "-"
                            }
                          </p>

                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-4">

                          <p className="text-xs text-slate-400">
                            No Carton
                          </p>

                          <p className="font-bold text-blue-600 mt-1">
                            {
                              hu.carton
                            }
                          </p>

                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-4">

                          <p className="text-xs text-slate-400">
                            Total Weight
                          </p>

                          <p className="font-bold text-slate-800 mt-1">
                            {
                              hu.total_weight
                            }
                          </p>

                        </div>

                      </div>

                      {/* DETAIL SKU */}

                      <div className="p-5">

                        <div className="overflow-x-auto">

                          <table className="w-full text-sm">

                            <thead>

                              <tr className="border-b border-slate-200">

                                <th className="text-left px-3 py-3 font-semibold text-slate-600">
                                  No
                                </th>

                                <th className="text-left px-3 py-3 font-semibold text-slate-600">
                                  SKU
                                </th>

                                <th className="text-left px-3 py-3 font-semibold text-slate-600">
                                  Deskripsi
                                </th>

                                <th className="text-right px-3 py-3 font-semibold text-slate-600">
                                  Qty
                                </th>

                              </tr>

                            </thead>

                            <tbody>

                              {hu.items.map(
                                (
                                  item,
                                  index
                                ) => (

                                  <tr
                                    key={`${key}-${item.sku}`}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                  >

                                    <td className="px-3 py-3 text-slate-400">
                                      {
                                        index +
                                        1
                                      }
                                    </td>

                                    <td className="px-3 py-3">

                                      <span className="font-bold text-blue-600">
                                        {
                                          item.sku
                                        }
                                      </span>

                                    </td>

                                    <td className="px-3 py-3 text-slate-600">
                                      {
                                        item.deskripsi ||
                                        "-"
                                      }
                                    </td>

                                    <td className="px-3 py-3 text-right">

                                      <span className="inline-flex min-w-[50px] justify-center bg-green-50 text-green-700 px-3 py-1 rounded-md font-bold">
                                        {
                                          item.qty
                                        }
                                      </span>

                                    </td>

                                  </tr>

                                )
                              )}

                            </tbody>

                            <tfoot>

                              <tr className="border-t-2 border-slate-200">

                                <td
                                  colSpan={
                                    3
                                  }
                                  className="px-3 py-4 text-right font-bold text-slate-600"
                                >
                                  Total Qty
                                </td>

                                <td className="px-3 py-4 text-right">

                                  <span className="text-lg font-bold text-blue-600">
                                    {
                                      hu.total_qty
                                    }
                                  </span>

                                </td>

                              </tr>

                            </tfoot>

                          </table>

                        </div>

                      </div>

                    </div>

                  )}

                </div>

              );
            }
          )}

        </div>

      )}

    </div>
  );
}
