"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type Receiving = {
  id: number;
  receiving_no: string;
  supplier_name: string;
};

type ReceivingDetail = {
  id: number;
  receiving_id: number;
  receiving_no: string;
  sku: string;
  quantity: number;
};

type CheckingRow = {
  sku: string;
  quantity: number;
  deskripsi?: string;
};

export default function CheckingPage() {
  const router = useRouter();

  const [receivings, setReceivings] = useState<Receiving[]>([]);
  const [selectedReceivingId, setSelectedReceivingId] = useState<number | null>(null);
  const [selectedReceivingNo, setSelectedReceivingNo] = useState("");

  const [receivingDetails, setReceivingDetails] = useState<ReceivingDetail[]>([]);
  const [checkingList, setCheckingList] = useState<CheckingRow[]>([]);

  const [sku, setSku] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState("");

  // 🆕 PRODUCTS
  const [products, setProducts] = useState<any[]>([]);
  const [deskripsi, setDeskripsi] = useState("");

  // ================= LOAD RECEIVINGS =================
 async function loadReceivings() {
const { data: checked } = await supabase
.from("checking")
.select("receiving_id");

const checkedIds = (checked || []).map(
(x: any) => x.receiving_id
);

let query = supabase
.from("receivings")
.select("id, receiving_no, supplier_name");

if (checkedIds.length > 0) {
query = query.not("id", "in", `(${checkedIds.join(",")})`);
}

const { data, error } = await query.order("id", {
ascending: false,
});

if (error) {
console.error(error);
return;
}

setReceivings(data || []);
}


  // ================= LOAD DETAILS =================
  async function loadDetails(receivingId: number) {
    const { data, error } = await supabase
      .from("receiving_details")
      .select("*")
      .eq("receiving_id", receivingId);

    if (error) return console.error(error);

    setReceivingDetails(data || []);
    setCheckingList([]);
  }

  // 🆕 LOAD PRODUCTS
  async function loadProducts() {
    const { data, error } = await supabase
      .from("product")
      .select("sku, deskripsi");

    if (error) return console.error(error);

    setProducts(data || []);
  }

  useEffect(() => {
    loadReceivings();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedReceivingId) loadDetails(selectedReceivingId);
  }, [selectedReceivingId]);

  // ================= ADD CHECKING =================
  function addChecking() {
    if (!sku.trim()) return alert("SKU wajib diisi");
    if (qty <= 0) return alert("Qty harus > 0");

    const cleanSku = sku.toLowerCase().trim();

    const detail = receivingDetails.find(
      (d) => d.sku.toLowerCase().trim() === cleanSku
    );

    if (!detail) return alert("SKU tidak ada di receiving");

    const usedQty = checkingList
      .filter((x) => x.sku === cleanSku)
      .reduce((sum, x) => sum + x.quantity, 0);

    const remaining = detail.quantity - usedQty;

    if (qty > remaining) {
      return alert(`Qty melebihi limit. Sisa: ${remaining}`);
    }

    const product = products.find(
      (p) => p.sku?.toLowerCase().trim() === cleanSku
    );

    setCheckingList((prev) => [
      ...prev,
      {
        sku: cleanSku,
        quantity: qty,
        deskripsi: product?.deskripsi || "",
      },
    ]);

    setSku("");
    setQty(0);
    setDeskripsi("");
  }

  // ================= SUBMIT =================
  async function submit() {
    if (!selectedReceivingId) return alert("Pilih Receiving dulu");
    if (checkingList.length === 0) return alert("Belum ada data checking");

    const { error } = await supabase.rpc("create_checking", {
      p_receiving_id: selectedReceivingId,
      p_receiving_no: selectedReceivingNo,
      p_note: note || null,
      p_items: checkingList.map((x) => ({
        sku: x.sku,
        quantity: x.quantity,
      })),
    });

    if (error) {
      console.error(error);
      return alert(error.message);
    }

    await supabase
  .from("receivings")
  .update({
    status: "Checking",
  })
  .eq("id", selectedReceivingId);

await loadReceivings();

alert("Checking berhasil disimpan");

setSelectedReceivingId(null);
setSelectedReceivingNo("");

    setCheckingList([]);
    setSku("");
    setQty(0);
    setNote("");
    setDeskripsi("");
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">

      <button
        onClick={() => router.back()}
        className="bg-gray-500 text-white px-3 py-1 rounded"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">Checking Inbound</h1>

      {/* RECEIVING SELECT */}
      <select
        className="border p-2 w-full"
        value={selectedReceivingId ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);
          setSelectedReceivingId(id);

          const selected = receivings.find((r) => r.id === id);
          setSelectedReceivingNo(selected?.receiving_no || "");
        }}
      >
        <option value="">-- Pilih Receiving --</option>
        {receivings.map((r) => (
          <option key={r.id} value={r.id}>
            {r.receiving_no} - {r.supplier_name}
          </option>
        ))}
      </select>

      {/* INPUT SKU + DESKRIPSI */}
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
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />

        <button
          onClick={addChecking}
          className="bg-blue-600 text-white w-full py-2"
        >
          + Tambah Item
        </button>
      </div>

      {/* TABLE */}
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Deskripsi</th>
            <th className="border p-2">Qty</th>
          </tr>
        </thead>

        <tbody>
          {checkingList.map((item, i) => (
            <tr key={i}>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.deskripsi || "-"}</td>
              <td className="border p-2">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* NOTE */}
      <input
        className="border p-2 w-full"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {/* SUBMIT */}
      <button
        onClick={submit}
        className="bg-green-600 text-white w-full py-2"
      >
        Simpan Checking
      </button>
    </div>
  );
}