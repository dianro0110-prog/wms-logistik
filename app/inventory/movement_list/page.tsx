"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  ArrowLeftCircle,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Movement = {
  id: number;
  sku: string;
  location_from: string;
  location_to: string;
  quantity: number;
  created_at: string;
  deskripsi?: string;
};

export default function MovementListPage() {
  const router = useRouter();

  const [data, setData] = useState<Movement[]>([]);
  const [filtered, setFiltered] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // =====================================================
  // LOAD MOVEMENT HISTORY
  // =====================================================

  async function loadMovements() {
    try {
      setLoading(true);

      // =================================================
      // AMBIL SEMUA MOVEMENT
      // =================================================

      const {
        data: movementData,
        error: movementError,
      } = await supabase
        .from("movement")
        .select(
          "id, sku, location_from, location_to, quantity, created_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (movementError) {
        console.error(
          "Movement error:",
          movementError
        );

        alert(
          `Gagal mengambil movement:\n${movementError.message}`
        );

        return;
      }

      // =================================================
      // AMBIL INVENTORY UNTUK DESCRIPTION
      // =================================================

      const {
        data: inventoryData,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select("sku, deskripsi");

      if (inventoryError) {
        console.error(
          "Inventory error:",
          inventoryError
        );
      }

      // =================================================
      // GABUNGKAN DESCRIPTION
      // =================================================

      const movementsWithDescription =
        (movementData || []).map((movement) => {

          const inventoryItem =
            inventoryData?.find(
              (item) =>
                item.sku?.trim().toLowerCase() ===
                movement.sku?.trim().toLowerCase()
            );

          return {
            ...movement,
            deskripsi:
              inventoryItem?.deskripsi || "-",
          };
        });

      setData(movementsWithDescription);
      setFiltered(movementsWithDescription);

    } catch (error) {
      console.error(
        "Load movement error:",
        error
      );

      alert(
        "Terjadi kesalahan saat mengambil movement history."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadMovements();
  }, []);

  // =====================================================
  // SEARCH
  // =====================================================

  useEffect(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      setFiltered(data);
      return;
    }

    const result = data.filter(
      (item) =>
        item.sku
          ?.toLowerCase()
          .includes(q) ||
        item.deskripsi
          ?.toLowerCase()
          .includes(q) ||
        item.location_from
          ?.toLowerCase()
          .includes(q) ||
        item.location_to
          ?.toLowerCase()
          .includes(q)
    );

    setFiltered(result);
  }, [search, data]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(value: string) {
    if (!value) return "-";

    return new Date(value).toLocaleString(
      "id-ID",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>

          <h1 className="text-2xl font-bold text-slate-800">
            Movement History
          </h1>

          <p className="text-gray-500 mt-1">
            Riwayat perpindahan stock antar lokasi
          </p>

        </div>

        <div className="flex items-center gap-2">

          {/* REFRESH */}

          <button
            onClick={loadMovements}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {/* BACK */}

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            <ArrowLeftCircle size={20} />

            <span>Back</span>
          </button>

        </div>

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="mb-4">

        <input
          type="text"
          className="border border-slate-300 p-2.5 rounded-lg w-full md:w-1/3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search SKU / Location / Description..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

      {/* =================================================
          TOTAL
      ================================================= */}

      <div className="mb-4 text-sm text-gray-500">

        Menampilkan{" "}
        <span className="font-semibold text-slate-700">
          {filtered.length}
        </span>{" "}
        movement

        {search && (
          <>
            {" "}
            dari{" "}
            <span className="font-semibold text-slate-700">
              {data.length}
            </span>{" "}
            total movement
          </>
        )}

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="w-full overflow-x-auto bg-white shadow rounded-xl">

        <table className="min-w-[1000px] w-full text-sm border-collapse">

          <thead className="bg-slate-200">

            <tr>

              <th className="border p-3 text-left">
                Date
              </th>

              <th className="border p-3 text-left">
                SKU
              </th>

              <th className="border p-3 text-left">
                Description
              </th>

              <th className="border p-3 text-left">
                From
              </th>

              <th className="border p-3 text-left">
                To
              </th>

              <th className="border p-3 text-center">
                Qty
              </th>

            </tr>

          </thead>

          <tbody>

            {/* LOADING */}

            {loading ? (

              <tr>

                <td
                  colSpan={6}
                  className="text-center p-8 text-gray-500"
                >
                  Loading movement history...
                </td>

              </tr>

            ) : filtered.length === 0 ? (

              /* EMPTY */

              <tr>

                <td
                  colSpan={6}
                  className="text-center p-8 text-gray-500"
                >
                  {search
                    ? "Movement tidak ditemukan."
                    : "Belum ada movement history."}
                </td>

              </tr>

            ) : (

              /* DATA */

              filtered.map((item) => (

                <tr
                  key={item.id}
                  className="hover:bg-slate-50"
                >

                  {/* DATE */}

                  <td className="border p-3 whitespace-nowrap">
                    {formatDate(
                      item.created_at
                    )}
                  </td>

                  {/* SKU */}

                  <td className="border p-3 font-semibold">
                    {item.sku}
                  </td>

                  {/* DESCRIPTION */}

                  <td className="border p-3">
                    {item.deskripsi || "-"}
                  </td>

                  {/* FROM */}

                  <td className="border p-3">
                    {item.location_from}
                  </td>

                  {/* TO */}

                  <td className="border p-3">
                    {item.location_to}
                  </td>

                  {/* QUANTITY */}

                  <td className="border p-3 text-center font-bold text-blue-600">
                    {item.quantity}
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}