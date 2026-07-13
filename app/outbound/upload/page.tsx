"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { supabase } from "../../../lib/supabase";

export default function UploadOrderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const [manualForm, setManualForm] = useState({
    order_no: "",
    customer: "",
    sku: "",
    item_name: "",
    qty: "",
  });

  const downloadTemplate = () => {
    const templateData = [
      {
        order_no: "SO001",
        customer: "PT ABC",
        sku: "SKU001",
        item_name: "Produk A",
        qty: 10,
      },
      {
        order_no: "SO001",
        customer: "PT ABC",
        sku: "SKU002",
        item_name: "Produk B",
        qty: 5,
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(templateData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Orders"
    );

    XLSX.writeFile(
      workbook,
      "Template_Order_Upload.xlsx"
    );
  };

  const uploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = e.target.files?.[0];

      if (!file) return;

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const sheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[sheetName];

      const data: any[] =
        XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        alert("File kosong");
        return;
      }

      setRows(data);

      alert(
        `${data.length} baris berhasil dimuat`
      );
    } catch (error) {
      console.error(error);
      alert("Gagal membaca file");
    }
  };

  const addManualRow = () => {
    if (
      !manualForm.order_no.trim() ||
      !manualForm.sku.trim() ||
      !manualForm.item_name.trim()
    ) {
      alert(
        "Order No, SKU dan Item Name wajib diisi"
      );
      return;
    }

    setRows((prev) => [
      ...prev,
      {
        order_no: manualForm.order_no,
        customer: manualForm.customer,
        sku: manualForm.sku,
        item_name: manualForm.item_name,
        qty: Number(manualForm.qty || 0),
      },
    ]);

    setManualForm({
      order_no: "",
      customer: "",
      sku: "",
      item_name: "",
      qty: "",
    });
  };

  const removeRow = (index: number) => {
    setRows(
      rows.filter((_, i) => i !== index)
    );
  };

  const saveOrders = async () => {
    try {
      if (rows.length === 0) {
        alert("Tidak ada data");
        return;
      }

      setLoading(true);

      for (const row of rows) {
        const orderNo = String(
          row.order_no || ""
        ).trim();

        if (!orderNo) continue;

        const { data: existingOrder } =
          await supabase
            .from("order_header")
            .select("order_no")
            .eq("order_no", orderNo)
            .maybeSingle();

        if (!existingOrder) {
          const { error: headerError } =
            await supabase
              .from("order_header")
              .insert({
                order_no: orderNo,
                customer_name:
                  row.customer || "",
                status: "NEW",
              });

          if (headerError) {
            console.error(
              "Header Error:",
              headerError
            );
            continue;
          }
        }

        const { error: detailError } =
          await supabase
            .from("order_detail")
            .insert({
              order_no: orderNo,
              sku: row.sku || "",
              item_name:
                row.item_name || "",
              qty_order: Number(
                row.qty || 0
              ),
            });

        if (detailError) {
          console.error(
            "Detail Error:",
            detailError
          );
        }
      }

      alert("Order berhasil disimpan");

      setRows([]);
    } catch (error) {
      console.error(error);
      alert("Gagal simpan order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Upload Orders
        </h1>

        <button
          onClick={() => router.back()}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          ← Back
        </button>
      </div>

      {/* Input Manual */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">
          Input Order Manual
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Order No"
            value={manualForm.order_no}
            onChange={(e) =>
              setManualForm({
                ...manualForm,
                order_no: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            type="text"
            placeholder="Customer"
            value={manualForm.customer}
            onChange={(e) =>
              setManualForm({
                ...manualForm,
                customer: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            type="text"
            placeholder="SKU"
            value={manualForm.sku}
            onChange={(e) =>
              setManualForm({
                ...manualForm,
                sku: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            type="text"
            placeholder="Item Name"
            value={manualForm.item_name}
            onChange={(e) =>
              setManualForm({
                ...manualForm,
                item_name: e.target.value,
              })
            }
            className="border rounded p-2"
          />

          <input
            type="number"
            placeholder="Qty"
            value={manualForm.qty}
            onChange={(e) =>
              setManualForm({
                ...manualForm,
                qty: e.target.value,
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addManualRow();
              }
            }}
            className="border rounded p-2"
          />
        </div>

        <button
          onClick={addManualRow}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          + Tambah ke List
        </button>
      </div>

      {/* Upload Excel */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={downloadTemplate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Download Template
          </button>

          <button
            onClick={saveOrders}
            disabled={
              loading || rows.length === 0
            }
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading
              ? "Saving..."
              : "Simpan Order"}
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <label className="block mb-3 font-medium">
            Upload File Excel
          </label>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={uploadFile}
            disabled={loading}
            className="block w-full border rounded p-2"
          />

          <p className="text-sm text-gray-500 mt-3">
            Gunakan template yang telah
            disediakan.
          </p>
        </div>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold text-lg">
              Preview Order
            </h2>

            <div className="font-semibold">
              Total Data : {rows.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2">
                    Order No
                  </th>
                  <th className="border p-2">
                    Customer
                  </th>
                  <th className="border p-2">
                    SKU
                  </th>
                  <th className="border p-2">
                    Item Name
                  </th>
                  <th className="border p-2">
                    Qty
                  </th>
                  <th className="border p-2">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50"
                  >
                    <td className="border p-2">
                      {row.order_no}
                    </td>

                    <td className="border p-2">
                      {row.customer}
                    </td>

                    <td className="border p-2">
                      {row.sku}
                    </td>

                    <td className="border p-2">
                      {row.item_name}
                    </td>

                    <td className="border p-2 text-center">
                      {row.qty}
                    </td>

                    <td className="border p-2 text-center">
                      <button
                        onClick={() =>
                          removeRow(index)
                        }
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}