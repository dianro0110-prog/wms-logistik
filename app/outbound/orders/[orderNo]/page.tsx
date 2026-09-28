"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

interface OrderDetail {
  id: number;
  order_no: string;
  sku: string;
  deskripsi: string;
  qty_order: number;
  qty_allocated: number;
}

interface InventoryRow {
  id: number;
  sku: string;
  location: string;
  deskripsi: string;
  quantity: number;
  created_at?: string;
}

interface AllocationRow {
  id: number;
  order_no: string;
  sku: string;
  deskripsi: string;
  location: string;
  qty_allocated: number;
  qty_picked: number;
}

interface StockStatus {
  sku: string;
  totalStock: number;
  qtyOrder: number;
  shortage: number;
  status: "AVAILABLE" | "INSUFFICIENT" | "OUT_OF_STOCK";
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = params.orderNo as string;

  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [stockStatuses, setStockStatuses] = useState<
    StockStatus[]
  >([]);

  // ==========================================================
  // LOAD ORDER DETAIL
  // ==========================================================
  async function loadData() {
    try {
      setLoading(true);

      // ======================================================
      // LOAD ORDER DETAIL
      // ======================================================
      const { data, error } = await supabase
        .from("order_detail")
        .select("*")
        .eq("order_no", orderNo)
        .order("id");

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      const orderDetails = data || [];

      setDetails(orderDetails);

      // ======================================================
      // LOAD ALLOCATION
      // ======================================================
      const {
        data: allocationData,
        error: allocationError,
      } = await supabase
        .from("allocation")
        .select("*")
        .eq("order_no", orderNo)
        .order("id");

      if (allocationError) {
        console.error(allocationError);
      } else {
        setAllocations(allocationData || []);
      }

      // ======================================================
      // CEK STOCK SETIAP SKU
      // ======================================================
      await checkStockStatus(orderDetails);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // CHECK STOCK STATUS
  // ==========================================================
  async function checkStockStatus(
    orderDetails: OrderDetail[]
  ) {
    try {
      const statuses: StockStatus[] = [];

      for (const item of orderDetails) {
        const sku = String(item.sku || "").trim();
        const qtyOrder = Number(item.qty_order || 0);

        if (!sku) {
          continue;
        }

        // ====================================================
        // AMBIL SEMUA INVENTORY SKU
        // ====================================================
        const { data: inventories, error } = await supabase
          .from("inventory")
          .select("id, sku, location, quantity")
          .eq("sku", sku);

        if (error) {
          console.error(
            `Gagal membaca stock SKU ${sku}:`,
            error
          );

          statuses.push({
            sku,
            totalStock: 0,
            qtyOrder,
            shortage: qtyOrder,
            status: "OUT_OF_STOCK",
          });

          continue;
        }

        // ====================================================
        // TOTAL STOCK
        // ====================================================
        const totalStock = (inventories || []).reduce(
          (sum, inv) =>
            sum + Number(inv.quantity || 0),
          0
        );

        // ====================================================
        // TENTUKAN STATUS
        // ====================================================
        let status:
          | "AVAILABLE"
          | "INSUFFICIENT"
          | "OUT_OF_STOCK";

        if (totalStock <= 0) {
          status = "OUT_OF_STOCK";
        } else if (totalStock < qtyOrder) {
          status = "INSUFFICIENT";
        } else {
          status = "AVAILABLE";
        }

        statuses.push({
          sku,
          totalStock,
          qtyOrder,
          shortage: Math.max(
            qtyOrder - totalStock,
            0
          ),
          status,
        });
      }

      setStockStatuses(statuses);
    } catch (error) {
      console.error(
        "Check stock status failed:",
        error
      );
    }
  }

  // ==========================================================
  // GET STOCK STATUS BY SKU
  // ==========================================================
  function getStockStatus(sku: string) {
    return stockStatuses.find(
      (item) =>
        item.sku.trim().toUpperCase() ===
        sku.trim().toUpperCase()
    );
  }

  // ==========================================================
  // DELETE OLD ALLOCATION
  // ==========================================================
  async function clearOldAllocation() {
    const { error } = await supabase
      .from("allocation")
      .delete()
      .eq("order_no", orderNo)
      .eq("qty_picked", 0);

    if (error) {
      console.error(error);

      alert(
        `Gagal membersihkan allocation lama:\n${error.message}`
      );

      return false;
    }

    return true;
  }

  // ==========================================================
  // AUTOMATIC ALLOCATION
  // ==========================================================
  async function allocateOrder() {
    try {
      setAllocating(true);

      if (!details || details.length === 0) {
        alert("Tidak ada detail order.");
        return;
      }

      // ======================================================
      // CEK APAKAH ADA ALLOCATION YANG SUDAH DIPICK
      // ======================================================
      const {
        data: pickedAllocation,
        error: pickedError,
      } = await supabase
        .from("allocation")
        .select(
          "id, sku, location, qty_allocated, qty_picked"
        )
        .eq("order_no", orderNo)
        .gt("qty_picked", 0);

      if (pickedError) {
        console.error(pickedError);

        alert(
          `Gagal mengecek allocation:\n${pickedError.message}`
        );

        return;
      }

      if (
        pickedAllocation &&
        pickedAllocation.length > 0
      ) {
        alert(
          "Allocation tidak dapat dihitung ulang karena sudah ada barang yang dipick."
        );

        return;
      }

      // ======================================================
      // HAPUS ALLOCATION LAMA
      // ======================================================
      const cleared =
        await clearOldAllocation();

      if (!cleared) {
        return;
      }

      // ======================================================
      // REFRESH STOCK STATUS
      // ======================================================
      await checkStockStatus(details);

      // ======================================================
      // PROSES SETIAP SKU
      // ======================================================
      let allocatedSkuCount = 0;
      let unavailableSkuCount = 0;

      for (const item of details) {
        const sku = String(
          item.sku || ""
        ).trim();

        const orderQty = Number(
          item.qty_order || 0
        );

        if (!sku || orderQty <= 0) {
          continue;
        }

        // ====================================================
        // CARI INVENTORY
        // ====================================================
        const {
          data: inventories,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select(
            "id, sku, location, deskripsi, quantity, created_at"
          )
          .eq("sku", sku)
          .gt("quantity", 0)
          .order("location", {
            ascending: true,
          });

        if (inventoryError) {
          console.error(inventoryError);

          alert(
            `Gagal membaca inventory SKU ${sku}:\n${inventoryError.message}`
          );

          return;
        }

        // ====================================================
        // JIKA STOCK TIDAK ADA
        // JANGAN HENTIKAN SKU LAIN
        // ====================================================
        if (
          !inventories ||
          inventories.length === 0
        ) {
          unavailableSkuCount++;

          await supabase
            .from("order_detail")
            .update({
              qty_allocated: 0,
            })
            .eq("id", item.id);

          continue;
        }

        // ====================================================
        // HITUNG TOTAL STOCK
        // ====================================================
        const totalStock =
          inventories.reduce(
            (sum, inv) =>
              sum +
              Number(inv.quantity || 0),
            0
          );

        // ====================================================
        // STOCK TIDAK MENCUKUPI
        // ====================================================
        if (totalStock < orderQty) {
          unavailableSkuCount++;

          await supabase
            .from("order_detail")
            .update({
              qty_allocated: 0,
            })
            .eq("id", item.id);

          console.log(
            `SKU ${sku} tidak cukup. ` +
              `Order=${orderQty}, ` +
              `Stock=${totalStock}`
          );

          continue;
        }

        // ====================================================
        // STOCK CUKUP
        // AUTOMATIC ALLOCATION
        // ====================================================
        let remaining = orderQty;

        for (const inv of inventories) {
          if (remaining <= 0) {
            break;
          }

          const availableQty =
            Number(inv.quantity || 0);

          if (availableQty <= 0) {
            continue;
          }

          // ==================================================
          // QTY ALLOCATION
          // ==================================================
          const allocQty = Math.min(
            availableQty,
            remaining
          );

          if (allocQty <= 0) {
            continue;
          }

          // ==================================================
          // INSERT ALLOCATION
          // ==================================================
          const {
            error: allocationError,
          } = await supabase
            .from("allocation")
            .insert({
              order_no: item.order_no,
              sku,
              deskripsi:
                item.deskripsi ||
                inv.deskripsi ||
                "",
              location: inv.location,
              qty_allocated: allocQty,
              qty_picked: 0,
            });

          if (allocationError) {
            console.error(
              allocationError
            );

            alert(
              `Gagal membuat allocation:\n${allocationError.message}`
            );

            return;
          }

          // ==================================================
          // KURANGI REMAINING
          // ==================================================
          remaining -= allocQty;
        }

        // ====================================================
        // CEK HASIL
        // ====================================================
        if (remaining > 0) {
          unavailableSkuCount++;

          await supabase
            .from("order_detail")
            .update({
              qty_allocated: 0,
            })
            .eq("id", item.id);

          continue;
        }

        // ====================================================
        // UPDATE ORDER DETAIL
        // ====================================================
        const {
          error: detailError,
        } = await supabase
          .from("order_detail")
          .update({
            qty_allocated: orderQty,
          })
          .eq("id", item.id);

        if (detailError) {
          console.error(detailError);

          alert(
            `Gagal update order detail:\n${detailError.message}`
          );

          return;
        }

        allocatedSkuCount++;
      }

      // ======================================================
      // CEK APAKAH SEMUA SKU BERHASIL ALLOCATE
      // ======================================================
      if (
        unavailableSkuCount === 0 &&
        allocatedSkuCount > 0
      ) {
        // ====================================================
        // SEMUA SKU AVAILABLE
        // ====================================================
        const {
          error: headerError,
        } = await supabase
          .from("order_header")
          .update({
            status: "ALLOCATED",
          })
          .eq("order_no", orderNo);

        if (headerError) {
          console.error(headerError);

          alert(
            `Gagal update status order:\n${headerError.message}`
          );

          return;
        }

        alert(
          "Allocation Success!\n\n" +
            "Semua SKU berhasil dialokasikan otomatis."
        );
      } else {
        // ====================================================
        // ADA SKU YANG TIDAK TERSEDIA
        // ====================================================
        await supabase
          .from("order_header")
          .update({
            status: "PARTIAL",
          })
          .eq("order_no", orderNo);

        alert(
          "Allocation selesai dengan beberapa SKU bermasalah.\n\n" +
            `SKU berhasil      : ${allocatedSkuCount}\n` +
            `SKU tidak tersedia : ${unavailableSkuCount}\n\n` +
            "SKU dengan status OUT OF STOCK / INSUFFICIENT STOCK tidak dialokasikan."
        );
      }

      await loadData();
    } catch (err) {
      console.error(
        "Allocation Failed:",
        err
      );

      alert("Allocation Failed");
    } finally {
      setAllocating(false);
    }
  }

  // ==========================================================
  // TOTAL QTY ORDER
  // ==========================================================
  const totalQty = details.reduce(
    (sum, item) =>
      sum + Number(item.qty_order || 0),
    0
  );

  // ==========================================================
  // TOTAL ALLOCATED
  // ==========================================================
  const totalAllocated = details.reduce(
    (sum, item) =>
      sum +
      Number(item.qty_allocated || 0),
    0
  );

  // ==========================================================
  // TOTAL OUT OF STOCK
  // ==========================================================
  const totalOutOfStock =
    stockStatuses.filter(
      (item) =>
        item.status === "OUT_OF_STOCK"
    ).length;

  // ==========================================================
  // TOTAL INSUFFICIENT
  // ==========================================================
  const totalInsufficient =
    stockStatuses.filter(
      (item) =>
        item.status === "INSUFFICIENT"
    ).length;

  // ==========================================================
  // TOTAL AVAILABLE
  // ==========================================================
  const totalAvailable =
    stockStatuses.filter(
      (item) =>
        item.status === "AVAILABLE"
    ).length;

  // ==========================================================
  // LOAD DATA
  // ==========================================================
  useEffect(() => {
    if (orderNo) {
      loadData();
    }
  }, [orderNo]);

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}
      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-2xl font-bold">
            Order Detail
          </h1>

          <p className="text-gray-500">
            Order No : {orderNo}
          </p>
        </div>

        <div className="flex gap-2">

          <button
            onClick={allocateOrder}
            disabled={
              allocating ||
              details.length === 0
            }
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {allocating
              ? "Allocating..."
              : "Allocate"}
          </button>

          <button
            onClick={() =>
              router.back()
            }
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            ← Back
          </button>

        </div>
      </div>

      {/* ================================================== */}
      {/* SUMMARY */}
      {/* ================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">

        {/* TOTAL SKU */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">
            Total SKU
          </div>

          <div className="text-2xl font-bold">
            {details.length}
          </div>
        </div>

        {/* TOTAL ORDER */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">
            Total Qty Order
          </div>

          <div className="text-2xl font-bold">
            {totalQty}
          </div>
        </div>

        {/* TOTAL ALLOCATED */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">
            Total Allocated
          </div>

          <div className="text-2xl font-bold">
            {totalAllocated}
          </div>
        </div>

        {/* AVAILABLE */}
        <div className="bg-green-50 p-4 rounded shadow border border-green-200">
          <div className="text-green-700 text-sm">
            Stock Available
          </div>

          <div className="text-2xl font-bold text-green-700">
            {totalAvailable}
          </div>
        </div>

        {/* INSUFFICIENT */}
        <div className="bg-orange-50 p-4 rounded shadow border border-orange-200">
          <div className="text-orange-700 text-sm">
            Insufficient
          </div>

          <div className="text-2xl font-bold text-orange-700">
            {totalInsufficient}
          </div>
        </div>

        {/* OUT OF STOCK */}
        <div className="bg-red-50 p-4 rounded shadow border border-red-200">
          <div className="text-red-700 text-sm">
            Out of Stock
          </div>

          <div className="text-2xl font-bold text-red-700">
            {totalOutOfStock}
          </div>
        </div>

      </div>

      {/* ================================================== */}
      {/* ORDER DETAIL TABLE */}
      {/* ================================================== */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">

        <table className="w-full">

          <thead className="bg-slate-200">

            <tr>

              <th className="border p-3">
                SKU
              </th>

              <th className="border p-3">
                Description
              </th>

              <th className="border p-3">
                Qty Order
              </th>

              <th className="border p-3">
                Available Stock
              </th>

              <th className="border p-3">
                Shortage
              </th>

              <th className="border p-3">
                Qty Allocated
              </th>

              <th className="border p-3">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>

                <td
                  colSpan={7}
                  className="text-center p-10"
                >
                  Loading...
                </td>

              </tr>

            ) : details.length === 0 ? (

              <tr>

                <td
                  colSpan={7}
                  className="text-center p-10"
                >
                  Tidak ada data
                </td>

              </tr>

            ) : (

              details.map((item) => {

                const stock =
                  getStockStatus(
                    item.sku
                  );

                return (

                  <tr
                    key={item.id}
                    className="hover:bg-slate-50"
                  >

                    {/* SKU */}
                    <td className="border p-2 font-medium">
                      {item.sku}
                    </td>

                    {/* DESCRIPTION */}
                    <td className="border p-2">
                      {item.deskripsi}
                    </td>

                    {/* QTY ORDER */}
                    <td className="border p-2 text-center font-medium">
                      {item.qty_order}
                    </td>

                    {/* AVAILABLE STOCK */}
                    <td className="border p-2 text-center">

                      {stock?.status ===
                      "OUT_OF_STOCK" ? (

                        <span className="font-bold text-red-600">
                          0
                        </span>

                      ) : (

                        <span
                          className={
                            stock?.status ===
                            "INSUFFICIENT"
                              ? "font-bold text-orange-600"
                              : "font-bold text-green-600"
                          }
                        >
                          {stock?.totalStock ??
                            0}
                        </span>

                      )}

                    </td>

                    {/* SHORTAGE */}
                    <td className="border p-2 text-center">

                      {stock &&
                      stock.shortage > 0 ? (

                        <span className="font-bold text-red-600">
                          {stock.shortage}
                        </span>

                      ) : (

                        <span className="text-gray-400">
                          -
                        </span>

                      )}

                    </td>

                    {/* ALLOCATED */}
                    <td className="border p-2 text-center font-bold">

                      {item.qty_allocated ||
                        0}

                    </td>

                    {/* STATUS */}
                    <td className="border p-2 text-center">

                      {stock?.status ===
                      "OUT_OF_STOCK" ? (

                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs">

                          🔴 OUT OF STOCK

                        </span>

                      ) : stock?.status ===
                        "INSUFFICIENT" ? (

                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">

                          🟠 INSUFFICIENT STOCK

                        </span>

                      ) : stock?.status ===
                        "AVAILABLE" ? (

                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs">

                          🟢 AVAILABLE

                        </span>

                      ) : (

                        <span className="text-gray-400">
                          Checking...
                        </span>

                      )}

                    </td>

                  </tr>

                );
              })

            )}

          </tbody>

        </table>

      </div>

      {/* ================================================== */}
      {/* ALLOCATION DETAIL */}
      {/* ================================================== */}
      <div className="bg-white rounded-lg shadow mt-6 overflow-x-auto">

        <div className="p-4 border-b">

          <h2 className="font-bold text-lg">
            Allocation Detail
          </h2>

        </div>

        <table className="w-full">

          <thead className="bg-slate-200">

            <tr>

              <th className="border p-3">
                SKU
              </th>

              <th className="border p-3">
                Description
              </th>

              <th className="border p-3">
                Location
              </th>

              <th className="border p-3">
                Qty Allocated
              </th>

              <th className="border p-3">
                Qty Picked
              </th>

            </tr>

          </thead>

          <tbody>

            {allocations.length ===
            0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="text-center p-8 text-gray-500"
                >
                  Belum ada allocation
                </td>

              </tr>

            ) : (

              allocations.map(
                (allocation) => (

                  <tr
                    key={
                      allocation.id
                    }
                    className="hover:bg-slate-50"
                  >

                    <td className="border p-2">
                      {allocation.sku}
                    </td>

                    <td className="border p-2">
                      {
                        allocation.deskripsi
                      }
                    </td>

                    <td className="border p-2 text-center font-medium">
                      {
                        allocation.location
                      }
                    </td>

                    <td className="border p-2 text-center font-bold">
                      {
                        allocation.qty_allocated
                      }
                    </td>

                    <td className="border p-2 text-center">
                      {
                        allocation.qty_picked ||
                        0
                      }
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