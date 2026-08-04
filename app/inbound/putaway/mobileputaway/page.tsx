"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

export default function PutawayPage() {
  const router = useRouter();

  const [receivings, setReceivings] = useState<string[]>([]);
  const [selectedReceivingNo, setSelectedReceivingNo] = useState("");

  const [checkingData, setCheckingData] = useState<any[]>([]);
  const [putawayData, setPutawayData] = useState<any[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [location, setLocation] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  const clean = (v: any) =>
    (v ?? "").toString().trim().toLowerCase();

  // ================= RECEIVING =================
  async function loadReceivingList() {
    const { data } = await supabase
      .from("receivings")
      .select("receiving_no")
      .in("status", ["Checking", "Putaway"]);

    setReceivings(data?.map((x) => x.receiving_no) || []);
  }

  // ================= CHECKING =================
  async function loadChecking(receiving_no: string) {
    const { data } = await supabase
      .from("checking_details")
      .select("receiving_no, sku, quantity")
      .eq("receiving_no", receiving_no);

    setCheckingData(data || []);
  }

  // ================= PUTAWAY =================
  async function loadPutaway() {
    const { data } = await supabase
      .from("putaway_details")
      .select("receiving_no, sku, quantity");

    setPutawayData(data || []);
  }

  // ================= PRODUCT =================
  async function loadProducts() {
    const { data } = await supabase
      .from("product")
      .select("sku, deskripsi");

    setProducts(data || []);
  }

  useEffect(() => {
    loadReceivingList();
    loadPutaway();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedReceivingNo) {
      loadChecking(selectedReceivingNo);
    } else {
      setCheckingData([]);
    }
  }, [selectedReceivingNo]);

  // ================= LOCATION VALID =================
  async function isLocationValid(loc: string) {
    const { data } = await supabase
      .from("locations")
      .select("location")
      .eq("location", loc)
      .maybeSingle();

    return !!data;
  }

  // ================= REMAINING QTY =================
  function getRemainingQty() {
    const checkQty = checkingData
      .filter((c) => clean(c.sku) === clean(sku))
      .reduce((s, i) => s + Number(i.quantity || 0), 0);

    const putQty = putawayData
      .filter(
        (p) =>
          clean(p.receiving_no) === clean(selectedReceivingNo) &&
          clean(p.sku) === clean(sku)
      )
      .reduce((s, i) => s + Number(i.quantity || 0), 0);

    return checkQty - putQty;
  }

  // ================= INVENTORY UPSERT =================
  async function updateInventory() {
  const product = products.find(
    (p) => clean(p.sku) === clean(sku)
  );

  const normalizedSku = clean(sku);
  const normalizedLoc = clean(location);

  // cek existing inventory
  const { data: existing, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("sku", normalizedSku)
    .eq("location", normalizedLoc)
    .maybeSingle();

  if (error) {
    console.error("Inventory check error:", error);
    return;
  }

  // kalau sudah ada → UPDATE
  if (existing) {
    const { error: updateError } = await supabase
      .from("inventory")
      .update({
        quantity:
          Number(existing.quantity || 0) + Number(quantity),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Inventory update error:", updateError);
      alert("Gagal update inventory");
    }

  } else {
    // kalau belum ada → INSERT
    const { error: insertError } = await supabase
      .from("inventory")
      .insert({
        sku: normalizedSku,
        deskripsi: product?.deskripsi || deskripsi,
        location: normalizedLoc,
        quantity: Number(quantity),
      });

    if (insertError) {
      console.error("Inventory insert error:", insertError);
      alert("Gagal insert inventory");
    }
  }
}

  // ================= SUBMIT =================
  async function submit() {
    const qty = Number(quantity);

    if (!selectedReceivingNo || !sku || !location || qty <= 0) {
      return alert("Data belum lengkap");
    }

    const valid = await isLocationValid(location);
    if (!valid) return alert("Location tidak valid");

    const remaining = getRemainingQty();
    if (qty > remaining) {
      return alert(`Qty melebihi checking: ${remaining}`);
    }

    const product = products.find(
      (p) => clean(p.sku) === clean(sku)
    );

    // HEADER
    const { data: header, error: headerError } = await supabase
      .from("putaways")
      .insert({
        putaway_no: `PW-${Date.now()}`,
        receiving_no: selectedReceivingNo,
        location,
      })
      .select()
      .single();

    if (headerError || !header)
      return alert("Gagal insert header");

    // DETAIL
    const { error: detailError } = await supabase
      .from("putaway_details")
      .insert({
        putaway_id: header.id,
        receiving_no: selectedReceivingNo,
        sku,
        deskripsi: product?.deskripsi || deskripsi,
        quantity: qty,
        location,
      });

    if (detailError) return alert("Gagal insert detail");

    // INVENTORY UPDATE
    await updateInventory();

    // UPDATE RECEIVING STATUS
    const { data: putRows } = await supabase
      .from("putaway_details")
      .select("quantity")
      .eq("receiving_no", selectedReceivingNo);

    const totalPut = (putRows || []).reduce(
      (s, i) => s + Number(i.quantity),
      0
    );

    const totalCheck = checkingData.reduce(
      (s, i) => s + Number(i.quantity),
      0
    );

    await supabase
      .from("receivings")
      .update({
        status: totalPut >= totalCheck ? "Completed" : "Putaway",
      })
      .eq("receiving_no", selectedReceivingNo);

    alert("Putaway & Inventory berhasil");

    setSku("");
    setQuantity(0);
    setLocation("");
    setDeskripsi("");

    loadPutaway();
    loadChecking(selectedReceivingNo);
  }

  // ================= AUTO DESKRIPSI =================
  useEffect(() => {
    const product = products.find(
      (p) => clean(p.sku) === clean(sku)
    );

    setDeskripsi(product?.deskripsi || "");
  }, [sku, products]);

  return (
  <div className="min-h-screen bg-gray-100">

    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* HEADER */}
      <div className="bg-purple-600 text-white rounded-xl p-4 shadow">

        <button
          onClick={() => router.back()}
          className="mb-3 text-sm"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold">
          Mobile Putaway
        </h1>

        <p className="text-purple-100 text-sm">
          Scan SKU lalu masukkan lokasi
        </p>

      </div>

      {/* RECEIVING */}

      <div className="bg-white rounded-xl shadow p-4">

        <label className="block font-semibold mb-2">
          Receiving
        </label>

        <select
          className="border rounded-lg p-3 w-full"
          value={selectedReceivingNo}
          onChange={(e) =>
            setSelectedReceivingNo(e.target.value)
          }
        >

          <option value="">
            Pilih Receiving
          </option>

          {receivings.map((r, i) => (

            <option
              key={i}
              value={r}
            >
              {r}
            </option>

          ))}

        </select>

      </div>

      {/* REMAINING */}

      {sku && (

        <div className="bg-green-50 border border-green-300 rounded-xl p-3">

          <div className="text-sm text-gray-600">
            Remaining Qty
          </div>

          <div className="text-3xl font-bold text-green-700">
            {getRemainingQty()}
          </div>

        </div>

      )}

      {/* SKU */}

      <div className="bg-white rounded-xl shadow p-4 space-y-3">

        <label className="font-semibold">
          SKU
        </label>

        <input
          className="border rounded-lg p-3 w-full text-lg"
          placeholder="Scan / Input SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />

        <input
          className="border rounded-lg p-3 bg-gray-100 w-full"
          value={deskripsi}
          readOnly
          placeholder="Deskripsi"
        />

      </div>

      {/* LOCATION */}

      <div className="bg-white rounded-xl shadow p-4">

        <label className="font-semibold block mb-2">
          Location
        </label>

        <input
          className="border rounded-lg p-3 w-full text-lg"
          placeholder="Scan Location"
          value={location}
          onChange={(e) =>
            setLocation(e.target.value)
          }
        />

      </div>

      {/* QTY */}

      <div className="bg-white rounded-xl shadow p-4">

        <label className="font-semibold block mb-3">
          Quantity
        </label>

        <div className="flex gap-2">

          <button
            onClick={() =>
              setQuantity((q) =>
                q > 0 ? q - 1 : 0
              )
            }
            className="w-14 bg-red-500 text-white rounded-lg text-2xl"
          >
            -
          </button>

          <input
            type="number"
            value={quantity}
            onChange={(e) =>
              setQuantity(Number(e.target.value))
            }
            className="flex-1 border rounded-lg text-center text-xl font-bold"
          />

          <button
            onClick={() =>
              setQuantity((q) => q + 1)
            }
            className="w-14 bg-green-600 text-white rounded-lg text-2xl"
          >
            +
          </button>

        </div>

      </div>

      {/* CHECKING */}

      {checkingData.length > 0 && (

        <div className="bg-white rounded-xl shadow p-4">

          <h3 className="font-bold mb-3">
            Data Checking
          </h3>

          <div className="space-y-2 max-h-64 overflow-auto">

            {checkingData.map((c, i) => (

              <div
                key={i}
                className="border rounded-lg p-3 flex justify-between"
              >

                <div>

                  <div className="font-semibold">
                    {c.sku}
                  </div>

                  <div className="text-sm text-gray-500">
                    Qty Checking
                  </div>

                </div>

                <div className="font-bold text-lg">

                  {c.quantity}

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

      {/* BUTTON */}

      <button
        onClick={submit}
        className="w-full bg-purple-600 text-white rounded-xl p-4 text-lg font-bold"
      >
        Simpan Putaway
      </button>

    </div>

  </div>
);
}