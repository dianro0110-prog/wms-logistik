"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

export default function ReceivingPage() {
  const [ASN, setASN] = useState("");
  const [NoPO, setNoPO] = useState("");
  const [NoDus, setNoDus] = useState(""); // ✅ DIGANTI DUS
  const [Tanggal, setTanggal] = useState("");
  const [Artikel, setArtikel] = useState("");
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");
  const [data, setData] = useState<any[]>([]);

  /* ================= LOAD ================= */
  async function loadData() {
    const { data } = await supabase
      .from("inbound_transactions")
      .select("*")
      .eq("type", "receiving")
      .order("id", { ascending: false });

    setData(data || []);
  }

  /* ================= SUBMIT ================= */
  async function submit() {
    if (!ASN || !NoPO || !NoDus || !Tanggal) {
      alert("Lengkapi data header");
      return;
    }

    const { error } = await supabase.from("inbound_transactions").insert({
      type: "receiving",
      asn: ASN,
      po: NoPO,
      dus: NoDus, // ✅ DIGANTI
      tanggal: Tanggal,
      artikel: Artikel,
      quantity: qty,
      note,
    });

    if (error) return alert(error.message);

    setASN("");
    setNoPO("");
    setNoDus("");
    setTanggal("");
    setArtikel("");
    setQty(0);
    setNote("");

    loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  /* ================= TEMPLATE DOWNLOAD ================= */
  function downloadTemplate() {
    const csv =
      "ASN;No PO;No Dus;Tanggal;Artikel;Qty;Note\n" +
      "ASN001;PO001;DUS001;2026-01-01;BRG001;10;Sample";

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "receiving_template.csv";
    a.click();
  }

  /* ================= CLEAN ================= */
  function clean(v: any) {
    return (v || "").toString().trim().replace(/\s+/g, " ");
  }

  /* ================= PROCESS UPLOAD ================= */
  async function processData(rows: any[]) {
    const formatted = rows
      .map((r: any) => ({
        type: "receiving",
        asn: clean(r["ASN"]),
        po: clean(r["No PO"]),
        dus: clean(r["No Dus"]), // ✅ DIGANTI
        tanggal: clean(r["Tanggal"]),
        artikel: clean(r["Artikel"]),
        quantity: Number(r["Qty"]) || 0,
        note: clean(r["Note"]),
      }))
      .filter((r) => r.asn && r.po);

    if (formatted.length === 0) {
      alert("File kosong / format salah");
      return;
    }

    const { error } = await supabase
      .from("inbound_transactions")
      .insert(formatted);

    if (error) alert(error.message);
    else {
      alert("Upload sukses");
      loadData();
    }
  }

  /* ================= UPLOAD HANDLER ================= */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";",
        transformHeader: (h) => h.replace(/\uFEFF/g, "").trim(),
        complete: async (res: any) => {
          await processData(res.data);
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
        raw: false,
      });

      await processData(json);
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">

        <h1 className="text-2xl font-bold text-slate-800">
          Receiving Inbound
        </h1>

        {/* ================= TOOLS ================= */}
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="bg-green-600 text-white px-3 py-1 rounded"
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
        <div className="bg-white shadow-lg rounded-xl p-6 space-y-4">

          <h2 className="font-semibold">Header Data</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              className="border p-2 rounded"
              placeholder="ASN"
              value={ASN}
              onChange={(e) => setASN(e.target.value)}
            />

            <input
              className="border p-2 rounded"
              placeholder="No PO"
              value={NoPO}
              onChange={(e) => setNoPO(e.target.value)}
            />

            {/* ✅ DUS */}
            <input
              className="border p-2 rounded"
              placeholder="No Dus"
              value={NoDus}
              onChange={(e) => setNoDus(e.target.value)}
            />

            <input
              type="date"
              className="border p-2 rounded"
              value={Tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />

          </div>

          <h2 className="font-semibold pt-4">Detail Item</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              className="border p-2 rounded"
              placeholder="Artikel"
              value={Artikel}
              onChange={(e) => setArtikel(e.target.value)}
            />

            <input
              className="border p-2 rounded"
              placeholder="Qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />

            <input
              className="border p-2 rounded md:col-span-2"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

          </div>

          <button
            onClick={submit}
            className="w-full bg-blue-600 text-white py-2 rounded-lg"
          >
            Simpan Receiving
          </button>

        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white shadow rounded-xl overflow-hidden">

          <table className="w-full text-sm">

            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">ASN</th>
                <th className="p-3">No PO</th>
                <th className="p-3">No Dus</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Artikel</th>
                <th className="p-3">Qty</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.asn}</td>
                  <td className="p-3">{item.po}</td>
                  <td className="p-3">{item.dus}</td>
                  <td className="p-3">{item.tanggal}</td>
                  <td className="p-3">{item.artikel}</td>
                  <td className="p-3">{item.quantity}</td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

      </div>
    </div>
  );
}