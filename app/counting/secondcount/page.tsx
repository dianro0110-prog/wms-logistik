
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

type SecondCountSourceRow = {
  first_count_id: number;

  location: string | null;
  sku: string | null;
  deskripsi: string | null;

  stock_existing: number | null;
  first_qty: number | null;
  first_difference: number | null;

  first_status:
    | "EXCESS"
    | "SHORTAGE"
    | null;
};

type SecondCountRow = {
  id: number;

  first_count_id: number;

  location: string | null;
  sku: string | null;
  deskripsi: string | null;

  stock_existing: number | null;

  first_qty: number | null;
  first_difference: number | null;

  second_qty: number | null;
  second_difference: number | null;

  status: DifferenceStatus | null;
};

type SkuOption = {
  sku: string;
  deskripsi: string;

  stockExisting: number;
  firstQty: number;
  firstDifference: number;

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

export default function SecondCountPage() {
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
  ] = useState<SecondCountSourceRow[]>([]);

  const [
    secondCounts,
    setSecondCounts,
  ] = useState<SecondCountRow[]>([]);

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
  // LOAD DATA
  // =======================================================

  const loadSecondCount =
    async () => {
      try {
        setLoading(true);

        // =================================================
        // 1. AMBIL SUMBER SECOND COUNT
        //    DARI FIRST COUNT YANG SELISIH
        // =================================================

        const {
          data: sourceData,
          error: sourceError,
        } = await supabase
          .from("second_count_source")
          .select(`
            first_count_id,
            location,
            sku,
            deskripsi,
            stock_existing,
            first_qty,
            first_difference,
            first_status
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
          (sourceData ?? []) as SecondCountSourceRow[]
        );

        // =================================================
        // 2. AMBIL HASIL SECOND COUNT
        // =================================================

        const {
          data: secondData,
          error: secondError,
        } = await supabase
          .from("second_count")
          .select(`
            id,
            first_count_id,
            location,
            sku,
            deskripsi,
            stock_existing,
            first_qty,
            first_difference,
            second_qty,
            second_difference,
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

        if (secondError) {
          throw secondError;
        }

        setSecondCounts(
          (secondData ?? []) as SecondCountRow[]
        );

      } catch (error) {
        console.error(
          "Gagal mengambil Second Count:",
          error
        );

        alert(
          "Gagal mengambil data Second Count."
        );
      } finally {
        setLoading(false);
      }
    };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadSecondCount();
  }, []);

  // =======================================================
  // HELPER:
  // CEK APAKAH SKU SUDAH SELESAI SECOND COUNT
  // =======================================================

  const isSecondCountCompleted = (
    firstCountId: number
  ) => {
    return secondCounts.some(
      (item) =>
        item.first_count_id ===
          firstCountId &&
        item.second_qty !== null
    );
  };

  // =======================================================
  // LOCATIONS
  //
  // HANYA LOKASI YANG BELUM FULL
  //
  // Contoh:
  //
  // A:
  // SKU 1 = selesai
  // SKU 2 = selesai
  // SKU 3 = belum
  //
  // => A MASIH MUNCUL
  //
  // B:
  // SKU 1 = selesai
  // SKU 2 = selesai
  //
  // => B HILANG
  // =======================================================

  const locations =
    useMemo(() => {

      // ---------------------------------------------------
      // TOTAL SKU SELISIH PER LOCATION
      // ---------------------------------------------------

      const totalByLocation =
        new Map<string, number>();

      sourceRows.forEach(
        (item) => {
          const loc =
            normalizeUpper(
              item.location
            );

          if (!loc) {
            return;
          }

          const difference =
            numberValue(
              item.first_difference
            );

          // HANYA SKU YANG MEMANG
          // MASUK SECOND COUNT
          if (difference === 0) {
            return;
          }

          totalByLocation.set(
            loc,
            (totalByLocation.get(loc) ?? 0) + 1
          );
        }
      );

      // ---------------------------------------------------
      // JUMLAH SKU YANG SUDAH SELESAI
      // PER LOCATION
      // ---------------------------------------------------

      const completedByLocation =
        new Map<string, Set<number>>();

      sourceRows.forEach(
        (item) => {

          const loc =
            normalizeUpper(
              item.location
            );

          const difference =
            numberValue(
              item.first_difference
            );

          if (
            !loc ||
            difference === 0
          ) {
            return;
          }

          const completed =
            secondCounts.some(
              (second) =>
                second.first_count_id ===
                  item.first_count_id &&
                second.second_qty !== null
            );

          if (!completed) {
            return;
          }

          if (
            !completedByLocation.has(
              loc
            )
          ) {
            completedByLocation.set(
              loc,
              new Set<number>()
            );
          }

          completedByLocation
            .get(loc)!
            .add(
              item.first_count_id
            );
        }
      );

      // ---------------------------------------------------
      // FILTER LOKASI YANG BELUM FULL
      // ---------------------------------------------------

      return Array.from(
        totalByLocation.entries()
      )
        .filter(
          ([loc, total]) => {

            const completed =
              completedByLocation
                .get(loc)
                ?.size ?? 0;

            return completed < total;
          }
        )
        .map(
          ([loc]) => loc
        )
        .sort();

    }, [
      sourceRows,
      secondCounts,
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
        .slice(
          0,
          30
        );

    }, [
      location,
      locations,
    ]);

  // =======================================================
  // SKU OPTIONS
  //
  // SKU YANG SUDAH SELESAI SECOND COUNT
  // TIDAK MUNCUL LAGI
  // =======================================================

  const skuOptions =
    useMemo<SkuOption[]>(() => {

      const map =
        new Map<
          string,
          SkuOption
        >();

      sourceRows
        .filter(
          (item) => {

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
          }
        )
        .forEach(
          (item) => {

            const itemSku =
              normalizeUpper(
                item.sku
              );

            if (!itemSku) {
              return;
            }

            const difference =
              numberValue(
                item.first_difference
              );

            // HANYA YANG SELISIH
            if (
              difference === 0
            ) {
              return;
            }

            // ------------------------------------------------
            // SKU SUDAH SELESAI SECOND COUNT?
            // JANGAN TAMPILKAN LAGI
            // ------------------------------------------------

            if (
              isSecondCountCompleted(
                item.first_count_id
              )
            ) {
              return;
            }

            const status =
              difference > 0
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
                  difference,

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
      secondCounts,
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
        .slice(
          0,
          30
        );

    }, [
      sku,
      skuOptions,
    ]);

  // =======================================================
  // SELECTED FIRST COUNT
  // =======================================================

  const selectedFirstCount =
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

      const difference =
        numberValue(
          row.first_difference
        );

      if (
        difference === 0
      ) {
        return null;
      }

      return {
        id:
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
          difference,

        status:
          getDifferenceStatus(
            difference
          ),
      };

    }, [
      sourceRows,
      location,
      sku,
    ]);

  // =======================================================
  // SECOND COUNT EXISTING
  // =======================================================

  const selectedSecondCount =
    useMemo(() => {

      if (
        !selectedFirstCount
      ) {
        return null;
      }

      return (
        secondCounts.find(
          (item) =>
            item.first_count_id ===
            selectedFirstCount.id
        ) ?? null
      );

    }, [
      secondCounts,
      selectedFirstCount,
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

    // -----------------------------------------------------
    // PASTIKAN LOKASI MASIH TERSEDIA
    // -----------------------------------------------------

    if (
      !locations.includes(
        selected
      )
    ) {
      alert(
        `Lokasi ${selected} sudah selesai Second Count.`
      );

      return;
    }

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

      // ---------------------------------------------------
      // EXACT LOCATION
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // JIKA LOKASI SUDAH FULL
      // ---------------------------------------------------

      const sourceHasLocation =
        sourceRows.some(
          (item) => {

            const itemLocation =
              normalizeUpper(
                item.location
              );

            const difference =
              numberValue(
                item.first_difference
              );

            return (
              itemLocation ===
                value &&
              difference !== 0
            );
          }
        );

      if (
        sourceHasLocation &&
        !locations.includes(
          value
        )
      ) {

        alert(
          `Lokasi ${value} sudah selesai Second Count.`
        );

        setLocation("");

        setSku("");

        setQty("");

        locationInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // FIRST MATCH
      // ---------------------------------------------------

      const firstMatch =
        filteredLocations[0];

      if (firstMatch) {

        selectLocation(
          firstMatch
        );

        return;
      }

      alert(
        `Lokasi ${value} tidak memiliki data selisih First Count.`
      );

      locationInputRef.current?.focus();
    };

  // =======================================================
  // SELECT SKU
  // =======================================================

  const selectSku = (
    value: string
  ) => {

    const selected =
      normalizeUpper(
        value
      );

    // -----------------------------------------------------
    // PASTIKAN SKU MASIH BELUM SELESAI
    // -----------------------------------------------------

    const available =
      skuOptions.some(
        (item) =>
          normalizeUpper(
            item.sku
          ) === selected
      );

    if (!available) {

      alert(
        `SKU ${selected} sudah selesai Second Count atau tidak tersedia.`
      );

      return;
    }

    setSku(
      selected
    );

    setShowSkuDropdown(
      false
    );

    setTimeout(() => {
      document
        .getElementById(
          "qty-second-count"
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

      // ---------------------------------------------------
      // CEK APAKAH SKU SUDAH SELESAI
      // ---------------------------------------------------

      const sourceRow =
        sourceRows.find(
          (item) =>
            normalizeUpper(
              item.location
            ) ===
              normalizeUpper(
                location
              ) &&
            normalizeUpper(
              item.sku
            ) === value
        );

      if (
        sourceRow &&
        numberValue(
          sourceRow.first_difference
        ) !== 0 &&
        isSecondCountCompleted(
          sourceRow.first_count_id
        )
      ) {

        alert(
          `SKU ${value} sudah selesai Second Count.`
        );

        setSku("");

        setQty("");

        skuInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // FIRST MATCH
      // ---------------------------------------------------

      const firstMatch =
        filteredSkuOptions[0];

      if (firstMatch) {

        selectSku(
          firstMatch.sku
        );

        return;
      }

      alert(
        `SKU ${value} tidak memiliki selisih First Count di lokasi ${location}.`
      );

      skuInputRef.current?.focus();
    };

  // =======================================================
  // SAVE SECOND COUNT
  // =======================================================

  const saveSecondCount =
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
      // PASTIKAN LOKASI BELUM FULL
      // ---------------------------------------------------

      if (
        !locations.includes(
          selectedLocation
        )
      ) {

        alert(
          `Lokasi ${selectedLocation} sudah selesai Second Count.`
        );

        setLocation("");

        setSku("");

        setQty("");

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
      // CARI SUMBER FIRST COUNT
      // ---------------------------------------------------

      const firstRow =
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

      if (!firstRow) {

        alert(
          `SKU ${selectedSku} tidak memiliki selisih First Count di lokasi ${selectedLocation}.`
        );

        skuInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // FIRST DIFFERENCE
      // ---------------------------------------------------

      const firstDifference =
        numberValue(
          firstRow.first_difference
        );

      if (
        firstDifference === 0
      ) {

        alert(
          "SKU ini tidak memiliki selisih First Count."
        );

        return;
      }

      // ---------------------------------------------------
      // CEK SKU SUDAH SELESAI
      // ---------------------------------------------------

      const alreadyCompleted =
        isSecondCountCompleted(
          firstRow.first_count_id
        );

      if (
        alreadyCompleted
      ) {

        alert(
          `SKU ${selectedSku} sudah selesai Second Count.`
        );

        setSku("");

        setQty("");

        skuInputRef.current?.focus();

        return;
      }

      // ---------------------------------------------------
      // DATA FIRST COUNT
      // ---------------------------------------------------

      const stockExisting =
        numberValue(
          firstRow.stock_existing
        );

      const firstQty =
        numberValue(
          firstRow.first_qty
        );

      // ---------------------------------------------------
      // SECOND DIFFERENCE
      //
      // second_qty - stock_existing
      // ---------------------------------------------------

      const secondDifference =
        countQty -
        stockExisting;

      const status =
        getDifferenceStatus(
          secondDifference
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
            "second_count"
          )
          .upsert(
            {
              first_count_id:
                firstRow.first_count_id,

              location:
                selectedLocation,

              sku:
                selectedSku,

              deskripsi:
                firstRow.deskripsi,

              stock_existing:
                stockExisting,

              first_qty:
                firstQty,

              first_difference:
                firstDifference,

              second_qty:
                countQty,

              second_difference:
                secondDifference,

              status,

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "first_count_id",
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
        //
        // PENTING:
        //
        // Setelah SKU terakhir selesai,
        // locations akan menghitung ulang.
        //
        // Lokasi otomatis hilang dari dropdown.
        // =================================================

        await loadSecondCount();

        // =================================================
        // KEEP LOCATION
        // =================================================

        if (
          keepLocation
        ) {

          // ------------------------------------------------
          // CEK SETELAH REFRESH:
          // APAKAH LOKASI MASIH ADA?
          // ------------------------------------------------

          const locationStillAvailable =
            sourceRows.some(
              (item) =>
                normalizeUpper(
                  item.location
                ) ===
                  selectedLocation &&
                numberValue(
                  item.first_difference
                ) !== 0 &&
                !isSecondCountCompleted(
                  item.first_count_id
                )
            );

          // ------------------------------------------------
          // KARENA STATE REACT BELUM TENTU
          // LANGSUNG BERUBAH DI SINI,
          // KITA GUNAKAN TIMEOUT UNTUK UX.
          // ------------------------------------------------

          if (
            locationStillAvailable
          ) {

            setLocation(
              selectedLocation
            );

            setTimeout(() => {
              skuInputRef.current?.focus();
            }, 100);

          } else {

            setLocation("");

            setTimeout(() => {
              locationInputRef.current?.focus();
            }, 100);
          }

        } else {

          setLocation("");

          setTimeout(() => {
            locationInputRef.current?.focus();
          }, 100);
        }

      } catch (error) {

        console.error(
          "Gagal menyimpan Second Count:",
          error
        );

        alert(
          "Gagal menyimpan Second Count."
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
    sourceRows.filter(
      (item) =>
        numberValue(
          item.first_difference
        ) !== 0
    ).length;

  const totalSecondCount =
    secondCounts.filter(
      (item) =>
        item.second_qty !== null
    ).length;

  const totalExcess =
    sourceRows.filter(
      (item) =>
        numberValue(
          item.first_difference
        ) > 0
    ).length;

  const totalShortage =
    sourceRows.filter(
      (item) =>
        numberValue(
          item.first_difference
        ) < 0
    ).length;

  // =======================================================
  // TOTAL LOCATION SELESAI
  // =======================================================

  const totalLocation =
    locations.length;

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
            Loading Second Count...
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
                Second Count
              </h1>

              <p className="text-[11px] text-gray-500">
                Follow-up selisih First Count
              </p>

            </div>

            {/* REFRESH */}

            <button
              type="button"
              onClick={
                loadSecondCount
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

        <section className="mb-3 grid grid-cols-4 gap-2">

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Selisih
            </div>

            <div className="mt-1 text-xl font-bold">
              {totalDifference}
            </div>

          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Excess
            </div>

            <div className="mt-1 text-xl font-bold">
              {totalExcess}
            </div>

          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Shortage
            </div>

            <div className="mt-1 text-xl font-bold">
              {totalShortage}
            </div>

          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm">

            <div className="text-[11px] text-gray-500">
              Lokasi Aktif
            </div>

            <div className="mt-1 text-xl font-bold">
              {totalLocation}
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
                Input Second Count
              </h2>

              <p className="text-xs text-gray-500">
                Hanya SKU dengan selisih First Count yang belum selesai.
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

                {keepLocation
                  ? "KEEP ✓"
                  : "KEEP"}

              </button>

            </div>

            <p className="mt-1 text-[11px] text-gray-400">

              {keepLocation
                ? "Lokasi tetap selama masih ada SKU yang belum selesai."
                : "Lokasi kosong setelah simpan."}

            </p>

            {/* LOCATION DROPDOWN */}

            {showLocationDropdown &&
              filteredLocations.length >
                0 && (

                <div className="absolute left-0 right-[76px] top-[76px] z-40 max-h-60 overflow-y-auto rounded-xl border bg-white shadow-xl">

                  {filteredLocations.map(
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
                  )}

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

                  {filteredSkuOptions.map(
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
                            {item.sku}
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

                        <div className="mt-1 flex gap-3 text-xs text-gray-400">

                          <span>
                            Stock:{" "}
                            {formatNumber(
                              item.stockExisting
                            )}
                          </span>

                          <span>
                            First:{" "}
                            {formatNumber(
                              item.firstQty
                            )}
                          </span>

                        </div>

                        <div className="mt-1 text-xs font-semibold">

                          Selisih First:{" "}

                          {item.firstDifference >
                          0
                            ? "+"
                            : ""}

                          {formatNumber(
                            item.firstDifference
                          )}

                        </div>

                      </button>

                    )
                  )}

                </div>
              )}

          </div>

          {/* =================================================
              FIRST COUNT INFORMATION
          ================================================= */}

          {selectedFirstCount && (

            <div className="mb-3 rounded-xl border bg-gray-50 p-3">

              <div className="mb-2 flex items-center justify-between">

                <div className="text-xs font-semibold text-gray-500">
                  Hasil First Count
                </div>

                <div
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                    selectedFirstCount.status ===
                    "EXCESS"
                      ? "bg-gray-200 text-gray-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {
                    selectedFirstCount.status
                  }
                </div>

              </div>

              <div className="grid grid-cols-3 gap-2">

                <div>

                  <div className="text-[10px] text-gray-400">
                    Stock
                  </div>

                  <div className="font-bold">
                    {formatNumber(
                      selectedFirstCount.stockExisting
                    )}
                  </div>

                </div>

                <div>

                  <div className="text-[10px] text-gray-400">
                    First Count
                  </div>

                  <div className="font-bold">
                    {formatNumber(
                      selectedFirstCount.firstQty
                    )}
                  </div>

                </div>

                <div>

                  <div className="text-[10px] text-gray-400">
                    Selisih
                  </div>

                  <div className="font-bold">

                    {selectedFirstCount.firstDifference >
                    0
                      ? "+"
                      : ""}

                    {formatNumber(
                      selectedFirstCount.firstDifference
                    )}

                  </div>

                </div>

              </div>

              {selectedFirstCount.description && (

                <div className="mt-2 text-xs text-gray-500">
                  {
                    selectedFirstCount.description
                  }
                </div>

              )}

            </div>
          )}

          {/* =================================================
              SECOND COUNT EXISTING
          ================================================= */}

          {selectedSecondCount &&
            selectedSecondCount.second_qty !==
              null && (

              <div className="mb-3 rounded-xl bg-gray-100 p-3">

                <div className="text-xs text-gray-500">
                  Second Count Sebelumnya
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {formatNumber(
                    numberValue(
                      selectedSecondCount.second_qty
                    )
                  )}
                </div>

                <div className="mt-1 text-xs text-gray-500">

                  Selisih Second:{" "}

                  {numberValue(
                    selectedSecondCount.second_difference
                  ) > 0
                    ? "+"
                    : ""}

                  {formatNumber(
                    numberValue(
                      selectedSecondCount.second_difference
                    )
                  )}

                </div>

                <div className="mt-1 text-xs font-semibold">

                  Status:{" "}

                  {
                    selectedSecondCount.status ??
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
              Qty Second Count
            </label>

            <input
              id="qty-second-count"
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

                  saveSecondCount();
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
              saveSecondCount
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

                SIMPAN SECOND COUNT
              </>

            )}

          </button>

        </section>

        {/* =================================================
            INFO
        ================================================= */}

        <div className="mt-3 rounded-xl bg-white p-3 text-xs text-gray-500 shadow-sm">

          <div className="font-semibold text-gray-700">
            Alur Second Count
          </div>

          <div className="mt-1">
            Data diambil langsung dari
            selisih First Count.
          </div>

          <div className="mt-1">
            EXCESS = First Count lebih besar
            dari Stock Existing.
          </div>

          <div className="mt-1">
            SHORTAGE = First Count lebih kecil
            dari Stock Existing.
          </div>

          <div className="mt-1">
            MATCH = tidak dilempar ke Second Count.
          </div>

          <div className="mt-1">
            SKU yang sudah selesai Second Count
            tidak muncul lagi di dropdown.
          </div>

          <div className="mt-1">
            Lokasi yang semua SKU selisihnya sudah
            selesai Second Count juga tidak muncul lagi.
          </div>

          <div className="mt-1">
            Sudah di-Second Count:{" "}
            <span className="font-semibold text-gray-700">
              {
                totalSecondCount
              }
            </span>
          </div>

        </div>

      </div>

    </main>
  );
}
