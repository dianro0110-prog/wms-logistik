"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function PutawayPage() {
  const [artikel, setArtikel] = useState("");
  const [qty, setQty] = useState(0);
  const [location, setLocation] = useState("");
  const [data, setData] = useState<any[]>([]);

  async function loadData() {
    const { data } = await supabase
      .from("inbound_transactions")
      .select("*")
      .eq("type", "putaway")
      .order("id", { ascending: false });

    setData(data || []);
  }

  async function submit() {
    await supabase.from("inbound_transactions").insert({
      type: "putaway",
      artikel,
      quantity: qty,
      location,
    });

    setArtikel("");
    setQty(0);
    setLocation("");

    loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">Putaway</h1>

      <div className="bg-white p-4 rounded shadow space-y-3">

        <input
          className="border p-2 w-full rounded"
          placeholder="Artikel"
          value={artikel}
          onChange={(e) => setArtikel(e.target.value)}
        />

        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />

        <input
          className="border p-2 w-full rounded"
          placeholder="Location (Rack A1, dll)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <button
          onClick={submit}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Simpan Putaway
        </button>

      </div>

    </div>
  );
}