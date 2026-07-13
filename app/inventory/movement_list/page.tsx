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

export default function MovementListPage() {
  const router = useRouter();

  const [data, setData] = useState<Movement[]>([]);
  const [filtered, setFiltered] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");

  async function loadMovements() {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setData(data || []);
    setFiltered(data || []);
  }

  useEffect(() => {
    loadMovements();
  }, []);

  useEffect(() => {
    let result = [...data];

    const q = search.toLowerCase();

    if (q) {
      result = result.filter(
        (item) =>
          item.sku?.toLowerCase().includes(q) ||
          item.deskripsi?.toLowerCase().includes(q) ||
          item.location_from?.toLowerCase().includes(q) ||
          item.location_to?.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, data]);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">

      {/* BACK BUTTON */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="bg-gray-700 text-white px-3 py-2 rounded"
        >
          ← Back
        </button>
      </div>

      {/* TITLE */}
      <h1 className="text-2xl font-bold mb-4">
        Movement History
      </h1>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          className="border p-2 rounded w-full md:w-1/3"
          placeholder="Search SKU / Location / Deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="w-full overflow-x-auto bg-white shadow rounded">

        <table className="min-w-[1000px] w-full text-sm border-collapse">

          <thead className="bg-slate-200 sticky top-0 z-10">
            <tr>
              <th className="border p-3 text-left">Date</th>
              <th className="border p-3 text-left">SKU</th>
              <th className="border p-3 text-left">Description</th>
              <th className="border p-3 text-left">From</th>
              <th className="border p-3 text-left">To</th>
              <th className="border p-3 text-center">Qty</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">

                <td className="border p-3 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </td>

                <td className="border p-3 font-semibold">
                  {item.sku}
                </td>

                <td className="border p-3">
                  {item.deskripsi}
                </td>

                <td className="border p-3">
                  {item.location_from}
                </td>

                <td className="border p-3">
                  {item.location_to}
                </td>

                <td className="border p-3 text-center font-bold text-blue-600">
                  {item.quantity}
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}