"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftCircle } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

interface PackingItem {
  id: number;
  order_no: string;
  sku: string;
  deskripsi?: string | null;
  qty_picked: number;
  qty_packed?: number;
  qty_packed_by?: string;
}

export default function PackingPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = params.orderNo as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");

  const [items, setItems] = useState<PackingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [scanSku, setScanSku] = useState("");
  const [cartonNo, setCartonNo] = useState("");
  const [packQty, setPackQty] = useState("");
  const [weight, setWeight] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================
  useEffect(() => {
    if (orderNo) {
      loadData();
    }
  }, [orderNo]);

  async function loadData() {
    try {
      setLoading(true);

      // =====================================================
      // HEADER ORDER
      // =====================================================
      const {
        data: header,
        error: headerError,
      } = await supabase
        .from("order_header")
        .select("customer_name")
        .eq("order_no", orderNo)
        .single();

      if (headerError) {
        alert(headerError.message);
        return;
      }

      setCustomerName(header?.customer_name || "");

      // =====================================================
      // PICKING
      // =====================================================
      const {
        data: pickingData,
        error: pickingError,
      } = await supabase
        .from("picking")
        .select("*")
        .eq("order_no", orderNo)
        .order("location", {
          ascending: true,
        });

      if (pickingError) {
        alert(pickingError.message);
        return;
      }

      // =====================================================
      // PACKING
      // =====================================================
      const {
        data: packingData,
        error: packingError,
      } = await supabase
        .from("packing")
        .select("sku, qty")
        .eq("order_no", orderNo);

      if (packingError) {
        alert(packingError.message);
        return;
      }

      // =====================================================
      // HITUNG TOTAL PACKING PER SKU
      // =====================================================
      const packedBySku: Record<string, number> = {};

      (packingData || []).forEach((packing: any) => {
        const sku = String(packing.sku || "")
          .trim()
          .toUpperCase();

        if (!sku) return;

        packedBySku[sku] =
          (packedBySku[sku] || 0) +
          Number(packing.qty || 0);
      });

      // =====================================================
      // GABUNG PICKING + PACKING
      // =====================================================
      const result: PackingItem[] =
        (pickingData || []).map((item: any) => {
          const sku = String(item.sku || "")
            .trim()
            .toUpperCase();

          const qtyPicked = Number(
            item.qty_picked || 0
          );

          const qtyPacked =
            packedBySku[sku] || 0;

          return {
            id: Number(item.id),
            order_no: item.order_no || orderNo,
            sku: item.sku || "",
            deskripsi:
              item.deskripsi ||
              item.description ||
              "",
            qty_picked: qtyPicked,
            qty_packed: qtyPacked,
          };
        });

      // =====================================================
      // HANYA ITEM YANG BELUM SELESAI
      // =====================================================
      const remaining = result.filter(
        (item) => {
          const qtyPicked = Number(
            item.qty_picked || 0
          );

          const qtyPacked = Number(
            item.qty_packed || 0
          );

          return qtyPacked < qtyPicked;
        }
      );

      setItems(remaining);

      setCurrentIndex((prev) => {
        if (remaining.length === 0) {
          return 0;
        }

        return Math.min(
          prev,
          remaining.length - 1
        );
      });
    } catch (err) {
      console.error(err);

      alert(
        "Terjadi kesalahan saat mengambil data."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CURRENT ITEM
  // =====================================================
  const currentItem = items[currentIndex];

  // =====================================================
  // CARI SKU DARI INPUT SCAN
  // =====================================================
  const scannedItem = scanSku.trim()
    ? items.find(
        (item) =>
          item.sku
            .trim()
            .toUpperCase() ===
          scanSku
            .trim()
            .toUpperCase()
      )
    : null;

  // =====================================================
  // DATA OTOMATIS SKU
  // =====================================================
  const displayDescription =
    scannedItem?.deskripsi || "";

  const displayQtyPicked = Number(
    scannedItem?.qty_picked || 0
  );

  const displayQtyPacked = Number(
    scannedItem?.qty_packed || 0
  );

  const displayQtySisa =
    displayQtyPicked -
    displayQtyPacked;

  // =====================================================
  // CONFIRM PACKING
  // =====================================================
  async function confirmPacking() {
    if (!currentItem) return;

    if (saving) return;

    setSaving(true);

    try {
      // =====================================================
      // VALIDASI SKU
      // =====================================================
      const enteredSku = scanSku
        .trim()
        .toUpperCase();

      const requiredSku = currentItem.sku
        .trim()
        .toUpperCase();

      if (enteredSku !== requiredSku) {
        alert(
          `SKU salah!\n\nHarus : ${currentItem.sku}`
        );

        return;
      }

      // =====================================================
      // VALIDASI QTY
      // =====================================================
      const qty = Number(packQty);

      if (!packQty.trim() || qty <= 0) {
        alert(
          "Qty harus lebih besar dari 0"
        );

        return;
      }

      const alreadyPacked = Number(
        currentItem.qty_packed || 0
      );

      const qtyPicked = Number(
        currentItem.qty_picked || 0
      );

      const qtySisa =
        qtyPicked - alreadyPacked;

      if (qty > qtySisa) {
        alert(
          `Qty melebihi Qty Sisa.\n\n` +
            `Qty Picked : ${qtyPicked}\n` +
            `Sudah Packing : ${alreadyPacked}\n` +
            `Qty Sisa : ${qtySisa}`
        );

        return;
      }

      // =====================================================
      // VALIDASI CARTON
      // =====================================================
      if (!cartonNo.trim()) {
        alert(
          "Carton No wajib diisi"
        );

        return;
      }

      // =====================================================
      // BERAT OPSIONAL
      // =====================================================
      const weightValue =
        weight.trim() === ""
          ? null
          : Number(weight);

      if (
        weightValue !== null &&
        weightValue <= 0
      ) {
        alert(
          "Berat harus lebih besar dari 0"
        );

        return;
      }

      // =====================================================
      // SIMPAN PACKING
      // =====================================================
      const { error } = await supabase
        .from("packing")
        .insert({
          order_no:
            currentItem.order_no,

          customer_name:
            customerName,

          sku:
            currentItem.sku,

          deskripsi:
            currentItem.deskripsi ||
            null,

          qty:
            qty,

          carton:
            cartonNo.trim(),

          weight:
            weightValue,

          packing_at:
            new Date().toISOString(),
        });

      if (error) {
        alert(error.message);
        return;
      }

      // =====================================================
      // SKU YANG BARU DIPACKING
      // =====================================================
      const confirmedSku =
        currentItem.sku
          .trim()
          .toUpperCase();

      // =====================================================
      // RESET FORM
      // =====================================================
      setScanSku("");
      setCartonNo("");
      setPackQty("");
      setWeight("");

      // =====================================================
      // REFRESH
      // =====================================================
      await refreshAfterPacking(
        confirmedSku
      );
    } catch (err) {
      console.error(err);

      alert(
        "Terjadi kesalahan saat menyimpan packing."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // REFRESH AFTER PACKING
  // =====================================================
  async function refreshAfterPacking(
    confirmedSku: string
  ) {
    try {
      setLoading(true);

      // =====================================================
      // PICKING
      // =====================================================
      const {
        data: pickingData,
        error: pickingError,
      } = await supabase
        .from("picking")
        .select("*")
        .eq("order_no", orderNo)
        .order("location", {
          ascending: true,
        });

      if (pickingError) {
        alert(pickingError.message);
        return;
      }

      // =====================================================
      // PACKING
      // =====================================================
      const {
        data: packingData,
        error: packingError,
      } = await supabase
        .from("packing")
        .select("sku, qty")
        .eq("order_no", orderNo);

      if (packingError) {
        alert(packingError.message);
        return;
      }

      // =====================================================
      // TOTAL PACKING PER SKU
      // =====================================================
      const packedBySku: Record<string, number> = {};

      (packingData || []).forEach(
        (packing: any) => {
          const sku = String(
            packing.sku || ""
          )
            .trim()
            .toUpperCase();

          if (!sku) return;

          packedBySku[sku] =
            (packedBySku[sku] || 0) +
            Number(packing.qty || 0);
        }
      );

      // =====================================================
      // GABUNGKAN
      // =====================================================
      const result: PackingItem[] =
        (pickingData || []).map(
          (item: any) => {
            const sku = String(
              item.sku || ""
            )
              .trim()
              .toUpperCase();

            const qtyPicked = Number(
              item.qty_picked || 0
            );

            const qtyPacked =
              packedBySku[sku] || 0;

            return {
              id: Number(item.id),
              order_no:
                item.order_no ||
                orderNo,
              sku:
                item.sku || "",
              deskripsi:
                item.deskripsi ||
                item.description ||
                "",
              qty_picked:
                qtyPicked,
              qty_packed:
                qtyPacked,
            };
          }
        );

      // =====================================================
      // ITEM YANG BELUM SELESAI
      // =====================================================
      const remaining =
        result.filter((item) => {
          const qtyPicked =
            Number(
              item.qty_picked || 0
            );

          const qtyPacked =
            Number(
              item.qty_packed || 0
            );

          return (
            qtyPacked < qtyPicked
          );
        });

      setItems(remaining);

      // =====================================================
      // ITEM YANG SAMA MASIH ADA SISA
      // =====================================================
      const sameItemIndex =
        remaining.findIndex(
          (item) =>
            item.sku
              .trim()
              .toUpperCase() ===
            confirmedSku
        );

      if (sameItemIndex !== -1) {
        setCurrentIndex(
          sameItemIndex
        );
      } else if (
        remaining.length > 0
      ) {
        setCurrentIndex((prev) =>
          Math.min(
            prev,
            remaining.length - 1
          )
        );
      } else {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);

      alert(
        "Gagal memperbarui data packing."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FINISH PACKING
  // =====================================================
  async function finishPacking() {
    try {
      setSaving(true);

      // =====================================================
      // PICKING
      // =====================================================
      const {
        data: pickingData,
        error: pickingError,
      } = await supabase
        .from("picking")
        .select(
          "sku, qty_picked"
        )
        .eq("order_no", orderNo);

      if (pickingError) {
        alert(pickingError.message);
        return;
      }

      // =====================================================
      // PACKING
      // =====================================================
      const {
        data: packedData,
        error: packedError,
      } = await supabase
        .from("packing")
        .select("sku, qty")
        .eq("order_no", orderNo);

      if (packedError) {
        alert(packedError.message);
        return;
      }

      // =====================================================
      // TOTAL PACKING PER SKU
      // =====================================================
      const packedBySku: Record<string, number> = {};

      (packedData || []).forEach(
        (item: any) => {
          const sku = String(
            item.sku || ""
          )
            .trim()
            .toUpperCase();

          if (!sku) return;

          packedBySku[sku] =
            (packedBySku[sku] || 0) +
            Number(item.qty || 0);
        }
      );

      // =====================================================
      // CEK SEMUA ITEM
      // =====================================================
      const belumSelesai: string[] =
        [];

      (pickingData || []).forEach(
        (item: any) => {
          const sku = String(
            item.sku || ""
          )
            .trim()
            .toUpperCase();

          const qtyPicked = Number(
            item.qty_picked || 0
          );

          const qtyPacked =
            packedBySku[sku] || 0;

          if (
            qtyPacked < qtyPicked
          ) {
            belumSelesai.push(
              `${sku}: sisa ${
                qtyPicked -
                qtyPacked
              }`
            );
          }
        }
      );

      // =====================================================
      // BELUM SELESAI
      // =====================================================
      if (
        belumSelesai.length > 0
      ) {
        alert(
          "Masih ada item yang belum selesai dipacking.\n\n" +
            belumSelesai.join("\n")
        );

        return;
      }

      // =====================================================
      // UPDATE STATUS
      // =====================================================
      const {
        error: updateError,
      } = await supabase
        .from("order_header")
        .update({
          status: "PACKED",
        })
        .eq("order_no", orderNo);

      if (updateError) {
        alert(updateError.message);
        return;
      }

      alert(
        "Packing Complete"
      );

      router.push(
        "/outbound/packing"
      );
    } catch (err) {
      console.error(err);

      alert(
        "Terjadi kesalahan saat menyelesaikan packing."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // PROGRESS
  // =====================================================
  const progress =
    items.length > 0
      ? Math.round(
          ((currentIndex + 1) /
            items.length) *
            100
        )
      : 100;

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Packing Order
          </h1>

          <p className="text-gray-500">
            Picklist : {orderNo}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              router.back()
            }
            className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            <ArrowLeftCircle
              size={20}
            />

            <span>Back</span>
          </button>

          <button
            onClick={
              finishPacking
            }
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving
              ? "Processing..."
              : "Finish Packing"}
          </button>
        </div>
      </div>

      {/* =================================================
          PROGRESS
      ================================================= */}
      <div className="bg-white p-4 rounded shadow mb-5">
        <div className="flex justify-between">
          <div>
            Progress :{" "}
            {items.length === 0
              ? 0
              : currentIndex + 1}
            {" / "}
            {items.length}
          </div>

          <div>
            {progress}%
          </div>
        </div>

        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* =================================================
          CONTENT
      ================================================= */}
      {loading ? (
        <div className="bg-white rounded shadow p-10">
          Loading...
        </div>
      ) : !currentItem ? (
        <div className="bg-white rounded shadow p-10 text-center">
          <h2 className="text-xl font-bold text-green-600">
            Semua Item Sudah Dipacking
          </h2>

          <p className="mt-2">
            Klik Finish Packing untuk
            menyelesaikan Order.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded shadow p-6">
          {/* =================================================
              SCAN SKU
          ================================================= */}
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Scan Product / SKU
            </label>

            <input
              value={scanSku}
              onChange={(e) =>
                setScanSku(
                  e.target.value
                )
              }
              className="border rounded p-2 w-full"
              placeholder="Scan SKU"
              disabled={saving}
              autoFocus
            />
          </div>

          {/* =================================================
              DETAIL SKU OTOMATIS
          ================================================= */}
          {scanSku.trim() && (
            <div className="mb-5 rounded-lg border bg-slate-50 p-4">
              {scannedItem ? (
                <>
                  <div className="mb-3 text-sm font-semibold text-gray-500">
                    DETAIL PRODUCT
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        SKU
                      </label>

                      <div className="text-lg font-bold text-blue-600">
                        {
                          scannedItem.sku
                        }
                      </div>
                    </div>

                    {/* DESKRIPSI */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Deskripsi
                      </label>

                      <div className="font-medium">
                        {scannedItem.deskripsi ||
                          "-"}
                      </div>
                    </div>

                    {/* QTY DIBUTUHKAN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Quantity Dibutuhkan
                      </label>

                      <div className="text-lg font-bold">
                        {
                          scannedItem.qty_picked
                        }
                      </div>
                    </div>

                    {/* QTY SUDAH PACKING */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Qty Sudah Packing
                      </label>

                      <div className="font-bold text-green-600">
                        {
                          scannedItem.qty_packed ||
                          0
                        }
                      </div>
                    </div>

                    {/* QTY SISA */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Qty Sisa
                      </label>

                      <div className="text-lg font-bold text-red-600">
                        {Number(
                          scannedItem.qty_picked
                        ) -
                          Number(
                            scannedItem.qty_packed ||
                              0
                          )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-red-600 font-medium">
                  SKU tidak ditemukan dalam
                  Picklist
                </div>
              )}
            </div>
          )}

          {/* =================================================
              DESKRIPSI
          ================================================= */}
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Deskripsi
            </label>

            <input
              value={
                scannedItem
                  ? displayDescription
                  : ""
              }
              readOnly
              className="border rounded p-2 w-full bg-gray-100"
              placeholder="Deskripsi otomatis berdasarkan SKU"
            />
          </div>

          {/* =================================================
              QUANTITY DIBUTUHKAN
          ================================================= */}
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Quantity Dibutuhkan
            </label>

            <input
              value={
                scannedItem
                  ? displayQtyPicked
                  : ""
              }
              readOnly
              className="border rounded p-2 w-full bg-gray-100"
              placeholder="Quantity otomatis berdasarkan SKU"
            />
          </div>

          {/* =================================================
              CARTON
          ================================================= */}
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Carton No
            </label>

            <input
              value={cartonNo}
              onChange={(e) =>
                setCartonNo(
                  e.target.value
                )
              }
              className="border rounded p-2 w-full"
              placeholder="Contoh : CTN001"
              disabled={saving}
            />
          </div>

          {/* =================================================
              QTY PACKING
          ================================================= */}
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Qty Packing
            </label>

            <input
              type="number"
              min="1"
              value={packQty}
              onChange={(e) =>
                setPackQty(
                  e.target.value
                )
              }
              className="border rounded p-2 w-full"
              disabled={saving}
              placeholder={
                scannedItem
                  ? `Maksimal ${displayQtySisa}`
                  : "Masukkan Qty"
              }
            />

            {scannedItem && (
              <p className="text-sm text-gray-500 mt-1">
                Qty maksimal yang dapat
                dipacking:{" "}
                <span className="font-bold">
                  {displayQtySisa}
                </span>
              </p>
            )}
          </div>

          {/* =================================================
              BERAT
          ================================================= */}
          <div className="mb-6">
            <label className="block mb-2 font-semibold">
              Berat (Kg)
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={weight}
              onChange={(e) =>
                setWeight(
                  e.target.value
                )
              }
              className="border rounded p-2 w-full"
              placeholder="Opsional"
              disabled={saving}
            />
          </div>

          {/* =================================================
              CONFIRM
          ================================================= */}
          <button
            onClick={
              confirmPacking
            }
            disabled={
              saving ||
              !scanSku.trim() ||
              !scannedItem
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Confirm Packing"}
          </button>
        </div>
      )}
    </div>
  );
}