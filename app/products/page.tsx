"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

type Product = {
  id: number;
  Artikel: string;
  Deskripsi: string;
  Harga: number;
  Dimensi: number;
  created_at?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [Artikel, setArtikel] = useState("");
  const [Deskripsi, setDeskripsi] = useState("");
  const [Harga, setHarga] = useState<number>(0);
  const [Dimensi, setDimensi] = useState<number>(0);

  /* ================= LOAD ================= */
  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setProducts([]);
      return;
    }

    setProducts(data ?? []);
  }

  /* ================= ADD ================= */
  async function addProduct() {
    if (!Artikel || !Deskripsi) return alert("Lengkapi data");

    const { error } = await supabase.from("products").insert({
      Artikel,
      Deskripsi,
      Harga,
      Dimensi,
    });

    if (error) return alert(error.message);

    setArtikel("");
    setDeskripsi("");
    setHarga(0);
    setDimensi(0);

    loadProducts();
  }

  /* ================= DELETE ================= */
  async function deleteProduct(id: number) {
    if (!confirm("Hapus data ini?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadProducts();
  }

  useEffect(() => {
    loadProducts();
  }, []);

  /* ================= DOWNLOAD TEMPLATE ================= */
  function downloadTemplate() {
    const csv =
      "Artikel,Deskripsi,Harga,Dimensi\n" +
      "BRG001,Contoh Produk,10000,10";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "product_template.csv";
    a.click();
  }

  /* ================= NORMALIZE HEADER ================= */
  function cleanHeader(h: string) {
    return h
      .replace(/\uFEFF/g, "")
      .trim()
      .toLowerCase();
  }

  /* ================= PROCESS DATA ================= */
  async function processData(data: any[]) {
    console.log("RAW DATA:", data);

    const formatted = data
      .map((row: any) => {
        const r = Object.fromEntries(
          Object.entries(row).map(([k, v]) => [cleanHeader(k), v])
        );

        return {
          Artikel: (r.artikel || "").toString().trim(),
          Deskripsi: (r.deskripsi || "").toString().trim(),
          Harga: Number(r.harga || 0),
          Dimensi: Number(r.dimensi || 0),
        };
      })
      .filter((r) => r.Artikel);

    if (formatted.length === 0) {
      alert("Data kosong. Cek file Excel/CSV kamu.");
      return;
    }

    const { error } = await supabase
      .from("products")
      .insert(formatted);

    if (error) {
      alert(error.message);
    } else {
      alert("Upload sukses");
      loadProducts();
    }
  }

  /* ================= UPLOAD CSV + EXCEL ================= */
  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    // ================= CSV =================
    if (name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: "",

        complete: async (res: any) => {
          await processData(res.data);
        },
      });

      return;
    }

    // ================= EXCEL =================
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);

      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];

      const json = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
      });

      await processData(json);
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="p-4">

      <h1 className="text-xl font-bold mb-4">
        Master Product
      </h1>

      {/* ================= TOOLS ================= */}
      <div className="flex gap-2 mb-3">

        <button
          onClick={downloadTemplate}
          className="bg-green-600 text-white px-3 py-1 text-sm rounded"
        >
          Download Template
        </button>

        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleUpload}
          className="text-sm"
        />

      </div>

      {/* ================= FORM ================= */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">

          <input
            value={Artikel}
            onChange={(e) => setArtikel(e.target.value)}
            placeholder="Artikel"
            className="border p-3 text-sm rounded"
          />

          <input
            value={Deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Deskripsi"
            className="border p-3 text-sm rounded"
          />

          <input
            value={Harga}
            type="number"
            onChange={(e) => setHarga(Number(e.target.value))}
            placeholder="Harga"
            className="border p-3 text-sm rounded"
          />

          <input
            value={Dimensi}
            type="number"
            onChange={(e) => setDimensi(Number(e.target.value))}
            placeholder="Dimensi"
            className="border p-3 text-sm rounded"
          />

        </div>

        <button
          onClick={addProduct}
          className="mt-3 bg-blue-600 text-white px-3 py-1.5 text-sm rounded flex items-center gap-2"
        >
          <Plus size={18} />
          Tambah
        </button>

      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-slate-100 text-xs">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Artikel</th>
              <th className="p-2 text-left">Deskripsi</th>
              <th className="p-2 text-left">Harga</th>
              <th className="p-2 text-left">Dimensi</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {(products || []).map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">

                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.Artikel}</td>
                <td className="p-2">{item.Deskripsi}</td>
                <td className="p-2">
                  Rp {Number(item.Harga || 0).toLocaleString()}
                </td>
                <td className="p-2">{item.Dimensi}</td>

                <td className="p-2 text-xs">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "-"}
                </td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => deleteProduct(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

    </div>
  );
}