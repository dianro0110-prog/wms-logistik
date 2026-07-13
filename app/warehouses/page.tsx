"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface Warehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  address: string | null;
  created_at?: string;
}

export default function WarehousePage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [address, setAddress] = useState("");

  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function loadWarehouses() {
    setLoading(true);

    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setWarehouses(data || []);
    setLoading(false);
  }

  async function saveWarehouse() {
    if (!warehouseCode.trim()) {
      alert("Warehouse Code wajib diisi");
      return;
    }

    if (!warehouseName.trim()) {
      alert("Warehouse Name wajib diisi");
      return;
    }

    if (editId) {
      const { error } = await supabase
        .from("warehouses")
        .update({
          warehouse_code: warehouseCode,
          warehouse_name: warehouseName,
          address: address,
        })
        .eq("id", editId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Data berhasil diupdate");
    } else {
      const { error } = await supabase
        .from("warehouses")
        .insert([
          {
            warehouse_code: warehouseCode,
            warehouse_name: warehouseName,
            address: address,
          },
        ]);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Data berhasil disimpan");
    }

    clearForm();
    loadWarehouses();
  }

  function editWarehouse(item: Warehouse) {
    setEditId(item.id);
    setWarehouseCode(item.warehouse_code);
    setWarehouseName(item.warehouse_name);
    setAddress(item.address || "");
  }

  async function deleteWarehouse(id: number) {
    const confirmDelete = window.confirm(
      "Yakin ingin menghapus warehouse ini?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("warehouses")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Data berhasil dihapus");
    loadWarehouses();
  }

  function clearForm() {
    setEditId(null);
    setWarehouseCode("");
    setWarehouseName("");
    setAddress("");
  }

  return (
    <div className="p-6">
      {/* Tombol Kembali */}
      <button
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 border rounded hover:bg-gray-100"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-5">
        Warehouse Master
      </h1>

      <div className="border rounded p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Warehouse Code"
            className="border p-2 rounded"
            value={warehouseCode}
            onChange={(e) =>
              setWarehouseCode(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Warehouse Name"
            className="border p-2 rounded"
            value={warehouseName}
            onChange={(e) =>
              setWarehouseName(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Address"
            className="border p-2 rounded"
            value={address}
            onChange={(e) =>
              setAddress(e.target.value)
            }
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={saveWarehouse}
            className="px-4 py-2 border rounded hover:bg-blue-50"
          >
            {editId ? "Update" : "Save"}
          </button>

          <button
            onClick={clearForm}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">
                Warehouse Code
              </th>
              <th className="border p-2">
                Warehouse Name
              </th>
              <th className="border p-2">
                Address
              </th>
              <th className="border p-2">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {warehouses.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border p-4 text-center"
                >
                  No Data
                </td>
              </tr>
            ) : (
              warehouses.map((item) => (
                <tr key={item.id}>
                  <td className="border p-2">
                    {item.id}
                  </td>

                  <td className="border p-2">
                    {item.warehouse_code}
                  </td>

                  <td className="border p-2">
                    {item.warehouse_name}
                  </td>

                  <td className="border p-2">
                    {item.address}
                  </td>

                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          editWarehouse(item)
                        }
                        className="px-2 py-1 border rounded hover:bg-yellow-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteWarehouse(item.id)
                        }
                        className="px-2 py-1 border rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}