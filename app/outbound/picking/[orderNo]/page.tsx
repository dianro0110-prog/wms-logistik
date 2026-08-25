"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

interface AllocationItem {
  id: number;
  order_no: string;
  sku: string;
  deskripsi?: string;
  location: string;
  qty_allocated: number;
  qty_picked: number;

  product?: {
    deskripsi?: string;
  };
}

export default function PickingPage() {
  const router = useRouter();
  const params = useParams();

  const orderNo = params.orderNo as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<AllocationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [scanLocation, setScanLocation] = useState("");
  const [scanSku, setScanSku] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [pickQty, setPickQty] = useState("");

  const [products, setProducts] = useState<any[]>([]);

  // ==========================================
  // LOAD PRODUCTS
  // ==========================================
  async function loadProducts() {
    const { data, error } = await supabase
      .from("product")
      .select("sku, deskripsi");

    if (error) {
      console.error("Load products error:", error);
      return;
    }

    setProducts(data || []);
  }

  // ==========================================
  // LOAD ALLOCATION
  // ==========================================
  async function loadData() {
    try {
      setLoading(true);

      // ==========================================
      // AMBIL ALLOCATION
      // ==========================================
      const {
        data: allocationData,
        error: allocationError,
      } = await supabase
        .from("allocation")
        .select("*")
        .eq("order_no", orderNo)
        .order("location", {
          ascending: true,
        });

      if (allocationError) {
        console.error(
          "Load allocation error:",
          allocationError
        );

        alert(allocationError.message);
        return;
      }

      // ==========================================
      // AMBIL PRODUCT
      // ==========================================
      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("product")
        .select("sku, deskripsi");

      if (productError) {
        console.error(
          "Load product error:",
          productError
        );
      }

      // ==========================================
      // MAP PRODUCT BERDASARKAN SKU
      // ==========================================
      const productMap = new Map();

      (productData || []).forEach((product) => {
        productMap.set(
          product.sku?.trim().toUpperCase(),
          product.deskripsi
        );
      });

      // ==========================================
      // GABUNGKAN ALLOCATION + PRODUCT
      // HANYA ITEM YANG BELUM SELESAI
      // ==========================================
      const result: AllocationItem[] = (
        allocationData || []
      )
        .filter(
          (x) =>
            Number(x.qty_picked || 0) <
            Number(x.qty_allocated || 0)
        )
        .map((x) => ({
          ...x,

          product: {
            deskripsi:
              productMap.get(
                x.sku?.trim().toUpperCase()
              ) || x.deskripsi || "",
          },
        }));

      setItems(result);

      // Jangan reset index kalau masih valid
      setCurrentIndex((prev) => {
        if (result.length === 0) {
          return 0;
        }

        return Math.min(
          prev,
          result.length - 1
        );
      });

    } catch (err) {
      console.error(
        "Load data error:",
        err
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    if (orderNo) {
      loadData();
      loadProducts();
    }
  }, [orderNo]);

  const currentItem = items[currentIndex];

  // ==========================================
  // DESKRIPSI BERDASARKAN SKU
  // ==========================================
  const currentDescription =
    currentItem?.product?.deskripsi ||
    currentItem?.deskripsi ||
    "";

  // ==========================================
  // HANDLE SCAN SKU
  // ==========================================
  function handleScanSku(value: string) {
    setScanSku(value);

    const sku = value
      .trim()
      .toUpperCase();

    const product = products.find(
      (p) =>
        p.sku
          ?.trim()
          .toUpperCase() === sku
    );

    setDeskripsi(
      product?.deskripsi || ""
    );
  }

  // ==========================================
  // NEXT ITEM
  // ==========================================
  function nextItem() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(
        currentIndex + 1
      );

      resetForm();
    }
  }

  // ==========================================
  // PREVIOUS ITEM
  // ==========================================
  function previousItem() {
    if (currentIndex > 0) {
      setCurrentIndex(
        currentIndex - 1
      );

      resetForm();
    }
  }

  // ==========================================
  // RESET FORM
  // ==========================================
  function resetForm() {
    setScanLocation("");
    setScanSku("");
    setDeskripsi("");
    setPickQty("");
  }

  // ==========================================
  // CONFIRM ITEM
  // ==========================================
  async function confirmItem() {
    if (!currentItem) return;

    try {
      setSaving(true);

      // ==========================================
      // 1. VALIDASI LOCATION
      // ==========================================
      if (
        scanLocation.trim().toUpperCase() !==
        currentItem.location.trim().toUpperCase()
      ) {
        alert(
          `Lokasi salah!\nHarus : ${currentItem.location}`
        );
        return;
      }

      // ==========================================
      // 2. VALIDASI SKU
      // ==========================================
      if (
        scanSku.trim().toUpperCase() !==
        currentItem.sku.trim().toUpperCase()
      ) {
        alert(
          `SKU salah!\nHarus : ${currentItem.sku}`
        );
        return;
      }

      // ==========================================
      // 3. VALIDASI DESKRIPSI
      // ==========================================
      const productDescription =
        products.find(
          (p) =>
            p.sku
              ?.trim()
              .toUpperCase() ===
            scanSku
              .trim()
              .toUpperCase()
        )?.deskripsi || "";

      if (
        currentDescription &&
        productDescription &&
        currentDescription !==
          productDescription
      ) {
        alert(
          "Deskripsi produk tidak sesuai dengan SKU."
        );
        return;
      }

      // ==========================================
      // 4. VALIDASI QTY
      // ==========================================
      const qty = Number(pickQty);

      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        alert(
          "Qty harus lebih besar dari 0"
        );
        return;
      }

      // ==========================================
      // 5. CEK QTY ALLOCATION
      // ==========================================
      const currentPicked =
        Number(
          currentItem.qty_picked || 0
        );

      const qtyAllocated =
        Number(
          currentItem.qty_allocated || 0
        );

      const totalPicked =
        currentPicked + qty;

      if (
        totalPicked >
        qtyAllocated
      ) {
        alert(
          `Qty melebihi allocated.\n\n` +
          `Allocated : ${qtyAllocated}\n` +
          `Sudah Pick: ${currentPicked}\n` +
          `Sisa      : ${
            qtyAllocated -
            currentPicked
          }\n` +
          `Pick      : ${qty}`
        );

        return;
      }

      // ==========================================
      // 6. CARI INVENTORY
      // ==========================================
      const {
        data: inventory,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select(
          "id, sku, location, quantity"
        )
        .eq(
          "sku",
          currentItem.sku
        )
        .eq(
          "location",
          currentItem.location
        )
        .maybeSingle();

      if (inventoryError) {
        console.error(
          "Inventory error:",
          inventoryError
        );

        alert(
          `Gagal membaca inventory:\n${inventoryError.message}`
        );

        return;
      }

      // ==========================================
      // 7. INVENTORY TIDAK DITEMUKAN
      // ==========================================
      if (!inventory) {
        alert(
          `Inventory tidak ditemukan!\n\n` +
          `SKU      : ${currentItem.sku}\n` +
          `Location : ${currentItem.location}`
        );

        return;
      }

      // ==========================================
      // 8. CEK STOK
      // ==========================================
      const currentStock =
        Number(
          inventory.quantity || 0
        );

      if (
        currentStock < qty
      ) {
        alert(
          `Stok inventory tidak cukup!\n\n` +
          `SKU       : ${currentItem.sku}\n` +
          `Location  : ${currentItem.location}\n` +
          `Stok      : ${currentStock}\n` +
          `Qty Pick  : ${qty}\n` +
          `Kekurangan: ${
            qty - currentStock
          }`
        );

        return;
      }

      // ==========================================
      // 9. INVENTORY BARU
      // ==========================================
      const newInventoryQuantity =
        currentStock - qty;

      // ==========================================
      // 10. UPDATE INVENTORY
      // ==========================================
      const {
        error:
          updateInventoryError,
      } = await supabase
        .from("inventory")
        .update({
          quantity:
            newInventoryQuantity,
        })
        .eq(
          "id",
          inventory.id
        );

      if (
        updateInventoryError
      ) {
        console.error(
          "Update inventory error:",
          updateInventoryError
        );

        alert(
          `Gagal mengurangi inventory:\n${updateInventoryError.message}`
        );

        return;
      }

      // ==========================================
      // 11. UPDATE ALLOCATION
      // ==========================================
      const {
        error: allocationError,
      } = await supabase
        .from("allocation")
        .update({
          qty_picked:
            totalPicked,
        })
        .eq(
          "id",
          currentItem.id
        );

      if (
        allocationError
      ) {
        console.error(
          "Allocation error:",
          allocationError
        );

        // Rollback inventory
        await supabase
          .from("inventory")
          .update({
            quantity:
              currentStock,
          })
          .eq(
            "id",
            inventory.id
          );

        alert(
          `Gagal update allocation:\n${allocationError.message}`
        );

        return;
      }

      // ==========================================
      // 12. USER LOGIN
      // ==========================================
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      let pickedBy = "Unknown";

      if (user) {
        const {
          data: profile,
        } = await supabase
          .from("profiles")
          .select("username")
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

        if (
          profile?.username
        ) {
          pickedBy =
            profile.username;
        }
      }

      // ==========================================
      // 13. INSERT HISTORI PICKING
      // ==========================================
      const {
        error: pickingError,
      } = await supabase
        .from("picking")
        .insert({
          order_no:
            currentItem.order_no,
          sku:
            currentItem.sku,
          location:
            currentItem.location,
          qty_picked:
            qty,
          picked_at:
            new Date().toISOString(),
          picked_by:
            pickedBy,
        });

      if (
        pickingError
      ) {
        console.error(
          "Picking history error:",
          pickingError
        );

        // Rollback allocation
        await supabase
          .from("allocation")
          .update({
            qty_picked:
              currentPicked,
          })
          .eq(
            "id",
            currentItem.id
          );

        // Rollback inventory
        await supabase
          .from("inventory")
          .update({
            quantity:
              currentStock,
          })
          .eq(
            "id",
            inventory.id
          );

        alert(
          `Gagal menyimpan histori picking:\n${pickingError.message}`
        );

        return;
      }

      // ==========================================
      // 14. BERHASIL
      // ==========================================
      alert(
        `Picking berhasil!\n\n` +
        `SKU       : ${currentItem.sku}\n` +
        `Deskripsi : ${currentDescription || "-"}\n` +
        `Location  : ${currentItem.location}\n` +
        `Qty Pick  : ${qty}\n\n` +
        `Inventory : ${currentStock} → ${newInventoryQuantity}`
      );

      // ==========================================
      // 15. RESET FORM
      // ==========================================
      resetForm();

      // ==========================================
      // 16. LOAD ULANG
      // ==========================================
      await loadData();

    } catch (error) {
      console.error(
        "Confirm picking error:",
        error
      );

      alert(
        "Terjadi kesalahan saat proses picking."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // FINISH PICKING
  // ==========================================
  async function finishPicking() {
    try {
      setSaving(true);

      const {
        data,
        error,
      } = await supabase
        .from("allocation")
        .select("*")
        .eq(
          "order_no",
          orderNo
        )
        .order("location");

      if (error) {
        alert(error.message);
        return;
      }

      const notPicked =
        data?.filter(
          (x) =>
            Number(
              x.qty_picked || 0
            ) <
            Number(
              x.qty_allocated || 0
            )
        ) || [];

      if (
        notPicked.length > 0
      ) {
        alert(
          "Masih ada item yang belum selesai dipick."
        );

        return;
      }

      // ==========================================
      // UPDATE STATUS ORDER
      // ==========================================
      const {
        error: statusError,
      } = await supabase
        .from("order_header")
        .update({
          status: "PICKED",
        })
        .eq(
          "order_no",
          orderNo
        );

      if (statusError) {
        alert(
          `Gagal update status order:\n${statusError.message}`
        );

        return;
      }

      alert(
        "Picking Complete"
      );

      router.push(
        "/outbound/picking"
      );

    } catch (err) {
      console.error(
        "Finish picking error:",
        err
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // PROGRESS
  // ==========================================
  const progress =
    items.length > 0
      ? Math.round(
          ((currentIndex + 1) /
            items.length) *
            100
        )
      : 0;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* ==========================================
          HEADER
      ========================================== */}
      <div className="flex justify-between mb-6">

        <div>
          <h1 className="text-2xl font-bold">
            Picking Order
          </h1>

          <p className="text-gray-500">
            {orderNo}
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

            <span>
              Back
            </span>
          </button>

          <button
            onClick={
              finishPicking
            }
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Finish Picking
          </button>

        </div>

      </div>

      {/* ==========================================
          PROGRESS + PREVIOUS NEXT
      ========================================== */}
      <div className="bg-white p-4 rounded shadow mb-5">

        <div className="flex items-center justify-between gap-4">

          {/* PREVIOUS */}
          <button
            type="button"
            onClick={
              previousItem
            }
            disabled={
              currentIndex === 0 ||
              saving ||
              loading
            }
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft
              size={18}
            />

            Previous
          </button>

          {/* PROGRESS */}
          <div className="flex-1">

            <div className="flex justify-between mb-2">

              <div className="font-medium">
                Progress :{" "}
                {currentItem
                  ? currentIndex + 1
                  : 0}
                {" / "}
                {items.length}
              </div>

              <div className="font-semibold">
                {progress}%
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="w-full bg-gray-200 rounded-full h-2">

              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          {/* NEXT */}
          <button
            type="button"
            onClick={
              nextItem
            }
            disabled={
              currentIndex >=
                items.length - 1 ||
              saving ||
              loading
            }
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next

            <ChevronRight
              size={18}
            />
          </button>

        </div>

      </div>

      {/* ==========================================
          CONTENT
      ========================================== */}
      {loading ? (

        <div className="bg-white p-6 rounded shadow">
          Loading...
        </div>

      ) : !currentItem ? (

        <div className="bg-white p-6 rounded shadow">
          Tidak ada data.
        </div>

      ) : (

        <>

          {/* ==========================================
              DETAIL ITEM
          ========================================== */}
          <div className="bg-white p-6 rounded shadow mb-5">

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="font-semibold">
                  Location
                </label>

                <div className="text-xl text-blue-600">
                  {currentItem.location}
                </div>
              </div>

              <div>
                <label className="font-semibold">
                  SKU
                </label>

                <div className="text-xl text-green-600">
                  {currentItem.sku}
                </div>
              </div>

              {/* DESKRIPSI */}
              <div className="col-span-2">

                <label className="font-semibold">
                  Deskripsi
                </label>

                <div className="mt-1 p-3 bg-slate-50 border rounded-lg">
                  {currentDescription ||
                    "Deskripsi tidak ditemukan"}
                </div>

              </div>

              <div>
                <label className="font-semibold">
                  Qty Allocated
                </label>

                <div>
                  {currentItem.qty_allocated}
                </div>
              </div>

              <div>
                <label className="font-semibold">
                  Qty Picked
                </label>

                <div>
                  {currentItem.qty_picked}
                </div>
              </div>

              <div>
                <label className="font-semibold">
                  Qty Sisa
                </label>

                <div className="text-red-600 font-bold">
                  {Number(
                    currentItem.qty_allocated
                  ) -
                    Number(
                      currentItem.qty_picked || 0
                    )}
                </div>
              </div>

            </div>

          </div>

          {/* ==========================================
              FORM PICKING
          ========================================== */}
          <div className="bg-white p-6 rounded shadow">

            {/* LOCATION */}
            <div className="mb-4">

              <label className="block mb-2 font-medium">
                Scan Location
              </label>

              <input
                value={
                  scanLocation
                }
                onChange={(e) =>
                  setScanLocation(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
                placeholder="Scan lokasi"
                disabled={saving}
              />

            </div>

            {/* SKU */}
            <div className="mb-4">

              <label className="block mb-2 font-medium">
                Scan SKU
              </label>

              <input
                value={
                  scanSku
                }
                onChange={(e) =>
                  handleScanSku(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
                placeholder="Scan SKU"
                disabled={saving}
              />

            </div>

            {/* DESKRIPSI FORM */}
            <div className="mb-4">

              <label className="block mb-2 font-medium">
                Deskripsi
              </label>

              <input
                type="text"
                value={
                  deskripsi ||
                  currentDescription
                }
                readOnly
                className="border p-2 rounded w-full bg-gray-100 text-gray-700"
                placeholder="Deskripsi produk"
              />

            </div>

            {/* QTY */}
            <div className="mb-4">

              <label className="block mb-2 font-medium">
                Qty Picked
              </label>

              <input
                type="number"
                min="1"
                value={
                  pickQty
                }
                onChange={(e) =>
                  setPickQty(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
                disabled={saving}
              />

            </div>

            {/* CONFIRM */}
            <button
              onClick={
                confirmItem
              }
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {saving
                ? "Processing..."
                : "Confirm Item"}
            </button>

          </div>

        </>

      )}

    </div>
  );
}