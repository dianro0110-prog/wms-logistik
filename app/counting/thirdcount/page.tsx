
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeftCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  RefreshCw,
  ScanLine,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabase";

// =========================================================
// TYPE
// =========================================================

type DifferenceStatus =
  | "MATCH"
  | "EXCESS"
  | "SHORTAGE";

type ThirdCountSourceRow = {
  second_count_id: number;
  first_count_id: number;

  location: string | null;
  sku: string | null;
  deskripsi: string | null;

  stock_existing: number | null;

  first_qty: number | null;
  first_difference: number | null;

  second_qty: number | null;
  second_difference: number | null;

  second_status:
    | "EXCESS"
    | "SHORTAGE"
    | null;
};

type ThirdCountRow = {
  id: number;

  second_count_id: number;
  first_count_id: number;

  location: string | null;
  sku: string | null;
  deskripsi: string | null;

  stock_existing: number | null;

  first_qty: number | null;
  first_difference: number | null;

  second_qty: number | null;
  second_difference: number | null;

  third_qty: number | null;
  third_difference: number | null;

  status: DifferenceStatus | null;
};

type SkuOption = {
  sku: string;
  deskripsi: string;

  stockExisting: number;

  firstQty: number;
  firstDifference: number;

  secondQty: number;
  secondDifference: number;

  status:
    | "EXCESS"
    | "SHORTAGE";
};

// =========================================================
// HELPER
// =========================================================

const normalize = (
  value: string | null | undefined
) => {
  return String(value ?? "").trim();
};

const normalizeUpper = (
  value: string | null | undefined
) => {
  return normalize(value).toUpperCase();
};

const numberValue = (
  value: unknown
) => {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
};

const formatNumber = (
  value: number
) => {
  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
};

const getDifferenceStatus = (
  difference: number
): DifferenceStatus => {
  if (difference > 0) {
    return "EXCESS";
  }

  if (difference < 0) {
    return "SHORTAGE";
  }

  return "MATCH";
};

// =========================================================
// COMPONENT
// =========================================================

