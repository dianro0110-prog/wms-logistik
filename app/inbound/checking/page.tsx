"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ReceivingRow = {
  asn: string;
  dus: string;
  artikel: string;
  quantity: number;
};

type CheckingRow = {
  asn: string;
  dus: string;
  artikel: string;
  quantity: number;
};

export default function CheckingPage() {
  const [asnList, setAsnList] = useState<string[]>([]);
  const [selectedASN, setSelectedASN] = useState("");

  const [dus, setDus] = useState("");
  const [artikel, setArtikel] = useState("");
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");

  const [receiving, setReceiving] = useState<ReceivingRow[]>([]);
  const [checking, setChecking] = useState<CheckingRow[]>([]);

  // ================= CLEAN =================
  function clean(v: any) {
    return (v ?? "")
      .toString()
      .replace(/\u00A0/g, " ")
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function cleanNumber(v: any) {
    return Number(String(v).replace(/[^\d.-]/g, "")) || 0;
  }

  // ================= LOAD ASN =================
  async function loadASNList() {
    const { data } = await supabase
      .from("inbound_transactions")
      .select("asn")
      .eq("type", "receiving");

    const unique = Array.from(
      new Set((data || []).map((d: any) => d.asn))
    );

    setAsnList(unique);
  }

  // ================= LOAD RECEIVING =================
  async function loadReceiving(asn: string) {
    const { data } = await supabase
      .from("inbound_transactions")
      .select("*")
      .eq("type", "receiving")
      .eq("asn", asn);

    setReceiving(data || []);
  }

  // ================= LOAD CHECKING =================
  async function loadChecking(asn: string) {
    const { data } = await supabase
      .from("inbound_transactions")
      .select("*")
      .eq("type", "checking")
      .eq("asn", asn);

    setChecking(data || []);
  }

  useEffect(() => {
    loadASNList();
  }, []);

  useEffect(() => {
    if (selectedASN) {
      loadReceiving(selectedASN);
      loadChecking(selectedASN);
    }
  }, [selectedASN]);

  // ================= FIND RECEIVING =================
  function getReceivingItem() {
    return receiving.find((r) => {
      return (
        clean(r.dus || r.dus) === clean(dus) &&
        clean(r.artikel) === clean(artikel)
      );
    });
  }

  // ================= USED QTY =================
  function getUsedQty() {
    return checking
      .filter(
        (c) =>
          clean(c.dus) === clean(dus) &&
          clean(c.artikel) === clean(artikel)
      )
      .reduce((sum, c) => sum + cleanNumber(c.quantity), 0);
  }

  // ================= VALIDATION =================
  function validate() {
    const rec = getReceivingItem();

    if (!rec) {
      return { ok: false, msg: "Data tidak ditemukan di Receiving" };
    }

    const receivingQty = cleanNumber(rec.quantity);
    const usedQty = getUsedQty();
    const remaining = receivingQty - usedQty;

    if (qty > remaining) {
      return {
        ok: false,
        msg: `Qty melebihi sisa receiving (sisa: ${remaining})`,
      };
    }

    return { ok: true, msg: "" };
  }

  // ================= SUBMIT =================
  async function submit() {
    if (!selectedASN || !dus || !artikel || qty <= 0) {
      alert("Lengkapi semua data");
      return;
    }

    const v = validate();

    if (!v.ok) {
      alert(v.msg);
      return;
    }

    const { error } = await supabase.from("inbound_transactions").insert({
      type: "checking",
      asn: selectedASN,
      dus,
      artikel,
      quantity: qty,
      note,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDus("");
    setArtikel("");
    setQty(0);
    setNote("");

    loadChecking(selectedASN);

    alert("Checking berhasil disimpan");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">

      <div className="w-full max-w-2xl space-y-6">

        <h1 className="text-2xl font-bold text-center">
          Checking Inbound
        </h1>

        {/* FORM */}
        <div className="bg-white p-6 rounded-xl shadow space-y-4">

          <select
            className="border p-2 w-full rounded"
            value={selectedASN}
            onChange={(e) => setSelectedASN(e.target.value)}
          >
            <option value="">Pilih ASN</option>
            {asnList.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            className="border p-2 w-full rounded"
            placeholder="No Dus"
            value={dus}
            onChange={(e) => setDus(e.target.value)}
          />

          <input
            className="border p-2 w-full rounded"
            placeholder="Artikel"
            value={artikel}
            onChange={(e) => setArtikel(e.target.value)}
          />

          <input
            className="border p-2 w-full rounded"
            type="number"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />

          <input
            className="border p-2 w-full rounded"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            onClick={submit}
            className="w-full bg-green-600 text-white py-2 rounded"
          >
            Simpan Checking
          </button>

        </div>

      </div>
    </div>
  );
}