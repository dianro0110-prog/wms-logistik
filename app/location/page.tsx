"use client";

import { useEffect, useState } from "react";
import { ArrowLeftCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";

type Location = {
  id: number;
  warehouse_code: string;
  location: string;
  location_type: string;
  created_at?: string;
};

export default function LocationPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);

  const [warehouse_code, setwarehouse_code] = useState("");
  const [location, setLocation] = useState("");
  const [location_type, setlocation_type] = useState("");

  /* ================= LOAD ================= */
  async function loadLocations() {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setLocations([]);
      return;
    }

    setLocations(data ?? []);
  }

  /* ================= ADD ================= */
  async function addLocation() {
    if (!warehouse_code || !location) return alert("Lengkapi data");

    const { error } = await supabase.from("locations").insert({
      warehouse_code,
      location,
      location_type,
    });

    if (error) return alert(error.message);

    setwarehouse_code("");
    setlocation_type("");

    loadLocations();
  }

  /* ================= DELETE ================= */
  async function deleteLocation(id: number) {
    if (!confirm("Hapus data ini?")) return;

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    loadLocations();
  }

  useEffect(() => {
    loadLocations();
  }, []);

  /* ================= DOWNLOAD TEMPLATE ================= */
  function downloadTemplate() {
    const csv =
      "warehouse_code;location;location_type\n" +
      "Gudang A;LOC001;Storage";

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "location_template.csv";
    a.click();
  }

  /* ================= CLEAN SPACING (INI INTI FIX) ================= */
  function cleanText(value: any) {
    return (value || "")
      .toString()
      .replace(/\s+/g, " ")   // 🔥 hapus double/triple spasi
      .trim();                // 🔥 hapus spasi depan & belakang
  }

  /* ================= PROCESS DATA ================= */
  async function processData(data: any[]) {
    const formatted = data
      .map((row: any) => ({
        warehouse_code: cleanText(row["warehouse_code"]),
        location: cleanText(row["location"]),
        location_type: cleanText(row["location_type"]),
      }))
      .filter((r) => r.warehouse_code && r.location);

    if (formatted.length === 0) {
      alert("File tidak valid");
      return;
    }

    const { error } = await supabase
      .from("locations")
      .insert(formatted);

    if (error) {
      alert(error.message);
    } else {
      alert("Upload sukses");
      loadLocations();
    }
  }

  /* ================= UPLOAD ================= */
  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    // ================= CSV =================
    if (name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";",

        transformHeader: (h) =>
          h.replace(/\uFEFF/g, "").trim(),

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

    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
      >
        <ArrowLeftCircle size={18} />
        Back
      </button>

      <h1 className="text-xl font-bold">
        Master Location
      </h1>
    </div>
      {/* TOOLS */}
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

      {/* FORM */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

          <input
            value={warehouse_code}
            onChange={(e) => setwarehouse_code(e.target.value)}
            placeholder="warehouse_code"
            className="border p-3 text-sm rounded"
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="border p-3 text-sm rounded"
          />

          <input
            value={location_type}
            onChange={(e) => setlocation_type(e.target.value)}
            placeholder="location_type"
            className="border p-3 text-sm rounded"
          />

        </div>

        <button
          onClick={addLocation}
          className="mt-3 bg-blue-600 text-white px-3 py-1.5 text-sm rounded flex items-center gap-2"
        >
          <Plus size={18} />
          Tambah
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-slate-100 text-xs">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Warehouse</th>
              <th className="p-2 text-left">Kode Location</th>
              <th className="p-2 text-left">Type Location</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {(locations || []).map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">

                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.warehouse_code}</td>
                <td className="p-2">{item.location}</td>
                <td className="p-2">{item.location_type}</td>

                <td className="p-2 text-xs">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "-"}
                </td>

                <td className="p-2 text-center">
                  <button
                    onClick={() => deleteLocation(item.id)}
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