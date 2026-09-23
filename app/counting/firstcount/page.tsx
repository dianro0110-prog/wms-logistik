"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type InventoryRow = {
id?: number;
location: string | null;
sku: string | null;
deskripsi: string | null;
quantity: number | null;
};

type SkuOption = {
sku: string;
deskripsi: string;
stock: number;
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

const numberValue = (value: unknown) => {
const n = Number(value);

return Number.isFinite(n) ? n : 0;
};

const formatNumber = (value: number) => {
return new Intl.NumberFormat("id-ID", {
maximumFractionDigits: 2,
}).format(value);
};

// =========================================================
// COMPONENT
// =========================================================

export default function FirstCountPage() {
const router = useRouter();

// =======================================================
// REFS
// =======================================================

const locationInputRef =
useRef<HTMLInputElement>(null);

const skuInputRef =
useRef<HTMLInputElement>(null);

// =======================================================
// DATA
// =======================================================

const [inventory, setInventory] =
useState<InventoryRow[]>([]);

// =======================================================
// FORM
// =======================================================

const [location, setLocation] =
useState("");

const [sku, setSku] =
useState("");

const [qty, setQty] =
useState("");

// =======================================================
// KEEP LOCATION
// =======================================================

const [keepLocation, setKeepLocation] =
useState(false);

// =======================================================
// DROPDOWN
// =======================================================

const [showLocationDropdown, setShowLocationDropdown] =
useState(false);

const [showSkuDropdown, setShowSkuDropdown] =
useState(false);

// =======================================================
// STATE
// =======================================================

const [loading, setLoading] =
useState(true);

const [saving, setSaving] =
useState(false);

// =======================================================
// LOAD INVENTORY
// =======================================================

const loadInventory = async () => {
try {
setLoading(true);


  const { data, error } =
    await supabase
      .from("inventory")
      .select(
        "id, location, sku, deskripsi, quantity"
      )
      .order("location", {
        ascending: true,
      })
      .order("sku", {
        ascending: true,
      });

  if (error) {
    throw error;
  }

  setInventory(
    (data ?? []) as InventoryRow[]
  );
} catch (error) {
  console.error(
    "Gagal mengambil inventory:",
    error
  );

  alert(
    "Gagal mengambil data inventory."
  );
} finally {
  setLoading(false);
}


};

// =======================================================
// INITIAL LOAD
// =======================================================

useEffect(() => {
loadInventory();
}, []);

// =======================================================
// LOCATION LIST
// =======================================================

const locations = useMemo(() => {
const map = new Set<string>();


inventory.forEach((item) => {
  const value =
    normalizeUpper(
      item.location
    );

  if (value) {
    map.add(value);
  }
});

return Array.from(map).sort();


}, [inventory]);

// =======================================================
// FILTER LOCATION
// =======================================================

const filteredLocations =
useMemo(() => {
const keyword =
normalizeUpper(location);


  if (!keyword) {
    return locations.slice(
      0,
      30
    );
  }

  return locations
    .filter((item) =>
      item.includes(keyword)
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


  inventory
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
    .forEach((item) => {
      const itemSku =
        normalizeUpper(
          item.sku
        );

      if (!itemSku) {
        return;
      }

      const existing =
        map.get(itemSku);

      if (existing) {
        existing.stock +=
          numberValue(
            item.quantity
          );

        if (
          !existing.deskripsi &&
          item.deskripsi
        ) {
          existing.deskripsi =
            normalize(
              item.deskripsi
            );
        }
      } else {
        map.set(itemSku, {
          sku: itemSku,
          deskripsi:
            normalize(
              item.deskripsi
            ),
          stock:
            numberValue(
              item.quantity
            ),
        });
      }
    });

  return Array.from(
    map.values()
  ).sort((a, b) =>
    a.sku.localeCompare(
      b.sku
    )
  );
}, [
  inventory,
  location,
]);


// =======================================================
// FILTER SKU
// =======================================================

const filteredSkuOptions =
useMemo(() => {
const keyword =
normalizeUpper(sku);


  if (!keyword) {
    return skuOptions.slice(
      0,
      30
    );
  }

  return skuOptions
    .filter((item) => {
      return (
        item.sku.includes(
          keyword
        ) ||
        normalizeUpper(
          item.deskripsi
        ).includes(
          keyword
        )
      );
    })
    .slice(0, 30);
}, [
  sku,
  skuOptions,
]);


// =======================================================
// SELECTED INVENTORY
// =======================================================

const selectedInventory =
useMemo(() => {
if (!location || !sku) {
return null;
}


  const selectedLocation =
    normalizeUpper(
      location
    );

  const selectedSku =
    normalizeUpper(sku);

  const rows =
    inventory.filter(
      (item) =>
        normalizeUpper(
          item.location
        ) ===
          selectedLocation &&
        normalizeUpper(
          item.sku
        ) === selectedSku
    );

  if (rows.length === 0) {
    return null;
  }

  const stock =
    rows.reduce(
      (total, item) =>
        total +
        numberValue(
          item.quantity
        ),
      0
    );

  const description =
    rows.find((item) =>
      normalize(
        item.deskripsi
      )
    )?.deskripsi ?? "";

  return {
    stock,
    description,
  };
}, [
  inventory,
  location,
  sku,
]);


// =======================================================
// SELECT LOCATION
// =======================================================

const selectLocation = (
value: string
) => {
const selected =
normalizeUpper(value);


setLocation(selected);

// Reset SKU dan Qty
setSku("");
setQty("");

setShowLocationDropdown(
  false
);

setShowSkuDropdown(
  false
);

// Fokus SKU
setTimeout(() => {
  skuInputRef.current?.focus();
}, 100);


};

// =======================================================
// LOCATION INPUT
// =======================================================

const handleLocationChange = (
value: string
) => {
setLocation(
value.toUpperCase()
);


// Kalau lokasi berubah,
// SKU dan Qty harus reset
setSku("");
setQty("");

setShowLocationDropdown(
  true
);


};

// =======================================================
// LOCATION ENTER
// =======================================================

const handleLocationEnter = () => {
const value =
normalizeUpper(location);


if (!value) {
  return;
}

const exact =
  locations.find(
    (item) =>
      item === value
  );

if (exact) {
  selectLocation(exact);
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
  `Lokasi ${value} tidak ditemukan.`
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
normalizeUpper(value)
);


setShowSkuDropdown(
  false
);

setTimeout(() => {
  document
    .getElementById(
      "qty-first-count"
    )
    ?.focus();
}, 100);


};

// =======================================================
// SKU INPUT
// =======================================================

const handleSkuChange = (
value: string
) => {
const newValue =
value.toUpperCase();


setSku(newValue);

setShowSkuDropdown(
  true
);

// Auto detect SKU exact
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
  setSku(exact.sku);
}


};

// =======================================================
// SKU ENTER
// =======================================================

const handleSkuEnter = () => {
const value =
normalizeUpper(sku);


if (!value) {
  return;
}

// Exact SKU
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

// Ambil suggestion pertama
const firstMatch =
  filteredSkuOptions[0];

if (firstMatch) {
  selectSku(
    firstMatch.sku
  );

  return;
}

alert(
  `SKU ${value} tidak ditemukan.`
);

skuInputRef.current?.focus();


};

// =======================================================
// SAVE FIRST COUNT
// =======================================================

const saveFirstCount =
async () => {
if (saving) {
return;
}


  const selectedLocation =
    normalizeUpper(
      location
    );

  const selectedSku =
    normalizeUpper(sku);

  const countQty =
    Number(qty);

  // ---------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------

  if (!selectedLocation) {
    alert(
      "Lokasi wajib dipilih."
    );

    locationInputRef.current?.focus();

    return;
  }

  if (!selectedSku) {
    alert(
      "SKU wajib diisi atau scan barcode."
    );

    skuInputRef.current?.focus();

    return;
  }

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
  // CARI INVENTORY
  // ---------------------------------------------------

  const inventoryRows =
    inventory.filter(
      (item) =>
        normalizeUpper(
          item.location
        ) ===
          selectedLocation &&
        normalizeUpper(
          item.sku
        ) === selectedSku
    );

  if (
    inventoryRows.length ===
    0
  ) {
    alert(
      `SKU ${selectedSku} tidak ditemukan di lokasi ${selectedLocation}.`
    );

    skuInputRef.current?.focus();

    return;
  }

  const stockExisting =
    inventoryRows.reduce(
      (total, item) =>
        total +
        numberValue(
          item.quantity
        ),
      0
    );

  const description =
    inventoryRows.find(
      (item) =>
        normalize(
          item.deskripsi
        )
    )?.deskripsi ??
    null;

  // ---------------------------------------------------
  // SAVE
  // ---------------------------------------------------

  setSaving(true);

  try {
    const { error } =
      await supabase
        .from(
          "first_count"
        )
        .upsert(
          {
            location:
              selectedLocation,

            sku:
              selectedSku,

            deskripsi:
              description,

            stock_existing:
              stockExisting,

            first_qty:
              countQty,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "location,sku",
          }
        );

    if (error) {
      throw error;
    }

    // =================================================
    // RESET FORM
    // =================================================

    // SKU selalu blank
    setSku("");

    // Qty selalu blank
    setQty("");

    // Tutup dropdown
    setShowSkuDropdown(
      false
    );

    setShowLocationDropdown(
      false
    );

    // =================================================
    // KEEP LOCATION
    // =================================================

    if (keepLocation) {
      // Lokasi tetap

      setTimeout(() => {
        skuInputRef.current?.focus();
      }, 100);
    } else {
      // Lokasi ikut blank

      setLocation("");

      setTimeout(() => {
        locationInputRef.current?.focus();
      }, 100);
    }

  } catch (error) {
    console.error(
      "Gagal menyimpan First Count:",
      error
    );

    alert(
      "Gagal menyimpan First Count."
    );
  } finally {
    setSaving(false);
  }
};


// =======================================================
// LOADING
// =======================================================

if (loading) {
return ( <div className="flex min-h-screen items-center justify-center bg-gray-50">

```
    <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow">

      <Loader2
        size={22}
        className="animate-spin"
      />

      <span className="font-medium">
        Loading First Count...
      </span>

    </div>

  </div>
);


}

// =======================================================
// RENDER
// =======================================================

return ( <main className="min-h-screen bg-gray-50 pb-10">

```
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
            First Count
          </h1>

          <p className="text-[11px] text-gray-500">
            Counting stock
          </p>

        </div>

        {/* REFRESH */}

        <button
          type="button"
          onClick={
            loadInventory
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white active:scale-95"
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

    <section className="rounded-2xl bg-white p-4 shadow-sm">

      {/* =================================================
          TITLE FORM
      ================================================= */}

      <div className="mb-4 flex items-center gap-2">

        <MapPin
          size={20}
        />

        <div>

          <h2 className="font-bold">
            Input First Count
          </h2>

          <p className="text-xs text-gray-500">
            Lokasi → SKU → Qty
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

          {/* LOCATION INPUT */}

          <div className="relative flex-1">

            <MapPin
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              ref={
                locationInputRef
              }
              id="location-input"
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

          {/* KEEP BUTTON */}

          <button
            type="button"
            onClick={() =>
              setKeepLocation(
                !keepLocation
              )
            }
            className={`h-14 rounded-xl border px-4 text-sm font-bold transition ${
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
            ? "Lokasi akan tetap setelah simpan."
            : "Lokasi akan kosong setelah simpan."}
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
            id="sku-input"
            type="text"
            value={sku}
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
          Bisa scan barcode atau
          ketik SKU.
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

                    <div className="font-bold">
                      {
                        item.sku
                      }
                    </div>

                    {item.deskripsi && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {
                          item.deskripsi
                        }
                      </div>
                    )}

                    {item.stock >
                      0 && (
                      <div className="mt-1 text-xs text-gray-400">
                        Stock:{" "}
                        {formatNumber(
                          item.stock
                        )}
                      </div>
                    )}

                  </button>

                )
              )}

            </div>

          )}

      </div>

      {/* =================================================
          STOCK EXISTING
      ================================================= */}

      {selectedInventory &&
        selectedInventory.stock >
          0 && (

          <div className="mb-3 rounded-xl bg-gray-100 p-3">

            <div className="text-xs text-gray-500">
              Stock Existing
            </div>

            <div className="mt-1 text-2xl font-bold">
              {formatNumber(
                selectedInventory.stock
              )}
            </div>

            {selectedInventory.description && (
              <div className="mt-1 text-xs text-gray-500">
                {
                  selectedInventory.description
                }
              </div>
            )}

          </div>

        )}

      {/* =================================================
          QTY
      ================================================= */}

      <div className="mb-4">

        <label className="mb-1 block text-sm font-semibold">
          Qty First Count
        </label>

        <input
          id="qty-first-count"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={qty}
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

              saveFirstCount();
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
          saveFirstCount
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

            SIMPAN COUNT
          </>
        )}

      </button>

    </section>

  </div>

</main>

);
}
