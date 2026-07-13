"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Item = {
  id: string;
  sku: string;
  deskripsi: string;
  quantity: number;
};

export default function ReceivingPage() {
  const router = useRouter();

  // HEADER
  const [receivingNo, setReceivingNo] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [status, setStatus] = useState("Open");

  // ITEMS
  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), sku: "", deskripsi: "", quantity: 0 },
  ]);

  const [products, setProducts] = useState<any[]>([]);
  const [receivingList, setReceivingList] = useState<any[]>([]);
  
  async function loadProducts() {
    const { data } = await supabase.from("product").select("sku, deskripsi");
    setProducts(data || []);
  }

  useEffect(() => {
    loadProducts();
    loadReceiving();
  }, []);


  async function loadReceiving() {
  const { data, error } = await supabase
    .from("receiving_details")
    .select(`
      id,
      sku,
      quantity,
      receiving_id
    `)
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const rows = await Promise.all(
    (data || []).map(async (item) => {
      const { data: header } = await supabase
        .from("receivings")
        .select("receiving_no,status")
        .eq("id", item.receiving_id)
        .single();

      return {
        ...item,
        receiving_no: header?.receiving_no || "-",
        status: header?.status || "-",
      };
    })
  );

  setReceivingList(rows);
}
  // ================= ITEM HANDLER =================
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sku: "", deskripsi: "", quantity: 0 },
    ]);
  }

  function updateItem(id: string, field: keyof Item, value: any) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateSku(id: string, sku: string) {
    const product = products.find(
      (p) => p.sku?.toLowerCase() === sku.toLowerCase()
    );

    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, sku, deskripsi: product?.deskripsi || "" }
          : i
      )
    );
  }

  // ================= TEMPLATE =================
  function downloadTemplate() {
    const csv =
`receiving_no;supplier_name;status;sku;deskripsi;quantity
RCV001;Supplier A;Open;SKU002;Contoh Barang; 2`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "receiving_template.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  // ================= PROCESS DATA =================
  async function processData(data: any[]) {
    const grouped: Record<string, any> = {};

    data.forEach((row) => {
      const cleanRow: any = {};

      Object.entries(row).forEach(([k, v]) => {
        const key = k
          .replace(/\uFEFF/g, "")
          .trim()
          .toLowerCase();
        cleanRow[key] = v;
      });

      const receiving_no = String(cleanRow.receiving_no || "").trim();
      const supplier_name = String(cleanRow.supplier_name || "").trim();
      const status = String(cleanRow.status || "Open").trim();

      const sku = String(cleanRow.sku || "").trim();
      const deskripsi = String(cleanRow.deskripsi || "").trim();
      const quantity = Number(cleanRow.quantity || 0);

      if (!receiving_no || !sku) return;

      if (!grouped[receiving_no]) {
        grouped[receiving_no] = {
          header: { receiving_no, supplier_name, status },
          items: [],
        };
      }

      grouped[receiving_no].items.push({
        sku,
        deskripsi,
        quantity,
      });
    });

    for (const key of Object.keys(grouped)) {
      const g = grouped[key];

      const { data: header, error } = await supabase
        .from("receivings")
        .insert(g.header)
        .select()
        .single();

      if (error) {
        alert(error.message);
        continue;
      }

      const details = g.items.map((i: any) => ({
        receiving_id: header.id,
        sku: i.sku,
        deskripsi: i.deskripsi,
        quantity: i.quantity,
      }));

      await supabase.from("receiving_details").insert(details);
    }

    await loadReceiving();
    alert("Upload sukses");
    alert("Upload sukses");
  }

  // ================= UPLOAD =================
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) =>
          h.replace(/\uFEFF/g, "").trim().toLowerCase(),
        complete: async (res) => {
          await processData(res.data as any[]);
        },
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);

      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      await processData(json as any[]);
    };

    reader.readAsArrayBuffer(file);
  }

  // ================= SUBMIT =================
  async function submit() {
    if (!receivingNo || !supplierName) {
      alert("Lengkapi header");
      return;
    }

    const { data: header, error } = await supabase
      .from("receivings")
      .insert({
        receiving_no: receivingNo,
        supplier_name: supplierName,
        status,
      })
      .select()
      .single();

    if (error) return alert(error.message);

    const details = items
      .filter((i) => i.sku)
      .map((i) => ({
        receiving_id: header.id,
        sku: i.sku,
        deskripsi: i.deskripsi,
        quantity: i.quantity,
      }));

    await supabase.from("receiving_details").insert(details);

    await loadReceiving();

    alert("Saved");

    setReceivingNo("");
    setSupplierName("");
    setItems([
      { id: crypto.randomUUID(), sku: "", deskripsi: "", quantity: 0 },
    ]);
  }


  async function deleteReceivingDetail(id: string) {
  const ok = confirm("Hapus data ini?");

  if (!ok) return;

  const { error } = await supabase
    .from("receiving_details")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadReceiving();
}

  // ================= UI =================
  return (
    <div className="p-6 flex justify-center bg-slate-100 min-h-screen">
      <div className="w-full max-w-6xl space-y-6">

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white px-3 py-2 rounded flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <h1 className="text-2xl font-bold">WMS Receiving System</h1>
        </div>

        <div className="bg-white p-6 rounded shadow grid grid-cols-3 gap-4">
          <input
            className="border p-2 rounded"
            placeholder="Receiving No"
            value={receivingNo}
            onChange={(e) => setReceivingNo(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Supplier Name"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />

          <select
            className="border p-2 rounded"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Open</option>
            <option>Receiving</option>
            <option>Completed</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="bg-green-600 text-white px-3 py-2 rounded"
          >
            Download Template
          </button>

          <input type="file" accept=".csv,.xls,.xlsx" onChange={handleUpload} />
        </div>

        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between mb-3">
            <h2 className="font-bold">Item Details</h2>

            <button
              onClick={addItem}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              + Add SKU
            </button>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">SKU</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border p-2">
                    <input
                      className="w-full border p-1"
                      value={item.sku}
                      onChange={(e) => updateSku(item.id, e.target.value)}
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      className="w-full border p-1 bg-gray-100"
                      value={item.deskripsi}
                      readOnly
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      className="w-full border p-1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", Number(e.target.value))
                      }
                    />
                  </td>

                  <td className="border p-2 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={submit}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Save Receiving
        </button>

<div className="bg-white p-6 rounded shadow">
  <h2 className="font-bold text-lg mb-4">
    Receiving List
  </h2>

  <table className="w-full border text-sm">
    <thead className="bg-slate-100">
      <tr>
        <th className="border p-2">Receiving No</th>
        <th className="border p-2">SKU</th>
        <th className="border p-2">Quantity</th>
        <th className="border p-2">Status</th>
        <th className="border p-2">Action</th>
      </tr>
    </thead>

    <tbody>
      {receivingList.length === 0 ? (
        <tr>
          <td
            colSpan={5}
            className="border p-4 text-center"
          >
            No Data
          </td>
        </tr>
      ) : (
        receivingList.map((row) => (
          <tr key={row.id}>
            <td className="border p-2">
              {row.receiving_no}
            </td>

            <td className="border p-2">
              {row.sku}
            </td>

            <td className="border p-2">
              {row.quantity}
            </td>

            <td className="border p-2">
              {row.status}
            </td>

            <td className="border p-2 text-center">
              <button
                onClick={() => deleteReceivingDetail(row.id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

      </div>
    </div>
  );
}

