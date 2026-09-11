"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeftCircle,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface OrderHeader {
  order_no: string;
  customer_name: string | null;
  status: string | null;
}

interface OrderDetail {
  id: number;
  order_no: string;
  sku: string;
  deskripsi: string | null;
  qty_order: number;
}

export default function SuratJalanPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  // =========================================================
  // LOAD ORDER
  // =========================================================
  async function loadOrders() {
    try {
      setLoadingOrders(true);

      const { data, error } = await supabase
        .from("order_header")
        .select("order_no, customer_name, status")
        .order("order_no", { ascending: false });

      if (error) {
        console.error("Load order error:", error);
        alert("Gagal mengambil data order");
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat mengambil order");
    } finally {
      setLoadingOrders(false);
    }
  }

  // =========================================================
  // LOAD DETAIL ORDER
  // =========================================================
  async function loadOrderDetail(orderNo: string) {
    if (!orderNo) {
      setDetails([]);
      setCustomer("");
      setStatus("");
      return;
    }

    try {
      setLoadingDetail(true);

      // Ambil header
      const { data: headerData, error: headerError } = await supabase
        .from("order_header")
        .select("order_no, customer_name, status")
        .eq("order_no", orderNo)
        .maybeSingle();

      if (headerError) {
        console.error("Header error:", headerError);
        alert("Gagal mengambil data customer");
        return;
      }

      if (headerData) {
        setCustomer(headerData.customer_name || "");
        setStatus(headerData.status || "");
      }

      // Ambil SEMUA detail order
      const { data: detailData, error: detailError } = await supabase
        .from("order_detail")
        .select("id, order_no, sku, deskripsi, qty_order")
        .eq("order_no", orderNo)
        .order("id", { ascending: true });

      if (detailError) {
        console.error("Detail error:", detailError);
        alert("Gagal mengambil detail order");
        return;
      }

      setDetails(detailData || []);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat mengambil detail order");
    } finally {
      setLoadingDetail(false);
    }
  }

  // =========================================================
  // SELECT ORDER
  // =========================================================
  const handleOrderChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const orderNo = e.target.value;

    setSelectedOrder(orderNo);

    loadOrderDetail(orderNo);
  };

  // =========================================================
  // TOTAL QTY
  // =========================================================
  const totalQty = details.reduce(
    (total, item) => total + Number(item.qty_order || 0),
    0
  );

  // =========================================================
  // FILTER SKU
  // =========================================================
  const filteredDetails = details.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      item.sku?.toLowerCase().includes(keyword) ||
      item.deskripsi?.toLowerCase().includes(keyword)
    );
  });

  // =========================================================
  // EXPORT EXCEL
  // =========================================================
  const exportExcel = () => {
    if (!selectedOrder) {
      alert("Silakan pilih Order No terlebih dahulu");
      return;
    }

    if (details.length === 0) {
      alert("Tidak ada detail order");
      return;
    }

    const exportData = details.map((item, index) => ({
      No: index + 1,
      "Order No": item.order_no,
      Customer: customer,
      SKU: item.sku,
      Deskripsi: item.deskripsi || "",
      Qty: Number(item.qty_order || 0),
    }));

    exportData.push({
      No: "",
      "Order No": "",
      Customer: "",
      SKU: "",
      Deskripsi: "TOTAL QTY",
      Qty: totalQty,
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 45 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Surat Jalan"
    );

    XLSX.writeFile(
      workbook,
      `Surat_Jalan_${selectedOrder}.xlsx`
    );
  };

  // =========================================================
  // ESCAPE HTML
  // =========================================================
  const escapeHtml = (value: any) => {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // =========================================================
  // PRINT SURAT JALAN
  // =========================================================
  const printSuratJalan = () => {
    if (!selectedOrder) {
      alert("Silakan pilih Order No terlebih dahulu");
      return;
    }

    if (details.length === 0) {
      alert("Tidak ada detail order");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!printWindow) {
      alert(
        "Popup diblokir browser. Silakan izinkan popup untuk website ini."
      );
      return;
    }

    const today = new Date();

    const tanggal = today.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const detailRows = details
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>${escapeHtml(item.sku)}</td>
            <td>${escapeHtml(item.deskripsi || "")}</td>
            <td class="center">${Number(item.qty_order || 0)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Surat Jalan - ${escapeHtml(selectedOrder)}</title>

          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              margin: 0;
              padding: 0;
              font-size: 12px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #111;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }

            .company {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .company-detail {
              font-size: 11px;
              line-height: 1.5;
            }

            .document-title {
              text-align: right;
            }

            .document-title h1 {
              font-size: 24px;
              margin: 0 0 5px 0;
            }

            .document-title p {
              margin: 2px 0;
              font-size: 11px;
            }

            .info {
              display: grid;
              grid-template-columns: 150px 1fr 150px 1fr;
              gap: 6px 10px;
              margin-bottom: 18px;
              border: 1px solid #999;
              padding: 10px;
            }

            .info-label {
              font-weight: bold;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th,
            td {
              border: 1px solid #555;
              padding: 7px;
              vertical-align: top;
            }

            th {
              background: #eee;
              text-align: center;
              font-weight: bold;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .total-row td {
              font-weight: bold;
              background: #f3f3f3;
            }

            .signature {
              margin-top: 55px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 80px;
              text-align: center;
            }

            .signature-box {
              min-height: 100px;
            }

            .signature-line {
              margin-top: 65px;
              border-top: 1px solid #111;
              padding-top: 5px;
            }

            .footer {
              margin-top: 30px;
              font-size: 10px;
              text-align: center;
              color: #555;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>

          <div class="header">

            <div>
              <div class="company">
                Z WAREHOUSE
              </div>

              <div class="company-detail">
                Warehouse Management System<br />
                Surat Jalan Pengiriman
              </div>
            </div>

            <div class="document-title">
              <h1>SURAT JALAN</h1>
              <p>Order No: <strong>${escapeHtml(
                selectedOrder
              )}</strong></p>
              <p>Tanggal: ${tanggal}</p>
            </div>

          </div>

          <div class="info">

            <div class="info-label">
              Order No
            </div>

            <div>
              ${escapeHtml(selectedOrder)}
            </div>

            <div class="info-label">
              Customer
            </div>

            <div>
              ${escapeHtml(customer || "-")}
            </div>

            <div class="info-label">
              Status
            </div>

            <div>
              ${escapeHtml(status || "-")}
            </div>

            <div class="info-label">
              Total SKU
            </div>

            <div>
              ${details.length}
            </div>

          </div>

          <table>

            <thead>
              <tr>
                <th style="width: 45px;">
                  No
                </th>

                <th style="width: 150px;">
                  SKU
                </th>

                <th>
                  Deskripsi
                </th>

                <th style="width: 100px;">
                  Qty
                </th>
              </tr>
            </thead>

            <tbody>

              ${detailRows}

              <tr class="total-row">

                <td
                  colspan="3"
                  class="right"
                >
                  TOTAL QTY
                </td>

                <td class="center">
                  ${totalQty}
                </td>

              </tr>

            </tbody>

          </table>

          <div class="signature">

            <div class="signature-box">
              <div>
                Dibuat Oleh
              </div>

              <div class="signature-line">
                Warehouse
              </div>
            </div>

            <div class="signature-box">
              <div>
                Diterima Oleh
              </div>

              <div class="signature-line">
                Customer
              </div>
            </div>

          </div>

          <div class="footer">
            Dokumen ini dibuat secara otomatis oleh Warehouse Management System.
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>

        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // =========================================================
  // REFRESH
  // =========================================================
  const refresh = async () => {
    await loadOrders();

    if (selectedOrder) {
      await loadOrderDetail(selectedOrder);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="mb-6">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          <ArrowLeftCircle size={20} />

          <span>
            Back
          </span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-5">

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Surat Jalan
            </h1>

            <p className="text-slate-500 mt-1">
              Surat jalan berdasarkan Order yang telah di-upload
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              onClick={refresh}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              <RefreshCw size={18} />

              Refresh
            </button>

            <button
              onClick={exportExcel}
              disabled={!selectedOrder || details.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={18} />

              Export Excel
            </button>

            <button
              onClick={printSuratJalan}
              disabled={!selectedOrder || details.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Printer size={18} />

              Print
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          SELECT ORDER
      ====================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">

        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Pilih Order
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>

            <label className="block text-sm font-medium text-slate-600 mb-2">
              Order No
            </label>

            <select
              value={selectedOrder}
              onChange={handleOrderChange}
              disabled={loadingOrders}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="">
                -- Pilih Order No --
              </option>

              {orders.map((order) => (
                <option
                  key={order.order_no}
                  value={order.order_no}
                >
                  {order.order_no}
                  {order.customer_name
                    ? ` - ${order.customer_name}`
                    : ""}
                </option>
              ))}

            </select>

          </div>

          <div>

            <label className="block text-sm font-medium text-slate-600 mb-2">
              Customer
            </label>

            <input
              type="text"
              value={customer}
              readOnly
              placeholder="-"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-100"
            />

          </div>

          <div>

            <label className="block text-sm font-medium text-slate-600 mb-2">
              Status Order
            </label>

            <input
              type="text"
              value={status}
              readOnly
              placeholder="-"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-100"
            />

          </div>

        </div>

      </div>

      {/* =====================================================
          SUMMARY
      ====================================================== */}
      {selectedOrder && !loadingDetail && details.length > 0 && (

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">

            <p className="text-sm text-slate-500">
              Order No
            </p>

            <p className="text-xl font-bold text-slate-800 mt-1">
              {selectedOrder}
            </p>

          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">

            <p className="text-sm text-slate-500">
              Total SKU
            </p>

            <p className="text-2xl font-bold text-blue-600 mt-1">
              {details.length}
            </p>

          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">

            <p className="text-sm text-slate-500">
              Total Qty
            </p>

            <p className="text-2xl font-bold text-green-600 mt-1">
              {totalQty}
            </p>

          </div>

        </div>

      )}

      {/* =====================================================
          DETAIL SURAT JALAN
      ====================================================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Detail Surat Jalan
            </h2>

            {selectedOrder && (
              <p className="text-sm text-slate-500 mt-1">
                Order:{" "}
                <span className="font-semibold text-slate-700">
                  {selectedOrder}
                </span>
              </p>
            )}
          </div>

          {details.length > 0 && (

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Cari SKU / deskripsi..."
                className="border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          )}

        </div>

        {/* LOADING */}

        {loadingDetail && (

          <div className="py-16 text-center">

            <RefreshCw
              size={32}
              className="mx-auto animate-spin text-blue-500"
            />

            <p className="mt-3 text-slate-500">
              Memuat detail order...
            </p>

          </div>

        )}

        {/* BELUM PILIH ORDER */}

        {!loadingDetail && !selectedOrder && (

          <div className="py-16 text-center text-slate-500">

            <p className="text-lg">
              Silakan pilih Order No
            </p>

            <p className="text-sm mt-1">
              Detail SKU, deskripsi dan qty akan tampil di sini.
            </p>

          </div>

        )}

        {/* ORDER TIDAK ADA DETAIL */}

        {!loadingDetail &&
          selectedOrder &&
          details.length === 0 && (

            <div className="py-16 text-center text-slate-500">

              <p className="text-lg font-medium">
                Detail order tidak ditemukan
              </p>

              <p className="text-sm mt-1">
                Pastikan order sudah memiliki data pada order_detail.
              </p>

            </div>

          )}

        {/* TABLE */}

        {!loadingDetail &&
          selectedOrder &&
          details.length > 0 && (

            <div className="overflow-x-auto">

              <table className="w-full border-collapse">

                <thead>

                  <tr className="bg-slate-100">

                    <th className="border border-slate-300 px-4 py-3 text-center w-16">
                      No
                    </th>

                    <th className="border border-slate-300 px-4 py-3 text-left">
                      SKU
                    </th>

                    <th className="border border-slate-300 px-4 py-3 text-left">
                      Deskripsi
                    </th>

                    <th className="border border-slate-300 px-4 py-3 text-center w-32">
                      Qty
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredDetails.map(
                    (item, index) => (

                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >

                        <td className="border border-slate-300 px-4 py-3 text-center">
                          {index + 1}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 font-semibold text-slate-800">
                          {item.sku}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 text-slate-600">
                          {item.deskripsi || "-"}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 text-center font-semibold">
                          {Number(item.qty_order || 0)}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

                <tfoot>

                  <tr className="bg-slate-100 font-bold">

                    <td
                      colSpan={3}
                      className="border border-slate-300 px-4 py-3 text-right"
                    >
                      TOTAL QTY
                    </td>

                    <td className="border border-slate-300 px-4 py-3 text-center text-blue-600">
                      {totalQty}
                    </td>

                  </tr>

                </tfoot>

              </table>

            </div>

          )}

      </div>

    </div>
  );
}