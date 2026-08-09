"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftCircle } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

interface PackingItem {
  id: number;
  order_no: string;
  sku: string;
  deskripsi?: string;
  qty_picked: number;
  qty_packed?: number;

  product?: {
    
    deskripsi?: string;
  };
}

export default function PackingPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = params.orderNo as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");

  const [items, setItems] = useState<PackingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [scanSku, setScanSku] = useState("");
  const [cartonNo, setCartonNo] = useState("");
  const [packQty, setPackQty] = useState("");
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (orderNo) {
      loadData();
    }
  }, [orderNo]);

  async function loadData() {
    try {
      setLoading(true);

      // Header Order
      const { data: header, error: headerError } = await supabase
        .from("order_header")
        .select("customer_name")
        .eq("order_no", orderNo)
        .single();

      if (headerError) {
        alert(headerError.message);
        return;
      }

      setCustomerName(header.customer_name);

      // Detail Picking
    const { data, error } = await supabase
  .from("picking")
  .select("*")
  .eq("order_no", orderNo)
  .order("location", { ascending: true });

      if (error) {
        alert(error.message);
        return;
      }

      // Hitung qty yang sudah dipacking
      const { data: packingData } = await supabase
        .from("packing")
        .select("sku,qty")
        .eq("order_no", orderNo);

      const result = (data || []).map((item: any) => {

        const packed =
          (packingData || [])
            .filter((x: any) => x.sku === item.sku)
            .reduce(
              (a: number, b: any) => a + Number(b.qty),
              0
            );

        return {
          ...item,
          qty_packed: packed,
        };

      });

      const remaining = result.filter(
        (x) =>
          Number(x.qty_packed || 0) <
          Number(x.qty_picked || 0)
      );

      setItems(remaining);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }

  const currentItem = items[currentIndex];

  async function confirmPacking() {

    if (!currentItem) return;

    // Validasi SKU
    if (
      scanSku.trim().toUpperCase() !==
      currentItem.sku.trim().toUpperCase()
    ) {
      alert(
        `SKU salah!\nHarus : ${currentItem.sku}`
      );
      return;
    }

    // Qty
    const qty = Number(packQty);

    if (qty <= 0) {
      alert("Qty harus lebih besar dari 0");
      return;
    }

    const alreadyPacked =
      Number(currentItem.qty_packed || 0);

    const total =
      alreadyPacked + qty;

    if (total > currentItem.qty_picked) {
      alert(
        `Qty melebihi Qty Picked (${currentItem.qty_picked})`
      );
      return;
    }

    // Carton
    if (!cartonNo.trim()) {
      alert("Carton No wajib diisi");
      return;
    }

    // Berat
    if (Number(weight) <= 0) {
      alert("Berat harus lebih besar dari 0");
      return;
    }

    const { error } = await supabase
      .from("packing")
      .insert({
        order_no: currentItem.order_no,
        customer_name: customerName,
        sku: currentItem.sku,
       
        deskripsi:
          currentItem.product?.deskripsi,
        qty: qty,
        carton: cartonNo,
        weight: Number(weight),
        packing_at: new Date().toISOString(),
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Packing berhasil");

    setScanSku("");
    setCartonNo("");
    setPackQty("");
    setWeight("");

    await loadData();

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }

  }

  async function finishPacking() {

    const { data } = await supabase
      .from("picking")
      .select("sku,qty_picked")
      .eq("order_no", orderNo);

    const { data: packed } = await supabase
      .from("packing")
      .select("sku,qty")
      .eq("order_no", orderNo);

    let selesai = true;

    for (const item of data || []) {

      const total =
        (packed || [])
          .filter((x: any) => x.sku === item.sku)
          .reduce(
            (a: number, b: any) => a + Number(b.qty),
            0
          );

      if (total < item.qty_picked) {
        selesai = false;
        break;
      }

    }

    if (!selesai) {
      alert("Masih ada item yang belum selesai dipacking.");
      return;
    }

    await supabase
      .from("order_header")
      .update({
        status: "PACKED",
      })
      .eq("order_no", orderNo);

    alert("Packing Complete");

    router.push("/outbound/packing");
  }

  const progress =
    items.length > 0
      ? Math.round(
          ((currentIndex + 1) / items.length) * 100
        )
      : 100;

  return (
    <div className="min-h-screen bg-slate-50 p-6">

              <div className="flex justify-between mb-6">

        <div>

          <h1 className="text-2xl font-bold">
            Packing Order
          </h1>

          <p className="text-gray-500">
            Picklist : {orderNo}
          </p>

        </div>

        <div className="flex gap-2">

          <button
  onClick={() => router.back()}
  className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition"
>
  <ArrowLeftCircle size={20} />
  <span>Back</span>
</button>

          <button
            onClick={finishPacking}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Finish Packing
          </button>

        </div>

      </div>

      <div className="bg-white p-4 rounded shadow mb-5">

        <div className="flex justify-between">

          <div>
            Progress :
            {" "}
            {items.length === 0
              ? 0
              : currentIndex + 1}
            {" / "}
            {items.length}
          </div>

          <div>
            {progress}%
          </div>

        </div>

      </div>

      {loading ? (

        <div className="bg-white rounded shadow p-10">

          Loading...

        </div>

      ) : !currentItem ? (

        <div className="bg-white rounded shadow p-10 text-center">

          <h2 className="text-xl font-bold text-green-600">
            Semua Item Sudah Dipacking
          </h2>

          <p className="mt-2">
            Klik Finish Packing untuk menyelesaikan Order.
          </p>

        </div>

      ) : (

        <>

          <div className="bg-white rounded shadow p-6 mb-5">

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="font-semibold">
                  No Picklist
                </label>

                <div className="text-lg">
                  {orderNo}
                </div>

              </div>

              <div>

                <label className="font-semibold">
                  Customer
                </label>

                <div className="text-lg">
                  {customerName}
                </div>

              </div>

              <div>

                <label className="font-semibold">
                  SKU
                </label>

                <div className="text-xl text-blue-600">
                  {currentItem.sku}
                </div>

              </div>

              <div>

                <label className="font-semibold">
                  
                </label>

                <div>

                  {currentItem.product?.deskripsi ||
                    currentItem.deskripsi}

                </div>

              </div>

              <div>

                <label className="font-semibold">
                  Deskripsi
                </label>

                <div>

                  {currentItem.product?.deskripsi}

                </div>

              </div>

              <div>

                <label className="font-semibold">
                  Qty Picked
                </label>

                <div>

                  {currentItem.qty_picked}

                </div>

              </div>

              <div>

                <label className="font-semibold">
                  Qty Sudah Packing
                </label>

                <div>

                  {currentItem.qty_packed || 0}

                </div>

              </div>

              <div>

                <label className="font-semibold">
                  Qty Sisa
                </label>

                <div className="text-red-600 font-bold">

                  {currentItem.qty_picked -
                    Number(currentItem.qty_packed || 0)}

                </div>

              </div>

            </div>

          </div>

          <div className="bg-white rounded shadow p-6">

            <div className="mb-4">

              <label className="block mb-2">
                Scan Product
              </label>

              <input
                value={scanSku}
                onChange={(e) =>
                  setScanSku(e.target.value)
                }
                className="border rounded p-2 w-full"
                placeholder="Scan SKU"
              />

            </div>

            <div className="mb-4">

              <label className="block mb-2">
                Carton No
              </label>

              <input
                value={cartonNo}
                onChange={(e) =>
                  setCartonNo(e.target.value)
                }
                className="border rounded p-2 w-full"
                placeholder="Contoh : CTN001"
              />

            </div>

            <div className="mb-4">

              <label className="block mb-2">
                Qty Packing
              </label>

              <input
                type="number"
                value={packQty}
                onChange={(e) =>
                  setPackQty(e.target.value)
                }
                className="border rounded p-2 w-full"
              />

            </div>

            <div className="mb-6">

              <label className="block mb-2">
                Berat (Kg)
              </label>

              <input
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) =>
                  setWeight(e.target.value)
                }
                className="border rounded p-2 w-full"
              />

            </div>

            <button
              onClick={confirmPacking}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded"
            >
              Confirm Packing
            </button>

          </div>

        </>

      )}

    </div>

  );

}

