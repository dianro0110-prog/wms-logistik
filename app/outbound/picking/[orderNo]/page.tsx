"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  CheckCircle2,
  MapPin,
  PackageCheck,
  ScanLine,
} from "lucide-react";
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
  const [products, setProducts] = useState<any[]>([]);

  // =====================================================
  // LOCATION
  // =====================================================

  const [selectedLocation, setSelectedLocation] =
    useState("");

  const [scanLocation, setScanLocation] =
    useState("");

  const [locationValidated, setLocationValidated] =
    useState(false);

  // =====================================================
  // SKU
  // =====================================================

  const [scanSku, setScanSku] =
    useState("");

  const [skuValidated, setSkuValidated] =
    useState(false);

  // =====================================================
  // QTY
  // =====================================================

  const [pickQty, setPickQty] =
    useState("");

  // =====================================================
  // DESKRIPSI
  // =====================================================

  const [deskripsi, setDeskripsi] =
    useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  async function loadProducts() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("product")
        .select("sku, deskripsi");

      if (error) {
        console.error(
          "Load products error:",
          error
        );

        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error(
        "Load products exception:",
        error
      );
    }
  }

  // =====================================================
  // LOAD ALLOCATION
  // =====================================================

  async function loadData() {
    try {
      setLoading(true);

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

        alert(
          allocationError.message
        );

        return;
      }

      // =====================================================
      // PRODUCT
      // =====================================================

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

      const productMap = new Map<
        string,
        string
      >();

      (productData || []).forEach(
        (product) => {
          const sku = String(
            product.sku || ""
          )
            .trim()
            .toUpperCase();

          if (sku) {
            productMap.set(
              sku,
              product.deskripsi || ""
            );
          }
        }
      );

      // =====================================================
      // HANYA ITEM YANG BELUM SELESAI
      //
      // PENTING:
      // Tidak ada hubungan dengan status PICKED.
      //
      // Selama allocation masih memiliki sisa,
      // item tetap muncul di Picking.
      // =====================================================

      const result: AllocationItem[] =
        (allocationData || [])
          .filter((x) => {
            return (
              Number(
                x.qty_picked || 0
              ) <
              Number(
                x.qty_allocated || 0
              )
            );
          })
          .map((x) => ({
            ...x,

            product: {
              deskripsi:
                productMap.get(
                  String(
                    x.sku || ""
                  )
                    .trim()
                    .toUpperCase()
                ) ||
                x.deskripsi ||
                "",
            },
          }));

      setItems(result);

      // =====================================================
      // VALIDASI LOCATION
      // =====================================================

      setSelectedLocation(
        (prev) => {
          if (!prev) return "";

          const stillExists =
            result.some(
              (item) =>
                item.location
                  ?.trim()
                  .toUpperCase() ===
                prev
                  .trim()
                  .toUpperCase()
            );

          return stillExists
            ? prev
            : "";
        }
      );
    } catch (error) {
      console.error(
        "Load data error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (!orderNo) return;

    loadData();
    loadProducts();
  }, [orderNo]);

  // =====================================================
  // UNIQUE LOCATION
  // =====================================================

  const locations = useMemo(() => {
    const map = new Map<
      string,
      string
    >();

    items.forEach((item) => {
      const original =
        item.location?.trim() || "";

      const normalized =
        original.toUpperCase();

      if (
        normalized &&
        !map.has(normalized)
      ) {
        map.set(
          normalized,
          original
        );
      }
    });

    return Array.from(
      map.values()
    ).sort();
  }, [items]);

  // =====================================================
  // ITEM BY LOCATION
  // =====================================================

  const locationItems = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }

    return items.filter(
      (item) =>
        item.location
          ?.trim()
          .toUpperCase() ===
        selectedLocation
          .trim()
          .toUpperCase()
    );
  }, [
    items,
    selectedLocation,
  ]);

  // =====================================================
  // CURRENT ITEM
  // =====================================================

  const currentItem =
    locationItems[0];

  // =====================================================
  // DESCRIPTION
  // =====================================================

  const currentDescription =
    currentItem?.product
      ?.deskripsi ||
    currentItem?.deskripsi ||
    "";

  // =====================================================
  // CHANGE LOCATION
  // =====================================================

  function handleLocationChange(
    value: string
  ) {
    setSelectedLocation(value);

    setScanLocation("");
    setLocationValidated(false);

    setScanSku("");
    setSkuValidated(false);

    setDeskripsi("");
    setPickQty("");
  }

  // =====================================================
  // SCAN LOCATION
  // =====================================================

  function handleScanLocation(
    value: string
  ) {
    setScanLocation(value);

    const scanned =
      value
        .trim()
        .toUpperCase();

    const selected =
      selectedLocation
        .trim()
        .toUpperCase();

    if (
      scanned &&
      selected &&
      scanned === selected
    ) {
      setLocationValidated(true);

      setTimeout(() => {
        document
          .getElementById(
            "scan-sku-input"
          )
          ?.focus();
      }, 50);
    } else {
      setLocationValidated(false);

      setScanSku("");
      setSkuValidated(false);
      setDeskripsi("");
      setPickQty("");
    }
  }

  // =====================================================
  // SCAN SKU
  // =====================================================

  function handleScanSku(
    value: string
  ) {
    setScanSku(value);

    const scanned =
      value
        .trim()
        .toUpperCase();

    if (!currentItem) {
      setSkuValidated(false);
      return;
    }

    const required =
      currentItem.sku
        .trim()
        .toUpperCase();

    const product =
      products.find(
        (p) =>
          p.sku
            ?.trim()
            .toUpperCase() ===
          scanned
      );

    setDeskripsi(
      product?.deskripsi || ""
    );

    if (
      scanned &&
      scanned === required
    ) {
      setSkuValidated(true);

      setTimeout(() => {
        document
          .getElementById(
            "pick-qty-input"
          )
          ?.focus();
      }, 50);
    } else {
      setSkuValidated(false);
      setPickQty("");
    }
  }

  // =====================================================
  // RESET FORM
  // =====================================================

  function resetItemForm() {
    setScanLocation("");
    setLocationValidated(false);

    setScanSku("");
    setSkuValidated(false);

    setDeskripsi("");
    setPickQty("");
  }

  // =====================================================
  // CONFIRM PICKING
  //
  // HASIL PICKING LANGSUNG:
  //
  // inventory
  // allocation
  // picking
  //
  // Packing membaca tabel "picking".
  // Jadi tidak perlu Finish Picking.
  // =====================================================

  async function confirmItem() {
    if (!currentItem) return;

    if (saving) return;

    setSaving(true);

    try {
      // =====================================================
      // VALIDASI LOCATION
      // =====================================================

      if (!locationValidated) {
        alert(
          "Silakan scan lokasi yang sesuai terlebih dahulu."
        );

        return;
      }

      // =====================================================
      // VALIDASI SKU
      // =====================================================

      if (!skuValidated) {
        alert(
          "Silakan scan SKU yang sesuai terlebih dahulu."
        );

        return;
      }

      // =====================================================
      // QTY
      // =====================================================

      const qty =
        Number(pickQty);

      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        alert(
          "Qty harus lebih besar dari 0."
        );

        return;
      }

      const currentPicked =
        Number(
          currentItem.qty_picked || 0
        );

      const qtyAllocated =
        Number(
          currentItem.qty_allocated || 0
        );

      const remaining =
        qtyAllocated -
        currentPicked;

      if (qty > remaining) {
        alert(
          `Qty melebihi kebutuhan.\n\n` +
            `Allocated : ${qtyAllocated}\n` +
            `Sudah Pick: ${currentPicked}\n` +
            `Sisa      : ${remaining}\n` +
            `Input     : ${qty}`
        );

        return;
      }

      const totalPicked =
        currentPicked + qty;

      // =====================================================
      // INVENTORY
      // =====================================================

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

      if (!inventory) {
        alert(
          `Inventory tidak ditemukan!\n\n` +
            `SKU      : ${currentItem.sku}\n` +
            `Location : ${currentItem.location}`
        );

        return;
      }

      // =====================================================
      // CEK STOCK
      // =====================================================

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

      const newInventoryQuantity =
        currentStock - qty;

      // =====================================================
      // UPDATE INVENTORY
      // =====================================================

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
        alert(
          `Gagal mengurangi inventory:\n${updateInventoryError.message}`
        );

        return;
      }

      // =====================================================
      // UPDATE ALLOCATION
      // =====================================================

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

      if (allocationError) {
        // rollback inventory
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

      // =====================================================
      // USER
      // =====================================================

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      let pickedBy =
        "Unknown";

      if (user) {
        const {
          data: profile,
        } = await supabase
          .from("profiles")
          .select(
            "username"
          )
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

      // =====================================================
      // INSERT PICKING HISTORY
      //
      // INI ADALAH DATA YANG AKAN DIBACA PACKING
      // =====================================================

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

          deskripsi:
            currentDescription ||
            null,
        });

      // =====================================================
      // JIKA INSERT PICKING GAGAL
      // ROLLBACK
      // =====================================================

      if (pickingError) {
        console.error(
          "Picking history error:",
          pickingError
        );

        // rollback allocation
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

        // rollback inventory
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

      // =====================================================
      // BERHASIL
      //
      // DATA SUDAH LANGSUNG MASUK KE TABLE PICKING
      // =====================================================

      alert(
        `Picking berhasil!\n\n` +
          `Location  : ${currentItem.location}\n` +
          `SKU       : ${currentItem.sku}\n` +
          `Deskripsi : ${
            currentDescription || "-"
          }\n` +
          `Qty Pick  : ${qty}\n\n` +
          `Inventory : ${currentStock} → ${newInventoryQuantity}\n\n` +
          `Hasil picking langsung tersedia di menu Packing.`
      );

      resetItemForm();

      // =====================================================
      // REFRESH PICKING
      // =====================================================

      await loadData();

      setTimeout(() => {
        document
          .getElementById(
            "scan-location-input"
          )
          ?.focus();
      }, 100);

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

  // =====================================================
  // FINISH PICKING
  //
  // PENTING:
  //
  // Tombol ini BUKAN syarat agar Packing bisa mulai.
  //
  // Packing sudah dapat membaca hasil picking
  // sejak confirmItem() berhasil.
  //
  // Finish hanya mengubah status order menjadi PICKED
  // setelah semua allocation selesai.
  // =====================================================

  async function finishPicking() {
    if (saving) return;

    try {
      setSaving(true);

      const {
        data,
        error,
      } = await supabase
        .from("allocation")
        .select(
          "sku, location, qty_allocated, qty_picked"
        )
        .eq(
          "order_no",
          orderNo
        );

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
          `Masih ada ${notPicked.length} item yang belum selesai dipick.\n\n` +
            `Item yang sudah berhasil dipick tetap sudah tersedia di menu Packing.`
        );

        return;
      }

      // =====================================================
      // UPDATE STATUS
      //
      // HANYA UNTUK MENANDAI PICKING SELESAI
      // =====================================================

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
        "Picking Complete.\n\nOrder sudah selesai dipick.\nHasil picking sebelumnya sudah dapat diproses di Packing."
      );

      router.push(
        "/outbound/picking"
      );

    } catch (error) {
      console.error(
        "Finish picking error:",
        error
      );

      alert(
        "Terjadi kesalahan saat menyelesaikan picking."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOCATION REMAINING
  // =====================================================

  const locationRemaining =
    locationItems.length;

  // =====================================================
  // TOTAL REMAINING
  // =====================================================

  const totalRemaining =
    items.reduce(
      (total, item) =>
        total +
        Math.max(
          0,
          Number(
            item.qty_allocated || 0
          ) -
            Number(
              item.qty_picked || 0
            )
        ),
      0
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="sticky top-0 z-20 bg-white border-b">

        <div className="max-w-2xl mx-auto px-4 py-4">

          <div className="flex items-center justify-between gap-3">

            <div className="min-w-0">

              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Picking Order
              </h1>

              <p className="text-sm text-slate-500 truncate">
                {orderNo}
              </p>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() =>
                  router.back()
                }
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-slate-600 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
              >

                <ArrowLeftCircle
                  size={19}
                />

                <span className="hidden sm:inline">
                  Back
                </span>

              </button>

              <button
                onClick={
                  finishPicking
                }
                disabled={
                  saving ||
                  items.length > 0
                }
                className="flex items-center gap-2 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >

                <PackageCheck
                  size={18}
                />

                <span className="hidden sm:inline">
                  Finish Picking
                </span>

                <span className="sm:hidden">
                  Finish
                </span>

              </button>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="max-w-2xl mx-auto px-2 py-5">

       

        {/* =====================================================
            TOTAL REMAINING
        ===================================================== */}

        {!loading &&
          items.length > 0 && (

            <div className="mb-5 grid grid-cols-2 gap-3">



              </div>

            

          )}

        {loading ? (

          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">

            <div className="animate-pulse text-slate-500">
              Loading data...
            </div>

          </div>

        ) : items.length === 0 ? (

          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">

            <CheckCircle2
              size={50}
              className="mx-auto text-green-500 mb-3"
            />

            <h2 className="text-xl font-bold text-slate-800">
              Semua picking selesai
            </h2>

            <p className="text-slate-500 mt-1">
              Semua allocation sudah selesai dipick.
            </p>

            <p className="text-sm text-blue-600 mt-3">
              Hasil picking sudah tersedia untuk proses Packing.
            </p>

          </div>

        ) : (

          <div className="space-y-5">

            {/* =====================================================
                STEP 1
            ===================================================== */}

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

              <div className="px-4 py-3 border-b bg-slate-50">

                <div className="flex items-center gap-2">

                  

                  <div>


                  </div>

                </div>

              </div>

              <div className="p-4">

                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Lokasi Picking
                </label>

                <div className="relative">

                  <MapPin
                    size={19}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
                  />

                  <select
                    value={
                      selectedLocation
                    }
                    onChange={(e) =>
                      handleLocationChange(
                        e.target.value
                      )
                    }
                    disabled={saving}
                    className="w-full appearance-none border border-slate-300 rounded-xl px-10 py-3 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >

                    <option value="">
                      -- Pilih lokasi --
                    </option>

                    {locations.map(
                      (location) => (
                        <option
                          key={location}
                          value={location}
                        >
                          {location}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {selectedLocation && (

                  <div className="mt-3 text-sm text-slate-500">


                   

                  </div>

                )}

              </div>

            </div>

            {/* =====================================================
                STEP 2
            ===================================================== */}

            {selectedLocation && (

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

                <div className="px-4 py-3 border-b bg-slate-50">

                  <div className="flex items-center gap-2">

                  

                  </div>

                </div>

                <div className="p-4">

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Scan Location
                  </label>

                  <div className="relative">

                    <ScanLine
                      size={19}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        locationValidated
                          ? "text-green-500"
                          : "text-slate-400"
                      }`}
                    />

                    <input
                      id="scan-location-input"
                      autoFocus
                      value={
                        scanLocation
                      }
                      onChange={(e) =>
                        handleScanLocation(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className={`w-full border rounded-xl px-10 py-3 text-lg font-semibold uppercase focus:outline-none focus:ring-2 ${
                        locationValidated
                          ? "border-green-500 bg-green-50 text-green-700 focus:ring-green-400"
                          : "border-slate-300 focus:ring-blue-500"
                      }`}
                      placeholder="Scan lokasi..."
                    />

                  </div>

                  {locationValidated ? (

                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-white border border-white px-3 py-0 text-white">

                     

                      <div>

                        
                      

                      </div>

                    </div>

                  ) : (

                    scanLocation && (

                      <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-sm">
                        Lokasi scan tidak sesuai dengan lokasi yang dipilih.
                      </div>

                    )

                  )}

                </div>

              </div>

            )}

            {/* =====================================================
                STEP 3
            ===================================================== */}

            {locationValidated &&
              currentItem && (

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

                  <div className="px-4 py-3 border-b bg-slate-50">

                    <div className="flex items-center gap-2">

                     
                      <div>

                       


                      </div>

                    </div>

                  </div>

                  <div className="p-4">

                    <div className="mb-4">

                     
                      <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">

                        <div className="text-xl sm:text-xl font-bold text-blue-700 break-all">
                          {currentItem.sku}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {currentDescription ||
                            "Deskripsi tidak ditemukan"}
                        </div>

                      </div>

                    </div>

                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Scan SKU
                    </label>

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
                        value={
                          scanSku
                        }
                        onChange={(e) =>
                          handleScanSku(
                            e.target.value
                          )
                        }
                        disabled={saving}
                        className={`w-full border rounded-xl px-10 py-3 text-lg font-semibold uppercase focus:outline-none focus:ring-2 ${
                          skuValidated
                            ? "border-green-500 bg-green-50 text-green-700 focus:ring-green-400"
                            : "border-slate-300 focus:ring-blue-500"
                        }`}
                        placeholder="Scan SKU..."
                      />

                    </div>

                    {skuValidated ? (

                      
                        <div>

                        </div>

                     
                    ) : (

                      scanSku && (

                        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-sm">
                          SKU yang discan tidak sesuai dengan SKU yang dibutuhkan.
                        </div>

                      )

                    )}

                  </div>

                </div>

              )}

            {/* =====================================================
                STEP 4
            ===================================================== */}

            {skuValidated &&
              currentItem && (

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

                  <div className="px-4 py-3 border-b bg-slate-50">

                    <div className="flex items-center gap-2">

                     

                      <div>


                        

                      </div>

                    </div>

                  </div>

                  <div className="p-2">

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">

                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">

                        <div className="text-xs text-slate-500">
                          Qty Dibutuhkan
                        </div>

                        <div className="text-xl sm:text-xl font-bold text-blue-700">
                          {
                            currentItem.qty_allocated
                          }
                        </div>

                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">

                        <div className="text-xs text-slate-500">
                          Sudah Pick
                        </div>

                        <div className="text-xl sm:text-xl font-bold text-slate-700">
                          {
                            currentItem.qty_picked
                          }
                        </div>

                      </div>

                      <div className="rounded-xl bg-red-50 border border-red-100 p-3">

                        <div className="text-xs text-slate-500">
                          Sisa
                        </div>

                        <div className="text-xl sm:text-xl font-bold text-red-600">
                          {Number(
                            currentItem.qty_allocated
                          ) -
                            Number(
                              currentItem.qty_picked ||
                                0
                            )}
                        </div>

                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">


                    </div>

                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Qty yang Dipick
                    </label>

                    <input
                      id="pick-qty-input"
                      type="number"
                      min="1"
                      max={
                        Number(
                          currentItem.qty_allocated
                        ) -
                        Number(
                          currentItem.qty_picked ||
                            0
                        )
                      }
                      value={
                        pickQty
                      }
                      onChange={(e) =>
                        setPickQty(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full border border-slate-300 rounded-xl px-2 py-2 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0"
                    />

                    <button
                      onClick={
                        confirmItem
                      }
                      disabled={
                        saving ||
                        !pickQty
                      }
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-4 rounded-xl text-lg font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >

                      <PackageCheck
                        size={22}
                      />

                      {saving
                        ? "Processing..."
                        : "Confirm Picking"}

                    </button>

                  </div>

                </div>

              )}

            {/* =====================================================
                INFO PARALLEL
            ===================================================== */}

            {selectedLocation &&
              locationValidated &&
              currentItem && (

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">

                 

                </div>

              )}

          </div>

        )}

      </div>

    </div>
  );
}