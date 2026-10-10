
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  CheckCircle2,
  PackageCheck,
  ScanLine,
  RefreshCw,
  Clock3,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";

// =====================================================
// TYPES
// =====================================================

interface PickingRow {
  id: number;
  order_no: string;
  sku: string;
  location?: string | null;
  qty_picked: number;
  deskripsi?: string | null;
}

interface ProductRow {
  sku: string;
  deskripsi?: string | null;
}

interface PackingRow {
  sku: string;
  qty: number;
}

interface AllocationRow {
  sku: string;
  qty_allocated: number;
  qty_picked: number;
}

interface PackingItem {
  sku: string;
  deskripsi: string;
  qty_required: number;
  qty_picked: number;
  qty_packed: number;
}

// =====================================================
// HELPERS
// =====================================================

function normalizeSku(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// =====================================================
// PAGE
// =====================================================

export default function PackingPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = String(params.orderNo || "");

  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");

  const [items, setItems] = useState<PackingItem[]>([]);

  const [selectedSku, setSelectedSku] = useState("");
  const [scanSku, setScanSku] = useState("");
  const [skuValidated, setSkuValidated] = useState(false);

  const [cartonNo, setCartonNo] = useState("");
  const [packQty, setPackQty] = useState("");
  const [weight, setWeight] = useState("");

  const [pickingComplete, setPickingComplete] = useState(false);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalPicked, setTotalPicked] = useState(0);
  const [totalPacked, setTotalPacked] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadingRef = useRef(false);

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!orderNo || loadingRef.current) return;

      loadingRef.current = true;

      try {
        if (showLoading) setLoading(true);

        // CUSTOMER
        const {
          data: orderHeader,
          error: orderError,
        } = await supabase
          .from("order_header")
          .select("customer_name")
          .eq("order_no", orderNo)
          .maybeSingle();

        if (orderError) {
          console.error("Load order error:", orderError);
        }

        setCustomerName(orderHeader?.customer_name || "");

        // PRODUCT: SUMBER DESKRIPSI SAJA
        const {
          data: productData,
          error: productError,
        } = await supabase
          .from("product")
          .select("sku, deskripsi");

        if (productError) {
          console.error("Load product error:", productError);
        }

        const productMap = new Map<string, string>();

        (productData || []).forEach((product: ProductRow) => {
          const sku = normalizeSku(product.sku);
          if (!sku) return;

          productMap.set(
            sku,
            String(product.deskripsi || "").trim()
          );
        });

        // =================================================
        // ALLOCATION
        // SUMBER UTAMA KEBUTUHAN QTY ORDER
        // =================================================

        const {
          data: allocationData,
          error: allocationError,
        } = await supabase
          .from("allocation")
          .select("sku, qty_allocated, qty_picked")
          .eq("order_no", orderNo);

        if (allocationError) {
          console.error("Load allocation error:", allocationError);
          setItems([]);
          return;
        }

        const allocationRows: AllocationRow[] =
          allocationData || [];

        let allocatedTotal = 0;
        let pickedAllocationTotal = 0;

        allocationRows.forEach((row) => {
          allocatedTotal += toNumber(row.qty_allocated);
          pickedAllocationTotal += toNumber(row.qty_picked);
        });

        setTotalAllocated(allocatedTotal);
        setTotalPicked(pickedAllocationTotal);

        setPickingComplete(
          allocationRows.length > 0 &&
            allocationRows.every(
              (row) =>
                toNumber(row.qty_picked) >=
                toNumber(row.qty_allocated)
            )
        );

        // PICKING: JUMLAH YANG SUDAH DIPICK
        const {
          data: pickingData,
          error: pickingError,
        } = await supabase
          .from("picking")
          .select("id, order_no, sku, location, qty_picked, deskripsi")
          .eq("order_no", orderNo)
          .order("id", { ascending: true });

        if (pickingError) {
          console.error("Load picking error:", pickingError);
          setItems([]);
          return;
        }

        // PACKING: JUMLAH YANG SUDAH DIPACK
        const {
          data: packingData,
          error: packingError,
        } = await supabase
          .from("packing")
          .select("sku, qty")
          .eq("order_no", orderNo);

        if (packingError) {
          console.error("Load packing error:", packingError);
          setItems([]);
          return;
        }

        // =================================================
        // GROUP ALLOCATION BY SKU
        // =================================================

        const requiredBySku = new Map<string, number>();

        allocationRows.forEach((row) => {
          const sku = normalizeSku(row.sku);
          if (!sku) return;

          requiredBySku.set(
            sku,
            (requiredBySku.get(sku) || 0) +
              toNumber(row.qty_allocated)
          );
        });

        // =================================================
        // GROUP PICKING BY SKU
        // =================================================

        const pickedBySku = new Map<string, number>();

        (pickingData || []).forEach((row: PickingRow) => {
          if (
            String(row.order_no || "").trim() !==
            orderNo.trim()
          ) {
            return;
          }

          const sku = normalizeSku(row.sku);
          if (!sku) return;

          pickedBySku.set(
            sku,
            (pickedBySku.get(sku) || 0) +
              toNumber(row.qty_picked)
          );

          const description = String(
            row.deskripsi || ""
          ).trim();

          if (description && !productMap.get(sku)) {
            productMap.set(sku, description);
          }
        });

        // =================================================
        // GROUP PACKING BY SKU
        // =================================================

        const packedBySku = new Map<string, number>();

        (packingData || []).forEach((row: PackingRow) => {
          const sku = normalizeSku(row.sku);
          if (!sku) return;

          packedBySku.set(
            sku,
            (packedBySku.get(sku) || 0) +
              toNumber(row.qty)
          );
        });

        // =================================================
        // BUILD ITEMS
        // SKU DAN QTY DARI SELURUH KEBUTUHAN ORDER
        // =================================================

        const result: PackingItem[] = Array.from(
          requiredBySku.entries()
        )
          .map(([sku, qtyRequired]) => ({
            sku,
            deskripsi: productMap.get(sku) || "",
            qty_required: qtyRequired,
            qty_picked: pickedBySku.get(sku) || 0,
            qty_packed: packedBySku.get(sku) || 0,
          }))
          .filter(
            (item) => item.qty_packed < item.qty_required
          );

        // TOTAL PACKED
        const packedTotal = Array.from(
          packedBySku.values()
        ).reduce((sum, qty) => sum + qty, 0);

        setTotalPacked(packedTotal);
        setItems(result);

        // PERTAHANKAN SKU YANG DIPILIH JIKA MASIH ADA
        setSelectedSku((previous) => {
          if (!previous) {
            return result[0]?.sku || "";
          }

          const exists = result.some(
            (item) =>
              normalizeSku(item.sku) ===
              normalizeSku(previous)
          );

          return exists ? previous : result[0]?.sku || "";
        });

        setLastRefresh(new Date());
      } catch (error) {
        console.error("Load packing data error:", error);
      } finally {
        if (showLoading) setLoading(false);
        loadingRef.current = false;
      }
    },
    [orderNo]
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (!orderNo) return;
    loadData(true);
  }, [orderNo, loadData]);

  // =====================================================
  // AUTO REFRESH
  // =====================================================

  useEffect(() => {
    if (!orderNo) return;

    const interval = setInterval(() => {
      loadData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [orderNo, loadData]);

  // =====================================================
  // CURRENT ITEM
  // =====================================================

  const currentItem = useMemo(() => {
    if (!selectedSku) return null;

    return (
      items.find(
        (item) =>
          normalizeSku(item.sku) ===
          normalizeSku(selectedSku)
      ) || null
    );
  }, [items, selectedSku]);

  // =====================================================
  // SKU OPTIONS
  // =====================================================

  const skuOptions = useMemo(
    () => [...items].sort((a, b) => a.sku.localeCompare(b.sku)),
    [items]
  );

  // =====================================================
  // REMAINING QTY
  // =====================================================

  const remainingQty = currentItem
    ? Math.max(
        0,
        currentItem.qty_required - currentItem.qty_packed
      )
    : 0;

  const totalRemaining = items.reduce(
    (total, item) =>
      total +
      Math.max(0, item.qty_required - item.qty_packed),
    0
  );

  const packingProgress =
    totalAllocated > 0
      ? Math.min(100, (totalPacked / totalAllocated) * 100)
      : 0;

  // =====================================================
  // CHANGE SKU
  // =====================================================

  function handleSkuChange(value: string) {
    const sku = normalizeSku(value);

    setSelectedSku(sku);
    setScanSku("");
    setSkuValidated(false);
    setPackQty("");
    setCartonNo("");
    setWeight("");

    setTimeout(() => {
      document.getElementById("scan-sku-input")?.focus();
    }, 50);
  }

  // =====================================================
  // SCAN SKU
  // =====================================================

  function handleScanSku(value: string) {
    setScanSku(value);

    const scanned = normalizeSku(value);

    if (!currentItem) {
      setSkuValidated(false);
      return;
    }

    const required = normalizeSku(currentItem.sku);

    if (scanned && scanned === required) {
      setSkuValidated(true);

      setTimeout(() => {
        document.getElementById("pack-qty-input")?.focus();
      }, 50);
    } else {
      setSkuValidated(false);
      setPackQty("");
    }
  }

  // =====================================================
  // RESET FORM
  // =====================================================

  function resetPackingForm() {
    setScanSku("");
    setSkuValidated(false);
    setPackQty("");
    setCartonNo("");
    setWeight("");
  }

  // =====================================================
  // CONFIRM PACKING
  // =====================================================

  async function confirmPacking() {
    if (!currentItem) {
      alert("Silakan pilih SKU terlebih dahulu.");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      if (!skuValidated) {
        alert("Silakan scan SKU yang sesuai terlebih dahulu.");
        return;
      }

      const qty = Number(packQty);

      if (!Number.isFinite(qty) || qty <= 0) {
        alert("Qty packing harus lebih besar dari 0.");
        return;
      }

      if (qty > remainingQty) {
        alert(
          `Qty packing melebihi sisa.\n\n` +
            `SKU    : ${currentItem.sku}\n` +
            `Qty    : ${qty}\n` +
            `Sisa   : ${remainingQty}`
        );
        return;
      }

      // Pastikan jumlah packing tidak melebihi jumlah yang sudah dipick.
      // Ini mencegah packing dilakukan untuk barang yang belum dipick.
      const { data: latestPicking, error: latestPickingError } =
        await supabase
          .from("picking")
          .select("sku, qty_picked")
          .eq("order_no", orderNo);

      if (latestPickingError) {
        alert(
          `Gagal memeriksa Qty picking:\n${latestPickingError.message}`
        );
        return;
      }

      const pickedForSku = (latestPicking || [])
        .filter(
          (row) =>
            normalizeSku(row.sku) ===
            normalizeSku(currentItem.sku)
        )
        .reduce(
          (sum, row) => sum + toNumber(row.qty_picked),
          0
        );

      const { data: latestPacking, error: latestPackingError } =
        await supabase
          .from("packing")
          .select("sku, qty")
          .eq("order_no", orderNo);

      if (latestPackingError) {
        alert(
          `Gagal memeriksa Qty packing:\n${latestPackingError.message}`
        );
        return;
      }

      const packedForSku = (latestPacking || [])
        .filter(
          (row) =>
            normalizeSku(row.sku) ===
            normalizeSku(currentItem.sku)
        )
        .reduce(
          (sum, row) => sum + toNumber(row.qty),
          0
        );

      const availableToPack = Math.max(
        0,
        pickedForSku - packedForSku
      );

      if (qty > availableToPack) {
        alert(
          `Qty packing melebihi jumlah yang sudah dipick.\n\n` +
            `SKU: ${currentItem.sku}\n` +
            `Sudah dipick: ${pickedForSku}\n` +
            `Sudah dipacking: ${packedForSku}\n` +
            `Maksimal dapat dipacking sekarang: ${availableToPack}`
        );
        return;
      }

      const finalCarton = cartonNo.trim();

      if (!finalCarton) {
        alert("Nomor carton wajib diisi.");
        return;
      }

      let weightValue = 0;

      if (weight.trim()) {
        weightValue = Number(weight);

        if (
          !Number.isFinite(weightValue) ||
          weightValue <= 0
        ) {
          alert("Weight harus berupa angka lebih besar dari 0.");
          return;
        }
      }

      const { error: packingError } = await supabase
        .from("packing")
        .insert({
          order_no: orderNo,
          customer_name: customerName,
          sku: currentItem.sku,
          deskripsi: currentItem.deskripsi || null,
          qty,
          carton: finalCarton,
          weight: weightValue,
          packing_at: new Date().toISOString(),
        });

      if (packingError) {
        console.error("Packing insert error:", packingError);
        alert(`Gagal menyimpan packing:\n${packingError.message}`);
        return;
      }

      alert(
        `Packing berhasil!\n\n` +
          `SKU       : ${currentItem.sku}\n` +
          `Deskripsi : ${currentItem.deskripsi || "-"}\n` +
          `Qty Pack  : ${qty}\n` +
          `Carton    : ${finalCarton}\n` +
          `Weight    : ${weightValue || "-"}`
      );

      resetPackingForm();

      await loadData(true);

      setTimeout(() => {
        document.getElementById("packing-sku-select")?.focus();
      }, 100);
    } catch (error) {
      console.error("Confirm packing error:", error);
      alert("Terjadi kesalahan saat proses packing.");
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // FINISH PACKING
  // =====================================================

  async function finishPacking() {
    if (saving) return;

    try {
      setSaving(true);

      // CEK ALLOCATION DAN STATUS PICKING
      const {
        data: allocationData,
        error: allocationError,
      } = await supabase
        .from("allocation")
        .select("sku, qty_allocated, qty_picked")
        .eq("order_no", orderNo);

      if (allocationError) {
        alert(allocationError.message);
        return;
      }

      const allocations: AllocationRow[] = allocationData || [];

      const notPicked = allocations.filter(
        (row) =>
          toNumber(row.qty_picked) <
          toNumber(row.qty_allocated)
      );

      if (notPicked.length > 0) {
        alert(
          `Picking belum selesai.\n\n` +
            `Masih ada ${notPicked.length} item yang belum selesai dipick.`
        );
        return;
      }

      // LOAD PACKING ORDER
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

      // GROUP ALLOCATION BY SKU
      const requiredMap = new Map<string, number>();

      allocations.forEach((row) => {
        const sku = normalizeSku(row.sku);
        if (!sku) return;

        requiredMap.set(
          sku,
          (requiredMap.get(sku) || 0) +
            toNumber(row.qty_allocated)
        );
      });

      // GROUP PACKING BY SKU
      const packedMap = new Map<string, number>();

      (packingData || []).forEach((row) => {
        const sku = normalizeSku(row.sku);
        if (!sku) return;

        packedMap.set(
          sku,
          (packedMap.get(sku) || 0) + toNumber(row.qty)
        );
      });

      // PERIKSA SELURUH KEBUTUHAN ORDER
      const notPacked: string[] = [];

      requiredMap.forEach((requiredQty, sku) => {
        const packedQty = packedMap.get(sku) || 0;

        if (packedQty < requiredQty) {
          notPacked.push(
            `${sku} (kebutuhan ${requiredQty}, packed ${packedQty})`
          );
        }
      });

      if (notPacked.length > 0) {
        alert(
          `Packing belum selesai.\n\n` +
            `SKU yang belum selesai:\n` +
            notPacked.join("\n")
        );
        return;
      }

      // UPDATE STATUS ORDER
      const { error: statusError } = await supabase
        .from("order_header")
        .update({ status: "PACKED" })
        .eq("order_no", orderNo);

      if (statusError) {
        alert(`Gagal update status order:\n${statusError.message}`);
        return;
      }

      alert(
        "Packing Complete.\n\nOrder sudah selesai dipacking."
      );

      router.push("/outbound/packing");
    } catch (error) {
      console.error("Finish packing error:", error);
      alert("Terjadi kesalahan saat menyelesaikan packing.");
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // RENDER
  // TAMPILAN DIPERTAHANKAN
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Packing Order
              </h1>

              <p className="text-sm text-slate-500 truncate">
                {orderNo}
              </p>

              {customerName && (
                <p className="text-xs text-slate-400 truncate mt-1">
                  Customer: {customerName}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-slate-600 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
              >
                <ArrowLeftCircle size={19} />
                <span className="hidden sm:inline">Back</span>
              </button>

              <button
                onClick={finishPacking}
                disabled={
                  saving ||
                  items.length > 0 ||
                  !pickingComplete
                }
                className="flex items-center gap-2 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PackageCheck size={18} />
                <span className="hidden sm:inline">
                  Finish Packing
                </span>
                <span className="sm:hidden">Finish</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* PICKING STATUS */}
        {!loading && (
          <div
            className={`mb-5 rounded-xl border p-4 ${
              pickingComplete
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {pickingComplete ? (
                <CheckCircle2
                  size={22}
                  className="text-green-600 mt-0.5"
                />
              ) : (
                <Clock3
                  size={22}
                  className="text-yellow-600 mt-0.5"
                />
              )}

              <div>
                <div
                  className={`font-bold ${
                    pickingComplete
                      ? "text-green-800"
                      : "text-yellow-800"
                  }`}
                >
                  {pickingComplete
                    ? "Picking sudah selesai"
                    : "Picking masih berjalan"}
                </div>

                <div
                  className={`text-sm mt-1 ${
                    pickingComplete
                      ? "text-green-700"
                      : "text-yellow-700"
                  }`}
                >
                  {pickingComplete
                    ? "Semua item sudah dipick dan dapat diproses untuk packing."
                    : "Hasil picking yang sudah berhasil tetap dapat langsung dipacking."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REFRESH */}
        {!loading && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => loadData(true)}
              disabled={saving}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
            >
              <RefreshCw size={15} />
              Refresh
              <span className="text-xs text-slate-400">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="animate-pulse text-slate-500">
              Loading data packing...
            </div>
          </div>
        ) : items.length === 0 ? (
          /* EMPTY */
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <CheckCircle2
              size={52}
              className="mx-auto text-green-500 mb-3"
            />

            <h2 className="text-xl font-bold text-slate-800">
              Semua packing selesai
            </h2>

            <p className="text-slate-500 mt-1">
              Semua hasil picking untuk order ini
              sudah selesai dipacking.
            </p>

            <p className="text-sm text-green-600 mt-3">
              Order siap untuk Finish Packing.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* STEP 1 - PILIH SKU */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center gap-2">
                  <div>
                    <h2 className="font-bold text-slate-800">
                      Pilih SKU
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <select
                  id="packing-sku-select"
                  value={selectedSku}
                  onChange={(e) =>
                    handleSkuChange(e.target.value)
                  }
                  disabled={saving}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  {skuOptions.map((item) => (
                    <option key={item.sku} value={item.sku}>
                      {item.sku}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STEP 2 - DETAIL SKU */}
            {currentItem && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2" />
                </div>

                <div className="p-4">
                  <div className="mb-2">
                    <div className="text-xs text-slate-500">
                      SKU
                    </div>

                    <div className="text-xl sm:text-xl font-bold text-blue-700 break-all">
                      {currentItem.sku}
                    </div>

                    <div className="text-sm text-slate-600 mt-1">
                      {currentItem.deskripsi ||
                        "Deskripsi tidak ditemukan"}
                    </div>
                  </div>

                  {/* QTY */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                      <div className="text-xs text-slate-500">
                        Qty Dibutuhkan
                      </div>

                      <div className="text-xl sm:text-2xl font-bold text-blue-700">
                        {currentItem.qty_required}
                      </div>
                    </div>

                    <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                      <div className="text-xs text-slate-500">
                        Qty Packed
                      </div>

                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {currentItem.qty_packed}
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                      <div className="text-xs text-slate-500">
                        Sisa
                      </div>

                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {remainingQty}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 - SCAN SKU */}
            {currentItem && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2" />
                </div>

                <div className="p-4">
                  <div className="relative">
                    <ScanLine
                      size={19}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        skuValidated
                          ? "text-green-500"
                          : "text-slate-400"
                      }`}
                    />

                    <input
                      id="scan-sku-input"
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      value={scanSku}
                      onChange={(e) =>
                        handleScanSku(e.target.value)
                      }
                      disabled={saving}
                      className={`w-full border rounded-xl px-10 py-3 text-lg font-semibold uppercase focus:outline-none focus:ring-2 ${
                        skuValidated
                          ? "border-green-500 bg-green-50 text-green-700 focus:ring-green-400"
                          : scanSku
                          ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-400"
                          : "border-slate-300 focus:ring-blue-500"
                      }`}
                     
                    />
                  </div>

                  {!skuValidated && scanSku && (
                    <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-3 text-red-600">
                      <div className="font-bold">
                        SKU tidak sesuai
                      </div>

                      <div className="text-sm mt-1">
                        Hasil scan:
                        <span className="font-bold ml-1">
                          {scanSku}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4 - PACKING */}
            {skuValidated && currentItem && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div />
                  </div>
                </div>

                <div className="p-4">
                  {/* QTY PACKING */}
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Qty yang Dipacking
                  </label>

                  <input
                    id="pack-qty-input"
                    type="number"
                    min="1"
                    max={remainingQty}
                    value={packQty}
                    onChange={(e) =>
                      setPackQty(e.target.value)
                    }
                    disabled={saving}
                    className="w-full border border-slate-300 rounded-xl px-4 py-4 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />

                  {/* CARTON */}
                  <label className="block text-sm font-semibold text-slate-700 mb-2 mt-4">
                    Nomor Carton
                  </label>

                  <input
                    type="text"
                    autoComplete="off"
                    value={cartonNo}
                    onChange={(e) =>
                      setCartonNo(e.target.value)
                    }
                    disabled={saving}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: CTN-001"
                  />

                  {/* WEIGHT */}
                  <label className="block text-sm font-semibold text-slate-700 mb-2 mt-4">
                    Weight
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={weight}
                    onChange={(e) =>
                      setWeight(e.target.value)
                    }
                    disabled={saving}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: 2.5"
                  />

                  {/* CONFIRM */}
                  <button
                    onClick={confirmPacking}
                    disabled={
                      saving ||
                      !packQty ||
                      !cartonNo.trim()
                    }
                    className="w-full mt-5 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-4 rounded-xl text-lg font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PackageCheck size={22} />

                    {saving
                      ? "Processing..."
                      : "Confirm Packing"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
