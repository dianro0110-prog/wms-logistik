"use client";

import { useEffect, useRef, useState } from "react";
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

export default function MobileCheckingPage() {
  const router = useRouter();

  const skuRef = useRef<HTMLInputElement>(null);

  const [receivings, setReceivings] = useState<Receiving[]>([]);
  const [selectedReceivingId, setSelectedReceivingId] = useState<number | null>(null);
  const [selectedReceivingNo, setSelectedReceivingNo] = useState("");

  const [receivingDetails, setReceivingDetails] = useState<ReceivingDetail[]>([]);
  const [checkingList, setCheckingList] = useState<CheckingRow[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  const [sku, setSku] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [deskripsi, setDeskripsi] = useState("");
  const [note, setNote] = useState("");

  async function loadReceivings() {
    const { data: checked } = await supabase
      .from("checking")
      .select("receiving_id");

    const checkedIds = (checked || []).map((x: any) => x.receiving_id);

    let query = supabase
      .from("receivings")
      .select("id,receiving_no,supplier_name");

    if (checkedIds.length > 0) {
      query = query.not("id", "in", `(${checkedIds.join(",")})`);
    }

    const { data } = await query.order("id", {
      ascending: false,
    });

    setReceivings(data || []);
  }

  async function loadDetails(id: number) {
    const { data } = await supabase
      .from("receiving_details")
      .select("*")
      .eq("receiving_id", id);

    setReceivingDetails(data || []);
    setCheckingList([]);
  }

  async function loadProducts() {
    const { data } = await supabase
      .from("product")
      .select("sku,deskripsi");

    setProducts(data || []);
  }

  useEffect(() => {
    loadReceivings();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedReceivingId) {
      loadDetails(selectedReceivingId);
    }
  }, [selectedReceivingId]);

  function addChecking() {
    if (!sku.trim()) {
      alert("SKU wajib diisi");
      return;
    }

    if (qty <= 0) {
      alert("Qty harus >0");
      return;
    }

    const cleanSku = sku.toLowerCase().trim();

    const detail = receivingDetails.find(
      (x) => x.sku.toLowerCase().trim() === cleanSku
    );

    if (!detail) {
      alert("SKU tidak ada di receiving");
      return;
    }

    const usedQty = checkingList
      .filter((x) => x.sku === cleanSku)
      .reduce((a, b) => a + b.quantity, 0);

    const remain = detail.quantity - usedQty;

    if (qty > remain) {
      alert(`Qty melebihi sisa (${remain})`);
      return;
    }

    const product = products.find(
      (x) => x.sku?.toLowerCase().trim() === cleanSku
    );

    setCheckingList([
      ...checkingList,
      {
        sku: cleanSku,
        quantity: qty,
        deskripsi: product?.deskripsi || "",
      },
    ]);

    setSku("");
    setQty(0);
    setDeskripsi("");

    setTimeout(() => {
      skuRef.current?.focus();
    }, 100);
  }

  async function submit() {
    if (!selectedReceivingId) {
      alert("Pilih Receiving");
      return;
    }

    if (checkingList.length == 0) {
      alert("Belum ada item");
      return;
    }

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
      alert(error.message);
      return;
    }

    await supabase
      .from("receivings")
      .update({
        status: "Checking",
      })
      .eq("id", selectedReceivingId);

    alert("Checking berhasil");

    setSelectedReceivingId(null);
    setSelectedReceivingNo("");
    setCheckingList([]);
    setSku("");
    setQty(0);
    setDeskripsi("");
    setNote("");

    loadReceivings();
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">

      <button
        onClick={() => router.back()}
        className="w-full bg-gray-500 text-white rounded-lg p-3"
      >
        ← Back
      </button>

      <h1 className="text-xl font-bold text-center">
        Mobile Checking
      </h1>

      <select
        className="border rounded-lg p-3 w-full"
        value={selectedReceivingId ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);

          setSelectedReceivingId(id);

          const r = receivings.find((x) => x.id == id);

          setSelectedReceivingNo(r?.receiving_no || "");
        }}
      >
        <option value="">Pilih Receiving</option>

        {receivings.map((r) => (
          <option key={r.id} value={r.id}>
            {r.receiving_no}
          </option>
        ))}
      </select>

      <input
        ref={skuRef}
        className="border rounded-lg p-3 w-full"
        placeholder="Scan / Input SKU"
        value={sku}
        onChange={(e) => {
          const value = e.target.value;

          setSku(value);

          const p = products.find(
            (x) =>
              x.sku?.toLowerCase().trim() ==
              value.toLowerCase().trim()
          );

          setDeskripsi(p?.deskripsi || "");
        }}
      />

      <input
        className="border rounded-lg p-3 bg-gray-100 w-full"
        value={deskripsi}
        readOnly
      />

      <input
        className="border rounded-lg p-3 w-full"
        type="number"
        placeholder="Qty"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
      />

      <button
        onClick={addChecking}
        className="bg-blue-600 text-white rounded-lg p-4 w-full text-lg"
      >
        Tambah Item
      </button>

      <div className="space-y-2">
        {checkingList.map((item, index) => (
          <div
            key={index}
            className="border rounded-xl p-3 shadow-sm"
          >
            <div className="font-bold">{item.sku}</div>

            <div className="text-sm text-gray-600">
              {item.deskripsi}
            </div>

            <div className="mt-2 font-semibold">
              Qty : {item.quantity}
            </div>
          </div>
        ))}
      </div>

      <input
        className="border rounded-lg p-3 w-full"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-green-600 text-white rounded-lg p-4 w-full text-lg font-bold"
      >
        SIMPAN CHECKING
      </button>
    </div>
  );
}