export default function ThirdCountPage() {
  const router = useRouter();

  // =======================================================
  // REF
  // =======================================================

  const locationInputRef =
    useRef<HTMLInputElement>(null);

  const skuInputRef =
    useRef<HTMLInputElement>(null);

  // =======================================================
  // DATA
  // =======================================================

  const [
    sourceRows,
    setSourceRows,
  ] = useState<ThirdCountSourceRow[]>([]);

  const [
    thirdCounts,
    setThirdCounts,
  ] = useState<ThirdCountRow[]>([]);

  // =======================================================
  // FORM
  // =======================================================

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    sku,
    setSku,
  ] = useState("");

  const [
    qty,
    setQty,
  ] = useState("");

  // =======================================================
  // KEEP LOCATION
  // =======================================================

  const [
    keepLocation,
    setKeepLocation,
  ] = useState(false);

  // =======================================================
  // DROPDOWN
  // =======================================================

  const [
    showLocationDropdown,
    setShowLocationDropdown,
  ] = useState(false);

  const [
    showSkuDropdown,
    setShowSkuDropdown,
  ] = useState(false);

  // =======================================================
  // STATE
  // =======================================================

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  // =======================================================
  // LOAD THIRD COUNT
  // =======================================================

  const loadThirdCount =
    async () => {
      try {
        setLoading(true);

        // =================================================
        // 1. LOAD SUMBER DARI SECOND COUNT
        // HANYA YANG SECOND DIFFERENCE != 0
        // =================================================

        const {
          data: sourceData,
          error: sourceError,
        } = await supabase
          .from("third_count_source")
          .select(`
            second_count_id,
            first_count_id,
            location,
            sku,
            deskripsi,
            stock_existing,
            first_qty,
            first_difference,
            second_qty,
            second_difference,
            second_status
          `)
          .order(
            "location",
            {
              ascending: true,
            }
          )
          .order(
            "sku",
            {
              ascending: true,
            }
          );

        if (sourceError) {
          throw sourceError;
        }

        setSourceRows(
          (sourceData ??
            []) as ThirdCountSourceRow[]
        );

        // =================================================
        // 2. LOAD HASIL THIRD COUNT
        // =================================================

        const {
          data: thirdData,
          error: thirdError,
        } = await supabase
          .from("third_count")
          .select(`
            id,
            second_count_id,
            first_count_id,
            location,
            sku,
            deskripsi,
            stock_existing,
            first_qty,
            first_difference,
            second_qty,
            second_difference,
            third_qty,
            third_difference,
            status
          `)
          .order(
            "location",
            {
              ascending: true,
            }
          )
          .order(
            "sku",
            {
              ascending: true,
            }
          );

        if (thirdError) {
          throw thirdError;
        }

        setThirdCounts(
          (thirdData ??
            []) as ThirdCountRow[]
        );

      } catch (error) {
        console.error(
          "Gagal mengambil Third Count:",
          error
        );

        alert(
          "Gagal mengambil data Third Count."
        );
      } finally {
        setLoading(false);
      }
    };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadThirdCount();
  }, []);

  // =======================================================
  // LOCATIONS
  // HANYA TAMPILKAN LOKASI YANG BELUM SELESAI THIRD COUNT
  // =======================================================

  const locations = useMemo(() => {
    // -----------------------------------------------------
    // TOTAL SKU YANG WAJIB THIRD COUNT PER LOCATION
    //
    // Menggunakan Set agar SKU duplikat pada lokasi
    // tidak dihitung dua kali.
    // -----------------------------------------------------

    const skuByLocation = new Map<
      string,
      Set<string>
    >();

    sourceRows.forEach((item) => {
      const loc =
        normalizeUpper(
          item.location
        );

      const itemSku =
        normalizeUpper(
          item.sku
        );

      if (!loc || !itemSku) {
        return;
      }

      const secondDifference =
        numberValue(
          item.second_difference
        );

      // Hanya SKU yang masih memiliki
      // selisih Second Count
      if (
        secondDifference === 0
      ) {
        return;
      }

      if (
        !skuByLocation.has(
          loc
        )
      ) {
        skuByLocation.set(
          loc,
          new Set<string>()
        );
      }

      skuByLocation
        .get(loc)!
        .add(itemSku);
    });

    // -----------------------------------------------------
    // SKU THIRD COUNT YANG SUDAH SELESAI PER LOCATION
    // -----------------------------------------------------

    const completedByLocation =
      new Map<
        string,
        Set<string>
      >();

    thirdCounts.forEach((item) => {
      const loc =
        normalizeUpper(
          item.location
        );

      const itemSku =
        normalizeUpper(
          item.sku
        );

      if (!loc || !itemSku) {
        return;
      }

      // Third Count dianggap selesai
      // kalau third_qty sudah ada.
      if (
        item.third_qty === null
      ) {
        return;
      }

      if (
        !completedByLocation.has(
          loc
        )
      ) {
        completedByLocation.set(
          loc,
          new Set<string>()
        );
      }

      completedByLocation
        .get(loc)!
        .add(itemSku);
    });

    // -----------------------------------------------------
    // HANYA LOKASI YANG MASIH MEMILIKI
    // SKU THIRD COUNT YANG BELUM SELESAI
    // -----------------------------------------------------

    return Array.from(
      skuByLocation.entries()
    )
      .filter(
        ([
          loc,
          skuSet,
        ]) => {
          const completed =
            completedByLocation
              .get(loc)
              ?.size ?? 0;

          return (
            completed <
            skuSet.size
          );
        }
      )
      .map(
        ([loc]) => loc
      )
      .sort();
  }, [
    sourceRows,
    thirdCounts,
  ]);

  // =======================================================
  // FILTER LOCATION
  // =======================================================

  const filteredLocations =
    useMemo(() => {
      const keyword =
        normalizeUpper(
          location
        );

      if (!keyword) {
        return locations.slice(
          0,
          30
        );
      }

      return locations
        .filter(
          (item) =>
            item.includes(
              keyword
            )
        )
        .slice(0, 30);
    }, [
      location,
      locations,
    ]);

  // =======================================================
  // SKU OPTIONS
  // =======================================================

  const skuOptions =
    useMemo<SkuOption[]>(() => {
      const map =
        new Map<
          string,
          SkuOption
        >();

      sourceRows
        .filter((item) => {
          if (!location) {
            return false;
          }

          return (
            normalizeUpper(
              item.location
            ) ===
            normalizeUpper(
              location
            )
          );
        })
        .forEach(
          (item) => {
            const itemSku =
              normalizeUpper(
                item.sku
              );

            if (!itemSku) {
              return;
            }

            const secondDifference =
              numberValue(
                item.second_difference
              );

            // HANYA YANG MASIH SELISIH
            if (
              secondDifference === 0
            ) {
              return;
            }

            const status =
              secondDifference > 0
                ? "EXCESS"
                : "SHORTAGE";

            map.set(
              itemSku,
              {
                sku: itemSku,

                deskripsi:
                  normalize(
                    item.deskripsi
                  ),

                stockExisting:
                  numberValue(
                    item.stock_existing
                  ),

                firstQty:
                  numberValue(
                    item.first_qty
                  ),

                firstDifference:
                  numberValue(
                    item.first_difference
                  ),

                secondQty:
                  numberValue(
                    item.second_qty
                  ),

                secondDifference,

                status,
              }
            );
          }
        );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.sku.localeCompare(
            b.sku
          )
      );
    }, [
      sourceRows,
      location,
    ]);

  // =======================================================
  // FILTER SKU
  // =======================================================

  const filteredSkuOptions =
    useMemo(() => {
      const keyword =
        normalizeUpper(
          sku
        );

      if (!keyword) {
        return skuOptions.slice(
          0,
          30
        );
      }

      return skuOptions
        .filter(
          (item) =>
            item.sku.includes(
              keyword
            ) ||
            normalizeUpper(
              item.deskripsi
            ).includes(
              keyword
            )
        )
        .slice(0, 30);
    }, [
      sku,
      skuOptions,
    ]);

  // =======================================================
  // SELECTED SOURCE
  // =======================================================

  const selectedSource =
    useMemo(() => {
      if (
        !location ||
        !sku
      ) {
        return null;
      }

      const selectedLocation =
        normalizeUpper(
          location
        );

      const selectedSku =
        normalizeUpper(
          sku
        );

      const row =
        sourceRows.find(
          (item) =>
            normalizeUpper(
              item.location
            ) ===
              selectedLocation &&
            normalizeUpper(
              item.sku
            ) ===
              selectedSku
        );

      if (!row) {
        return null;
      }

      const secondDifference =
        numberValue(
          row.second_difference
        );

      // Harus masih memiliki selisih
      if (
        secondDifference === 0
      ) {
        return null;
      }

      return {
        secondCountId:
          row.second_count_id,

        firstCountId:
          row.first_count_id,

        location:
          selectedLocation,

        sku:
          selectedSku,

        description:
          normalize(
            row.deskripsi
          ),

        stockExisting:
          numberValue(
            row.stock_existing
          ),

        firstQty:
          numberValue(
            row.first_qty
          ),

        firstDifference:
          numberValue(
            row.first_difference
          ),

        secondQty:
          numberValue(
            row.second_qty
          ),

        secondDifference,

        status:
          getDifferenceStatus(
            secondDifference
          ),
      };
    }, [
      sourceRows,
      location,
      sku,
    ]);

  // =======================================================
  // THIRD COUNT EXISTING
  // =======================================================

  const selectedThirdCount =
    useMemo(() => {
      if (
        !selectedSource
      ) {
        return null;
      }

      return (
        thirdCounts.find(
          (item) =>
            item.second_count_id ===
            selectedSource.secondCountId
        ) ?? null
      );
    }, [
      thirdCounts,
      selectedSource,
    ]);

  // =======================================================
  // SELECT LOCATION
  // =======================================================

  const selectLocation = (
    value: string
  ) => {
    const selected =
      normalizeUpper(
        value
      );

    setLocation(
      selected
    );

    setSku("");
    setQty("");

    setShowLocationDropdown(
      false
    );

    setShowSkuDropdown(
      false
    );

    setTimeout(() => {
      skuInputRef.current?.focus();
    }, 100);
  };

  // =======================================================
  // LOCATION CHANGE
  // =======================================================

  const handleLocationChange =
    (
      value: string
    ) => {
      setLocation(
        value.toUpperCase()
      );

      setSku("");
      setQty("");

      setShowLocationDropdown(
        true
      );
    };

  // =======================================================
  // LOCATION ENTER
  // =======================================================

  const handleLocationEnter =
    () => {
      const value =
        normalizeUpper(
          location
        );

      if (!value) {
        return;
      }

      const exact =
        locations.find(
          (item) =>
            item === value
        );

      if (exact) {
        selectLocation(
          exact
        );

        return;
      }

      const firstMatch =
        filteredLocations[0];

      if (firstMatch) {
        selectLocation(
          firstMatch
        );

        return;
      }

      alert(
        `Lokasi ${value} tidak memiliki data selisih Third Count yang belum selesai.`
      );

      locationInputRef.current?.focus();
    };

  // =======================================================
  // SELECT SKU
  // =======================================================

  const selectSku = (
    value: string
  ) => {
    setSku(
      normalizeUpper(
        value
      )
    );

    setShowSkuDropdown(
      false
    );

    setTimeout(() => {
      document
        .getElementById(
          "qty-third-count"
        )
        ?.focus();
    }, 100);
  };

  // =======================================================
  // SKU CHANGE
  // =======================================================

  const handleSkuChange =
    (
      value: string
    ) => {
      const newValue =
        value.toUpperCase();

      setSku(
        newValue
      );

      setShowSkuDropdown(
        true
      );

      const exact =
        skuOptions.find(
          (item) =>
            normalizeUpper(
              item.sku
            ) ===
            normalizeUpper(
              newValue
            )
        );

      if (exact) {
        setSku(
          exact.sku
        );
      }
    };

  // =======================================================
  // SKU ENTER
  // =======================================================

  const handleSkuEnter =
    () => {
      const value =
        normalizeUpper(
          sku
        );

      if (!value) {
        return;
      }

      const exact =
        skuOptions.find(
          (item) =>
            normalizeUpper(
              item.sku
            ) === value
        );

      if (exact) {
        selectSku(
          exact.sku
        );

        return;
      }

      const firstMatch =
        filteredSkuOptions[0];

      if (firstMatch) {
        selectSku(
          firstMatch.sku
        );

        return;
      }

      alert(
        `SKU ${value} tidak memiliki selisih Second Count.`
      );

      skuInputRef.current?.focus();
    };

  // =======================================================
  // SAVE THIRD COUNT
  // =======================================================

  const saveThirdCount =
    async () => {
      if (saving) {
        return;
      }

      const selectedLocation =
        normalizeUpper(
          location
        );

      const selectedSku =
        normalizeUpper(
          sku
        );

      const countQty =
        Number(qty);

      // ---------------------------------------------------
      // VALIDASI LOKASI
      // ---------------------------------------------------

      if (
        !selectedLocation
      ) {
        alert(
          "Lokasi wajib dipilih."
        );

        locationInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // VALIDASI SKU
      // ---------------------------------------------------

      if (!selectedSku) {
        alert(
          "SKU wajib diisi atau scan barcode."
        );

        skuInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // VALIDASI QTY
      // ---------------------------------------------------

      if (
        qty === "" ||
        !Number.isFinite(
          countQty
        ) ||
        countQty < 0
      ) {
        alert(
          "Qty harus berupa angka 0 atau lebih."
        );

        return;
      }

      // ---------------------------------------------------
      // CARI SOURCE
      // ---------------------------------------------------

      const sourceRow =
        sourceRows.find(
          (item) =>
            normalizeUpper(
              item.location
            ) ===
              selectedLocation &&
            normalizeUpper(
              item.sku
            ) ===
              selectedSku
        );

      if (!sourceRow) {
        alert(
          `SKU ${selectedSku} tidak memiliki selisih Second Count di lokasi ${selectedLocation}.`
        );

        skuInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // SECOND DIFFERENCE
      // ---------------------------------------------------

      const secondDifference =
        numberValue(
          sourceRow.second_difference
        );

      if (
        secondDifference === 0
      ) {
        alert(
          "SKU ini tidak memiliki selisih Second Count."
        );

        return;
      }

      // ---------------------------------------------------
      // DATA
      // ---------------------------------------------------

      const stockExisting =
        numberValue(
          sourceRow.stock_existing
        );

      const firstQty =
        numberValue(
          sourceRow.first_qty
        );

      const firstDifference =
        numberValue(
          sourceRow.first_difference
        );

      const secondQty =
        numberValue(
          sourceRow.second_qty
        );

      // ---------------------------------------------------
      // HITUNG THIRD DIFFERENCE
      // ---------------------------------------------------

      const thirdDifference =
        countQty -
        stockExisting;

      const status =
        getDifferenceStatus(
          thirdDifference
        );

      // ---------------------------------------------------
      // SAVE
      // ---------------------------------------------------

      setSaving(true);

      try {
        const {
          error,
        } = await supabase
          .from(
            "third_count"
          )
          .upsert(
            {
              second_count_id:
                sourceRow.second_count_id,

              first_count_id:
                sourceRow.first_count_id,

              location:
                selectedLocation,

              sku:
                selectedSku,

              deskripsi:
                sourceRow.deskripsi,

              stock_existing:
                stockExisting,

              first_qty:
                firstQty,

              first_difference:
                firstDifference,

              second_qty:
                secondQty,

              second_difference:
                secondDifference,

              third_qty:
                countQty,

              third_difference:
                thirdDifference,

              status,

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "second_count_id",
            }
          );

        if (error) {
          throw error;
        }

        // =================================================
        // RESET SKU + QTY
        // =================================================

        setSku("");
        setQty("");

        setShowSkuDropdown(
          false
        );

        setShowLocationDropdown(
          false
        );

        // =================================================
        // REFRESH DATA
        // =================================================

        await loadThirdCount();

        // =================================================
        // KEEP LOCATION
        // =================================================

        if (
          keepLocation
        ) {
          setTimeout(() => {
            skuInputRef.current?.focus();
          }, 100);
        } else {
          setLocation("");

          setTimeout(() => {
            locationInputRef.current?.focus();
          }, 100);
        }

      } catch (error) {
        console.error(
          "Gagal menyimpan Third Count:",
          error
        );

        alert(
          "Gagal menyimpan Third Count."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  // =======================================================
  // SUMMARY
  // =======================================================

  const totalDifference =
    sourceRows.length;

  const totalThirdCount =
    thirdCounts.filter(
      (item) =>
        item.third_qty !==
        null
    ).length;

  const totalExcess =
    sourceRows.filter(
      (item) =>
        numberValue(
          item.second_difference
        ) > 0
    ).length;

  const totalShortage =
    sourceRows.filter(
      (item) =>
        numberValue(
          item.second_difference
        ) < 0
    ).length;

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">

        <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow">

          <Loader2
            size={22}
            className="animate-spin"
          />

          <span className="font-medium">
            Loading Third Count...
          </span>

        </div>

      </div>
    );
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <main className="min-h-screen bg-gray-50 pb-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-20 border-b bg-white shadow-sm">

        <div className="mx-auto max-w-2xl px-3 py-3">

          <div className="flex items-center justify-between gap-3">

            {/* BACK */}

            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold active:scale-95"
            >

              <ArrowLeftCircle
                size={20}
              />

              <span>
                Kembali
              </span>

            </button>

            {/* TITLE */}

            <div className="flex-1 text-center">

              <h1 className="text-lg font-bold">
                Third Count
              </h1>

              <p className="text-[11px] text-gray-500">
                Follow-up selisih Second Count
              </p>

            </div>

            {/* REFRESH */}

            <button
              type="button"
              onClick={
                loadThirdCount
              }
              disabled={
                loading
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white active:scale-95 disabled:opacity-50"
            >

              <RefreshCw
                size={19}
              />

            </button>

          </div>

        </div>

      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-2xl px-3 py-4">

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="mb-3 grid grid-cols-3 gap-2">

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Selisih
            </div>

            <div className="mt-1 text-xl font-bold">
              {
                totalDifference
              }
            </div>

          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Excess
            </div>

            <div className="mt-1 text-xl font-bold">
              {
                totalExcess
              }
            </div>

          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Shortage
            </div>

            <div className="mt-1 text-xl font-bold">
              {
                totalShortage
              }
            </div>

          </div>

        </section>

        {/* =================================================
            FORM
        ================================================= */}

        <section className="rounded-2xl bg-white p-4 shadow-sm">

          {/* TITLE */}

          <div className="mb-4 flex items-center gap-2">

            <ScanLine
              size={20}
            />

            <div>

              <h2 className="font-bold">
                Input Third Count
              </h2>

              <p className="text-xs text-gray-500">
                Hanya SKU yang masih memiliki selisih Second Count.
              </p>

            </div>

          </div>

          {/* =================================================
              LOCATION
          ================================================= */}

          <div className="relative mb-3">

            <label className="mb-1 block text-sm font-semibold">
              Lokasi
            </label>

            <div className="flex gap-2">

              <div className="relative flex-1">

                <MapPin
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  ref={
                    locationInputRef
                  }
                  type="text"
                  value={
                    location
                  }
                  onChange={(e) =>
                    handleLocationChange(
                      e.target.value
                    )
                  }
                  onFocus={() =>
                    setShowLocationDropdown(
                      true
                    )
                  }
                  onKeyDown={(e) => {

                    if (
                      e.key ===
                      "Enter"
                    ) {
                      e.preventDefault();

                      handleLocationEnter();
                    }

                    if (
                      e.key ===
                      "Escape"
                    ) {
                      setShowLocationDropdown(
                        false
                      );
                    }

                  }}
                  placeholder="Ketik atau pilih lokasi"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="h-14 w-full rounded-xl border pl-11 pr-11 text-base font-semibold uppercase outline-none focus:border-black"
                />

                <ChevronDown
                  size={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

              </div>

              {/* KEEP */}

              <button
                type="button"
                onClick={() =>
                  setKeepLocation(
                    !keepLocation
                  )
                }
                className={`h-14 rounded-xl border px-4 text-sm font-bold ${
                  keepLocation
                    ? "border-black bg-black text-white"
                    : "bg-white text-gray-600"
                }`}
              >

                {
                  keepLocation
                    ? "KEEP ✓"
                    : "KEEP"
                }

              </button>

            </div>

            <p className="mt-1 text-[11px] text-gray-400">

              {
                keepLocation
                  ? "Lokasi tetap setelah simpan."
                  : "Lokasi kosong setelah simpan."
              }

            </p>

            {/* LOCATION DROPDOWN */}

            {showLocationDropdown &&
              filteredLocations.length >
                0 && (

                <div className="absolute left-0 right-[76px] top-[76px] z-40 max-h-60 overflow-y-auto rounded-xl border bg-white shadow-xl">

                  {
                    filteredLocations.map(
                      (item) => (

                        <button
                          key={item}
                          type="button"
                          onMouseDown={(
                            e
                          ) => {

                            e.preventDefault();

                            selectLocation(
                              item
                            );

                          }}
                          className="flex w-full items-center gap-3 border-b px-3 py-3 text-left last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
                        >

                          <MapPin
                            size={18}
                            className="text-gray-400"
                          />

                          <span className="font-bold">
                            {item}
                          </span>

                        </button>

                      )
                    )
                  }

                </div>

              )}

          </div>

          {/* =================================================
              SKU
          ================================================= */}

          <div className="relative mb-3">

            <label className="mb-1 block text-sm font-semibold">
              SKU
            </label>

            <div className="relative">

              <ScanLine
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                ref={
                  skuInputRef
                }
                type="text"
                value={
                  sku
                }
                onChange={(e) =>
                  handleSkuChange(
                    e.target.value
                  )
                }
                onFocus={() =>
                  setShowSkuDropdown(
                    true
                  )
                }
                onKeyDown={(e) => {

                  if (
                    e.key ===
                    "Enter"
                  ) {
                    e.preventDefault();

                    handleSkuEnter();
                  }

                  if (
                    e.key ===
                    "Escape"
                  ) {
                    setShowSkuDropdown(
                      false
                    );
                  }

                }}
                placeholder={
                  location
                    ? "Scan atau ketik SKU"
                    : "Pilih lokasi dulu"
                }
                autoComplete="off"
                autoCapitalize="characters"
                disabled={
                  !location
                }
                className="h-14 w-full rounded-xl border pl-11 pr-11 text-base font-semibold uppercase outline-none focus:border-black disabled:bg-gray-100"
              />

              <ChevronDown
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

            </div>

            <p className="mt-1 text-[11px] text-gray-400">
              Scan barcode atau ketik SKU.
            </p>

            {/* SKU DROPDOWN */}

            {showSkuDropdown &&
              location &&
              filteredSkuOptions.length >
                0 && (

                <div className="absolute left-0 right-0 top-[76px] z-30 max-h-72 overflow-y-auto rounded-xl border bg-white shadow-xl">

                  {
                    filteredSkuOptions.map(
                      (item) => (

                        <button
                          key={
                            item.sku
                          }
                          type="button"
                          onMouseDown={(
                            e
                          ) => {

                            e.preventDefault();

                            selectSku(
                              item.sku
                            );

                          }}
                          className="w-full border-b px-3 py-3 text-left last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
                        >

                          <div className="flex items-center justify-between gap-2">

                            <div className="font-bold">
                              {
                                item.sku
                              }
                            </div>

                            <div
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                item.status ===
                                "EXCESS"
                                  ? "bg-gray-200 text-gray-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {
                                item.status
                              }
                            </div>

                          </div>

                          {item.deskripsi && (

                            <div className="mt-1 text-xs text-gray-500">
                              {
                                item.deskripsi
                              }
                            </div>

                          )}

                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">

                            <span>
                              Stock:{" "}
                              {
                                formatNumber(
                                  item.stockExisting
                                )
                              }
                            </span>

                            <span>
                              First:{" "}
                              {
                                formatNumber(
                                  item.firstQty
                                )
                              }
                            </span>

                            <span>
                              Second:{" "}
                              {
                                formatNumber(
                                  item.secondQty
                                )
                              }
                            </span>

                          </div>

                          <div className="mt-1 text-xs font-semibold">

                            Selisih Second:{" "}

                            {
                              item.secondDifference >
                              0
                                ? "+"
                                : ""
                            }

                            {
                              formatNumber(
                                item.secondDifference
                              )
                            }

                          </div>

                        </button>

                      )
                    )
                  }

                </div>

              )}

          </div>

          {/* =================================================
              COUNT INFORMATION
          ================================================= */}

          {selectedSource && (

            <div className="mb-3 rounded-xl border bg-gray-50 p-3">

              <div className="mb-2 flex items-center justify-between">

                <div className="text-xs font-semibold text-gray-500">
                  Hasil Counting
                </div>

                <div
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    selectedSource.status ===
                    "EXCESS"
                      ? "bg-gray-200 text-gray-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {
                    selectedSource.status
                  }
                </div>

              </div>

              <div className="grid grid-cols-4 gap-2">

                <div>

                  <div className="text-[10px] text-gray-400">
                    Stock
                  </div>

                  <div className="font-bold">
                    {
                      formatNumber(
                        selectedSource.stockExisting
                      )
                    }
                  </div>

                </div>

                <div>

                  <div className="text-[10px] text-gray-400">
                    First
                  </div>

                  <div className="font-bold">
                    {
                      formatNumber(
                        selectedSource.firstQty
                      )
                    }
                  </div>

                </div>

                <div>

                  <div className="text-[10px] text-gray-400">
                    Second
                  </div>

                  <div className="font-bold">
                    {
                      formatNumber(
                        selectedSource.secondQty
                      )
                    }
                  </div>

                </div>

                <div>

                  <div className="text-[10px] text-gray-400">
                    Selisih
                  </div>

                  <div className="font-bold">

                    {
                      selectedSource.secondDifference >
                      0
                        ? "+"
                        : ""
                    }

                    {
                      formatNumber(
                        selectedSource.secondDifference
                      )
                    }

                  </div>

                </div>

              </div>

              {selectedSource.description && (

                <div className="mt-2 text-xs text-gray-500">
                  {
                    selectedSource.description
                  }
                </div>

              )}

            </div>

          )}

          {/* =================================================
              THIRD COUNT EXISTING
          ================================================= */}

          {selectedThirdCount &&
            selectedThirdCount.third_qty !==
              null && (

              <div className="mb-3 rounded-xl bg-gray-100 p-3">

                <div className="text-xs text-gray-500">
                  Third Count Sebelumnya
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {
                    formatNumber(
                      numberValue(
                        selectedThirdCount.third_qty
                      )
                    )
                  }
                </div>

                <div className="mt-1 text-xs text-gray-500">

                  Selisih Third:{" "}

                  {
                    numberValue(
                      selectedThirdCount.third_difference
                    ) > 0
                      ? "+"
                      : ""
                  }

                  {
                    formatNumber(
                      numberValue(
                        selectedThirdCount.third_difference
                      )
                    )
                  }

                </div>

                <div className="mt-1 text-xs font-semibold">

                  Status:{" "}

                  {
                    selectedThirdCount.status ??
                    "-"
                  }

                </div>

              </div>

            )}

          {/* =================================================
              QTY
          ================================================= */}

          <div className="mb-4">

            <label className="mb-1 block text-sm font-semibold">
              Qty Third Count
            </label>

            <input
              id="qty-third-count"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={
                qty
              }
              onChange={(e) =>
                setQty(
                  e.target.value
                )
              }
              onKeyDown={(e) => {

                if (
                  e.key ===
                  "Enter"
                ) {
                  e.preventDefault();

                  saveThirdCount();
                }

              }}
              placeholder="Masukkan qty"
              className="h-14 w-full rounded-xl border px-4 text-xl font-bold outline-none focus:border-black"
            />

          </div>

          {/* =================================================
              SAVE
          ================================================= */}

          <button
            type="button"
            onClick={
              saveThirdCount
            }
            disabled={
              saving
            }
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-black text-base font-bold text-white disabled:opacity-50"
          >

            {saving ? (
              <>

                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Menyimpan...

              </>
            ) : (
              <>

                <CheckCircle2
                  size={20}
                />

                SIMPAN THIRD COUNT

              </>
            )}

          </button>

        </section>

        {/* =================================================
            INFO
        ================================================= */}

        <div className="mt-3 rounded-xl bg-white p-3 text-xs text-gray-500 shadow-sm">

          <div className="font-semibold text-gray-700">
            Alur Third Count
          </div>

          <div className="mt-1">
            Data diambil dari Second Count
            yang masih memiliki selisih.
          </div>

          <div className="mt-1">
            EXCESS = Second Count lebih besar
            dari Stock Existing.
          </div>

          <div className="mt-1">
            SHORTAGE = Second Count lebih kecil
            dari Stock Existing.
          </div>

          <div className="mt-1">
            MATCH = tidak dilempar ke Third Count.
          </div>

          <div className="mt-1">
            Sudah di-Third Count:{" "}
            <span className="font-semibold text-gray-700">
              {
                totalThirdCount
              }
            </span>
          </div>

          <div className="mt-1">
            Lokasi belum selesai:{" "}
            <span className="font-semibold text-gray-700">
              {
                locations.length
              }
            </span>
          </div>

        </div>

      </div>

    </main>
  );
}
