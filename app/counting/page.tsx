
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type CountStage =
  | "FIRST_COUNT"
  | "SECOND_COUNT"
  | "THIRD_COUNT"
  | "COMPLETED";

type CompareStatus = "MATCH" | "EXCESS" | "SHORTAGE" | null;

interface CountingSession {
  id: number;
  session_no: string;
  status: string | null;
  first_completed_at: string | null;
  second_completed_at: string | null;
  third_completed_at: string | null;
}

interface InventoryRow {
  id?: number;
  sku: string;
  deskripsi: string | null;
  quantity: number | null;
  location: string | null;
}

interface CountRow {
  id: number;
  session_id: number;
  sku: string;
  deskripsi: string | null;
  stock_existing: number;
  first_count: number | null;
  first_difference: number | null;
  second_count: number | null;
  second_difference: number | null;
  third_count: number | null;
  third_difference: number | null;
  final_stock: number | null;

  location?: string | null;
  physical_qty?: number | null;
  excess_qty?: number | null;
  shortage_qty?: number | null;
  compare_status?: CompareStatus;
}

interface PhysicalRow {
  id: number;
  session_id: number;
  sku: string;
  location: string;
  stock_existing: number;
  physical_qty: number;
  difference: number;
  compare_status: CompareStatus;
  created_at?: string;
  updated_at?: string;
}

interface MobileResult {
  sku: string;
  location: string;
  deskripsi: string;
  stockExisting: number;
  physicalQty: number;
  difference: number;
  status: CompareStatus;
}

/* =========================================================
   HELPERS
========================================================= */

const normalizeText = (value: string | null | undefined) =>
  String(value ?? "").trim();

const normalizeSku = (value: string) =>
  String(value ?? "").trim().toUpperCase();

const normalizeLocation = (value: string) =>
  String(value ?? "").trim().toUpperCase();

const numberValue = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);

const getCompareStatus = (difference: number): CompareStatus => {
  if (difference > 0) return "EXCESS";
  if (difference < 0) return "SHORTAGE";
  return "MATCH";
};

/* =========================================================
   COMPONENT
========================================================= */

