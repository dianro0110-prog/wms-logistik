
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { ArrowLeftCircle, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type InventoryRow = {
  id: number;
  sku: string;
  location: string;
  
  quantity: number;
};

type MovementRow = {
  id: number;
  sku: string;
  location_from: string;
  location_to: string;
  quantity: number;
  created_at: string;
};

export default function MovementPage() {
  const router = useRouter();

  // =====================================================
  // FORM STATE
  // =====================================================

  const [sku, setSku] = useState("");
  const [locationFrom, setLocationFrom] =
    useState("");
  const [locationTo, setLocationTo] =
    useState("");
  const [quantity, setQuantity] =
    useState<number>(0);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // INVENTORY
  // =====================================================

  const [inventory, setInventory] =
    useState<InventoryRow[]>([]);

  // =====================================================
  // MOVEMENT HISTORY
  // =====================================================

  const [movement, setMovement] =
    useState<MovementRow[]>([]);

  // =====================================================
  // LOAD INVENTORY
  // =====================================================

  async function loadInventory() {
    const {
      data,
      error,
    } = await supabase
      .from("inventory")
      .select(
        "id, sku, location, quantity"
      )
      .gt("quantity", 0)
      .order("location", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Inventory error:",
        error
      );

      alert(error.message);

      return;
    }

    setInventory(data || []);
  }

  // =====================================================
  // LOAD MOVEMENT HISTORY
  // =====================================================

  async function loadMovement() {
    const {
      data,
      error,
    } = await supabase
      .from("movement")
      .select(
        "id, sku,  location_from, location_to, quantity, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Movement error:",
        error
      );

      alert(error.message);

      return;
    }

    setMovement(data || []);
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadInventory();
    loadMovement();
  }, []);

  // =====================================================
  // GET INVENTORY FROM LOCATION
  // =====================================================

  const selectedInventory =
    inventory.find(
      (item) =>
        item.sku.trim().toLowerCase() ===
          sku.trim().toLowerCase() &&
        item.location.trim().toLowerCase() ===
          locationFrom.trim().toLowerCase()
    );

  const availableQty =
    selectedInventory
      ? Number(
          selectedInventory.quantity || 0
        )
      : 0;

  // =====================================================
  // PROCESS MOVEMENT
  // =====================================================

  async function processMovement() {
    // ================================================
    // VALIDASI SKU
    // ================================================

    if (!sku.trim()) {
      alert("SKU wajib diisi.");
      return;
    }

    // ================================================
    // VALIDASI LOCATION FROM
    // ================================================

    if (!locationFrom.trim()) {
      alert(
        "Lokasi awal wajib diisi."
      );

      return;
    }

    // ================================================
    // VALIDASI LOCATION TO
    // ================================================

    if (!locationTo.trim()) {
      alert(
        "Lokasi tujuan wajib diisi."
      );

      return;
    }

    // ================================================
    // LOCATION TIDAK BOLEH SAMA
    // ================================================

    if (
      locationFrom.trim().toLowerCase() ===
      locationTo.trim().toLowerCase()
    ) {
      alert(
        "Lokasi awal dan lokasi tujuan tidak boleh sama."
      );

      return;
    }

    // ================================================
    // VALIDASI QUANTITY
    // ================================================

    if (
      !quantity ||
      quantity <= 0
    ) {
      alert(
        "Quantity harus lebih besar dari 0."
      );

      return;
    }

    // ================================================
    // CEK INVENTORY
    // ================================================

    if (!selectedInventory) {
      alert(
        `SKU ${sku} tidak ditemukan di lokasi ${locationFrom}.`
      );

      return;
    }

    // ================================================
    // CEK STOK
    // ================================================

    if (
      quantity > availableQty
    ) {
      alert(
        `Stok tidak mencukupi.\n\n` +
        `SKU       : ${sku}\n` +
        `Location  : ${locationFrom}\n` +
        `Stok      : ${availableQty}\n` +
        `Movement  : ${quantity}`
      );

      return;
    }

    try {
      setLoading(true);

      // ================================================
      // PANGGIL SUPABASE RPC
      // ================================================

      const {
        data,
        error,
      } = await supabase.rpc(
        "process_stock_movement",
        {
          p_sku: sku.trim(),
          p_location_from:
            locationFrom.trim(),
          p_location_to:
            locationTo.trim(),
          p_quantity:
            Number(quantity),
        }
      );

      if (error) {
        console.error(
          "Movement RPC error:",
          error
        );

        alert(
          `Movement gagal:\n${error.message}`
        );

        return;
      }

      console.log(
        "Movement success:",
        data
      );

      // ================================================
      // SUCCESS
      // ================================================

      alert(
        `Movement berhasil!\n\n` +
        `SKU       : ${sku}\n` +
        `Dari      : ${locationFrom}\n` +
        `Ke        : ${locationTo}\n` +
        `Quantity  : ${quantity}`
      );

      // ================================================
      // RESET FORM
      // ================================================

      setSku("");
      setLocationFrom("");
      setLocationTo("");
      setQuantity(0);

      // ================================================
      // RELOAD DATA
      // ================================================

      await loadInventory();
      await loadMovement();

    } catch (error) {
      console.error(
        "Movement error:",
        error
      );

      alert(
        "Terjadi kesalahan saat melakukan movement."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(
    value: string
  ) {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleString("id-ID");
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <div className="flex items-center gap-3">

            <ArrowRightLeft
              size={30}
              className="text-blue-600"
            />

            <h1 className="text-2xl font-bold text-slate-800">
              Stock Movement
            </h1>

          </div>

          <p className="text-gray-500 mt-1">
            Move stock from one warehouse
            location to another
          </p>
        </div>

        <button
          onClick={() =>
            router.back()
          }
          className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
        >
          <ArrowLeftCircle
            size={20}
          />

          Back
        </button>

      </div>

      {/* =================================================
          MOVEMENT FORM
      ================================================= */}

      <div className="bg-white rounded-xl shadow p-6 mb-6">

        <h2 className="text-lg font-semibold text-slate-800 mb-5">
          Create Stock Movement
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* SKU */}

          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              SKU
            </label>

            <input
              type="text"
              value={sku}
              onChange={(e) =>
                setSku(
                  e.target.value
                )
              }
              placeholder="Enter SKU"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* LOCATION FROM */}

          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Location From
            </label>

            <input
              type="text"
              value={locationFrom}
              onChange={(e) =>
                setLocationFrom(
                  e.target.value
                )
              }
              placeholder="Source location"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* LOCATION TO */}

          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Location To
            </label>

            <input
              type="text"
              value={locationTo}
              onChange={(e) =>
                setLocationTo(
                  e.target.value
                )
              }
              placeholder="Destination location"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* QUANTITY */}

          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Quantity
            </label>

            <input
              type="number"
              min="1"
              value={
                quantity || ""
              }
              onChange={(e) =>
                setQuantity(
                  Number(
                    e.target.value
                  )
                )
              }
              placeholder="Quantity"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

        </div>

        {/* =================================================
            STOCK INFORMATION
        ================================================= */}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-slate-50 rounded-lg p-4">

            <div className="text-sm text-gray-500">
              SKU
            </div>

            <div className="font-bold text-lg">
              {sku || "-"}
            </div>

          </div>

          <div className="bg-slate-50 rounded-lg p-4">

            <div className="text-sm text-gray-500">
              Current Stock
            </div>

            <div className="font-bold text-lg text-blue-600">
              {selectedInventory
                ? availableQty
                : "-"}
            </div>

          </div>

          <div className="bg-slate-50 rounded-lg p-4">

            <div className="text-sm text-gray-500">
              Remaining After Movement
            </div>

            <div className="font-bold text-lg text-green-600">
              {selectedInventory
                ? Math.max(
                    availableQty -
                      Number(
                        quantity || 0
                      ),
                    0
                  )
                : "-"}
            </div>

          </div>

        </div>

        {/* =================================================
            SUBMIT
        ================================================= */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={
              processMovement
            }
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            <ArrowRightLeft
              size={20}
            />

            {loading
              ? "Processing..."
              : "Process Movement"}

          </button>

        </div>

      </div>

      {/* =================================================
          INVENTORY
      ================================================= */}

      <div className="bg-white rounded-xl shadow mb-6">

        <div className="p-5 border-b">

          <h2 className="text-lg font-semibold text-slate-800">
            Current Inventory
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-200">

              <tr>

                <th className="border p-3 text-left">
                  SKU
                </th>

                <th className="border p-3 text-left">
                  Description
                </th>

                <th className="border p-3 text-left">
                  Location
                </th>

                <th className="border p-3 text-center">
                  Quantity
                </th>

              </tr>

            </thead>

            <tbody>

              {inventory.length === 0 ? (

                <tr>

                  <td
                    colSpan={4}
                    className="text-center p-8 text-gray-500"
                  >
                    No inventory
                  </td>

                </tr>

              ) : (

                inventory.map(
                  (item) => (

                    <tr
                      key={item.id}
                      className="hover:bg-slate-50"
                    >

                      <td className="border p-3 font-semibold">
                        {item.sku}
                      </td>

                      

                      <td className="border p-3">
                        {item.location}
                      </td>

                      <td className="border p-3 text-center font-bold text-blue-600">
                        {item.quantity}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          MOVEMENT HISTORY
      ================================================= */}

      <div className="bg-white rounded-xl shadow">

        <div className="p-5 border-b">

          <h2 className="text-lg font-semibold text-slate-800">
            Movement History
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-200">

              <tr>

                <th className="border p-3 text-left">
                  Date
                </th>

                <th className="border p-3 text-left">
                  SKU
                </th>

                <th className="border p-3 text-left">
                  Location From
                </th>

                <th className="border p-3 text-left">
                  Location To
                </th>

                <th className="border p-3 text-center">
                  Quantity
                </th>

              </tr>

            </thead>

            <tbody>

              {movement.length === 0 ? (

                <tr>

                  <td
                    colSpan={5}
                    className="text-center p-8 text-gray-500"
                  >
                    Belum ada movement
                  </td>

                </tr>

              ) : (

                movement.map(
                  (movement) => (

                    <tr
                      key={
                        movement.id
                      }
                      className="hover:bg-slate-50"
                    >

                      <td className="border p-3 whitespace-nowrap">
                        {formatDate(
                          movement.created_at
                        )}
                      </td>

                      <td className="border p-3 font-semibold">
                        {movement.sku}
                      </td>

                      <td className="border p-3">
                        {movement.location_from}
                      </td>

                      <td className="border p-3">
                        {movement.location_to}
                      </td>

                      <td className="border p-3 text-center font-bold text-blue-600">
                        {movement.quantity}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

