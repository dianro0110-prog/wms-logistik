"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h1 className="text-2xl font-bold">Putaway System</h1>
      </div>

      {/* RECEIVING */}
      <select
        className="border p-2 w-full rounded"
        value={selectedReceivingNo}
        onChange={(e) => setSelectedReceivingNo(e.target.value)}
      >
        <option value="">Pilih Receiving</option>
        {receivings.map((r, i) => (
          <option key={i} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* CHECKING */}
      {checkingData.length > 0 && (
        <div className="border p-3 rounded bg-white">
          <h3 className="font-bold mb-2">Checking Data</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">SKU</th>
                <th className="border p-2">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {checkingData.map((c, i) => (
                <tr key={i}>
                  <td className="border p-2">{c.sku}</td>
                  <td className="border p-2">{c.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* INPUT SKU */}
      <input
        className="border p-2 w-full rounded"
        placeholder="SKU"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      />

      {/* DESKRIPSI */}
      <input
        className="border p-2 w-full rounded bg-gray-100"
        value={deskripsi}
        readOnly
      />

      {/* LOCATION */}
      <input
        className="border p-2 w-full rounded"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      {/* QUANTITY */}
      <input
        type="number"
        className="border p-2 w-full rounded"
        placeholder={`Max: ${getRemainingQty()}`}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />

      {/* SUBMIT */}
      <button
        onClick={submit}
        className="bg-purple-600 text-white w-full py-2 rounded"
      >
        Simpan Putaway
      </button>
    </div>
  );
}