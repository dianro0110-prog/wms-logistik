"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeftCircle,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Receipt,
  Percent,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

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

interface Product {
  sku: string;
  deskripsi: string | null;
  Harga: number | null;
}

interface InvoiceItem {
  sku: string;
  deskripsi: string;
  qty: number;
  harga: number;
  subtotal: number;
}

export default function InvoicePage() {
  const router = useRouter();

  // =========================================================
  // STATE
  // =========================================================

  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");

  const [details, setDetails] = useState<InvoiceItem[]>([]);

  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [search, setSearch] = useState("");

  const [discount, setDiscount] = useState<number>(0);

  // =========================================================
  // LOAD ORDER
  // =========================================================

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoadingOrders(true);

      const { data, error } = await supabase
        .from("order_header")
        .select("order_no, customer_name, status")
        .order("order_no", { ascending: false });

      if (error) {
        console.error(
          "Load order error:",
          JSON.stringify(error, null, 2)
        );

        alert(
          `Gagal mengambil data order: ${
            error.message || "Unknown error"
          }`
        );

        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error("Load order exception:", error);

      alert("Terjadi kesalahan saat mengambil order");
    } finally {
      setLoadingOrders(false);
    }
  }

  // =========================================================
  // LOAD DETAIL INVOICE
  // =========================================================

  async function loadInvoiceDetail(orderNo: string) {
    if (!orderNo) {
      setDetails([]);
      setCustomer("");
      setStatus("");
      setDiscount(0);
      return;
    }

    try {
      setLoadingDetail(true);

      setDetails([]);

      // =====================================================
      // HEADER
      // =====================================================

      const { data: headerData, error: headerError } =
        await supabase
          .from("order_header")
          .select("order_no, customer_name, status")
          .eq("order_no", orderNo)
          .maybeSingle();

      if (headerError) {
        console.error(
          "Header error:",
          JSON.stringify(headerError, null, 2)
        );

        alert(
          `Gagal mengambil data customer: ${
            headerError.message || "Unknown error"
          }`
        );

        return;
      }

      if (headerData) {
        setCustomer(headerData.customer_name || "");
        setStatus(headerData.status || "");
      } else {
        setCustomer("");
        setStatus("");
      }

      // =====================================================
      // ORDER DETAIL
      // =====================================================

      const { data: detailData, error: detailError } =
        await supabase
          .from("order_detail")
          .select(
            "id, order_no, sku, deskripsi, qty_order"
          )
          .eq("order_no", orderNo)
          .order("id", {
            ascending: true,
          });

      if (detailError) {
        console.error(
          "Detail error:",
          JSON.stringify(detailError, null, 2)
        );

        alert(
          `Gagal mengambil detail order: ${
            detailError.message || "Unknown error"
          }`
        );

        return;
      }

      if (!detailData || detailData.length === 0) {
        setDetails([]);
        return;
      }

      // =====================================================
      // SKU UNIK
      // =====================================================

      const skuList = Array.from(
        new Set(
          detailData
            .map((item: OrderDetail) =>
              String(item.sku || "").trim()
            )
            .filter(Boolean)
        )
      );

      console.log("SKU yang dicari:", skuList);

      if (skuList.length === 0) {
        setDetails([]);
        return;
      }

      // =====================================================
      // PRODUCT
      //
      // DATABASE:
      // id
      // sku
      // deskripsi
      // Harga
      // =====================================================

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("product")
        .select("sku, deskripsi, Harga")
        .in("sku", skuList);

      if (productError) {
        console.error(
          "Product error:",
          JSON.stringify(productError, null, 2)
        );

        console.error(
          "Product error message:",
          productError.message
        );

        console.error(
          "Product error details:",
          productError.details
        );

        console.error(
          "Product error hint:",
          productError.hint
        );

        console.error(
          "Product error code:",
          productError.code
        );

        alert(
          `Gagal mengambil harga product: ${
            productError.message || "Unknown error"
          }`
        );

        return;
      }

      console.log("Product data:", productData);

      // =====================================================
      // MAP PRODUCT
      // =====================================================

      const productMap = new Map<string, Product>();

      (productData || []).forEach(
        (product: Product) => {
          const sku = String(
            product.sku || ""
          ).trim();

          if (!sku) return;

          productMap.set(sku, product);
        }
      );

      // =====================================================
      // AGREGASI SKU
      // SKU YANG SAMA HANYA TAMPIL SEKALI
      // =====================================================

      const aggregated: Record<
        string,
        {
          sku: string;
          deskripsi: string;
          qty: number;
          harga: number;
        }
      > = {};

      detailData.forEach(
        (item: OrderDetail) => {
          const sku = String(
            item.sku || ""
          ).trim();

          if (!sku) return;

          const product = productMap.get(sku);

          // Harga berasal dari tabel product
          const harga = Number(
            product?.Harga ?? 0
          );

          // Deskripsi mengutamakan product
          const deskripsi =
            product?.deskripsi ||
            item.deskripsi ||
            "-";

          if (!aggregated[sku]) {
            aggregated[sku] = {
              sku,
              deskripsi,
              qty: 0,
              harga,
            };
          }

          // Jumlahkan qty SKU yang sama
          aggregated[sku].qty += Number(
            item.qty_order || 0
          );

          // Harga selalu menggunakan harga product
          aggregated[sku].harga = harga;

          // Jika sebelumnya deskripsi kosong,
          // gunakan deskripsi dari product
          if (
            !aggregated[sku].deskripsi ||
            aggregated[sku].deskripsi === "-"
          ) {
            aggregated[sku].deskripsi =
              deskripsi;
          }
        }
      );

      // =====================================================
      // BUAT INVOICE ITEMS
      // =====================================================

      const invoiceItems: InvoiceItem[] =
        Object.values(aggregated).map(
          (item) => ({
            sku: item.sku,
            deskripsi:
              item.deskripsi || "-",
            qty: Number(item.qty || 0),
            harga: Number(item.harga || 0),
            subtotal:
              Number(item.qty || 0) *
              Number(item.harga || 0),
          })
        );

      console.log(
        "Invoice Items:",
        invoiceItems
      );

      setDetails(invoiceItems);
    } catch (error) {
      console.error(
        "Invoice exception:",
        error
      );

      alert(
        "Terjadi kesalahan saat mengambil data invoice"
      );
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
    setSearch("");
    setDiscount(0);

    loadInvoiceDetail(orderNo);
  };

  // =========================================================
  // FORMAT RUPIAH
  // =========================================================

  const formatRupiah = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    ).format(Number(value || 0));
  };

  // =========================================================
  // TOTAL QTY
  // =========================================================

  const totalQty = useMemo(() => {
    return details.reduce(
      (total, item) =>
        total +
        Number(item.qty || 0),
      0
    );
  }, [details]);

  // =========================================================
  // TOTAL SUBTOTAL
  // =========================================================

  const totalSubtotal = useMemo(() => {
    return details.reduce(
      (total, item) =>
        total +
        Number(item.subtotal || 0),
      0
    );
  }, [details]);

  // =========================================================
  // DISCOUNT
  // =========================================================

  const discountAmount = useMemo(() => {
    const safeDiscount = Math.min(
      Math.max(
        Number(discount || 0),
        0
      ),
      100
    );

    return (
      totalSubtotal *
      (safeDiscount / 100)
    );
  }, [
    discount,
    totalSubtotal,
  ]);

  // =========================================================
  // GRAND TOTAL
  // =========================================================

  const grandTotal = useMemo(() => {
    return Math.max(
      totalSubtotal -
        discountAmount,
      0
    );
  }, [
    totalSubtotal,
    discountAmount,
  ]);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredDetails =
    useMemo(() => {
      const keyword =
        search
          .toLowerCase()
          .trim();

      if (!keyword) {
        return details;
      }

      return details.filter(
        (item) =>
          item.sku
            .toLowerCase()
            .includes(keyword) ||
          item.deskripsi
            .toLowerCase()
            .includes(keyword)
      );
    }, [
      details,
      search,
    ]);

  // =========================================================
  // ESCAPE HTML
  // =========================================================

  const escapeHtml = (
    value: any
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
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
  };

  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  const exportExcel = () => {
    if (!selectedOrder) {
      alert(
        "Silakan pilih Order No terlebih dahulu"
      );
      return;
    }

    if (details.length === 0) {
      alert(
        "Tidak ada detail invoice"
      );
      return;
    }

    const exportData =
      details.map(
        (item, index) => ({
          No: index + 1,
          "Order No":
            selectedOrder,
          Customer:
            customer,
          SKU: item.sku,
          Deskripsi:
            item.deskripsi,
          Qty: item.qty,
          "Harga Satuan":
            item.harga,
          Subtotal:
            item.subtotal,
        })
      );

    exportData.push({
      No: "",
      "Order No": "",
      Customer: "",
      SKU: "",
      Deskripsi: "TOTAL",
      Qty: totalQty,
      "Harga Satuan": "",
      Subtotal:
        totalSubtotal,
    } as any);

    exportData.push({
      No: "",
      "Order No": "",
      Customer: "",
      SKU: "",
      Deskripsi:
        `DISKON ${discount}%`,
      Qty: "",
      "Harga Satuan": "",
      Subtotal:
        -discountAmount,
    } as any);

    exportData.push({
      No: "",
      "Order No": "",
      Customer: "",
      SKU: "",
      Deskripsi:
        "GRAND TOTAL",
      Qty: "",
      "Harga Satuan": "",
      Subtotal:
        grandTotal,
    } as any);

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportData
      );

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 45 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Invoice"
    );

    XLSX.writeFile(
      workbook,
      `Invoice_${selectedOrder}.xlsx`
    );
  };

  // =========================================================
  // PRINT INVOICE
  // =========================================================

  const printInvoice = () => {
    if (!selectedOrder) {
      alert(
        "Silakan pilih Order No terlebih dahulu"
      );
      return;
    }

    if (details.length === 0) {
      alert(
        "Tidak ada detail invoice"
      );
      return;
    }

    const printWindow =
      window.open(
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

    const today =
      new Date();

    const tanggal =
      today.toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );

    const invoiceNo =
      `INV-${selectedOrder}`;

    const detailRows =
      details
        .map(
          (item, index) => `
            <tr>
              <td class="center">
                ${index + 1}
              </td>

              <td>
                ${escapeHtml(
                  item.sku
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.deskripsi
                )}
              </td>

              <td class="center">
                ${item.qty}
              </td>

              <td class="right">
                ${formatRupiah(
                  item.harga
                )}
              </td>

              <td class="right">
                ${formatRupiah(
                  item.subtotal
                )}
              </td>
            </tr>
          `
        )
        .join("");

    const html = `
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            Invoice - ${escapeHtml(
              selectedOrder
            )}
          </title>

          <style>

            @page {
              size: A4 portrait;
              margin: 15mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #111;

              margin: 0;

              padding: 0;

              font-size: 12px;
            }

            .header {
              display: flex;

              justify-content:
                space-between;

              align-items:
                flex-start;

              border-bottom:
                2px solid #111;

              padding-bottom:
                14px;

              margin-bottom:
                18px;
            }

            .company {
              font-size: 22px;

              font-weight:
                bold;

              margin-bottom:
                5px;
            }

            .company-detail {
              font-size: 11px;

              line-height:
                1.5;

              color: #444;
            }

            .document-title {
              text-align:
                right;
            }

            .document-title h1 {
              font-size: 28px;

              margin:
                0 0 5px 0;
            }

            .document-title p {
              margin:
                3px 0;

              font-size: 11px;
            }

            .info {
              display: grid;

              grid-template-columns:
                120px 1fr
                120px 1fr;

              gap:
                7px 12px;

              margin-bottom:
                20px;

              border:
                1px solid #999;

              padding:
                11px;
            }

            .info-label {
              font-weight:
                bold;
            }

            table {
              width: 100%;

              border-collapse:
                collapse;

              margin-top:
                10px;
            }

            th,
            td {
              border:
                1px solid #555;

              padding:
                7px;

              vertical-align:
                top;
            }

            th {
              background:
                #eee;

              text-align:
                center;

              font-weight:
                bold;
            }

            .center {
              text-align:
                center;
            }

            .right {
              text-align:
                right;
            }

            .total-row td {
              font-weight:
                bold;

              background:
                #f3f3f3;
            }

            .summary {
              width: 45%;

              margin-left:
                auto;

              margin-top:
                15px;
            }

            .summary-row {
              display: flex;

              justify-content:
                space-between;

              border-bottom:
                1px solid #ddd;

              padding:
                7px 0;
            }

            .summary-label {
              font-weight:
                bold;
            }

            .summary-grand {
              display: flex;

              justify-content:
                space-between;

              padding:
                10px 0;

              margin-top:
                3px;

              border-top:
                2px solid #111;

              font-size: 15px;

              font-weight:
                bold;
            }

            .signature {
              margin-top:
                55px;

              display: grid;

              grid-template-columns:
                1fr 1fr;

              gap:
                80px;

              text-align:
                center;
            }

            .signature-box {
              min-height:
                100px;
            }

            .signature-line {
              margin-top:
                65px;

              border-top:
                1px solid #111;

              padding-top:
                5px;
            }

            .footer {
              margin-top:
                30px;

              font-size:
                10px;

              text-align:
                center;

              color:
                #555;
            }

            @media print {

              body {
                -webkit-print-color-adjust:
                  exact;

                print-color-adjust:
                  exact;
              }

            }

          </style>

        </head>

        <body>

          <div class="header">

            <div>

              <div class="company">
                CV. MAF Fashion 
              </div>

              <div class="company-detail">
                Jl Raya Katapang no 13<br />
                No Telp : +628994376079
              </div>

            </div>

            <div class="document-title">

              <h1>
                INVOICE
              </h1>

              <p>
                Invoice No:
                <strong>
                  ${escapeHtml(
                    invoiceNo
                  )}
                </strong>
              </p>

              <p>
                Tanggal:
                ${escapeHtml(
                  tanggal
                )}
              </p>

            </div>

          </div>

          <div class="info">

            <div class="info-label">
              Invoice No
            </div>

            <div>
              ${escapeHtml(
                invoiceNo
              )}
            </div>

            <div class="info-label">
              Order No
            </div>

            <div>
              ${escapeHtml(
                selectedOrder
              )}
            </div>

            <div class="info-label">
              Customer
            </div>

            <div>
              ${escapeHtml(
                customer || "-"
              )}
            </div>

            <div class="info-label">
              Status
            </div>

            <div>
              ${escapeHtml(
                status || "-"
              )}
            </div>

          </div>

          <table>

            <thead>

              <tr>

                <th style="width: 40px;">
                  No
                </th>

                <th style="width: 115px;">
                  SKU
                </th>

                <th>
                  Deskripsi
                </th>

                <th style="width: 55px;">
                  Qty
                </th>

                <th style="width: 110px;">
                  Harga
                </th>

                <th style="width: 125px;">
                  Subtotal
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
                  TOTAL
                </td>

                <td class="center">
                  ${totalQty}
                </td>

                <td></td>

                <td class="right">
                  ${escapeHtml(
                    formatRupiah(
                      totalSubtotal
                    )
                  )}
                </td>

              </tr>

            </tbody>

          </table>

          <div class="summary">

            <div class="summary-row">

              <span class="summary-label">
                Subtotal
              </span>

              <span>
                ${escapeHtml(
                  formatRupiah(
                    totalSubtotal
                  )
                )}
              </span>

            </div>

            <div class="summary-row">

              <span class="summary-label">
                Diskon (${discount}%)
              </span>

              <span>
                -
                ${escapeHtml(
                  formatRupiah(
                    discountAmount
                  )
                )}
              </span>

            </div>

            <div class="summary-grand">

              <span>
                GRAND TOTAL
              </span>

              <span>
                ${escapeHtml(
                  formatRupiah(
                    grandTotal
                  )
                )}
              </span>

            </div>

          </div>

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
            Dokumen ini dibuat secara otomatis
            oleh Warehouse Management System.
          </div>

          <script>

            window.onload =
              function () {

                setTimeout(
                  function () {

                    window.print();

                  },
                  300
                );

              };

            window.onafterprint =
              function () {

                window.close();

              };

          </script>

        </body>

      </html>
    `;

    printWindow.document.open();

    printWindow.document.write(
      html
    );

    printWindow.document.close();
  };

  // =========================================================
  // REFRESH
  // =========================================================

  const refresh =
    async () => {
      await loadOrders();

      if (selectedOrder) {
        await loadInvoiceDetail(
          selectedOrder
        );
      }
    };

  // =========================================================
  // RESET FILTER
  // =========================================================

  const resetFilter =
    () => {
      setSearch("");
    };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-6">

        <button
          onClick={() =>
            router.back()
          }
          className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >

          <ArrowLeftCircle
            size={20}
          />

          <span>
            Back
          </span>

        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-5">

          <div>

            <div className="flex items-center gap-3">

              <div className="p-3 bg-blue-100 rounded-xl">

                <Receipt
                  size={28}
                  className="text-blue-600"
                />

              </div>

              <div>

                <h1 className="text-3xl font-bold text-slate-800">
                  Invoice
                </h1>

                <p className="text-slate-500 mt-1">
                  Invoice berdasarkan Order
                  dan harga Product
                </p>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <button
              onClick={refresh}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition"
            >

              <RefreshCw
                size={18}
              />

              Refresh

            </button>

            <button
              onClick={exportExcel}
              disabled={
                !selectedOrder ||
                details.length === 0
              }
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >

              <FileSpreadsheet
                size={18}
              />

              Export Excel

            </button>

            <button
              onClick={printInvoice}
              disabled={
                !selectedOrder ||
                details.length === 0
              }
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >

              <Printer
                size={18}
              />

              Print Invoice

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
              onChange={
                handleOrderChange
              }
              disabled={
                loadingOrders
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="">
                -- Pilih Order No --
              </option>

              {orders.map(
                (order) => (

                  <option
                    key={
                      order.order_no
                    }
                    value={
                      order.order_no
                    }
                  >

                    {order.order_no}

                    {order.customer_name
                      ? ` - ${order.customer_name}`
                      : ""}

                  </option>

                )
              )}

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

      {selectedOrder &&
        !loadingDetail &&
        details.length > 0 && (

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">

              <p className="text-sm text-slate-500">
                Grand Total
              </p>

              <p className="text-xl font-bold text-purple-600 mt-1">
                {formatRupiah(
                  grandTotal
                )}
              </p>

            </div>

          </div>
        )}

      {/* =====================================================
          FILTER + DISCOUNT
      ====================================================== */}

      {selectedOrder &&
        !loadingDetail &&
        details.length > 0 && (

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">

            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">

              {/* SEARCH */}

              <div className="flex-1">

                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Filter SKU / Deskripsi
                </label>

                <div className="relative">

                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Cari SKU / deskripsi..."
                    className="border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* DISCOUNT */}

              <div className="w-full lg:w-48">

                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Diskon (%)
                </label>

                <div className="relative">

                  <Percent
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => {

                      const value =
                        Number(
                          e.target.value
                        );

                      if (
                        value < 0
                      ) {

                        setDiscount(
                          0
                        );

                      } else if (
                        value > 100
                      ) {

                        setDiscount(
                          100
                        );

                      } else {

                        setDiscount(
                          value
                        );

                      }

                    }}
                    className="border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* RESET */}

              <button
                onClick={
                  resetFilter
                }
                className="flex items-center justify-center gap-2 border border-slate-300 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition"
              >

                <X
                  size={18}
                />

                Reset

              </button>

            </div>

          </div>
        )}

      {/* =====================================================
          DETAIL INVOICE
      ====================================================== */}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

          <div>

            <h2 className="text-xl font-bold text-slate-800">
              Detail Invoice
            </h2>

            {selectedOrder && (
              <p className="text-sm text-slate-500 mt-1">

                Order:

                <span className="font-semibold text-slate-700 ml-1">
                  {selectedOrder}
                </span>

              </p>
            )}

          </div>

          {details.length > 0 && (

            <div className="text-sm text-slate-500">

              Menampilkan{" "}

              <span className="font-semibold text-slate-800">
                {filteredDetails.length}
              </span>

              {" "}dari{" "}

              <span className="font-semibold text-slate-800">
                {details.length}
              </span>

              {" "}SKU

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
              Memuat data invoice...
            </p>

          </div>

        )}

        {/* BELUM PILIH ORDER */}

        {!loadingDetail &&
          !selectedOrder && (

            <div className="py-16 text-center text-slate-500">

              <Receipt
                size={42}
                className="mx-auto text-slate-300"
              />

              <p className="text-lg mt-4">
                Silakan pilih Order No
              </p>

              <p className="text-sm mt-1">
                Detail invoice akan tampil
                di sini.
              </p>

            </div>

          )}

        {/* ORDER TIDAK ADA DETAIL */}

        {!loadingDetail &&
          selectedOrder &&
          details.length === 0 && (

            <div className="py-16 text-center text-slate-500">

              <Receipt
                size={42}
                className="mx-auto text-slate-300"
              />

              <p className="text-lg font-medium">
                Detail order tidak ditemukan
              </p>

              <p className="text-sm mt-1">
                Pastikan order sudah memiliki
                data pada order_detail dan
                SKU tersedia pada product.
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

                    <th className="border border-slate-300 px-4 py-3 text-center w-24">
                      Qty
                    </th>

                    <th className="border border-slate-300 px-4 py-3 text-right w-40">
                      Harga
                    </th>

                    <th className="border border-slate-300 px-4 py-3 text-right w-44">
                      Subtotal
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredDetails.map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={
                          item.sku
                        }
                        className="hover:bg-slate-50"
                      >

                        <td className="border border-slate-300 px-4 py-3 text-center">
                          {index + 1}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 font-semibold text-slate-800">
                          {item.sku}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 text-slate-600">
                          {item.deskripsi ||
                            "-"}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 text-center font-semibold">
                          {item.qty}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 text-right">
                          {formatRupiah(
                            item.harga
                          )}
                        </td>

                        <td className="border border-slate-300 px-4 py-3 text-right font-semibold">
                          {formatRupiah(
                            item.subtotal
                          )}
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
                      TOTAL
                    </td>

                    <td className="border border-slate-300 px-4 py-3 text-center text-blue-600">
                      {totalQty}
                    </td>

                    <td className="border border-slate-300 px-4 py-3 text-right">
                      -
                    </td>

                    <td className="border border-slate-300 px-4 py-3 text-right text-blue-600">
                      {formatRupiah(
                        totalSubtotal
                      )}
                    </td>

                  </tr>

                </tfoot>

              </table>

            </div>

          )}

        {/* =====================================================
            TOTAL CARD
        ====================================================== */}

        {!loadingDetail &&
          selectedOrder &&
          details.length > 0 && (

            <div className="flex justify-end mt-6">

              <div className="w-full md:w-96 bg-slate-50 border border-slate-200 rounded-xl p-5">

                <div className="flex justify-between py-2">

                  <span className="text-slate-600">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {formatRupiah(
                      totalSubtotal
                    )}
                  </span>

                </div>

                <div className="flex justify-between py-2">

                  <span className="text-slate-600">
                    Diskon ({discount}%)
                  </span>

                  <span className="font-semibold text-red-600">
                    -
                    {" "}
                    {formatRupiah(
                      discountAmount
                    )}
                  </span>

                </div>

                <div className="border-t border-slate-300 mt-2 pt-3 flex justify-between">

                  <span className="text-lg font-bold text-slate-800">
                    Grand Total
                  </span>

                  <span className="text-xl font-bold text-blue-600">
                    {formatRupiah(
                      grandTotal
                    )}
                  </span>

                </div>

              </div>

            </div>

          )}

      </div>

    </div>
  );
}