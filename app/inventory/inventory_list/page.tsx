
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { ArrowLeftCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type InventoryRow = {
  id?: number;
  sku: string;
  deskripsi: string;
  quantity: number;
  location: string;
  created_at?: string;

  // Dari allocation
  qty_allocated: number;
  qty_picked: number;
  qty_reserved: number;
  available_qty: number;
};

export default function InventoryListPage() {
  const router = useRouter();

  const [data, setData] = useState<InventoryRow[]>([]);
  const [filtered, setFiltered] = useState<InventoryRow[]>([]);

  const [search, setSearch] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const [loading, setLoading] = useState(true);

  // =====================================================
  // LOAD INVENTORY + ALLOCATION
  // =====================================================
  async function loadInventory() {
    try {
      setLoading(true);

      // =================================================
      // 1. BACA INVENTORY
      // =================================================
      const {
        data: inventoryData,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select(
          "id, sku, deskripsi, quantity, location, created_at"
        )
        .order("location", {
          ascending: true,
        });

      if (inventoryError) {
        console.error(
          "Inventory error:",
          inventoryError
        );

        alert(inventoryError.message);
        return;
      }

      // =================================================
      // 2. BACA ALLOCATION
      // =================================================
      const {
        data: allocationData,
        error: allocationError,
      } = await supabase
        .from("allocation")
        .select(
          "sku, location, qty_allocated, qty_picked"
        );

      if (allocationError) {
        console.error(
          "Allocation error:",
          allocationError
        );

        alert(allocationError.message);
        return;
      }

      // =================================================
      // 3. BUAT MAP ALLOCATION
      //
      // Key:
      // SKU + LOCATION
      //
      // Karena satu SKU/location bisa mempunyai
      // beberapa order allocation.
      // =================================================
      const allocationMap: Record<
        string,
        {
          qtyAllocated: number;
          qtyPicked: number;
        }
      > = {};

      (allocationData || []).forEach((allocation) => {
        const sku =
          allocation.sku?.trim() || "";

        const location =
          allocation.location?.trim() || "";

        const key =
          `${sku.toUpperCase()}|||${location.toUpperCase()}`;

        if (!allocationMap[key]) {
          allocationMap[key] = {
            qtyAllocated: 0,
            qtyPicked: 0,
          };
        }

        allocationMap[key].qtyAllocated +=
          Number(
            allocation.qty_allocated || 0
          );

        allocationMap[key].qtyPicked +=
          Number(
            allocation.qty_picked || 0
          );
      });

      // =================================================
      // 4. GABUNGKAN INVENTORY + ALLOCATION
      // =================================================
      const result: InventoryRow[] = (
        inventoryData || []
      ).map((inventory) => {
        const sku =
          inventory.sku?.trim() || "";

        const location =
          inventory.location?.trim() || "";

        const key =
          `${sku.toUpperCase()}|||${location.toUpperCase()}`;

        const allocation =
          allocationMap[key] || {
            qtyAllocated: 0,
            qtyPicked: 0,
          };

        const inventoryQty =
          Number(inventory.quantity || 0);

        const qtyAllocated =
          allocation.qtyAllocated;

        const qtyPicked =
          allocation.qtyPicked;

        // =================================================
        // QTY YANG MASIH DI-RESERVE
        //
        // Allocated 30
        // Picked    10
        // Reserved  20
        // =================================================
        const qtyReserved = Math.max(
          qtyAllocated - qtyPicked,
          0
        );

        // =================================================
        // STOK YANG MASIH BEBAS DIALOKASIKAN
        //
        // Inventory 100
        // Reserved   20
        // Available  80
        // =================================================
        const availableQty = Math.max(
          inventoryQty - qtyReserved,
          0
        );

        return {
          id: inventory.id,
          sku,
          deskripsi:
            inventory.deskripsi || "",
          quantity: inventoryQty,
          location,
          created_at:
            inventory.created_at || "",

          qty_allocated: qtyAllocated,
          qty_picked: qtyPicked,
          qty_reserved: qtyReserved,
          available_qty: availableQty,
        };
      });

      setData(result);
      setFiltered(result);
    } catch (error) {
      console.error(
        "Load inventory error:",
        error
      );

      alert(
        "Gagal mengambil data inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================
  useEffect(() => {
    loadInventory();
  }, []);

  // =====================================================
  // FILTER
  // =====================================================
  useEffect(() => {
    let result = [...data];

    const q = search
      .trim()
      .toLowerCase();

    if (q) {
      result = result.filter(
        (item) =>
          item.sku
            ?.toLowerCase()
            .includes(q) ||
          item.location
            ?.toLowerCase()
            .includes(q) ||
          item.deskripsi
            ?.toLowerCase()
            .includes(q)
      );
    }

    if (skuFilter.trim()) {
      const sku =
        skuFilter
          .trim()
          .toLowerCase();

      result = result.filter((item) =>
        item.sku
          ?.toLowerCase()
          .includes(sku)
      );
    }

    if (locationFilter.trim()) {
      const location =
        locationFilter
          .trim()
          .toLowerCase();

      result = result.filter((item) =>
        item.location
          ?.toLowerCase()
          .includes(location)
      );
    }

    setFiltered(result);
  }, [
    search,
    skuFilter,
    locationFilter,
    data,
  ]);

  // =====================================================
  // GROUP DATA BY SKU
  // =====================================================
  const grouped = filtered
    .filter(
      (item) =>
        Number(item.quantity) > 0
    )
    .reduce((acc: any, item) => {
      const key = item.sku;

      if (!acc[key]) {
        acc[key] = {
          sku: item.sku,
          deskripsi: item.deskripsi,

          // TOTAL INVENTORY
          totalQty: 0,

          // TOTAL ALLOCATION
          totalAllocated: 0,

          // TOTAL PICKED
          totalPicked: 0,

          // TOTAL RESERVED
          totalReserved: 0,

          // TOTAL AVAILABLE
          totalAvailable: 0,

          locations: new Set<string>(),
          rows: [],
        };
      }

      acc[key].totalQty +=
        Number(item.quantity || 0);

      acc[key].totalAllocated +=
        Number(
          item.qty_allocated || 0
        );

      acc[key].totalPicked +=
        Number(
          item.qty_picked || 0
        );

      acc[key].totalReserved +=
        Number(
          item.qty_reserved || 0
        );

      acc[key].totalAvailable +=
        Number(
          item.available_qty || 0
        );

      acc[key].locations.add(
        item.location
      );

      acc[key].rows.push(item);

      return acc;
    }, {});

  const result = Object.values(grouped);

  // =====================================================
  // TOTAL
  // =====================================================
  const totalInventory = result.reduce(
    (sum: number, item: any) =>
      sum + item.totalQty,
    0
  );

  const totalAllocated = result.reduce(
    (sum: number, item: any) =>
      sum + item.totalAllocated,
    0
  );

  const totalReserved = result.reduce(
    (sum: number, item: any) =>
      sum + item.totalReserved,
    0
  );

  const totalAvailable = result.reduce(
    (sum: number, item: any) =>
      sum + item.totalAvailable,
    0
  );

  // =====================================================
  // EXPORT EXCEL
  // =====================================================
  const exportToExcel = () => {
    const exportData: any[] = [];

    filtered.forEach((row) => {
      exportData.push({
        SKU: row.sku,
        Description: row.deskripsi,
        Location: row.location,

        "Inventory Qty":
          row.quantity,

        "Qty Allocated":
          row.qty_allocated,

        "Qty Picked":
          row.qty_picked,

        "Qty Reserved":
          row.qty_reserved,

        "Available Qty":
          row.available_qty,

        Created_At:
          row.created_at,
      });
    });

    if (exportData.length === 0) {
      alert(
        "Tidak ada data untuk di-download."
      );
      return;
    }

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Inventory"
    );

    XLSX.writeFile(
      workbook,
      "inventory.xlsx"
    );
  };

  // =====================================================
  // RETURN
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* =================================================
          HEADER
      ================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Inventory List
          </h1>

          <p className="text-gray-500">
            Current warehouse stock
          </p>
        </div>

        <div className="flex gap-2">

          <button
            onClick={() =>
              router.back()
            }
            className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            <ArrowLeftCircle
              size={20}
            />

            Back
          </button>

          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            📥 Download Excel
          </button>

        </div>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        {/* INVENTORY */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-gray-500 text-sm">
            Total Inventory
          </div>

          <div className="text-2xl font-bold text-blue-600">
            {totalInventory}
          </div>
        </div>

        {/* ALLOCATED */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-gray-500 text-sm">
            Total Allocated
          </div>

          <div className="text-2xl font-bold text-orange-600">
            {totalAllocated}
          </div>
        </div>

        {/* RESERVED */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-gray-500 text-sm">
            Still Reserved
          </div>

          <div className="text-2xl font-bold text-red-600">
            {totalReserved}
          </div>
        </div>

        {/* AVAILABLE */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-gray-500 text-sm">
            Available Stock
          </div>

          <div className="text-2xl font-bold text-green-600">
            {totalAvailable}
          </div>
        </div>

      </div>

      {/* =================================================
          FILTER
      ================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

        <input
          className="border p-2 rounded-lg bg-white"
          placeholder="Search SKU / Location / Description..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <input
          className="border p-2 rounded-lg bg-white"
          placeholder="Filter SKU"
          value={skuFilter}
          onChange={(e) =>
            setSkuFilter(
              e.target.value
            )
          }
        />

        <input
          className="border p-2 rounded-lg bg-white"
          placeholder="Filter Location"
          value={locationFilter}
          onChange={(e) =>
            setLocationFilter(
              e.target.value
            )
          }
        />

      </div>

      {/* =================================================
          TABLE
      ================================================= */}
      <div className="w-full overflow-x-auto bg-white shadow rounded-xl">

        <table className="min-w-[1500px] w-full text-sm border-collapse">

          <thead className="bg-slate-200 sticky top-0 z-10">

            <tr>

              <th className="border p-3 text-left">
                SKU
              </th>

              <th className="border p-3 text-left">
                Description
              </th>

              <th className="border p-3 text-center">
                Inventory
              </th>

              <th className="border p-3 text-center">
                Allocated
              </th>

              <th className="border p-3 text-center">
                Picked
              </th>

              <th className="border p-3 text-center">
                Reserved
              </th>

              <th className="border p-3 text-center">
                Available
              </th>

              <th className="border p-3 text-left">
                Locations
              </th>

              <th className="border p-3 text-left">
                Detail Rows
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td
                  colSpan={9}
                  className="text-center p-10"
                >
                  Loading inventory...
                </td>
              </tr>

            ) : result.length === 0 ? (

              <tr>
                <td
                  colSpan={9}
                  className="text-center p-10 text-gray-500"
                >
                  Tidak ada data inventory
                </td>
              </tr>

            ) : (

              result.map(
                (item: any, i) => (

                  <tr
                    key={i}
                    className="hover:bg-slate-50"
                  >

                    {/* SKU */}
                    <td className="border p-3 font-semibold whitespace-nowrap">
                      {item.sku}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="border p-3 min-w-[300px]">
                      {item.deskripsi ||
                        "-"}
                    </td>

                    {/* INVENTORY */}
                    <td className="border p-3 text-center font-bold text-blue-600">
                      {item.totalQty}
                    </td>

                    {/* ALLOCATED */}
                    <td className="border p-3 text-center font-bold text-orange-600">
                      {item.totalAllocated}
                    </td>

                    {/* PICKED */}
                    <td className="border p-3 text-center font-bold text-purple-600">
                      {item.totalPicked}
                    </td>

                    {/* RESERVED */}
                    <td className="border p-3 text-center font-bold text-red-600">
                      {item.totalReserved}
                    </td>

                    {/* AVAILABLE */}
                    <td className="border p-3 text-center font-bold text-green-600">
                      {item.totalAvailable}
                    </td>

                    {/* LOCATIONS */}
                    <td className="border p-3 whitespace-nowrap">
                      {[
                        ...item.locations,
                      ].join(" | ")}
                    </td>

                    {/* DETAIL */}
                    <td className="border p-3">

                      <div className="max-h-40 overflow-y-auto text-xs space-y-1">

                        {item.rows.map(
                          (
                            r: InventoryRow,
                            idx: number
                          ) => (

                            <div
                              key={idx}
                              className="border-b py-2"
                            >

                              <div className="grid grid-cols-5 gap-2">

                                <span className="font-medium">
                                  {r.location}
                                </span>

                                <span>
                                  Stock:
                                  {" "}
                                  <b>
                                    {r.quantity}
                                  </b>
                                </span>

                                <span className="text-orange-600">
                                  Alloc:
                                  {" "}
                                  <b>
                                    {
                                      r.qty_allocated
                                    }
                                  </b>
                                </span>

                                <span className="text-red-600">
                                  Reserved:
                                  {" "}
                                  <b>
                                    {
                                      r.qty_reserved
                                    }
                                  </b>
                                </span>

                                <span className="text-green-600">
                                  Available:
                                  {" "}
                                  <b>
                                    {
                                      r.available_qty
                                    }
                                  </b>
                                </span>

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}
