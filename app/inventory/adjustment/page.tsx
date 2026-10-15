
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  ClipboardList,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type InventoryRow = {
  id: string; // UUID, bukan number
  sku: string;
  deskripsi: string;
  quantity: number;
  location: string;
  created_at?: string;
};

type AdjustmentType = "IN" | "OUT";

type AdjustmentRow = {
  id: number | string;
  inventory_id: string; // UUID, bukan number
  adjustment_type: AdjustmentType;
  quantity: number;
  qty_before: number;
  qty_after: number;
  reason: string;
  notes: string | null;
  created_at: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdjustmentPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [history, setHistory] = useState<AdjustmentRow[]>([]);

  // UUID disimpan sebagai string.
  const [inventoryId, setInventoryId] = useState("");
  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("IN");

  const [quantityInput, setQuantityInput] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [searchItem, setSearchItem] = useState("");
  const [searchHistory, setSearchHistory] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const quantity = Number(quantityInput);

  const selectedItem = useMemo(
    () => inventory.find((item) => item.id === inventoryId),
    [inventory, inventoryId]
  );

  const inventoryById = useMemo(
    () => new Map(inventory.map((item) => [item.id, item])),
    [inventory]
  );

  const filteredInventory = useMemo(() => {
    const keyword = searchItem.trim().toLowerCase();

    if (!keyword) return inventory;

    return inventory.filter((item) =>
      [
        item.sku,
        item.deskripsi,
        item.location,
      ].some((value) => value?.toLowerCase().includes(keyword))
    );
  }, [inventory, searchItem]);

  const filteredHistory = useMemo(() => {
    const keyword = searchHistory.trim().toLowerCase();

    if (!keyword) return history;

    return history.filter((row) => {
      const item = inventoryById.get(row.inventory_id);

      return [
        item?.sku,
        item?.deskripsi,
        item?.location,
        row.adjustment_type,
        row.reason,
        row.notes ?? "",
      ].some((value) => value?.toLowerCase().includes(keyword));
    });
  }, [history, inventoryById, searchHistory]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [inventoryResult, historyResult] = await Promise.all([
        supabase
          .from("inventory")
          .select("id, sku, deskripsi, quantity, location, created_at")
          .order("sku", { ascending: true }),

        supabase
          .from("inventory_adjustments")
          .select(
            "id, inventory_id, adjustment_type, quantity, qty_before, qty_after, reason, notes, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (inventoryResult.error) {
        throw new Error(
          `Gagal mengambil inventory: ${inventoryResult.error.message}`
        );
      }

      if (historyResult.error) {
        throw new Error(
          `Gagal mengambil riwayat adjustment: ${historyResult.error.message}`
        );
      }

      const inventoryData = (inventoryResult.data ?? []) as InventoryRow[];
      const historyData = (historyResult.data ?? []) as AdjustmentRow[];

      setInventory(inventoryData);
      setHistory(historyData);

      // Pilih item pertama jika item sebelumnya tidak lagi tersedia.
      setInventoryId((currentId) => {
        if (inventoryData.some((item) => item.id === currentId)) {
          return currentId;
        }

        return inventoryData[0]?.id ?? "";
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memuat data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const qtyBefore = Number(selectedItem?.quantity ?? 0);

  const qtyAfter =
    adjustmentType === "IN"
      ? qtyBefore + quantity
      : qtyBefore - quantity;

  const canSubmit =
    Boolean(selectedItem) &&
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    Boolean(reason.trim()) &&
    (adjustmentType === "IN" || qtyAfter >= 0) &&
    !saving;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedItem) {
      setErrorMessage("Silakan pilih item inventory.");
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setErrorMessage("Quantity harus berupa bilangan bulat lebih dari 0.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("Alasan adjustment wajib diisi.");
      return;
    }

    if (adjustmentType === "OUT" && quantity > qtyBefore) {
      setErrorMessage(
        "Quantity OUT melebihi stok saat ini. Periksa kembali quantity."
      );
      return;
    }

    const confirmed = window.confirm(
      [
        `Konfirmasi Adjustment ${adjustmentType}`,
        "",
        `SKU: ${selectedItem.sku}`,
        `Lokasi: ${selectedItem.location}`,
        `Quantity adjustment: ${formatNumber(quantity)}`,
        `Stok sebelum: ${formatNumber(qtyBefore)}`,
        `Stok setelah: ${formatNumber(qtyAfter)}`,
        "",
        "Lanjutkan proses adjustment?",
      ].join("\n")
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      // inventoryId adalah UUID string.
      // Nama parameter harus sama persis dengan SQL function.
      const { error } = await supabase.rpc(
        "create_inventory_adjustment",
        {
          p_inventory_id: selectedItem.id,
          p_adjustment_type: adjustmentType,
          p_quantity: quantity,
          p_reason: reason.trim(),
          p_notes: notes.trim() || null,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage(
        `Adjustment ${adjustmentType} berhasil disimpan untuk SKU ${selectedItem.sku}.`
      );

      setReason("");
      setNotes("");
      setQuantityInput("1");

      // Memuat ulang stok terbaru dan riwayat adjustment.
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Adjustment gagal disimpan."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/system"
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-blue-600"
            >
              <ArrowLeft size={17} />
              Kembali
            </Link>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Inventory Adjustment
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Tambah atau kurangi stok inventory dan simpan riwayat
              perubahannya.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Data
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">Terjadi kesalahan</p>
            <p className="mt-1 break-words">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {successMessage}
          </div>
        )}

        {/* Adjustment Form */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ClipboardList size={22} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Form Adjustment
              </h2>
              <p className="text-sm text-gray-500">
                Pilih item, tipe adjustment, quantity, dan alasan.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Adjustment Type */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Tipe Adjustment
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType("IN")}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    adjustmentType === "IN"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-100"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <ArrowDownCircle
                    size={25}
                    className="rotate-180 text-green-600"
                  />
                  <div>
                    <p className="font-semibold text-green-700">
                      Adjustment IN
                    </p>
                    <p className="text-xs text-gray-500">
                      Menambah quantity inventory
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentType("OUT")}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    adjustmentType === "OUT"
                      ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <ArrowUpCircle
                    size={25}
                    className="rotate-180 text-red-600"
                  />
                  <div>
                    <p className="font-semibold text-red-700">
                      Adjustment OUT
                    </p>
                    <p className="text-xs text-gray-500">
                      Mengurangi quantity inventory
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Item Selection */}
            <div>
              <label
                htmlFor="item-search"
                className="mb-2 block text-sm font-medium"
              >
                Cari Item Inventory
              </label>

              <div className="relative mb-2">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="item-search"
                  type="text"
                  value={searchItem}
                  onChange={(event) => setSearchItem(event.target.value)}
                  placeholder="Cari SKU, deskripsi, atau lokasi..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <label
                htmlFor="inventory-id"
                className="mb-2 block text-sm font-medium"
              >
                Pilih SKU / Item
              </label>

              <select
                id="inventory-id"
                value={inventoryId}
                onChange={(event) => setInventoryId(event.target.value)}
                className={inputClass}
                required
                disabled={loading || filteredInventory.length === 0}
              >
                {filteredInventory.length === 0 ? (
                  <option value="">Tidak ada item ditemukan</option>
                ) : (
                  filteredInventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} — {item.deskripsi} | {item.location} |
                      Stok: {formatNumber(Number(item.quantity))}
                    </option>
                  ))
                )}
              </select>

              {selectedItem && (
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">SKU</p>
                    <p className="mt-1 break-words font-semibold">
                      {selectedItem.sku}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Deskripsi</p>
                    <p className="mt-1 break-words font-medium">
                      {selectedItem.deskripsi}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Lokasi</p>
                    <p className="mt-1 font-medium">
                      {selectedItem.location}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label
                htmlFor="quantity"
                className="mb-2 block text-sm font-medium"
              >
                Quantity Adjustment
              </label>

              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
                className={inputClass}
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                Masukkan jumlah unit yang ingin ditambahkan atau dikurangi.
              </p>
            </div>

            {/* Stock Preview */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Stok Sebelum</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatNumber(qtyBefore)}
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  adjustmentType === "IN"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-sm text-gray-500">
                  {adjustmentType === "IN" ? "Stok Ditambahkan" : "Stok Dikurangi"}
                </p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    adjustmentType === "IN"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {adjustmentType === "IN" ? "+" : "-"}
                  {formatNumber(Number.isFinite(quantity) ? quantity : 0)}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-gray-500">Perkiraan Stok Akhir</p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    qtyAfter < 0 ? "text-red-700" : "text-blue-700"
                  }`}
                >
                  {formatNumber(Number.isFinite(qtyAfter) ? qtyAfter : 0)}
                </p>
              </div>
            </div>

            {adjustmentType === "OUT" &&
              Number.isFinite(quantity) &&
              quantity > qtyBefore && (
                <p className="text-sm text-red-600">
                  Quantity OUT tidak boleh melebihi stok saat ini.
                </p>
              )}

            {/* Reason */}
            <div>
              <label
                htmlFor="reason"
                className="mb-2 block text-sm font-medium"
              >
                Alasan Adjustment
              </label>

              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Contoh: Koreksi hasil stock opname"
                maxLength={500}
                className={inputClass}
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium"
              >
                Catatan Tambahan (Opsional)
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Tambahkan detail jika diperlukan..."
                rows={3}
                maxLength={2000}
                className={inputClass}
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setReason("");
                  setNotes("");
                  setQuantityInput("1");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  adjustmentType === "IN"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <Save size={17} />
                {saving
                  ? "Menyimpan..."
                  : `Simpan Adjustment ${adjustmentType}`}
              </button>
            </div>
          </form>
        </section>

        {/* History */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">
                Riwayat Adjustment
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Maksimal 200 transaksi terbaru ditampilkan.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchHistory}
                onChange={(event) => setSearchHistory(event.target.value)}
                placeholder="Cari SKU, lokasi, atau alasan..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Memuat data inventory dan riwayat...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-xl bg-gray-50 px-4 py-12 text-center text-sm text-gray-500">
              Belum ada riwayat adjustment atau tidak ada data yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3">Lokasi</th>
                    <th className="px-4 py-3">Tipe</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Sebelum</th>
                    <th className="px-4 py-3 text-right">Sesudah</th>
                    <th className="px-4 py-3">Alasan / Catatan</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((row) => {
                    const item = inventoryById.get(row.inventory_id);

                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatDate(row.created_at)}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {item?.sku ?? "-"}
                        </td>

                        <td className="max-w-xs px-4 py-3">
                          <span className="line-clamp-2">
                            {item?.deskripsi ?? "-"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {item?.location ?? "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.adjustment_type === "IN"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {row.adjustment_type}
                          </span>
                        </td>

                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            row.adjustment_type === "IN"
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {row.adjustment_type === "IN" ? "+" : "-"}
                          {formatNumber(Number(row.quantity))}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatNumber(Number(row.qty_before))}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {formatNumber(Number(row.qty_after))}
                        </td>

                        <td className="max-w-xs px-4 py-3">
                          <p className="font-medium">{row.reason}</p>
                          {row.notes && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-gray-500">
                              {row.notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">
            Data yang tampil: {formatNumber(filteredHistory.length)} transaksi.
          </p>
        </section>
      </div>
    </main>
  );
}
