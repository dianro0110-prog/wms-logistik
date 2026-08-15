
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { ArrowLeftCircle } from "lucide-react";
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
  const [selectedReceivingId, setSelectedReceivingId] =
    useState<number | null>(null);
  const [selectedReceivingNo, setSelectedReceivingNo] = useState("");

  const [receivingDetails, setReceivingDetails] = useState<
    ReceivingDetail[]
  >([]);
  const [checkingList, setCheckingList] = useState<CheckingRow[]>([]);

  const [sku, setSku] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [deskripsi, setDeskripsi] = useState("");

  // ================= LOAD RECEIVINGS =================
  async function loadReceivings() {
    const { data, error } = await supabase
      .from("receivings")
      .select("id, receiving_no, supplier_name")
      .neq("status", "Checking Complete")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setReceivings(data ?? []);
  }

  // ================= LOAD DETAILS =================
  async function loadDetails(receivingId: number) {
    const { data, error } = await supabase
      .from("receiving_details")
      .select("*")
      .eq("receiving_id", receivingId);

    if (error) {
      console.error(error);
      return;
    }

    setReceivingDetails(data || []);
    setCheckingList([]);
  }

  // ================= LOAD PRODUCTS =================
  async function loadProducts() {
    const { data, error } = await supabase
      .from("product")
      .select("sku, deskripsi");

    if (error) {
      console.error(error);
      return;
    }

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

  // ================= ADD CHECKING =================
  function addChecking() {
    if (!sku.trim()) {
      return alert("SKU wajib diisi");
    }

    if (qty <= 0) {
      return alert("Qty harus > 0");
    }

    const cleanSku = sku.toLowerCase().trim();

    const detail = receivingDetails.find(
      (d) => d.sku.toLowerCase().trim() === cleanSku
    );

    if (!detail) {
      return alert("SKU tidak ada di receiving");
    }

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

  // ================= EDIT QTY =================
  function updateCheckingQty(index: number, newQty: number) {
    if (newQty <= 0) {
      return;
    }

    const item = checkingList[index];

    const detail = receivingDetails.find(
      (d) => d.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()
    );

    if (!detail) {
      return;
    }

    // Hitung qty item yang sama selain baris yang sedang diedit
    const otherQty = checkingList
      .filter((_, i) => i !== index)
      .filter(
        (x) =>
          x.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()
      )
      .reduce((sum, x) => sum + x.quantity, 0);

    const maxQty = detail.quantity - otherQty;

    if (newQty > maxQty) {
      alert(`Qty maksimal untuk SKU ${item.sku} adalah ${maxQty}`);
      return;
    }

    setCheckingList((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              quantity: newQty,
            }
          : row
      )
    );
  }

  // ================= DELETE CHECKING =================
  function deleteChecking(index: number) {
    setCheckingList((prev) => prev.filter((_, i) => i !== index));
  }

  // ================= SUBMIT =================
  async function submit() {
    if (!selectedReceivingId) {
      return alert("Pilih Receiving dulu");
    }

    if (checkingList.length === 0) {
      return alert("Belum ada data checking");
    }

    // Validasi ulang sebelum simpan
    for (const item of checkingList) {
      if (item.quantity <= 0) {
        return alert(`Qty SKU ${item.sku} harus lebih dari 0`);
      }

      const detail = receivingDetails.find(
        (d) =>
          d.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()
      );

      if (!detail) {
        return alert(`SKU ${item.sku} tidak ada di receiving`);
      }

      const totalQty = checkingList
        .filter(
          (x) =>
            x.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()
        )
        .reduce((sum, x) => sum + x.quantity, 0);

      if (totalQty > detail.quantity) {
        return alert(
          `Qty SKU ${item.sku} melebihi receiving. Maksimal: ${detail.quantity}`
        );
      }
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
      console.error(error);
      return alert(error.message);
    }

    // ================= CEK STATUS RECEIVING =================

    const { data: details, error: detailsError } = await supabase
      .from("receiving_details")
      .select("sku, quantity")
      .eq("receiving_id", selectedReceivingId);

    if (detailsError) {
      console.error(detailsError);
      return alert(detailsError.message);
    }

    const { data: checkingDetails, error: checkingError } =
      await supabase
        .from("checking_details")
        .select("sku, quantity")
        .eq("receiving_id", selectedReceivingId);

    if (checkingError) {
      console.error(checkingError);
      return alert(checkingError.message);
    }

    let selesai = true;

    for (const item of details || []) {
      const totalChecking = (checkingDetails || [])
        .filter(
          (c) =>
            c.sku.toLowerCase().trim() === item.sku.toLowerCase().trim()
        )
        .reduce((a, b) => a + b.quantity, 0);

      if (totalChecking < item.quantity) {
        selesai = false;
        break;
      }
    }

    const { error: updateError } = await supabase
      .from("receivings")
      .update({
        status: selesai ? "Checking Complete" : "Checking Process",
      })
      .eq("id", selectedReceivingId);

    if (updateError) {
      console.error(updateError);
      return alert(updateError.message);
    }

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

      {/* BACK */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition"
      >
        <ArrowLeftCircle size={20} />
        <span>Back</span>
      </button>

      <h1 className="text-2xl font-bold">
        Checking Inbound
      </h1>

      {/* RECEIVING SELECT */}
      <select
        className="border p-2 w-full"
        value={selectedReceivingId ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);

          setSelectedReceivingId(id);

          const selected = receivings.find(
            (r) => r.id === id
          );

          setSelectedReceivingNo(
            selected?.receiving_no || ""
          );
        }}
      >
        <option value="">
          -- Pilih Receiving --
        </option>

        {receivings.map((r) => (
          <option key={r.id} value={r.id}>
            {r.receiving_no} - {r.supplier_name}
          </option>
        ))}
      </select>

      {/* INPUT SKU */}
      <div className="border p-4 space-y-2">

        <input
          className="border p-2 w-full"
          placeholder="SKU"
          value={sku}
          onChange={(e) => {
            const value = e.target.value;

            setSku(value);

            const product = products.find(
              (p) =>
                p.sku?.toLowerCase().trim() ===
                value.toLowerCase().trim()
            );

            setDeskripsi(
              product?.deskripsi || ""
            );
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
          onChange={(e) =>
            setQty(Number(e.target.value))
          }
        />

        <button
          onClick={addChecking}
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          + Tambah Item
        </button>
      </div>

      {/* CHECKING LIST */}
      <div className="border rounded-lg overflow-hidden">

        <table className="w-full border-collapse">

          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">
                SKU
              </th>

              <th className="border p-2">
                Deskripsi
              </th>

              <th className="border p-2">
                Qty
              </th>

              <th className="border p-2">
                Action
              </th>
            </tr>
          </thead>

          <tbody>

            {checkingList.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="border p-4 text-center text-gray-500"
                >
                  Belum ada item checking
                </td>
              </tr>
            ) : (
              checkingList.map((item, i) => (
                <tr key={i}>

                  <td className="border p-2">
                    {item.sku}
                  </td>

                  <td className="border p-2">
                    {item.deskripsi || "-"}
                  </td>

                  {/* QTY EDITABLE */}
                  <td className="border p-2">

                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateCheckingQty(
                          i,
                          Number(e.target.value)
                        )
                      }
                      className="border rounded p-1 w-24 text-center"
                    />

                  </td>

                  {/* DELETE */}
                  <td className="border p-2 text-center">

                    <button
                      onClick={() =>
                        deleteChecking(i)
                      }
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Hapus
                    </button>

                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

      {/* NOTE */}
      <input
        className="border p-2 w-full"
        placeholder="Note"
        value={note}
        onChange={(e) =>
          setNote(e.target.value)
        }
      />

      {/* SUBMIT */}
      <button
        onClick={submit}
        className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700"
      >
        Simpan Checking
      </button>

    </div>
  );
}
