"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

interface OrderDetail {
  id: number;
  order_no: string;
  sku: string;
  item_name: string;
  qty_order: number;
  qty_allocated: number;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = params.orderNo as string;

  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [details, setDetails] = useState<OrderDetail[]>([]);

  async function loadData() {
    try {
      setLoading(true);

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

      setDetails(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

async function allocateOrder() {
  try {

    for (const item of details) {

      // Cari stok inventory berdasarkan SKU
      const { data: inventoryData, error: inventoryError } =
        await supabase
          .from("inventory")
          .select("*")
          .eq("sku", item.sku)
          .single();

      if (inventoryError || !inventoryData) {
        alert(
          `Inventory tidak ditemukan untuk SKU ${item.sku}`
        );
        return;
      }

      // Simpan allocation + location
      const { error: allocationError } =
        await supabase
          .from("allocation")
          .insert({
            order_no: item.order_no,
            sku: item.sku,
            item_name: item.item_name,
            location: inventoryData.location,
            qty_allocated: item.qty_order,
          });

      if (allocationError) {
        console.error(allocationError);
        alert(allocationError.message);
        return;
      }

      // Update order_detail
      const { error: detailError } =
        await supabase
          .from("order_detail")
          .update({
            qty_allocated: item.qty_order,
          })
          .eq("id", item.id);

      if (detailError) {
        console.error(detailError);
      }
    }

    // Update status order
    const { error: headerError } =
      await supabase
        .from("order_header")
        .update({
          status: "ALLOCATED",
        })
        .eq("order_no", orderNo);

    if (headerError) {
      console.error(headerError);
      alert(headerError.message);
      return;
    }

    alert("Allocation Success");

    loadData();

  } catch (err) {
    console.error(err);
    alert("Allocation Failed");
  }
}

  const totalQty = details.reduce(
    (sum, item) => sum + (item.qty_order || 0),
    0
  );

  const totalAllocated = details.reduce(
    (sum, item) => sum + (item.qty_allocated || 0),
    0
  );

  useEffect(() => {
    if (orderNo) {
      loadData();
    }
  }, [orderNo]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
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
              allocating || details.length === 0
            }
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {allocating
              ? "Allocating..."
              : "Allocate"}
          </button>

          <button
            onClick={() => router.back()}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">
            Total SKU
          </div>

          <div className="text-2xl font-bold">
            {details.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">
            Total Qty Order
          </div>

          <div className="text-2xl font-bold">
            {totalQty}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">
            Total Allocated
          </div>

          <div className="text-2xl font-bold">
            {totalAllocated}
          </div>
        </div>
      </div>

      {/* Table */}
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
                Qty Allocated
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-10"
                >
                  Loading...
                </td>
              </tr>
            ) : details.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-10"
                >
                  Tidak ada data
                </td>
              </tr>
            ) : (
              details.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50"
                >
                  <td className="border p-2">
                    {item.sku}
                  </td>

                  <td className="border p-2">
                    {item.item_name}
                  </td>

                  <td className="border p-2 text-center">
                    {item.qty_order}
                  </td>

                  <td className="border p-2 text-center">
                    {item.qty_allocated || 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}