export default function CountingPage() {
  const router = useRouter();

  /* -------------------------------------------------------
     SESSION
  ------------------------------------------------------- */

  const [session, setSession] = useState<CountingSession | null>(null);

  const [countRows, setCountRows] = useState<CountRow[]>([]);
  const [physicalRows, setPhysicalRows] = useState<PhysicalRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPhysical, setLoadingPhysical] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* -------------------------------------------------------
     FILTER
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");

  /* -------------------------------------------------------
     COUNT STAGE
  ------------------------------------------------------- */

  const [stage, setStage] = useState<CountStage>("FIRST_COUNT");

  /* -------------------------------------------------------
     MOBILE INPUT
  ------------------------------------------------------- */

  const [locationInput, setLocationInput] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [physicalQtyInput, setPhysicalQtyInput] = useState("");

  const [mobileSaving, setMobileSaving] = useState(false);

  const [lastMobileResult, setLastMobileResult] =
    useState<MobileResult | null>(null);

  /* -------------------------------------------------------
     SELECTED SKU / PHYSICAL DETAIL
  ------------------------------------------------------- */

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [selectedDescription, setSelectedDescription] = useState("");

  /* =========================================================
     LOAD SESSION
  ========================================================= */

  const loadLatestSession = useCallback(async () => {
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("counting_session")
        .select(
          "id, session_no, status, first_completed_at, second_completed_at, third_completed_at"
        )
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData) {
        setSession(null);
        setCountRows([]);
        setPhysicalRows([]);
        return;
      }

      const currentSession = sessionData as CountingSession;

      setSession(currentSession);

      /* Determine stage */

      if (currentSession.third_completed_at) {
        setStage("COMPLETED");
      } else if (currentSession.second_completed_at) {
        setStage("THIRD_COUNT");
      } else if (currentSession.first_completed_at) {
        setStage("SECOND_COUNT");
      } else {
        setStage("FIRST_COUNT");
      }

      /* Load counting_detail */

      const { data: detailData, error: detailError } = await supabase
        .from("counting_detail")
        .select(`
          id,
          session_id,
          sku,
          deskripsi,
          stock_existing,
          first_count,
          first_difference,
          second_count,
          second_difference,
          third_count,
          third_difference,
          final_stock,
          location,
          physical_qty,
          excess_qty,
          shortage_qty,
          compare_status
        `)
        .eq("session_id", currentSession.id)
        .order("id", { ascending: true });

      if (detailError) {
        throw detailError;
      }

      setCountRows((detailData ?? []) as CountRow[]);

      /* Load physical */

      const { data: physicalData, error: physicalError } = await supabase
        .from("counting_physical")
        .select(`
          id,
          session_id,
          sku,
          location,
          stock_existing,
          physical_qty,
          difference,
          compare_status,
          created_at,
          updated_at
        `)
        .eq("session_id", currentSession.id)
        .order("id", { ascending: false });

      if (physicalError) {
        throw physicalError;
      }

      setPhysicalRows((physicalData ?? []) as PhysicalRow[]);
    } catch (error) {
      console.error("Gagal load counting:", error);
      alert("Gagal mengambil data counting.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestSession();
  }, [loadLatestSession]);

  /* =========================================================
     CREATE NEW SESSION
     
     NOTE:
     Semua inventory boleh dimasukkan ke counting_detail sebagai
     REFERENSI SYSTEM STOCK.

     Tetapi TIDAK WAJIB dihitung semuanya.
========================================================= */

  const createNewSession = async () => {
    if (saving) return;

    const confirmed = window.confirm(
      "Buat session counting baru?\n\nSession lama tidak akan dihapus."
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const now = new Date();

      const datePart = `${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

      const timePart = `${String(now.getHours()).padStart(2, "0")}${String(
        now.getMinutes()
      ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

      const sessionNo = `COUNT-${datePart}-${timePart}`;

      /* Get inventory */

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("sku, deskripsi, quantity, location");

      if (inventoryError) {
        throw inventoryError;
      }

      const inventory = (inventoryData ?? []) as InventoryRow[];

      /* Aggregate SKU */

      const skuMap = new Map<
        string,
        {
          sku: string;
          deskripsi: string | null;
          quantity: number;
        }
      >();

      for (const item of inventory) {
        const sku = normalizeSku(item.sku);

        if (!sku) continue;

        const existing = skuMap.get(sku);

        if (existing) {
          existing.quantity += numberValue(item.quantity);

          if (!existing.deskripsi && item.deskripsi) {
            existing.deskripsi = item.deskripsi;
          }
        } else {
          skuMap.set(sku, {
            sku,
            deskripsi: item.deskripsi ?? null,
            quantity: numberValue(item.quantity),
          });
        }
      }

      /* Create session */

      const { data: newSessionData, error: sessionError } = await supabase
        .from("counting_session")
        .insert({
          session_no: sessionNo,
          status: "FIRST_COUNT",
        })
        .select(
          "id, session_no, status, first_completed_at, second_completed_at, third_completed_at"
        )
        .single();

      if (sessionError) {
        throw sessionError;
      }

      const newSession = newSessionData as CountingSession;

      /* Create detail */

      const detailRows = Array.from(skuMap.values()).map((item) => ({
        session_id: newSession.id,
        sku: item.sku,
        deskripsi: item.deskripsi,
        stock_existing: item.quantity,
        first_count: null,
        first_difference: null,
        second_count: null,
        second_difference: null,
        third_count: null,
        third_difference: null,
        final_stock: null,
      }));

      if (detailRows.length > 0) {
        const { error: detailInsertError } = await supabase
          .from("counting_detail")
          .insert(detailRows);

        if (detailInsertError) {
          throw detailInsertError;
        }
      }

      setSession(newSession);
      setStage("FIRST_COUNT");

      await loadLatestSession();

      alert(`Session ${sessionNo} berhasil dibuat.`);
    } catch (error) {
      console.error("Gagal membuat session:", error);
      alert("Gagal membuat session counting.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     MOBILE PHYSICAL COUNT
     
     INPUT:
       LOCATION
       SKU
       PHYSICAL QTY
     
     SYSTEM:
       inventory SKU + LOCATION
========================================================= */

  const saveMobilePhysicalCount = async () => {
    if (mobileSaving) return;

    if (!session) {
      alert("Belum ada session counting.");
      return;
    }

    const location = normalizeLocation(locationInput);
    const sku = normalizeSku(skuInput);
    const physicalQty = Number(physicalQtyInput);

    if (!location) {
      alert("Location wajib diisi.");
      return;
    }

    if (!sku) {
      alert("SKU wajib diisi.");
      return;
    }

    if (
      physicalQtyInput === "" ||
      !Number.isFinite(physicalQty) ||
      physicalQty < 0
    ) {
      alert("Physical Qty harus berupa angka 0 atau lebih.");
      return;
    }

    setMobileSaving(true);

    try {
      /* -----------------------------------------------------
         1. Cari inventory berdasarkan SKU + LOCATION
      ----------------------------------------------------- */

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("sku, deskripsi, quantity, location")
        .eq("sku", sku)
        .eq("location", location);

      if (inventoryError) {
        throw inventoryError;
      }

      const inventoryRows = (inventoryData ?? []) as InventoryRow[];

      /*
       * Kalau tidak ada inventory:
       *
       * systemStock = 0
       *
       * sehingga physical > 0 otomatis EXCESS.
       */

      const systemStock = inventoryRows.reduce(
        (total, row) => total + numberValue(row.quantity),
        0
      );

      const description =
        inventoryRows.find((row) => row.deskripsi)?.deskripsi ?? "";

      /* -----------------------------------------------------
         2. Compare
      ----------------------------------------------------- */

      const difference = physicalQty - systemStock;

      const status = getCompareStatus(difference);

      /* -----------------------------------------------------
         3. UPSERT counting_physical
         
         SKU + LOCATION sama:
         UPDATE

         SKU + LOCATION baru:
         INSERT
      ----------------------------------------------------- */

      const { data: savedPhysical, error: physicalError } =
        await supabase
          .from("counting_physical")
          .upsert(
            {
              session_id: session.id,
              sku,
              location,
              stock_existing: systemStock,
              physical_qty: physicalQty,
            },
            {
              onConflict: "session_id,sku,location",
            }
          )
          .select(`
            id,
            session_id,
            sku,
            location,
            stock_existing,
            physical_qty,
            difference,
            compare_status
          `)
          .single();

      if (physicalError) {
        throw physicalError;
      }

      /* -----------------------------------------------------
         4. Jika SKU belum ada di counting_detail,
            buat sebagai SKU baru / EXCESS.
      ----------------------------------------------------- */

      const existingDetail = countRows.find(
        (row) => normalizeSku(row.sku) === sku
      );

      if (!existingDetail) {
        const { error: detailInsertError } = await supabase
          .from("counting_detail")
          .insert({
            session_id: session.id,
            sku,
            deskripsi: description || null,
            stock_existing: 0,
            first_count: null,
            first_difference: null,
            second_count: null,
            second_difference: null,
            third_count: null,
            third_difference: null,
            final_stock: null,
          });

        if (detailInsertError) {
          console.error(
            "Gagal membuat counting_detail:",
            detailInsertError
          );
        }
      }

      /* -----------------------------------------------------
         5. Result
      ----------------------------------------------------- */

      const result: MobileResult = {
        sku,
        location,
        deskripsi: description,
        stockExisting: numberValue(savedPhysical.stock_existing),
        physicalQty: numberValue(savedPhysical.physical_qty),
        difference: numberValue(savedPhysical.difference),
        status: savedPhysical.compare_status as CompareStatus,
      };

      setLastMobileResult(result);

      /* Reset input */

      setLocationInput("");
      setSkuInput("");
      setPhysicalQtyInput("");

      /*
       * Setelah save, fokus kembali ke location
       * agar operator HP bisa langsung scan berikutnya.
       */

      setTimeout(() => {
        document.getElementById("mobile-location-input")?.focus();
      }, 100);

      await loadLatestSession();
    } catch (error) {
      console.error("Gagal menyimpan physical count:", error);
      alert("Gagal menyimpan counting physical.");
    } finally {
      setMobileSaving(false);
    }
  };

  /* =========================================================
     DELETE PHYSICAL COUNT
========================================================= */

  const deletePhysicalCount = async (id: number) => {
    const confirmed = window.confirm(
      "Hapus hasil counting lokasi ini?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("counting_physical")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await loadLatestSession();

      setLastMobileResult(null);
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus counting.");
    }
  };

  /* =========================================================
     OPEN SKU PHYSICAL DETAIL
========================================================= */

  const openPhysicalCount = async (sku: string) => {
    if (!session) return;

    setSelectedSku(sku);

    const row = countRows.find(
      (item) => normalizeSku(item.sku) === normalizeSku(sku)
    );

    setSelectedDescription(row?.deskripsi ?? "");

    setLoadingPhysical(true);

    try {
      const { data, error } = await supabase
        .from("counting_physical")
        .select(`
          id,
          session_id,
          sku,
          location,
          stock_existing,
          physical_qty,
          difference,
          compare_status,
          created_at,
          updated_at
        `)
        .eq("session_id", session.id)
        .eq("sku", normalizeSku(sku))
        .order("location", { ascending: true });

      if (error) {
        throw error;
      }

      setPhysicalRows((data ?? []) as PhysicalRow[]);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil detail physical count.");
    } finally {
      setLoadingPhysical(false);
    }
  };

  /* =========================================================
     CLOSE SKU DETAIL
========================================================= */

  const closePhysicalDetail = async () => {
    setSelectedSku(null);
    setSelectedDescription("");
    await loadLatestSession();
  };

  /* =========================================================
     MAIN COUNT SAVE
     
     PARTIAL COUNTING:
     
     User TIDAK wajib menghitung semua SKU.
     
     Jika ingin menggunakan First/Second/Third:
     hanya row yang sudah diisi yang akan disimpan.
========================================================= */

  const saveCurrentCount = async (
    rowId: number,
    value: number | null
  ) => {
    if (!session) return;

    if (value === null || !Number.isFinite(value) || value < 0) {
      alert("Qty harus berupa angka 0 atau lebih.");
      return;
    }

    try {
      const row = countRows.find((item) => item.id === rowId);

      if (!row) return;

      const stockExisting = numberValue(row.stock_existing);

      if (stage === "FIRST_COUNT") {
        const difference = value - stockExisting;

        const { error } = await supabase
          .from("counting_detail")
          .update({
            first_count: value,
            first_difference: difference,
          })
          .eq("id", rowId);

        if (error) throw error;
      }

      if (stage === "SECOND_COUNT") {
        const difference = value - stockExisting;

        const { error } = await supabase
          .from("counting_detail")
          .update({
            second_count: value,
            second_difference: difference,
          })
          .eq("id", rowId);

        if (error) throw error;
      }

      if (stage === "THIRD_COUNT") {
        const difference = value - stockExisting;

        const { error } = await supabase
          .from("counting_detail")
          .update({
            third_count: value,
            third_difference: difference,
            final_stock: value,
          })
          .eq("id", rowId);

        if (error) throw error;
      }

      await loadLatestSession();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan hasil counting.");
    }
  };

  /* =========================================================
     BULK SAVE STAGE
     
     IMPORTANT:
     Tidak lagi mengecek apakah semua SKU sudah di-count.
     
     Tahap dapat diselesaikan walaupun hanya sebagian SKU
     yang dihitung.
========================================================= */

  const saveStage = async () => {
    if (!session) {
      alert("Belum ada session.");
      return;
    }

    if (stage === "COMPLETED") {
      alert("Counting sudah completed.");
      return;
    }

    /*
     * Tidak ada lagi validasi:
     *
     * "semua SKU harus diisi"
     *
     * Karena counting sekarang bersifat partial.
     */

    let countedRows = 0;

    if (stage === "FIRST_COUNT") {
      countedRows = countRows.filter(
        (row) => row.first_count !== null
      ).length;
    }

    if (stage === "SECOND_COUNT") {
      countedRows = countRows.filter(
        (row) =>
          numberValue(row.first_difference) !== 0 &&
          row.second_count !== null
      ).length;
    }

    if (stage === "THIRD_COUNT") {
      countedRows = countRows.filter(
        (row) =>
          numberValue(row.second_difference) !== 0 &&
          row.third_count !== null
      ).length;
    }

    const confirmed = window.confirm(
      `Selesaikan ${stageLabel}?\n\n` +
        `SKU yang sudah dihitung: ${countedRows}\n\n` +
        `SKU yang belum dihitung akan tetap dibiarkan dan tidak dianggap error.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      if (stage === "FIRST_COUNT") {
        const { error } = await supabase
          .from("counting_session")
          .update({
            status: "SECOND_COUNT",
            first_completed_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        if (error) throw error;

        setStage("SECOND_COUNT");
      }

      if (stage === "SECOND_COUNT") {
        const { error } = await supabase
          .from("counting_session")
          .update({
            status: "THIRD_COUNT",
            second_completed_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        if (error) throw error;

        setStage("THIRD_COUNT");
      }

      if (stage === "THIRD_COUNT") {
        const { error } = await supabase
          .from("counting_session")
          .update({
            status: "COMPLETED",
            third_completed_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        if (error) throw error;

        setStage("COMPLETED");
      }

      await loadLatestSession();

      alert(
        `${stageLabel} berhasil diselesaikan.\n\n` +
          `Counting bersifat partial, sehingga SKU yang belum dihitung tetap diperbolehkan.`
      );
    } catch (error) {
      console.error(error);
      alert("Gagal menyelesaikan tahap counting.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     EXPORT EXCEL
     
     Export:
       Sheet 1 = Physical Counting
       Sheet 2 = Summary
       Sheet 3 = SKU Summary
========================================================= */

  const exportCountingExcel = async () => {
    if (!session) {
      alert("Belum ada session counting.");
      return;
    }

    if (physicalRows.length === 0) {
      alert("Belum ada data physical counting untuk di-export.");
      return;
    }

    setExporting(true);

    try {
      /* -----------------------------------------------------
         SHEET 1 - DETAIL LOCATION
      ----------------------------------------------------- */

      const detailData = physicalRows.map((row, index) => ({
        No: index + 1,
        "Session No": session.session_no,
        SKU: row.sku,
        Location: row.location,
        "System Stock": numberValue(row.stock_existing),
        "Physical Qty": numberValue(row.physical_qty),
        Difference: numberValue(row.difference),
        Status: row.compare_status ?? "",
        "Created At": row.created_at
          ? new Date(row.created_at).toLocaleString("id-ID")
          : "",
      }));

      /* -----------------------------------------------------
         SHEET 2 - SUMMARY
      ----------------------------------------------------- */

      const totalSystem = physicalRows.reduce(
        (sum, row) => sum + numberValue(row.stock_existing),
        0
      );

      const totalPhysical = physicalRows.reduce(
        (sum, row) => sum + numberValue(row.physical_qty),
        0
      );

      const totalDifference = totalPhysical - totalSystem;

      const totalExcess = physicalRows
        .filter((row) => row.compare_status === "EXCESS")
        .reduce(
          (sum, row) =>
            sum + Math.max(numberValue(row.difference), 0),
          0
        );

      const totalShortage = physicalRows
        .filter((row) => row.compare_status === "SHORTAGE")
        .reduce(
          (sum, row) =>
            sum +
            Math.abs(
              Math.min(numberValue(row.difference), 0)
            ),
          0
        );

      const matchCount = physicalRows.filter(
        (row) => row.compare_status === "MATCH"
      ).length;

      const excessCount = physicalRows.filter(
        (row) => row.compare_status === "EXCESS"
      ).length;

      const shortageCount = physicalRows.filter(
        (row) => row.compare_status === "SHORTAGE"
      ).length;

      const summaryData = [
        {
          "Session No": session.session_no,
          Status: stageLabel,
          "Total Location": physicalRows.length,
          "Total System": totalSystem,
          "Total Physical": totalPhysical,
          Difference: totalDifference,
          Excess: totalExcess,
          Shortage: totalShortage,
          "Location MATCH": matchCount,
          "Location EXCESS": excessCount,
          "Location SHORTAGE": shortageCount,
        },
      ];

      /* -----------------------------------------------------
         SHEET 3 - SKU SUMMARY
         
         SKU yang sama di beberapa location digabungkan.
      ----------------------------------------------------- */

      const skuMap = new Map<
        string,
        {
          sku: string;
          system: number;
          physical: number;
          locations: number;
        }
      >();

      for (const row of physicalRows) {
        const sku = normalizeSku(row.sku);

        const existing = skuMap.get(sku);

        if (existing) {
          existing.system += numberValue(row.stock_existing);
          existing.physical += numberValue(row.physical_qty);
          existing.locations += 1;
        } else {
          skuMap.set(sku, {
            sku,
            system: numberValue(row.stock_existing),
            physical: numberValue(row.physical_qty),
            locations: 1,
          });
        }
      }

      const skuSummaryData = Array.from(skuMap.values()).map(
        (item, index) => {
          const difference = item.physical - item.system;

          return {
            No: index + 1,
            SKU: item.sku,
            Location: item.locations,
            "System Stock": item.system,
            "Physical Qty": item.physical,
            Difference: difference,
            Status: getCompareStatus(difference) ?? "",
          };
        }
      );

      /* -----------------------------------------------------
         CREATE WORKBOOK
      ----------------------------------------------------- */

      const workbook = XLSX.utils.book_new();

      const detailSheet =
        XLSX.utils.json_to_sheet(detailData);

      const summarySheet =
        XLSX.utils.json_to_sheet(summaryData);

      const skuSummarySheet =
        XLSX.utils.json_to_sheet(skuSummaryData);

      /* Column width */

      detailSheet["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 14 },
        { wch: 14 },
        { wch: 22 },
      ];

      summarySheet["!cols"] = [
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
      ];

      skuSummarySheet["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        detailSheet,
        "Physical Detail"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Summary"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        skuSummarySheet,
        "SKU Summary"
      );

      /* -----------------------------------------------------
         DOWNLOAD
      ----------------------------------------------------- */

      const safeSessionNo = session.session_no.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

      const filename = `Counting_${safeSessionNo}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Gagal export Excel:", error);
      alert("Gagal export data counting.");
    } finally {
      setExporting(false);
    }
  };

  /* =========================================================
     FILTER
========================================================= */

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return countRows;
    }

    return countRows.filter((row) => {
      return (
        normalizeText(row.sku)
          .toLowerCase()
          .includes(keyword) ||
        normalizeText(row.deskripsi)
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [countRows, search]);

  /* =========================================================
     SECOND / THIRD ROWS
========================================================= */

  const activeStageRows = useMemo(() => {
    if (stage === "FIRST_COUNT") {
      return filteredRows;
    }

    if (stage === "SECOND_COUNT") {
      return filteredRows.filter(
        (row) =>
          numberValue(row.first_difference) !== 0
      );
    }

    if (stage === "THIRD_COUNT") {
      return filteredRows.filter(
        (row) =>
          numberValue(row.second_difference) !== 0
      );
    }

    return [];
  }, [filteredRows, stage]);

  /* =========================================================
     GLOBAL PHYSICAL SUMMARY
========================================================= */

  const globalPhysicalSummary = useMemo(() => {
    const system = physicalRows.reduce(
      (sum, row) => sum + numberValue(row.stock_existing),
      0
    );

    const physical = physicalRows.reduce(
      (sum, row) => sum + numberValue(row.physical_qty),
      0
    );

    const difference = physical - system;

    const excess = physicalRows
      .filter((row) => row.compare_status === "EXCESS")
      .reduce(
        (sum, row) =>
          sum + Math.max(numberValue(row.difference), 0),
        0
      );

    const shortage = physicalRows
      .filter((row) => row.compare_status === "SHORTAGE")
      .reduce(
        (sum, row) =>
          sum +
          Math.abs(
            Math.min(numberValue(row.difference), 0)
          ),
        0
      );

    return {
      system,
      physical,
      difference,
      excess,
      shortage,
      status: getCompareStatus(difference),
      locations: physicalRows.length,
    };
  }, [physicalRows]);

  /* =========================================================
     PHYSICAL DETAIL SUMMARY
========================================================= */

  const physicalSummary = useMemo(() => {
    const system = physicalRows.reduce(
      (sum, row) => sum + numberValue(row.stock_existing),
      0
    );

    const physical = physicalRows.reduce(
      (sum, row) => sum + numberValue(row.physical_qty),
      0
    );

    const difference = physical - system;

    return {
      system,
      physical,
      difference,
      status: getCompareStatus(difference),
    };
  }, [physicalRows]);

  /* =========================================================
     STATUS BADGE
========================================================= */

  const compareBadge = (
    status: CompareStatus | string | undefined
  ) => {
    if (status === "MATCH") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          <CheckCircle2 size={13} />
          MATCH
        </span>
      );
    }

    if (status === "EXCESS") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <Plus size={13} />
          EXCESS
        </span>
      );
    }

    if (status === "SHORTAGE") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          <Minus size={13} />
          SHORTAGE
        </span>
      );
    }

    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
        -
      </span>
    );
  };

  /* =========================================================
     STAGE LABEL
========================================================= */

  const stageLabel = {
    FIRST_COUNT: "First Count",
    SECOND_COUNT: "Second Count",
    THIRD_COUNT: "Third Count",
    COMPLETED: "Completed",
  }[stage];

  /* =========================================================
     RENDER
========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-5 shadow">
          <Loader2
            size={22}
            className="animate-spin"
          />
          <span>Loading Counting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">

            <div className="flex min-w-0 items-center gap-3">

              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <ArrowLeftCircle size={25} />
              </button>

              <div className="min-w-0">

                <div className="flex items-center gap-2">
                  <ClipboardCheck size={21} />

                  <h1 className="truncate text-lg font-bold">
                    Stock Counting
                  </h1>
                </div>

                <p className="hidden text-xs text-gray-500 sm:block">
                  Partial counting berdasarkan SKU + Location
                </p>

              </div>
            </div>

            <div className="flex items-center gap-2">

              {/* EXPORT */}

              {session && physicalRows.length > 0 && (
                <button
                  type="button"
                  onClick={exportCountingExcel}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg border bg-white p-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 sm:px-3"
                  title="Export Excel"
                >
                  {exporting ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Download size={18} />
                  )}

                  <span className="hidden sm:inline">
                    Export Excel
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={loadLatestSession}
                disabled={loading}
                className="rounded-lg border bg-white p-2 hover:bg-gray-50 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  size={18}
                  className={
                    loading ? "animate-spin" : ""
                  }
                />
              </button>

              <button
                type="button"
                onClick={createNewSession}
                disabled={saving}
                className="hidden rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 sm:block"
              >
                {saving
                  ? "Creating..."
                  : "New Session"}
              </button>

            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-4 sm:py-6">

        {/* ===================================================
            NO SESSION
        =================================================== */}

        {!session ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">

            <ClipboardCheck
              size={45}
              className="mx-auto mb-4 text-gray-400"
            />

            <h2 className="text-lg font-bold">
              Belum ada Counting Session
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Buat session baru untuk mulai stock counting.
            </p>

            <button
              type="button"
              onClick={createNewSession}
              disabled={saving}
              className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Buat Counting Session"}
            </button>

          </div>
        ) : (
          <>

            {/* =================================================
                SESSION INFO
            ================================================= */}

            <div className="rounded-2xl border bg-white p-4 shadow-sm">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Session
                  </div>

                  <div className="mt-1 text-lg font-bold">
                    {session.session_no}
                  </div>
                </div>

                <div className="flex items-center gap-2">

                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold">
                    {stageLabel}
                  </span>

                  <button
                    type="button"
                    onClick={createNewSession}
                    disabled={saving}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50 sm:hidden"
                  >
                    New Session
                  </button>

                </div>
              </div>

              <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                <strong>Partial Counting:</strong>{" "}
                Tidak semua SKU harus dihitung. Masukkan hanya
                SKU + Location yang ingin diperiksa.
              </div>

            </div>

            {/* =================================================
                MOBILE COUNTING FORM
            ================================================= */}

            <section className="rounded-2xl border bg-white shadow-sm">

              <div className="border-b px-4 py-4">

                <div className="flex items-center gap-2">
                  <MapPin size={20} />

                  <h2 className="font-bold">
                    Physical Stock Counting
                  </h2>
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Input Location, SKU dan Physical Qty.
                  System otomatis mencari stock berdasarkan
                  SKU + Location.
                </p>

              </div>

              <div className="p-4">

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                  {/* LOCATION */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Location
                    </label>

                    <input
                      id="mobile-location-input"
                      type="text"
                      value={locationInput}
                      onChange={(e) =>
                        setLocationInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          document
                            .getElementById(
                              "mobile-sku-input"
                            )
                            ?.focus();
                        }
                      }}
                      placeholder="Contoh: A01-R01"
                      className="h-12 w-full rounded-xl border px-4 text-base font-medium uppercase outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      autoComplete="off"
                    />
                  </div>

                  {/* SKU */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      SKU
                    </label>

                    <input
                      id="mobile-sku-input"
                      type="text"
                      value={skuInput}
                      onChange={(e) =>
                        setSkuInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          document
                            .getElementById(
                              "mobile-qty-input"
                            )
                            ?.focus();
                        }
                      }}
                      placeholder="Scan / input SKU"
                      className="h-12 w-full rounded-xl border px-4 text-base font-medium uppercase outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                  </div>

                  {/* QTY */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                      Physical Qty
                    </label>

                    <input
                      id="mobile-qty-input"
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={physicalQtyInput}
                      onChange={(e) =>
                        setPhysicalQtyInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          saveMobilePhysicalCount();
                        }
                      }}
                      placeholder="0"
                      className="h-12 w-full rounded-xl border px-4 text-base font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                    />
                  </div>

                </div>

                <button
                  type="button"
                  onClick={saveMobilePhysicalCount}
                  disabled={mobileSaving}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mobileSaving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <ClipboardCheck size={18} />
                      Simpan & Compare
                    </>
                  )}
                </button>

                {/* LAST RESULT */}

                {lastMobileResult && (
                  <div className="mt-4 rounded-2xl border bg-gray-50 p-4">

                    <div className="mb-3 flex items-center justify-between">

                      <div className="text-sm font-bold">
                        Hasil Compare
                      </div>

                      {compareBadge(
                        lastMobileResult.status
                      )}

                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[11px] text-gray-500">
                          Location
                        </div>

                        <div className="mt-1 font-bold">
                          {lastMobileResult.location}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[11px] text-gray-500">
                          SKU
                        </div>

                        <div className="mt-1 break-all font-bold">
                          {lastMobileResult.sku}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[11px] text-gray-500">
                          System
                        </div>

                        <div className="mt-1 text-lg font-bold">
                          {formatNumber(
                            lastMobileResult.stockExisting
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <div className="text-[11px] text-gray-500">
                          Physical
                        </div>

                        <div className="mt-1 text-lg font-bold">
                          {formatNumber(
                            lastMobileResult.physicalQty
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="mt-3 rounded-xl bg-white p-3">

                      <div className="text-[11px] text-gray-500">
                        Difference
                      </div>

                      <div
                        className={`mt-1 text-2xl font-bold ${
                          lastMobileResult.difference > 0
                            ? "text-blue-600"
                            : lastMobileResult.difference < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {lastMobileResult.difference > 0
                          ? "+"
                          : ""}
                        {formatNumber(
                          lastMobileResult.difference
                        )}
                      </div>

                    </div>

                  </div>
                )}

              </div>
            </section>

            {/* =================================================
                GLOBAL SUMMARY
            ================================================= */}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">
                  System
                </div>

                <div className="mt-1 text-xl font-bold">
                  {formatNumber(
                    globalPhysicalSummary.system
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">
                  Physical
                </div>

                <div className="mt-1 text-xl font-bold">
                  {formatNumber(
                    globalPhysicalSummary.physical
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">
                  Difference
                </div>

                <div
                  className={`mt-1 text-xl font-bold ${
                    globalPhysicalSummary.difference > 0
                      ? "text-blue-600"
                      : globalPhysicalSummary.difference < 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {globalPhysicalSummary.difference > 0
                    ? "+"
                    : ""}
                  {formatNumber(
                    globalPhysicalSummary.difference
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">
                  Location Count
                </div>

                <div className="mt-1 text-xl font-bold">
                  {globalPhysicalSummary.locations}
                </div>
              </div>

            </section>

            {/* =================================================
                EXPORT MOBILE
            ================================================= */}

            {physicalRows.length > 0 && (
              <button
                type="button"
                onClick={exportCountingExcel}
                disabled={exporting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white text-sm font-bold shadow-sm hover:bg-gray-50 disabled:opacity-50 sm:hidden"
              >
                {exporting ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={18} />
                )}

                {exporting
                  ? "Exporting..."
                  : "Export Data Counting"}
              </button>
            )}

            {/* =================================================
                PHYSICAL RESULT LIST
            ================================================= */}

            <section className="rounded-2xl border bg-white shadow-sm">

              <div className="flex items-center justify-between border-b px-4 py-4">

                <div>
                  <h2 className="font-bold">
                    Hasil Counting Location
                  </h2>

                  <p className="text-xs text-gray-500">
                    Compare berdasarkan SKU + Location
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">
                  {physicalRows.length}
                </span>

              </div>

              {physicalRows.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  Belum ada hasil physical counting.
                </div>
              ) : (
                <div className="divide-y">

                  {physicalRows.map((row) => (
                    <div
                      key={row.id}
                      className="p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">
                            <MapPin size={16} />

                            <span className="font-bold">
                              {row.location}
                            </span>
                          </div>

                          <div className="mt-1 break-all text-sm font-semibold">
                            {row.sku}
                          </div>

                        </div>

                        {compareBadge(
                          row.compare_status
                        )}

                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-[10px] text-gray-500">
                            System
                          </div>

                          <div className="mt-1 font-bold">
                            {formatNumber(
                              numberValue(
                                row.stock_existing
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-[10px] text-gray-500">
                            Physical
                          </div>

                          <div className="mt-1 font-bold">
                            {formatNumber(
                              numberValue(
                                row.physical_qty
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-[10px] text-gray-500">
                            Difference
                          </div>

                          <div
                            className={`mt-1 font-bold ${
                              numberValue(
                                row.difference
                              ) > 0
                                ? "text-blue-600"
                                : numberValue(
                                    row.difference
                                  ) < 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {numberValue(
                              row.difference
                            ) > 0
                              ? "+"
                              : ""}
                            {formatNumber(
                              numberValue(
                                row.difference
                              )
                            )}
                          </div>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deletePhysicalCount(row.id)
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                        Hapus
                      </button>

                    </div>
                  ))}

                </div>
              )}

            </section>

            {/* =================================================
                DESKTOP ADVANCED COUNTING
            ================================================= */}

            <section className="hidden rounded-2xl border bg-white shadow-sm md:block">

              <div className="border-b p-4">

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                  <div>
                    <h2 className="font-bold">
                      Counting Detail
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      First / Second / Third Count — partial
                    </p>
                  </div>

                  <div className="flex items-center gap-2">

                    <div className="relative">

                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        value={search}
                        onChange={(e) =>
                          setSearch(e.target.value)
                        }
                        placeholder="Cari SKU / Deskripsi..."
                        className="h-10 w-64 rounded-lg border pl-9 pr-3 text-sm outline-none focus:border-black"
                      />

                    </div>

                    {stage !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={saveStage}
                        disabled={saving}
                        className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {saving
                          ? "Saving..."
                          : `Selesaikan ${stageLabel}`}
                      </button>
                    )}

                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1250px] border-collapse text-sm">

                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">

                      <th className="px-3 py-3">
                        No
                      </th>

                      <th className="px-3 py-3">
                        SKU
                      </th>

                      <th className="px-3 py-3">
                        Description
                      </th>

                      <th className="px-3 py-3 text-right">
                        Existing
                      </th>

                      <th className="px-3 py-3 text-right">
                        Physical
                      </th>

                      <th className="px-3 py-3">
                        Compare
                      </th>

                      <th className="px-3 py-3 text-right">
                        First
                      </th>

                      <th className="px-3 py-3 text-right">
                        Diff
                      </th>

                      <th className="px-3 py-3 text-right">
                        Second
                      </th>

                      <th className="px-3 py-3 text-right">
                        Diff
                      </th>

                      <th className="px-3 py-3 text-right">
                        Third
                      </th>

                      <th className="px-3 py-3 text-right">
                        Diff
                      </th>

                      <th className="px-3 py-3 text-right">
                        Final
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {activeStageRows.map((row, index) => {

                      const physicalForSku =
                        physicalRows.filter(
                          (physical) =>
                            normalizeSku(
                              physical.sku
                            ) ===
                            normalizeSku(
                              row.sku
                            )
                        );

                      const physicalQty =
                        physicalForSku.reduce(
                          (sum, item) =>
                            sum +
                            numberValue(
                              item.physical_qty
                            ),
                          0
                        );

                      const physicalSystem =
                        physicalForSku.reduce(
                          (sum, item) =>
                            sum +
                            numberValue(
                              item.stock_existing
                            ),
                          0
                        );

                      const physicalDifference =
                        physicalQty -
                        physicalSystem;

                      const physicalStatus =
                        physicalForSku.length > 0
                          ? getCompareStatus(
                              physicalDifference
                            )
                          : null;

                      return (
                        <tr
                          key={row.id}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >

                          <td className="px-3 py-3 text-gray-500">
                            {index + 1}
                          </td>

                          <td className="px-3 py-3">

                            <button
                              type="button"
                              onClick={() =>
                                openPhysicalCount(
                                  row.sku
                                )
                              }
                              className="font-bold text-blue-600 hover:underline"
                            >
                              {row.sku}
                            </button>

                          </td>

                          <td className="px-3 py-3 text-gray-600">
                            {row.deskripsi || "-"}
                          </td>

                          <td className="px-3 py-3 text-right font-semibold">
                            {formatNumber(
                              numberValue(
                                row.stock_existing
                              )
                            )}
                          </td>

                          <td className="px-3 py-3 text-right font-semibold">
                            {physicalForSku.length > 0
                              ? formatNumber(
                                  physicalQty
                                )
                              : "-"}
                          </td>

                          <td className="px-3 py-3">
                            {compareBadge(
                              physicalStatus
                            )}
                          </td>

                          {/* FIRST */}

                          <td className="px-3 py-3 text-right">

                            {stage === "FIRST_COUNT" ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                defaultValue={
                                  row.first_count ?? ""
                                }
                                onBlur={(e) => {

                                  if (
                                    e.target.value === ""
                                  ) {
                                    return;
                                  }

                                  saveCurrentCount(
                                    row.id,
                                    Number(
                                      e.target.value
                                    )
                                  );
                                }}
                                className="w-24 rounded-lg border px-2 py-1.5 text-right outline-none focus:border-black"
                              />
                            ) : (
                              row.first_count ===
                              null
                                ? "-"
                                : formatNumber(
                                    numberValue(
                                      row.first_count
                                    )
                                  )
                            )}

                          </td>

                          <td
                            className={`px-3 py-3 text-right font-semibold ${
                              numberValue(
                                row.first_difference
                              ) > 0
                                ? "text-blue-600"
                                : numberValue(
                                    row.first_difference
                                  ) < 0
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {row.first_difference ===
                            null
                              ? "-"
                              : formatNumber(
                                  numberValue(
                                    row.first_difference
                                  )
                                )}
                          </td>

                          {/* SECOND */}

                          <td className="px-3 py-3 text-right">

                            {stage === "SECOND_COUNT" ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                defaultValue={
                                  row.second_count ?? ""
                                }
                                onBlur={(e) => {

                                  if (
                                    e.target.value === ""
                                  ) {
                                    return;
                                  }

                                  saveCurrentCount(
                                    row.id,
                                    Number(
                                      e.target.value
                                    )
                                  );
                                }}
                                className="w-24 rounded-lg border px-2 py-1.5 text-right outline-none focus:border-black"
                              />
                            ) : (
                              row.second_count ===
                              null
                                ? "-"
                                : formatNumber(
                                    numberValue(
                                      row.second_count
                                    )
                                  )
                            )}

                          </td>

                          <td
                            className={`px-3 py-3 text-right font-semibold ${
                              numberValue(
                                row.second_difference
                              ) > 0
                                ? "text-blue-600"
                                : numberValue(
                                    row.second_difference
                                  ) < 0
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {row.second_difference ===
                            null
                              ? "-"
                              : formatNumber(
                                  numberValue(
                                    row.second_difference
                                  )
                                )}
                          </td>

                          {/* THIRD */}

                          <td className="px-3 py-3 text-right">

                            {stage === "THIRD_COUNT" ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                defaultValue={
                                  row.third_count ?? ""
                                }
                                onBlur={(e) => {

                                  if (
                                    e.target.value === ""
                                  ) {
                                    return;
                                  }

                                  saveCurrentCount(
                                    row.id,
                                    Number(
                                      e.target.value
                                    )
                                  );
                                }}
                                className="w-24 rounded-lg border px-2 py-1.5 text-right outline-none focus:border-black"
                              />
                            ) : (
                              row.third_count ===
                              null
                                ? "-"
                                : formatNumber(
                                    numberValue(
                                      row.third_count
                                    )
                                  )
                            )}

                          </td>

                          <td
                            className={`px-3 py-3 text-right font-semibold ${
                              numberValue(
                                row.third_difference
                              ) > 0
                                ? "text-blue-600"
                                : numberValue(
                                    row.third_difference
                                  ) < 0
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {row.third_difference ===
                            null
                              ? "-"
                              : formatNumber(
                                  numberValue(
                                    row.third_difference
                                  )
                                )}
                          </td>

                          <td className="px-3 py-3 text-right font-bold">
                            {row.final_stock ===
                            null
                              ? "-"
                              : formatNumber(
                                  numberValue(
                                    row.final_stock
                                  )
                                )}
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>
                </table>

              </div>

              {activeStageRows.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  Tidak ada data pada tahap ini.
                </div>
              )}

              <div className="border-t p-4">

                <div className="flex items-center justify-between">

                  <div className="text-xs text-gray-500">
                    Menampilkan {activeStageRows.length} SKU
                  </div>

                  {stage !== "COMPLETED" && (
                    <button
                      type="button"
                      onClick={saveStage}
                      disabled={saving}
                      className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : `Selesaikan ${stageLabel}`}
                    </button>
                  )}

                </div>
              </div>

            </section>

          </>
        )}

      </main>

      {/* =====================================================
          PHYSICAL DETAIL MODAL
      ===================================================== */}

      {selectedSku && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">

          <div className="max-h-[90vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b px-4 py-4">

              <div className="min-w-0">

                <div className="text-xs text-gray-500">
                  Physical Detail
                </div>

                <div className="mt-1 break-all font-bold">
                  {selectedSku}
                </div>

                {selectedDescription && (
                  <div className="mt-1 text-xs text-gray-500">
                    {selectedDescription}
                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={closePhysicalDetail}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>

            </div>

            {/* SUMMARY */}

            <div className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-4">

              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-[10px] text-gray-500">
                  System
                </div>

                <div className="mt-1 font-bold">
                  {formatNumber(
                    physicalSummary.system
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-[10px] text-gray-500">
                  Physical
                </div>

                <div className="mt-1 font-bold">
                  {formatNumber(
                    physicalSummary.physical
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-[10px] text-gray-500">
                  Difference
                </div>

                <div className="mt-1 font-bold">
                  {physicalSummary.difference > 0
                    ? "+"
                    : ""}
                  {formatNumber(
                    physicalSummary.difference
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">

                <div className="text-[10px] text-gray-500">
                  Status
                </div>

                <div className="mt-2">
                  {compareBadge(
                    physicalSummary.status
                  )}
                </div>

              </div>

            </div>

            {/* CONTENT */}

            <div className="max-h-[55vh] overflow-y-auto">

              {loadingPhysical ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2
                    size={25}
                    className="animate-spin"
                  />
                </div>
              ) : physicalRows.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  Belum ada physical count untuk SKU ini.
                </div>
              ) : (
                <div className="divide-y">

                  {physicalRows.map((row) => (
                    <div
                      key={row.id}
                      className="p-4"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-2">
                          <MapPin size={17} />

                          <span className="font-bold">
                            {row.location}
                          </span>
                        </div>

                        {compareBadge(
                          row.compare_status
                        )}

                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-[10px] text-gray-500">
                            System
                          </div>

                          <div className="mt-1 font-bold">
                            {formatNumber(
                              numberValue(
                                row.stock_existing
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-[10px] text-gray-500">
                            Physical
                          </div>

                          <div className="mt-1 font-bold">
                            {formatNumber(
                              numberValue(
                                row.physical_qty
                              )
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="text-[10px] text-gray-500">
                            Difference
                          </div>

                          <div className="mt-1 font-bold">
                            {numberValue(
                              row.difference
                            ) > 0
                              ? "+"
                              : ""}
                            {formatNumber(
                              numberValue(
                                row.difference
                              )
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="border-t p-4">

              <button
                type="button"
                onClick={closePhysicalDetail}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-bold text-white"
              >
                Tutup
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
