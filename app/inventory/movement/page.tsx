"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type Movement = {
  id: number;
  sku: string;
  deskripsi: string;
  location_from: string;
  location_to: string;
  quantity: number;
  created_at: string;
};

type Product = {
  sku: string;
  deskripsi: string;
};

export default function MovementPage() {
  const router = useRouter();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [sku, setSku] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [locationFrom, setLocationFrom] = useState("");
  const [locationTo, setLocationTo] = useState("");
  const [qty, setQty] = useState<number>(0);

  // ================= LOAD PRODUCTS =================
  async function loadProducts() {
    const { data, error } = await supabase
      .from("product")
      .select("sku, deskripsi");

    if (error) return console.error(error);

    setProducts(data || []);
  }

  // ================= LOAD MOVEMENTS =================
  async function loadMovements() {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("id", { ascending: false });

    if (error) return console.error(error);

    setMovements(data || []);
  }

  useEffect(() => {
    loadProducts();
    loadMovements();
  }, []);

  // ================= ADD MOVEMENT =================
  function addMovement() {
    if (!sku.trim()) return alert("SKU wajib diisi");
    if (!locationFrom.trim()) return alert("Location From wajib diisi");
    if (!locationTo.trim()) return alert("Location To wajib diisi");
    if (qty <= 0) return alert("Qty harus > 0");

    const cleanSku = sku.toLowerCase().trim();

    const product = products.find(
      (p) => p.sku?.toLowerCase().trim() === cleanSku
    );

    if (!product) return alert("SKU tidak ditemukan di master product");

    const newMovement = {
      sku: cleanSku,
      deskripsi: product.deskripsi,
      location_from: locationFrom,
      location_to: locationTo,
      quantity: qty,
    };

    setMovements((prev) => [newMovement as Movement, ...prev]);

    setSku("");
    setDeskripsi("");
    setLocationFrom("");
    setLocationTo("");
    setQty(0);
  }

  // ================= SAVE TO DATABASE =================
  async function submit() {
  if (movements.length === 0) return alert("Tidak ada data movement");

  // 1. simpan movement
  const { error: insertError } = await supabase.from("movements").insert(
    movements.map((m) => ({
      sku: m.sku,
      deskripsi: m.deskripsi,
      location_from: m.location_from,
      location_to: m.location_to,
      quantity: m.quantity,
    }))
  );

  if (insertError) {
    console.error(insertError);
    return alert(insertError.message);
  }

  // 2. update stok satu per satu
  for (const m of movements) {
    const qty = Number(m.quantity);

    // 🔻 ambil stok asal
    const { data: fromData } = await supabase
      .from("putaway_details")
      .select("quantity")
      .eq("sku", m.sku)
      .eq("location", m.location_from)
      .single();

    const fromQty = fromData?.quantity || 0;

    await supabase
      .from("putaway_details")
      .update({
        quantity: fromQty - qty,
      })
      .eq("sku", m.sku)
      .eq("location", m.location_from);

    // 🔺 ambil stok tujuan
    const { data: toData } = await supabase
      .from("putaway_details")
      .select("quantity")
      .eq("sku", m.sku)
      .eq("location", m.location_to)
      .maybeSingle();

    if (toData) {
      await supabase
        .from("putaway_details")
        .update({
          quantity: toData.quantity + qty,
        })
        .eq("sku", m.sku)
        .eq("location", m.location_to);
    } else {
      await supabase.from("putaway_details").insert({
        sku: m.sku,
        deskripsi: m.deskripsi,
        location: m.location_to,
        quantity: qty,
        receiving_no: "MOVE",
      });
    }
  }

  await loadMovements();

  alert("Movement berhasil disimpan & stok terupdate");

  setMovements([]);
}

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">

      {/* BACK */}
      <button
        onClick={() => router.back()}
        className="bg-gray-500 text-white px-3 py-1 rounded"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">Movement Stock</h1>

      {/* INPUT FORM */}
      <div className="border p-4 space-y-2">

        <input
          className="border p-2 w-full"
          placeholder="SKU"
          value={sku}
          onChange={(e) => {
            const value = e.target.value;
            setSku(value);

            const product = products.find(
              (p) => p.sku?.toLowerCase().trim() === value.toLowerCase().trim()
            );

            setDeskripsi(product?.deskripsi || "");
          }}
        />

        <input
          className="border p-2 w-full bg-gray-100"
          placeholder="Deskripsi"
          value={deskripsi}
          readOnly
        />

        <input
          className="border p-2 w-full"
          placeholder="Location From"
          value={locationFrom}
          onChange={(e) => setLocationFrom(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Location To"
          value={locationTo}
          onChange={(e) => setLocationTo(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />

        <button
          onClick={addMovement}
          className="bg-blue-600 text-white w-full py-2"
        >
          + Add Movement
        </button>
      </div>

      {/* TABLE */}
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Deskripsi</th>
            <th className="border p-2">From</th>
            <th className="border p-2">To</th>
            <th className="border p-2">Qty</th>
          </tr>
        </thead>

        <tbody>
          {movements.map((item, i) => (
            <tr key={i}>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.deskripsi}</td>
              <td className="border p-2">{item.location_from}</td>
              <td className="border p-2">{item.location_to}</td>
              <td className="border p-2">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SUBMIT */}
      <button
        onClick={submit}
        className="bg-green-600 text-white w-full py-2"
      >
        Simpan Movement
      </button>
    </div>
  );
}