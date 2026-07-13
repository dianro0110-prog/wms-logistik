"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

interface AllocationItem {
  id: number;
  order_no: string;
  sku: string;
  item_name: string;
  location: string;
  qty_allocated: number;
  qty_picked: number;
}

export default function PickingPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = params.orderNo as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<AllocationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [scanLocation, setScanLocation] = useState("");
  const [scanSku, setScanSku] = useState("");
  const [pickQty, setPickQty] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("allocation")
        .select("*")
        .eq("order_no", orderNo)
        .order("location", { ascending: true });

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      const { error: pickingError } = await supabase
  .from("picking")
  .insert({
    order_no: currentItem.order_no,
    sku: currentItem.sku,
    item_name: currentItem.item_name,
    location: currentItem.location,
    qty_picked: pickQty,
    picked_by: UserActivation,
    picked_at: new Date().toISOString(),
    status: "PICKED",
  });

if (pickingError) {
  console.error(pickingError);
  alert(pickingError.message);
  return;
}

      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderNo) {
      loadData();
    }
  }, [orderNo]);

  const currentItem = items[currentIndex];

  async function confirmItem() {
    if (!currentItem) return;

    if (
      scanLocation.trim().toUpperCase() !==
      currentItem.location.trim().toUpperCase()
    ) {
      alert(
        `Lokasi salah!\nHarus : ${currentItem.location}`
      );
      return;
    }

    if (
      scanSku.trim().toUpperCase() !==
      currentItem.sku.trim().toUpperCase()
    ) {
      alert(
        `SKU salah!\nHarus : ${currentItem.sku}`
      );
      return;
    }

    const qty = Number(pickQty);

    if (qty <= 0) {
      alert("Qty harus lebih besar dari 0");
      return;
    }

    if (qty > currentItem.qty_allocated) {
      alert(
        `Qty tidak boleh melebihi allocated (${currentItem.qty_allocated})`
      );
      return;
    }

    const { error } = await supabase
      .from("allocation")
      .update({
        qty_picked: qty,
      })
      .eq("id", currentItem.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Item berhasil dipick");

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);

      setScanLocation("");
      setScanSku("");
      setPickQty("");

      loadData();
    } else {
      alert(
        "Semua item selesai dipick.\nKlik Finish Picking."
      );

      loadData();
    }
  }

  async function finishPicking() {
    try {
      setSaving(true);

      const { data } = await supabase
        .from("allocation")
        .select("*")
        .eq("order_no", orderNo);

      const notPicked =
        data?.filter(
          (x) =>
            Number(x.qty_picked || 0) <
            Number(x.qty_allocated || 0)
        ) || [];

      if (notPicked.length > 0) {
        alert(
          "Masih ada item yang belum selesai dipick."
        );
        return;
      }

      await supabase
        .from("order_header")
        .update({
          status: "PICKED",
        })
        .eq("order_no", orderNo);

      alert("Picking Complete");

      router.push("/outbound/picking");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const progress =
    items.length > 0
      ? Math.round(
          ((currentIndex + 1) /
            items.length) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="flex justify-between mb-6">

        <div>
          <h1 className="text-2xl font-bold">
            Picking Order
          </h1>

          <p className="text-gray-500">
            {orderNo}
          </p>
        </div>

        <div className="flex gap-2">

          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back
          </button>

          <button
            onClick={finishPicking}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Finish Picking
          </button>

        </div>

      </div>

      <div className="bg-white p-4 rounded shadow mb-5">

        <div className="flex justify-between">

          <div>
            Progress :
            {" "}
            {currentIndex + 1}
            {" / "}
            {items.length}
          </div>

          <div>
            {progress}%
          </div>

        </div>

      </div>

      {loading ? (
        <div>Loading...</div>
      ) : !currentItem ? (
        <div className="bg-white p-6 rounded shadow">
          Tidak ada data.
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded shadow mb-5">

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="font-semibold">
                  Location
                </label>

                <div className="text-xl text-blue-600">
                  {currentItem.location}
                </div>
              </div>

              <div>
                <label className="font-semibold">
                  SKU
                </label>

                <div className="text-xl text-green-600">
                  {currentItem.sku}
                </div>
              </div>

              <div>
                <label className="font-semibold">
                  Item
                </label>

                <div>
                  {currentItem.item_name}
                </div>
              </div>

              <div>
                <label className="font-semibold">
                  Qty Allocated
                </label>

                <div>
                  {currentItem.qty_allocated}
                </div>
              </div>

            </div>

          </div>

          <div className="bg-white p-6 rounded shadow">

            <div className="mb-4">

              <label className="block mb-2">
                Scan Location
              </label>

              <input
                value={scanLocation}
                onChange={(e) =>
                  setScanLocation(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
                placeholder="Scan lokasi"
              />

            </div>

            <div className="mb-4">

              <label className="block mb-2">
                Scan SKU
              </label>

              <input
                value={scanSku}
                onChange={(e) =>
                  setScanSku(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
                placeholder="Scan SKU"
              />

            </div>

            <div className="mb-4">

              <label className="block mb-2">
                Qty Picked
              </label>

              <input
                type="number"
                value={pickQty}
                onChange={(e) =>
                  setPickQty(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
              />

            </div>

            <button
              onClick={confirmItem}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Confirm Item
            </button>

          </div>
        </>
      )}
    </div>
  );
}