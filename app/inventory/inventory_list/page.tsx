
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Download,
  RefreshCw,
  Search,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type InventoryRecord = {
  id: string;
  sku: string;
  location: string;
  quantity: number | null;
};

type AllocationRecord = {
  sku: string;
  location: string;
  qty_allocated?: number | null;
  qty_picked?: number | null;
  allocated_quantity?: number | null;
  picked_quantity?: number | null;
  allocated?: number | null;
  picked?: number | null;
};

type AdjustmentRecord = {
  inventory_id: string;
  adjustment_type: string;
  quantity: number | null;
};

type InventoryRow = {
  id: string;
  sku: string;
  location: string;
  stock: number;
  adjustment_in: number;
  adjustment_out: number;
  net_adjustment: number;
  qty_allocated: number;
  qty_picked: number;
  qty_reserved: number;
  available_qty: number;
};

function toNumber(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs leading-4 text-gray-500">{title}</span>
        <span className="shrink-0 text-gray-400">{icon}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-gray-900">
        {formatNumber(value)}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const router = useRouter();

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        { data: inventoryData, error: inventoryError },
        { data: allocationData, error: allocationError },
        { data: adjustmentData, error: adjustmentError },
      ] = await Promise.all([
        supabase
          .from("inventory")
          .select("id, sku, location, quantity")
          .order("sku", { ascending: true }),

        supabase.from("allocation").select("*"),

        supabase
          .from("inventory_adjustments")
          .select("inventory_id, adjustment_type, quantity"),
      ]);

      if (inventoryError) throw inventoryError;
      if (allocationError) throw allocationError;
      if (adjustmentError) throw adjustmentError;

      const inventoryRecords = (inventoryData ?? []) as InventoryRecord[];
      const allocationRecords = (allocationData ?? []) as AllocationRecord[];
      const adjustmentRecords = (adjustmentData ?? []) as AdjustmentRecord[];

      const allocationMap = new Map<
        string,
        { allocated: number; picked: number }
      >();

      for (const item of allocationRecords) {
        const sku = String(item.sku ?? "");
        const location = String(item.location ?? "");
        const key = `${sku}|||${location}`;

        const allocated = toNumber(
          item.qty_allocated ??
            item.allocated_quantity ??
            item.allocated
        );

        const picked = toNumber(
          item.qty_picked ??
            item.picked_quantity ??
            item.picked
        );

        const current = allocationMap.get(key) ?? {
          allocated: 0,
          picked: 0,
        };

        current.allocated += allocated;
        current.picked += picked;

        allocationMap.set(key, current);
      }

      const adjustmentMap = new Map<
        string,
        { incoming: number; outgoing: number }
      >();

      for (const adjustment of adjustmentRecords) {
        const inventoryId = String(adjustment.inventory_id ?? "");
        const type = String(adjustment.adjustment_type ?? "").toUpperCase();
        const quantity = toNumber(adjustment.quantity);

        const current = adjustmentMap.get(inventoryId) ?? {
          incoming: 0,
          outgoing: 0,
        };

        if (type === "IN") {
          current.incoming += quantity;
        } else if (type === "OUT") {
          current.outgoing += quantity;
        }

        adjustmentMap.set(inventoryId, current);
      }

      const rows: InventoryRow[] = inventoryRecords
  .filter((item) => toNumber(item.quantity) !== 0)
  .map((item) => {
        const id = String(item.id);
        const sku = String(item.sku ?? "");
        const location = String(item.location ?? "");
        const stock = toNumber(item.quantity);

        const allocation = allocationMap.get(`${sku}|||${location}`) ?? {
          allocated: 0,
          picked: 0,
        };

        const adjustment = adjustmentMap.get(id) ?? {
          incoming: 0,
          outgoing: 0,
        };

        const qtyAllocated = allocation.allocated;
        const qtyPicked = allocation.picked;
        const qtyReserved = Math.max(qtyAllocated - qtyPicked, 0);
        const availableQty = Math.max(stock - qtyReserved, 0);

        return {
          id,
          sku,
          location,
          stock,
          adjustment_in: adjustment.incoming,
          adjustment_out: adjustment.outgoing,
          net_adjustment: adjustment.incoming - adjustment.outgoing,
          qty_allocated: qtyAllocated,
          qty_picked: qtyPicked,
          qty_reserved: qtyReserved,
          available_qty: availableQty,
        };
      });

      setInventory(rows);
    } catch (err) {
      console.error("Gagal memuat inventory:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat inventory."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const filteredInventory = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return inventory;

    return inventory.filter(
      (row) =>
        row.sku.toLowerCase().includes(keyword) ||
        row.location.toLowerCase().includes(keyword)
    );
  }, [inventory, search]);

  const summary = useMemo(() => {
    return filteredInventory.reduce(
      (total, row) => {
        total.stock += row.stock;
        total.adjustmentIn += row.adjustment_in;
        total.adjustmentOut += row.adjustment_out;
        total.netAdjustment += row.net_adjustment;
        total.allocated += row.qty_allocated;
        total.picked += row.qty_picked;
        total.reserved += row.qty_reserved;
        total.available += row.available_qty;
        return total;
      },
      {
        stock: 0,
        adjustmentIn: 0,
        adjustmentOut: 0,
        netAdjustment: 0,
        allocated: 0,
        picked: 0,
        reserved: 0,
        available: 0,
      }
    );
  }, [filteredInventory]);

  const exportToExcel = () => {
    const exportData = filteredInventory.map((row) => ({
      SKU: row.sku,
      Location: row.location,
      Stock: row.stock,
      "Adjustment IN": row.adjustment_in,
      "Adjustment OUT": row.adjustment_out,
      "Net Adjustment": row.net_adjustment,
      Allocated: row.qty_allocated,
      Picked: row.qty_picked,
      Reserved: row.qty_reserved,
      Available: row.available_qty,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

    XLSX.writeFile(
      workbook,
      `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header dan tombol kembali */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Inventory List
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ringkasan stok, adjustment, dan ketersediaan inventory.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadInventory()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || filteredInventory.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Gagal memuat inventory</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <SummaryCard
          title="Total Stock"
          value={summary.stock}
          icon={<Package size={17} />}
        />
        <SummaryCard
          title="Adjustment IN"
          value={summary.adjustmentIn}
          icon={<ArrowDownToLine size={17} />}
        />
        <SummaryCard
          title="Adjustment OUT"
          value={summary.adjustmentOut}
          icon={<ArrowUpFromLine size={17} />}
        />
        <SummaryCard
          title="Net Adjustment"
          value={summary.netAdjustment}
          icon={<SlidersHorizontal size={17} />}
        />
        <SummaryCard
          title="Allocated"
          value={summary.allocated}
          icon={<Package size={17} />}
        />
        <SummaryCard
          title="Picked"
          value={summary.picked}
          icon={<Package size={17} />}
        />
        <SummaryCard
          title="Reserved"
          value={summary.reserved}
          icon={<Package size={17} />}
        />
        <SummaryCard
          title="Available"
          value={summary.available}
          icon={<Package size={17} />}
        />
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari SKU atau lokasi..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <p className="text-sm text-gray-500">
          {filteredInventory.length} baris inventory
        </p>
      </div>

      {/* Inventory table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Memuat data inventory...
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Data inventory tidak ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Adjustment IN
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Adjustment OUT
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Net Adjustment
                  </th>

                  {/* Kolom Allocated dan Picked hanya untuk proses aktif */}
                  {filteredInventory.some(
                    (row) => row.qty_allocated > row.qty_picked
                  ) && (
                    <>
                      <th className="px-4 py-3 text-right font-semibold">
                        Allocated
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Picked
                      </th>
                    </>
                  )}

                 
                  <th className="px-4 py-3 text-right font-semibold">
                    Available
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((row) => {
                  const hasActiveAllocation =
                    row.qty_allocated > row.qty_picked;

                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {row.sku || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {row.location || "-"}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatNumber(row.stock)}
                      </td>

                      <td className="px-4 py-3 text-right text-green-700">
                        {row.adjustment_in > 0
                          ? `+${formatNumber(row.adjustment_in)}`
                          : "-"}
                      </td>

                      <td className="px-4 py-3 text-right text-red-700">
                        {row.adjustment_out > 0
                          ? `-${formatNumber(row.adjustment_out)}`
                          : "-"}
                      </td>

                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          row.net_adjustment > 0
                            ? "text-green-700"
                            : row.net_adjustment < 0
                              ? "text-red-700"
                              : "text-gray-400"
                        }`}
                      >
                        {row.net_adjustment > 0 ? "+" : ""}
                        {formatNumber(row.net_adjustment)}
                      </td>

                      {filteredInventory.some(
                        (item) => item.qty_allocated > item.qty_picked
                      ) && (
                        <>
                          <td className="px-4 py-3 text-right">
                            {hasActiveAllocation
                              ? formatNumber(row.qty_allocated)
                              : "-"}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {hasActiveAllocation
                              ? formatNumber(row.qty_picked)
                              : "-"}
                          </td>
                        </>
                      )}

                      

                      <td className="px-4 py-3 text-right font-semibold text-blue-700">
                        {row.available_qty !== 0
                          ? formatNumber(row.available_qty)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>

                  <td className="px-4 py-3 text-right">
                    {formatNumber(summary.stock)}
                  </td>

                  <td className="px-4 py-3 text-right text-green-700">
                    {formatNumber(summary.adjustmentIn)}
                  </td>

                  <td className="px-4 py-3 text-right text-red-700">
                    {formatNumber(summary.adjustmentOut)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {formatNumber(summary.netAdjustment)}
                  </td>

                  {filteredInventory.some(
                    (row) => row.qty_allocated > row.qty_picked
                  ) && (
                    <>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(summary.allocated)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(summary.picked)}
                      </td>
                    </>
                  )}

                  <td className="px-4 py-3 text-right">
                    {formatNumber(summary.reserved)}
                  </td>

                  <td className="px-4 py-3 text-right text-blue-700">
                    {formatNumber(summary.available)}
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
