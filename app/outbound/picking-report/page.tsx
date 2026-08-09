"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import * as XLSX from "xlsx";
import {
  Search,
  RefreshCcw,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface PickingReport {
  id: number;
  order_no: string;
  sku: string;
  deskripsi: string;
  location: string;
  qty_picked: number;
  picked_by: string;
  picked_at: string;
}

export default function PickingReportPage() {
const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<PickingReport[]>([]);
  const [selectedRow, setSelectedRow] =
  useState<PickingReport | null>(null);

const [showDetail, setShowDetail] =
  useState(false);

  const [search, setSearch] = useState("");

  const [picker, setPicker] = useState("");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);

  const pageSize = 10;

  // ================= LOAD DATA =================

  async function loadData() {

    try {

      setLoading(true);

      const { data, error } = await supabase
        .from("picking")
        .select("*")
        .order("picked_at", {
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

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    loadData();

  }, []);

  // ================= FILTER =================

  const filtered = useMemo(() => {

    return rows.filter((row) => {

      const keyword = search.toLowerCase();

      const matchSearch =
        row.order_no.toLowerCase().includes(keyword) ||
        row.sku.toLowerCase().includes(keyword) ||
        row.deskripsi.toLowerCase().includes(keyword) ||
        row.location.toLowerCase().includes(keyword);

      const matchPicker =
        picker === ""
          ? true
          : row.picked_by === picker;

      const pickedDate =
        row.picked_at.slice(0, 10);

      const matchDateFrom =
        dateFrom === ""
          ? true
          : pickedDate >= dateFrom;

      const matchDateTo =
        dateTo === ""
          ? true
          : pickedDate <= dateTo;

      return (
        matchSearch &&
        matchPicker &&
        matchDateFrom &&
        matchDateTo
      );

    });

  }, [
    rows,
    search,
    picker,
    dateFrom,
    dateTo,
  ]);

  // ================= SUMMARY =================

  const totalPicking = filtered.length;

  const totalQty = filtered.reduce(
    (sum, item) =>
      sum + Number(item.qty_picked),
    0
  );

  const totalOrder = new Set(
    filtered.map((x) => x.order_no)
  ).size;

  const totalPicker = new Set(
    filtered.map((x) => x.picked_by)
  ).size;

  // ================= PICKER LIST =================

  const pickerList = Array.from(
    new Set(rows.map((x) => x.picked_by))
  );

  // ================= PAGINATION =================

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
    picker,
    dateFrom,
    dateTo,
  ]);

  // ================= EXPORT EXCEL =================

  function exportExcel() {

    const data = filtered.map((item, index) => ({

      No: index + 1,

      Order: item.order_no,

      SKU: item.sku,

      Deskripsi: item.deskripsi,

      Location: item.location,

      Qty: item.qty_picked,

      Picker: item.picked_by,

      Date: new Date(
        item.picked_at
      ).toLocaleString("id-ID"),

    }));

    const ws =
      XLSX.utils.json_to_sheet(data);

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Picking Report"
    );

    XLSX.writeFile(
      wb,
      `Picking_Report_${
        new Date()
          .toISOString()
          .slice(0, 10)
      }.xlsx`
    );

  }

  // ================= PRINT =================

  function printReport() {

    window.print();

  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* ================= HEADER ================= */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

  <div className="flex items-center gap-3">

    <button
      onClick={() => router.back()}
      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
    >
      <ArrowLeftCircle size={18} />
      Back
    </button>

    <div>
      <h1 className="text-3xl font-bold text-gray-800">
        Picking Report
      </h1>

      <p className="text-gray-500 mt-1">
        Laporan hasil Picking Warehouse
      </p>
    </div>

  </div>

  <div className="flex gap-2">

    <button
      onClick={loadData}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
    >
      <RefreshCcw size={18} />
      Refresh
    </button>

    <button
      onClick={exportExcel}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
    >
      <FileSpreadsheet size={18} />
      Export Excel
    </button>

    <button
      onClick={printReport}
      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
    >
      <Printer size={18} />
      Print
    </button>

  </div>

</div>
      {/* ================= SUMMARY ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Picking
          </p>

          <h2 className="text-3xl font-bold text-blue-600 mt-2">
            {totalPicking}
          </h2>

        </div>

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Qty Picked
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {totalQty}
          </h2>

        </div>

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Order
          </p>

          <h2 className="text-3xl font-bold text-purple-600 mt-2">
            {totalOrder}
          </h2>

        </div>

        <div className="bg-white rounded-xl shadow p-5">

          <p className="text-gray-500 text-sm">
            Total Picker
          </p>

          <h2 className="text-3xl font-bold text-orange-600 mt-2">
            {totalPicker}
          </h2>

        </div>

      </div>

      {/* ================= FILTER ================= */}

      <div className="bg-white rounded-xl shadow p-5">

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          <div className="relative lg:col-span-2">

            <Search
              size={18}
              className="absolute left-3 top-3 text-gray-400"
            />

            <input
              type="text"
              placeholder="Cari Order No / SKU / Deskripsi / Location"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full border rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <select
            value={picker}
            onChange={(e) =>
              setPicker(e.target.value)
            }
            className="border rounded-lg px-3 py-2"
          >

            <option value="">
              Semua Picker
            </option>

            {pickerList.map((item) => (

              <option
                key={item}
                value={item}
              >
                {item}
              </option>

            ))}

          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              setDateFrom(e.target.value)
            }
            className="border rounded-lg px-3 py-2"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) =>
              setDateTo(e.target.value)
            }
            className="border rounded-lg px-3 py-2"
          />

        </div>

        <div className="flex justify-end mt-4">

          <button
            onClick={() => {

              setSearch("");

              setPicker("");

              setDateFrom("");

              setDateTo("");

            }}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg"
          >
            Reset Filter
          </button>

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">

        {loading ? (

          <div className="p-10 text-center">

            Loading...

          </div>

        ) : (

                  <table className="min-w-full text-sm">

            <thead className="bg-blue-600 text-white">

              <tr>

                <th className="px-4 py-3 text-center">No</th>

                <th className="px-4 py-3">Picking Date</th>

                <th className="px-4 py-3">Order No</th>

                <th className="px-4 py-3">SKU</th>

                <th className="px-4 py-3">Deskripsi</th>

                <th className="px-4 py-3">Location</th>

                <th className="px-4 py-3 text-center">
                  Qty Picked
                </th>

                <th className="px-4 py-3">
                  Picked By
                </th>

              </tr>

            </thead>

            <tbody>

              {currentRows.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="text-center py-10 text-gray-500"
                  >
                    Tidak ada data.
                  </td>

                </tr>

              ) : (

                currentRows.map((row, index) => (

                  <tr
  key={row.id}
  onClick={() => {
    setSelectedRow(row);
    setShowDetail(true);
  }}
  className="border-b hover:bg-blue-50 cursor-pointer"
>
                 
                  

                    <td className="px-4 py-3 text-center">

                      {(page - 1) * pageSize + index + 1}

                    </td>

                    <td className="px-4 py-3">

                      {new Date(
                        row.picked_at
                      ).toLocaleString("id-ID")}

                    </td>

                    <td className="px-4 py-3 font-medium">

                      {row.order_no}

                    </td>

                    <td className="px-4 py-3">

                      {row.sku}

                    </td>

                    <td className="px-4 py-3">

                      {row.deskripsi}

                    </td>

                    <td className="px-4 py-3">

                      {row.location}

                    </td>

                    <td className="px-4 py-3 text-center font-semibold text-blue-600">

                      {row.qty_picked}

                    </td>

                    <td className="px-4 py-3">

                      {row.picked_by}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        )}

      </div>

      {/* ================= PAGINATION ================= */}

      <div className="flex items-center justify-between">

        <div className="text-sm text-gray-500">

          Total Data : {filtered.length}

        </div>

        <div className="flex items-center gap-2">

          <button
            disabled={page === 1}
            onClick={() =>
              setPage((p) => p - 1)
            }
            className="flex items-center gap-1 px-3 py-2 rounded bg-gray-200 disabled:opacity-40"
          >

            <ChevronLeft size={18} />

            Previous

          </button>

          <span className="px-4">

            Page {page} of {totalPages || 1}

          </span>

          <button
            disabled={
              page >= totalPages
            }
            onClick={() =>
              setPage((p) => p + 1)
            }
            className="flex items-center gap-1 px-3 py-2 rounded bg-gray-200 disabled:opacity-40"
          >

            Next

            <ChevronRight size={18} />

          </button>

        </div>

      </div>

{
showDetail && selectedRow && (

<div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

<div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">

<div className="flex justify-between items-center border-b p-5">

<h2 className="text-xl font-bold">

Detail Picking

</h2>

<button

onClick={()=>{
setShowDetail(false);
}}

>

<X size={22}/>

</button>

</div>

<div className="p-6 space-y-4">

<div className="grid grid-cols-2 gap-5">

<div>

<label className="text-gray-500 text-sm">

Order No

</label>

<div className="font-semibold">

{selectedRow.order_no}

</div>

</div>

<div>

<label className="text-gray-500 text-sm">

Picker

</label>

<div className="font-semibold">

{selectedRow.picked_by}

</div>

</div>

<div>

<label className="text-gray-500 text-sm">

SKU

</label>

<div className="font-semibold">

{selectedRow.sku}

</div>

</div>

<div>

<label className="text-gray-500 text-sm">

Location

</label>

<div className="font-semibold">

{selectedRow.location}

</div>

</div>

<div>

<label className="text-gray-500 text-sm">

Description

</label>

<div className="font-semibold">

{selectedRow.deskripsi}

</div>

</div>

<div>

<label className="text-gray-500 text-sm">

Qty Picked

</label>

<div className="font-semibold text-blue-600 text-lg">

{selectedRow.qty_picked}

</div>

</div>

<div className="col-span-2">

<label className="text-gray-500 text-sm">

Picked At

</label>

<div className="font-semibold">

{new Date(
selectedRow.picked_at
).toLocaleString("id-ID")}

</div>

</div>

</div>

</div>

<div className="border-t p-5 flex justify-end">

<button

onClick={()=>{
setShowDetail(false);
}}

className="bg-blue-600 text-white px-5 py-2 rounded-lg"

>

Close

</button>

</div>

</div>

</div>

)
}
    </div>

  );

}
