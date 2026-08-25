"use client";

import { useEffect, useState } from "react";
import { ArrowLeftCircle, RefreshCw } from "lucide-react";
import { supabase } from "../../../lib/supabase";

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
}

export default function PackingReportPage() {
  const [data, setData] = useState<PackingReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("packing")
        .select(
          "id, order_no, customer_name, sku, deskripsi, qty, carton, weight, packing_at"
        )
        .order("packing_at", {
          ascending: false,
        });

      if (error) {
        alert(error.message);
        return;
      }

      setData(data || []);
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil laporan packing.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FILTER
  // =====================================================

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      item.order_no?.toLowerCase().includes(keyword) ||
      item.customer_name?.toLowerCase().includes(keyword) ||
      item.sku?.toLowerCase().includes(keyword) ||
      item.carton?.toLowerCase().includes(keyword);

    const matchDate =
      !date ||
      (item.packing_at &&
        item.packing_at.startsWith(date));

    return matchSearch && matchDate;
  });

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalQty = filteredData.reduce(
    (total, item) => total + Number(item.qty || 0),
    0
  );

  const totalWeight = filteredData.reduce(
    (total, item) => total + Number(item.weight || 0),
    0
  );

  const totalCarton = new Set(
    filteredData
      .map((item) => item.carton)
      .filter(Boolean)
  ).size;

  const totalOrder = new Set(
    filteredData.map((item) => item.order_no)
  ).size;

  // =====================================================
  // FORMAT TANGGAL
  // =====================================================

  function formatDate(value?: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Report Packing
          </h1>

          <p className="text-gray-500">
            Laporan aktivitas packing
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600"
          >
            <ArrowLeftCircle size={20} />
            Back
          </button>

          <button
            onClick={loadReport}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* =================================================
          FILTER
      ================================================= */}
      <div className="bg-white rounded-lg shadow p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-2">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Order No / Customer / SKU / Carton"
              className="border rounded-lg p-2 w-full"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Tanggal Packing
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
              className="border rounded-lg p-2 w-full"
            />
          </div>
        </div>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-gray-500">
            Total Order
          </p>

          <h2 className="text-2xl font-bold text-blue-600">
            {totalOrder}
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-gray-500">
            Total Qty
          </p>

          <h2 className="text-2xl font-bold text-green-600">
            {totalQty}
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-gray-500">
            Total Carton
          </p>

          <h2 className="text-2xl font-bold text-orange-600">
            {totalCarton}
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-gray-500">
            Total Berat
          </p>

          <h2 className="text-2xl font-bold text-purple-600">
            {totalWeight.toFixed(2)} Kg
          </h2>
        </div>
      </div>

      {/* =================================================
          TABLE
      ================================================= */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-bold text-lg">
            Detail Packing
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            Loading...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Tidak ada data packing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">
                    No
                  </th>

                  <th className="p-3 text-left">
                    Order No
                  </th>

                  <th className="p-3 text-left">
                    Customer
                  </th>

                  <th className="p-3 text-left">
                    SKU
                  </th>

                  <th className="p-3 text-left">
                    Deskripsi
                  </th>

                  <th className="p-3 text-right">
                    Qty
                  </th>

                  <th className="p-3 text-left">
                    Carton
                  </th>

                  <th className="p-3 text-right">
                    Berat
                  </th>

                  <th className="p-3 text-left">
                    Packing At
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map(
                  (item, index) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="p-3">
                        {index + 1}
                      </td>

                      <td className="p-3 font-semibold">
                        {item.order_no}
                      </td>

                      <td className="p-3">
                        {item.customer_name}
                      </td>

                      <td className="p-3 font-medium text-blue-600">
                        {item.sku}
                      </td>

                      <td className="p-3">
                        {item.deskripsi || "-"}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {item.qty}
                      </td>

                      <td className="p-3">
                        {item.carton || "-"}
                      </td>

                      <td className="p-3 text-right">
                        {item.weight !== null &&
                        item.weight !== undefined
                          ? `${Number(
                              item.weight
                            ).toFixed(2)} Kg`
                          : "-"}
                      </td>

                      <td className="p-3">
                        {formatDate(
                          item.packing_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}