"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";


type InventoryRow = {
  sku: string;
  deskripsi: string;
  quantity: number;
  location: string;
  receiving_no: string;
};

export default function InventoryListPage() {
  const router = useRouter();

  const [data, setData] = useState<InventoryRow[]>([]);
  const [filtered, setFiltered] = useState<InventoryRow[]>([]);

  const [search, setSearch] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  async function loadInventory() {
    const { data, error } = await supabase
      .from("putaway_details")
      .select(
        "sku, deskripsi, quantity, location, receiving_no"
      );

    if (error) {
      console.error(error);
      return;
    }

    setData(data || []);
    setFiltered(data || []);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    let result = [...data];

    const q = search.toLowerCase();

    if (q) {
      result = result.filter(
        (item) =>
          item.sku?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.receiving_no?.toLowerCase().includes(q) ||
          item.deskripsi?.toLowerCase().includes(q)
      );
    }

    if (skuFilter) {
      const s = skuFilter.toLowerCase();

      result = result.filter((item) =>
        item.sku?.toLowerCase().includes(s)
      );
    }

    if (locationFilter) {
      const l = locationFilter.toLowerCase();

      result = result.filter((item) =>
        item.location?.toLowerCase().includes(l)
      );
    }

    setFiltered(result);
  }, [search, skuFilter, locationFilter, data]);

  // GROUP DATA
  const grouped = filtered
    .filter((item) => Number(item.quantity) > 0)
    .reduce((acc: any, item) => {
      const key = item.sku;

      if (!acc[key]) {
        acc[key] = {
          sku: item.sku,
          deskripsi: item.deskripsi,
          totalQty: 0,
          locations: new Set<string>(),
          receivings: new Set<string>(),
          rows: [],
        };
      }

      acc[key].totalQty += Number(item.quantity || 0);
      acc[key].locations.add(item.location);
      acc[key].receivings.add(item.receiving_no);
      acc[key].rows.push(item);

      return acc;
    }, {});

  const result = Object.values(grouped);

  // DOWNLOAD EXCEL DETAIL
  const exportToExcel = () => {
    const exportData = result.flatMap((item: any) =>
      item.rows.map((row: any) => ({
        SKU: row.sku,
        Description: row.deskripsi,
        Location: row.location,
        Quantity: row.quantity,
        Receiving_No: row.receiving_no,
      }))
    );

    const worksheet =
      XLSX.utils.json_to_sheet(exportData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Inventory"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob(
      [excelBuffer],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      }
    );

    
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">

      {/* BUTTONS */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => router.back()}
          className="bg-gray-700 text-white px-3 py-2 rounded"
        >
          ← Back
        </button>

        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
        >
          📥 Download
        </button>
      </div>

      {/* TITLE */}
      <h1 className="text-2xl font-bold mb-4">
        Inventory List
      </h1>

      {/* FILTER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

        <input
          className="border p-2 rounded"
          placeholder="Search global..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <input
          className="border p-2 rounded"
          placeholder="Filter SKU"
          value={skuFilter}
          onChange={(e) =>
            setSkuFilter(e.target.value)
          }
        />

        <input
          className="border p-2 rounded"
          placeholder="Filter Location"
          value={locationFilter}
          onChange={(e) =>
            setLocationFilter(e.target.value)
          }
        />

      </div>

      {/* TABLE */}
      <div className="w-full overflow-x-auto bg-white shadow rounded">

        <table className="min-w-[1400px] w-full text-sm border-collapse">

          <thead className="bg-slate-200 sticky top-0 z-10">
            <tr>
              <th className="border p-3 text-left">
                SKU
              </th>

              <th className="border p-3 text-left">
                Description
              </th>

              <th className="border p-3 text-center">
                Total Qty
              </th>

              <th className="border p-3 text-left">
                Locations
              </th>

              <th className="border p-3 text-left">
                Receiving No
              </th>

              <th className="border p-3 text-left">
                Detail Rows
              </th>
            </tr>
          </thead>

          <tbody>
            {result.map((item: any, i) => (
              <tr
                key={i}
                className="hover:bg-slate-50"
              >
                <td className="border p-3 font-semibold whitespace-nowrap">
                  {item.sku}
                </td>

                <td className="border p-3 min-w-[300px]">
                  {item.deskripsi || "-"}
                </td>

                <td className="border p-3 text-center font-bold text-blue-600">
                  {item.totalQty}
                </td>

                <td className="border p-3 whitespace-nowrap">
                  {[...item.locations].join(" | ")}
                </td>

                <td className="border p-3 whitespace-nowrap">
                  {[...item.receivings].join(" | ")}
                </td>

                <td className="border p-3">
                  <div className="max-h-28 overflow-y-auto text-xs space-y-1">

                    {item.rows.map(
                      (r: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between border-b py-1"
                        >
                          <span>
                            {r.location}
                          </span>

                          <span className="font-semibold">
                            {r.quantity}
                          </span>
                        </div>
                      )
                    )}

                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}