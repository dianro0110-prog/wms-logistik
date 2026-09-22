
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeftCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  MapPin,
  Play,
  RefreshCw,
  Save,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";


// =========================================================
// TYPES
// =========================================================

type CountStage =
  | "FIRST_COUNT"
  | "SECOND_COUNT"
  | "THIRD_COUNT"
  | "COMPLETED";

type CompareStatus =
  | "MATCH"
  | "EXCESS"
  | "SHORTAGE"
  | null;

interface InventoryRow {
  sku: string;
  deskripsi: string | null;
  quantity: number;
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
  id?: number;
  session_id: number;
  sku: string;
  location: string;
  stock_existing: number;
  physical_qty: number;
  difference: number;
  compare_status: CompareStatus;
}


// =========================================================
// PAGE
// =========================================================

export default function CountingPage() {
  const router = useRouter();

  // =======================================================
  // SESSION
  // =======================================================

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionNo, setSessionNo] = useState<string | null>(null);

  const [stage, setStage] = useState<CountStage>("FIRST_COUNT");

  // =======================================================
  // DATA
  // =======================================================

  const [rows, setRows] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // =======================================================
  // FILTER
  // =======================================================

  const [search, setSearch] = useState("");

  // =======================================================
  // PHYSICAL COUNT MODAL
  // =======================================================

  const [physicalModal, setPhysicalModal] = useState(false);

  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const [physicalRows, setPhysicalRows] = useState<PhysicalRow[]>([]);

  const [loadingPhysical, setLoadingPhysical] = useState(false);

  const [savingPhysical, setSavingPhysical] = useState(false);

  const [newLocation, setNewLocation] = useState("");

  const [newPhysicalQty, setNewPhysicalQty] = useState("");


  // =======================================================
  // LOAD LATEST SESSION
  // =======================================================

  useEffect(() => {
    loadLatestSession();
  }, []);


  async function loadLatestSession() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("counting_session")
        .select("id, session_no, status")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(error);
        alert("Gagal mengambil session counting");
        return;
      }

      if (!data) {
        setSessionId(null);
        setSessionNo(null);
        setStage("FIRST_COUNT");
        setRows([]);
        return;
      }

      setSessionId(data.id);
      setSessionNo(data.session_no);
      setStage((data.status || "FIRST_COUNT") as CountStage);

      await loadCountingDetail(data.id);

    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat mengambil data counting");
    } finally {
      setLoading(false);
    }
  }


  // =======================================================
  // LOAD COUNTING DETAIL
  // =======================================================

  async function loadCountingDetail(id: number) {
    const { data, error } = await supabase
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
      .eq("session_id", id)
      .order("sku", { ascending: true });

    if (error) {
      console.error(error);
      alert("Gagal mengambil detail counting");
      return;
    }

    setRows((data || []) as CountRow[]);
  }


  // =======================================================
  // GET EXISTING STOCK
  //
  // inventory:
  // SKU + LOCATION + QUANTITY
  //
  // Digabung menjadi SKU untuk counting utama.
  // =======================================================

  async function getExistingStock() {
    const { data, error } = await supabase
      .from("inventory")
      .select("sku, deskripsi, quantity, location");

    if (error) {
      console.error(error);
      throw new Error("Gagal mengambil inventory");
    }

    const inventoryData = (data || []) as InventoryRow[];

    const skuMap = new Map<
      string,
      {
        sku: string;
        deskripsi: string | null;
        quantity: number;
      }
    >();

    for (const item of inventoryData) {
      const sku = String(item.sku || "").trim();

      if (!sku) continue;

      const key = sku.toUpperCase();

      const current = skuMap.get(key);

      if (current) {
        current.quantity += Number(item.quantity || 0);

        if (!current.deskripsi && item.deskripsi) {
          current.deskripsi = item.deskripsi;
        }
      } else {
        skuMap.set(key, {
          sku,
          deskripsi: item.deskripsi,
          quantity: Number(item.quantity || 0),
        });
      }
    }

    return Array.from(skuMap.values()).filter(
      (item) => item.quantity > 0
    );
  }


  // =======================================================
  // CREATE NEW SESSION
  // =======================================================

  async function createNewSession() {
    if (creatingSession) return;

    if (sessionId) {
      const confirmCreate = window.confirm(
        "Session counting saat ini masih tersedia.\n\n" +
          "Apakah Anda yakin ingin membuat session counting baru?"
      );

      if (!confirmCreate) return;
    }

    setCreatingSession(true);

    try {
      const inventory = await getExistingStock();

      if (!inventory.length) {
        alert("Tidak ada stok inventory yang dapat dihitung.");
        return;
      }

      const now = new Date();

      const pad = (value: number) =>
        String(value).padStart(2, "0");

      const sessionNoValue =
        `COUNT-${now.getFullYear()}` +
        `${pad(now.getMonth() + 1)}` +
        `${pad(now.getDate())}-` +
        `${pad(now.getHours())}` +
        `${pad(now.getMinutes())}` +
        `${pad(now.getSeconds())}`;

      // -----------------------------------------------
      // CREATE SESSION
      // -----------------------------------------------

      const { data: session, error: sessionError } =
        await supabase
          .from("counting_session")
          .insert({
            session_no: sessionNoValue,
            status: "FIRST_COUNT",
          })
          .select("id, session_no, status")
          .single();

      if (sessionError || !session) {
        console.error(sessionError);
        alert("Gagal membuat session counting");
        return;
      }

      // -----------------------------------------------
      // CREATE COUNTING DETAIL
      // -----------------------------------------------

      const detailRows = inventory.map((item) => ({
        session_id: session.id,
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

        location: null,
        physical_qty: null,

        excess_qty: 0,
        shortage_qty: 0,

        compare_status: null,
      }));

      const { error: detailError } = await supabase
        .from("counting_detail")
        .insert(detailRows);

      if (detailError) {
        console.error(detailError);

        await supabase
          .from("counting_session")
          .delete()
          .eq("id", session.id);

        alert("Gagal membuat detail counting");
        return;
      }

      setSessionId(session.id);
      setSessionNo(session.session_no);
      setStage("FIRST_COUNT");

      setSearch("");

      await loadCountingDetail(session.id);

      alert(
        `Session ${session.session_no} berhasil dibuat.\n\n` +
          `Total SKU: ${inventory.length}`
      );

    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Gagal membuat session counting"
      );
    } finally {
      setCreatingSession(false);
    }
  }


  // =======================================================
  // CURRENT COUNT VALUE
  // =======================================================

  function getCountValue(row: CountRow) {
    if (stage === "FIRST_COUNT") {
      return row.first_count;
    }

    if (stage === "SECOND_COUNT") {
      return row.second_count;
    }

    if (stage === "THIRD_COUNT") {
      return row.third_count;
    }

    return row.final_stock;
  }


  // =======================================================
  // CURRENT DIFFERENCE
  // =======================================================

  function getDifference(row: CountRow) {
    if (stage === "FIRST_COUNT") {
      return row.first_difference;
    }

    if (stage === "SECOND_COUNT") {
      return row.second_difference;
    }

    if (stage === "THIRD_COUNT") {
      return row.third_difference;
    }

    return null;
  }


  // =======================================================
  // SET COUNT VALUE
  // =======================================================

  function setCountValue(
    id: number,
    value: string
  ) {
    const parsed =
      value === ""
        ? null
        : Math.max(0, Number(value));

    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;

        if (stage === "FIRST_COUNT") {
          const difference =
            parsed === null
              ? null
              : parsed - row.stock_existing;

          return {
            ...row,
            first_count: parsed,
            first_difference: difference,
          };
        }

        if (stage === "SECOND_COUNT") {
          const previous =
            row.first_count ?? row.stock_existing;

          const difference =
            parsed === null
              ? null
              : parsed - previous;

          return {
            ...row,
            second_count: parsed,
            second_difference: difference,
          };
        }

        if (stage === "THIRD_COUNT") {
          const previous =
            row.second_count ??
            row.first_count ??
            row.stock_existing;

          const difference =
            parsed === null
              ? null
              : parsed - previous;

          return {
            ...row,
            third_count: parsed,
            third_difference: difference,
          };
        }

        return row;
      })
    );
  }


  // =======================================================
  // HAS DIFFERENCE
  // =======================================================

  function hasDifference(row: CountRow) {
    const difference = getDifference(row);

    return (
      difference !== null &&
      Number(difference) !== 0
    );
  }


  // =======================================================
  // OPEN PHYSICAL COUNT
  // =======================================================

  async function openPhysicalCount(
    sku: string
  ) {
    if (!sessionId) {
      alert("Belum ada session counting.");
      return;
    }

    setSelectedSku(sku);
    setPhysicalModal(true);
    setLoadingPhysical(true);
    setNewLocation("");
    setNewPhysicalQty("");

    try {
      // -----------------------------------------------
      // LOAD SYSTEM INVENTORY FOR SKU
      // -----------------------------------------------

      const { data: inventoryData, error: inventoryError } =
        await supabase
          .from("inventory")
          .select("sku, location, quantity")
          .eq("sku", sku);

      if (inventoryError) {
        console.error(inventoryError);
        alert("Gagal mengambil stok berdasarkan lokasi.");
        return;
      }

      // -----------------------------------------------
      // LOAD EXISTING PHYSICAL COUNT
      // -----------------------------------------------

      const { data: physicalData, error: physicalError } =
        await supabase
          .from("counting_physical")
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
          .eq("session_id", sessionId)
          .eq("sku", sku)
          .order("location", { ascending: true });

      if (physicalError) {
        console.error(physicalError);
        alert("Gagal mengambil physical count.");
        return;
      }

      // -----------------------------------------------
      // SYSTEM STOCK BY LOCATION
      // -----------------------------------------------

      const systemMap = new Map<string, number>();

      for (const item of inventoryData || []) {
        const location =
          String(item.location || "").trim();

        if (!location) continue;

        const key = location.toUpperCase();

        systemMap.set(
          key,
          (systemMap.get(key) || 0) +
            Number(item.quantity || 0)
        );
      }

      // -----------------------------------------------
      // EXISTING PHYSICAL MAP
      // -----------------------------------------------

      const physicalMap = new Map<
        string,
        PhysicalRow
      >();

      for (const item of physicalData || []) {
        const location =
          String(item.location || "").trim();

        if (!location) continue;

        physicalMap.set(
          location.toUpperCase(),
          {
            id: item.id,
            session_id: item.session_id,
            sku: item.sku,
            location: item.location,
            stock_existing: Number(
              item.stock_existing || 0
            ),
            physical_qty: Number(
              item.physical_qty || 0
            ),
            difference: Number(
              item.difference || 0
            ),
            compare_status:
              item.compare_status as CompareStatus,
          }
        );
      }

      // -----------------------------------------------
      // COMBINE:
      //
      // SYSTEM LOCATION
      // +
      // PHYSICAL LOCATION
      //
      // Jika physical location tidak ada di system,
      // otomatis stock existing = 0
      // dan akan menjadi EXCESS.
      // -----------------------------------------------

      const allLocations = new Set<string>();

      for (const key of systemMap.keys()) {
        allLocations.add(key);
      }

      for (const key of physicalMap.keys()) {
        allLocations.add(key);
      }

      const combined: PhysicalRow[] = [];

      for (const key of Array.from(allLocations).sort()) {
        const existing = systemMap.get(key) || 0;

        const physical = physicalMap.get(key);

        if (physical) {
          combined.push({
            ...physical,
            stock_existing: existing,
          });
        } else {
          combined.push({
            session_id: sessionId,
            sku,
            location: key,
            stock_existing: existing,
            physical_qty: 0,
            difference: -existing,
            compare_status:
              existing === 0
                ? "MATCH"
                : "SHORTAGE",
          });
        }
      }

      setPhysicalRows(combined);

    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat membuka physical count.");
    } finally {
      setLoadingPhysical(false);
    }
  }


  // =======================================================
  // ADD NEW PHYSICAL LOCATION
  // =======================================================

  async function addPhysicalLocation() {
    if (!sessionId || !selectedSku) return;

    const location = newLocation.trim();

    if (!location) {
      alert("Masukkan lokasi.");
      return;
    }

    const qty = Math.max(
      0,
      Number(newPhysicalQty || 0)
    );

    const existing = physicalRows.find(
      (item) =>
        item.location.toUpperCase() ===
        location.toUpperCase()
    );

    if (existing) {
      alert(
        "Lokasi tersebut sudah ada.\n" +
          "Silakan ubah quantity pada baris yang tersedia."
      );
      return;
    }

    setSavingPhysical(true);

    try {
      const { data, error } = await supabase
        .from("counting_physical")
        .insert({
          session_id: sessionId,
          sku: selectedSku,
          location,

          // Lokasi baru yang tidak ada inventory
          // otomatis mempunyai stock existing = 0
          stock_existing: 0,

          physical_qty: qty,

          // Akan dihitung trigger Supabase
          difference: 0,
          compare_status: null,
        })
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

      if (error || !data) {
        console.error(error);
        alert("Gagal menambahkan lokasi physical count.");
        return;
      }

      setNewLocation("");
      setNewPhysicalQty("");

      await openPhysicalCount(selectedSku);

    } catch (error) {
      console.error(error);
      alert("Gagal menambahkan lokasi.");
    } finally {
      setSavingPhysical(false);
    }
  }


  // =======================================================
  // UPDATE PHYSICAL QTY
  // =======================================================

  async function updatePhysicalQty(
    row: PhysicalRow,
    value: string
  ) {
    if (!row.id) return;

    const qty =
      value === ""
        ? 0
        : Math.max(0, Number(value));

    // Optimistic update
    setPhysicalRows((current) =>
      current.map((item) =>
        item.id === row.id
          ? {
              ...item,
              physical_qty: qty,
              difference:
                qty - item.stock_existing,
              compare_status:
                qty > item.stock_existing
                  ? "EXCESS"
                  : qty < item.stock_existing
                  ? "SHORTAGE"
                  : "MATCH",
            }
          : item
      )
    );

    const { error } = await supabase
      .from("counting_physical")
      .update({
        physical_qty: qty,
      })
      .eq("id", row.id);

    if (error) {
      console.error(error);
      alert("Gagal menyimpan physical quantity.");

      if (selectedSku) {
        await openPhysicalCount(selectedSku);
      }
    }
  }


  // =======================================================
  // DELETE PHYSICAL LOCATION
  // =======================================================

  async function deletePhysicalLocation(
    row: PhysicalRow
  ) {
    if (!row.id) return;

    const confirmDelete = window.confirm(
      `Hapus physical count lokasi ${row.location}?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("counting_physical")
      .delete()
      .eq("id", row.id);

    if (error) {
      console.error(error);
      alert("Gagal menghapus physical count.");
      return;
    }

    setPhysicalRows((current) =>
      current.filter(
        (item) => item.id !== row.id
      )
    );
  }


  // =======================================================
  // SAVE PHYSICAL SUMMARY
  //
  // Summary physical akan masuk ke counting_detail.
  // =======================================================

  async function savePhysicalSummary() {
    if (!sessionId || !selectedSku) return;

    const totalPhysical = physicalRows.reduce(
      (sum, item) =>
        sum + Number(item.physical_qty || 0),
      0
    );

    const totalExisting = physicalRows.reduce(
      (sum, item) =>
        sum + Number(item.stock_existing || 0),
      0
    );

    const excessQty = physicalRows.reduce(
      (sum, item) =>
        sum +
        Math.max(
          Number(item.physical_qty || 0) -
            Number(item.stock_existing || 0),
          0
        ),
      0
    );

    const shortageQty = physicalRows.reduce(
      (sum, item) =>
        sum +
        Math.max(
          Number(item.stock_existing || 0) -
            Number(item.physical_qty || 0),
          0
        ),
      0
    );

    let status: CompareStatus = "MATCH";

    if (excessQty > 0) {
      status = "EXCESS";
    } else if (shortageQty > 0) {
      status = "SHORTAGE";
    }

    const { error } = await supabase
      .from("counting_detail")
      .update({
        stock_existing: totalExisting,
        physical_qty: totalPhysical,
        excess_qty: excessQty,
        shortage_qty: shortageQty,
        compare_status: status,
      })
      .eq("session_id", sessionId)
      .eq("sku", selectedSku);

    if (error) {
      console.error(error);
      alert("Gagal menyimpan hasil physical count.");
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.sku === selectedSku
          ? {
              ...row,
              stock_existing: totalExisting,
              physical_qty: totalPhysical,
              excess_qty: excessQty,
              shortage_qty: shortageQty,
              compare_status: status,
            }
          : row
      )
    );

    alert(
      `Physical count ${selectedSku} berhasil disimpan.`
    );

    setPhysicalModal(false);
  }


  // =======================================================
  // SAVE CURRENT COUNT
  // =======================================================

  async function saveCurrentCount() {
    if (!sessionId) {
      alert("Belum ada session counting.");
      return;
    }

    const incomplete = rows.filter(
      (row) => getCountValue(row) === null
    );

    if (incomplete.length > 0) {
      alert(
        `Masih ada ${incomplete.length} SKU yang belum dihitung.`
      );
      return;
    }

    setSaving(true);

    try {
      // -----------------------------------------------
      // FIRST COUNT
      // -----------------------------------------------

      if (stage === "FIRST_COUNT") {
        for (const row of rows) {
          const firstCount =
            row.first_count ?? 0;

          const difference =
            firstCount - row.stock_existing;

          const { error } = await supabase
            .from("counting_detail")
            .update({
              first_count: firstCount,
              first_difference: difference,
            })
            .eq("id", row.id);

          if (error) {
            throw error;
          }
        }

        const { error: sessionError } =
          await supabase
            .from("counting_session")
            .update({
              status: "SECOND_COUNT",
              first_completed_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

        if (sessionError) {
          throw sessionError;
        }

        setStage("SECOND_COUNT");

        await loadCountingDetail(sessionId);

        alert(
          "First Count berhasil disimpan.\n\n" +
            "SKU yang memiliki selisih akan masuk ke Second Count."
        );

        return;
      }


      // -----------------------------------------------
      // SECOND COUNT
      // -----------------------------------------------

      if (stage === "SECOND_COUNT") {
        const secondRows = rows.filter(
          (row) =>
            row.first_difference !== null &&
            Number(row.first_difference) !== 0
        );

        for (const row of secondRows) {
          const secondCount =
            row.second_count ?? 0;

          const previous =
            row.first_count ??
            row.stock_existing;

          const difference =
            secondCount - previous;

          const { error } = await supabase
            .from("counting_detail")
            .update({
              second_count: secondCount,
              second_difference: difference,
            })
            .eq("id", row.id);

          if (error) {
            throw error;
          }
        }

        // SKU yang match pada first count
        // tidak perlu masuk second count.
        const firstMatchRows = rows.filter(
          (row) =>
            row.first_difference !== null &&
            Number(row.first_difference) === 0
        );

        for (const row of firstMatchRows) {
          await supabase
            .from("counting_detail")
            .update({
              second_count: row.first_count,
              second_difference: 0,
            })
            .eq("id", row.id);
        }

        const { error: sessionError } =
          await supabase
            .from("counting_session")
            .update({
              status: "THIRD_COUNT",
              second_completed_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

        if (sessionError) {
          throw sessionError;
        }

        setStage("THIRD_COUNT");

        await loadCountingDetail(sessionId);

        alert(
          "Second Count berhasil disimpan.\n\n" +
            "Selanjutnya masuk ke Third Count."
        );

        return;
      }


      // -----------------------------------------------
      // THIRD COUNT
      // -----------------------------------------------

      if (stage === "THIRD_COUNT") {
        for (const row of rows) {
          const thirdCount =
            row.third_count ??
            row.second_count ??
            row.first_count ??
            row.stock_existing;

          const previous =
            row.second_count ??
            row.first_count ??
            row.stock_existing;

          const difference =
            thirdCount - previous;

          const { error } = await supabase
            .from("counting_detail")
            .update({
              third_count: thirdCount,
              third_difference: difference,
              final_stock: thirdCount,
            })
            .eq("id", row.id);

          if (error) {
            throw error;
          }
        }

        const { error: sessionError } =
          await supabase
            .from("counting_session")
            .update({
              status: "COMPLETED",
              third_completed_at: new Date().toISOString(),
            })
            .eq("id", sessionId);

        if (sessionError) {
          throw sessionError;
        }

        setStage("COMPLETED");

        await loadCountingDetail(sessionId);

        alert(
          "Third Count berhasil disimpan.\n\n" +
            "Counting telah selesai."
        );

        return;
      }

    } catch (error) {
      console.error(error);

      alert(
        "Gagal menyimpan counting.\n\n" +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  }


  // =======================================================
  // FILTER
  // =======================================================

  const filteredRows = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((row) => {
      const sku =
        row.sku?.toLowerCase() || "";

      const description =
        row.deskripsi?.toLowerCase() || "";

      return (
        sku.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [rows, search]);


  // =======================================================
  // SUMMARY
  // =======================================================

  const summary = useMemo(() => {
    const total = rows.length;

    const counted = rows.filter(
      (row) => getCountValue(row) !== null
    ).length;

    const match = rows.filter(
      (row) => {
        const diff =
          getDifference(row);

        return (
          diff !== null &&
          Number(diff) === 0
        );
      }
    ).length;

    const difference = rows.filter(
      (row) => hasDifference(row)
    ).length;

    const excess = rows.filter(
      (row) =>
        row.compare_status === "EXCESS"
    ).length;

    const shortage = rows.filter(
      (row) =>
        row.compare_status === "SHORTAGE"
    ).length;

    return {
      total,
      counted,
      match,
      difference,
      excess,
      shortage,
    };
  }, [rows, stage]);


  // =======================================================
  // SECOND COUNT ITEMS
  // =======================================================

  const nextCountItems = useMemo(() => {
    if (stage === "FIRST_COUNT") {
      return rows.filter(
        (row) =>
          row.first_difference !== null &&
          Number(row.first_difference) !== 0
      );
    }

    if (stage === "SECOND_COUNT") {
      return rows.filter(
        (row) =>
          row.second_difference !== null &&
          Number(row.second_difference) !== 0
      );
    }

    return [];
  }, [rows, stage]);


  // =======================================================
  // EXPORT EXCEL
  // =======================================================

  async function exportExcel() {
    if (!rows.length) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    const exportRows = rows.map(
      (row, index) => ({
        No: index + 1,

        "SKU": row.sku,

        "Deskripsi":
          row.deskripsi || "",

        "Stock Existing":
          row.stock_existing,

        "Physical Qty":
          row.physical_qty ?? "",

        "Excess Qty":
          row.excess_qty ?? 0,

        "Shortage Qty":
          row.shortage_qty ?? 0,

        "Compare Status":
          row.compare_status || "",

        "First Count":
          row.first_count ?? "",

        "First Difference":
          row.first_difference ?? "",

        "Second Count":
          row.second_count ?? "",

        "Second Difference":
          row.second_difference ?? "",

        "Third Count":
          row.third_count ?? "",

        "Third Difference":
          row.third_difference ?? "",

        "Final Stock":
          row.final_stock ?? "",
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(exportRows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Counting"
    );

    XLSX.writeFile(
      workbook,
      `Stock_Counting_${sessionNo || "Export"}.xlsx`
    );
  }


  // =======================================================
  // REFRESH
  // =======================================================

  async function refresh() {
    await loadLatestSession();
  }


  // =======================================================
  // STAGE LABEL
  // =======================================================

  function stageLabel(
    value: CountStage
  ) {
    switch (value) {
      case "FIRST_COUNT":
        return "First Count";

      case "SECOND_COUNT":
        return "Second Count";

      case "THIRD_COUNT":
        return "Third Count";

      case "COMPLETED":
        return "Completed";

      default:
        return value;
    }
  }


  // =======================================================
  // FORMAT NUMBER
  // =======================================================

  function formatNumber(
    value: number | null | undefined
  ) {
    return new Intl.NumberFormat(
      "id-ID"
    ).format(Number(value || 0));
  }


  // =======================================================
  // STATUS BADGE
  // =======================================================

  function compareBadge(
  status: string | null | undefined
) {
    if (status === "EXCESS") {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
          EXCESS
        </span>
      );
    }

    if (status === "SHORTAGE") {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          SHORTAGE
        </span>
      );
    }

    if (status === "MATCH") {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          MATCH
        </span>
      );
    }

    return (
      <span className="text-xs text-gray-400">
        -
      </span>
    );
  }


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw
            size={20}
            className="animate-spin"
          />

          Loading Stock Counting...
        </div>
      </div>
    );
  }


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <button
              onClick={() => router.back()}
              className="rounded-xl border bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <ArrowLeftCircle size={22} />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Stock Counting
              </h1>

              <p className="text-sm text-gray-500">
                First Count → Second Count → Third Count
              </p>
            </div>

          </div>
        </div>


        <div className="flex flex-wrap gap-2">

          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            onClick={exportExcel}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Excel
          </button>

          <button
            onClick={createNewSession}
            disabled={creatingSession}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingSession ? (
              <RefreshCw
                size={17}
                className="animate-spin"
              />
            ) : (
              <Play size={17} />
            )}

            New Counting
          </button>

        </div>
      </div>


      {/* =================================================
          SESSION INFO
      ================================================= */}

      <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Session
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {sessionNo || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Stage
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {stageLabel(stage)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              SKU
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {rows.length}
            </p>
          </div>

        </div>
      </div>


      {/* =================================================
          PROCESS
      ================================================= */}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">

        {[
          {
            label: "Inventory",
            active: true,
          },
          {
            label: "First Count",
            active:
              stage === "FIRST_COUNT" ||
              stage === "SECOND_COUNT" ||
              stage === "THIRD_COUNT" ||
              stage === "COMPLETED",
          },
          {
            label: "Second Count",
            active:
              stage === "SECOND_COUNT" ||
              stage === "THIRD_COUNT" ||
              stage === "COMPLETED",
          },
          {
            label: "Third Count",
            active:
              stage === "THIRD_COUNT" ||
              stage === "COMPLETED",
          },
          {
            label: "Final",
            active:
              stage === "COMPLETED",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 shadow-sm ${
              item.active
                ? "border-gray-900 bg-gray-900 text-white"
                : "bg-white text-gray-400"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide">
              Process
            </p>

            <p className="mt-1 font-semibold">
              {item.label}
            </p>
          </div>
        ))}

      </div>


      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-6">

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Total SKU
          </p>

          <p className="mt-1 text-2xl font-bold">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Counted
          </p>

          <p className="mt-1 text-2xl font-bold">
            {summary.counted}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Match
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {summary.match}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Difference
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {summary.difference}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Excess
          </p>

          <p className="mt-1 text-2xl font-bold text-orange-600">
            {summary.excess}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">
            Shortage
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {summary.shortage}
          </p>
        </div>

      </div>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="mb-4 flex flex-col gap-3 md:flex-row">

        <div className="relative flex-1">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Cari SKU atau deskripsi..."
            className="w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-gray-900"
          />

        </div>

        {search && (
          <button
            onClick={() => setSearch("")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-gray-600"
          >
            <X size={16} />
            Reset
          </button>
        )}

      </div>


      {/* =================================================
          NEXT COUNT INFO
      ================================================= */}

      {stage !== "COMPLETED" && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">

          <div className="flex items-start gap-3">

            <ClipboardList
              size={20}
              className="mt-0.5 text-blue-600"
            />

            <div>
              <p className="font-semibold text-blue-900">
                {stage === "FIRST_COUNT"
                  ? "First Count"
                  : stage === "SECOND_COUNT"
                  ? "Second Count"
                  : "Third Count"}
              </p>

              <p className="mt-1 text-sm text-blue-700">
                {stage === "FIRST_COUNT"
                  ? "Semua SKU dihitung. SKU yang memiliki selisih akan diteruskan ke Second Count."
                  : stage === "SECOND_COUNT"
                  ? "SKU yang masih memiliki selisih dari First Count diperiksa kembali."
                  : "Pemeriksaan terakhir sebelum Final Stock."}
              </p>

              {stage !== "THIRD_COUNT" && (
                <p className="mt-2 text-sm font-semibold text-blue-800">
                  Kandidat count berikutnya:{" "}
                  {nextCountItems.length} SKU
                </p>
              )}
            </div>

          </div>
        </div>
      )}


      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="min-w-[1450px] w-full text-sm">

            <thead className="bg-gray-900 text-left text-xs uppercase tracking-wide text-white">

              <tr>

                <th className="px-4 py-3">
                  No
                </th>

                <th className="px-4 py-3">
                  SKU
                </th>

                <th className="px-4 py-3">
                  Description
                </th>

                <th className="px-4 py-3 text-right">
                  Existing
                </th>

                <th className="px-4 py-3 text-right">
                  Physical
                </th>

                <th className="px-4 py-3 text-center">
                  Compare
                </th>

                <th className="px-4 py-3 text-right">
                  First Count
                </th>

                <th className="px-4 py-3 text-right">
                  Diff
                </th>

                <th className="px-4 py-3 text-right">
                  Second Count
                </th>

                <th className="px-4 py-3 text-right">
                  Diff
                </th>

                <th className="px-4 py-3 text-right">
                  Third Count
                </th>

                <th className="px-4 py-3 text-right">
                  Diff
                </th>

                <th className="px-4 py-3 text-right">
                  Final
                </th>

                <th className="px-4 py-3 text-center">
                  Status
                </th>

              </tr>

            </thead>


            <tbody className="divide-y">

              {filteredRows.length === 0 ? (

                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Tidak ada data counting.
                  </td>
                </tr>

              ) : (

                filteredRows.map(
                  (row, index) => {

                    const currentValue =
                      getCountValue(row);

                    const currentDifference =
                      getDifference(row);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-4 py-3 text-gray-500">
                          {index + 1}
                        </td>


                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {row.sku}
                        </td>


                        <td className="px-4 py-3 text-gray-600">
                          {row.deskripsi || "-"}
                        </td>


                        <td className="px-4 py-3 text-right font-semibold">
                          {formatNumber(
                            row.stock_existing
                          )}
                        </td>


                        {/* PHYSICAL */}

                        <td className="px-4 py-3 text-right">

                          <div className="flex items-center justify-end gap-2">

                            <span className="font-semibold">
                              {formatNumber(
                                row.physical_qty
                              )}
                            </span>

                            <button
                              onClick={() =>
                                openPhysicalCount(
                                  row.sku
                                )
                              }
                              title="Input physical berdasarkan lokasi"
                              className="rounded-lg border p-1.5 text-gray-600 hover:bg-gray-100"
                            >
                              <MapPin size={15} />
                            </button>

                          </div>

                        </td>


                        {/* COMPARE */}

                        <td className="px-4 py-3 text-center">
                          {compareBadge(
                            row.compare_status
                          )}
                        </td>


                        {/* FIRST COUNT */}

                        <td className="px-4 py-3 text-right">

                          {stage ===
                            "FIRST_COUNT" ? (

                            <input
                              type="number"
                              min="0"
                              value={
                                row.first_count ??
                                ""
                              }
                              onChange={(e) =>
                                setCountValue(
                                  row.id,
                                  e.target.value
                                )
                              }
                              className="w-28 rounded-lg border px-3 py-2 text-right outline-none focus:border-gray-900"
                            />

                          ) : (

                            <span>
                              {formatNumber(
                                row.first_count
                              )}
                            </span>

                          )}

                        </td>


                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            row.first_difference !==
                              null &&
                            row.first_difference !== 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {row.first_difference ===
                          null
                            ? "-"
                            : row.first_difference > 0
                            ? `+${formatNumber(
                                row.first_difference
                              )}`
                            : formatNumber(
                                row.first_difference
                              )}
                        </td>


                        {/* SECOND COUNT */}

                        <td className="px-4 py-3 text-right">

                          {stage ===
                            "SECOND_COUNT" &&
                          row.first_difference !==
                            null &&
                          row.first_difference !==
                            0 ? (

                            <input
                              type="number"
                              min="0"
                              value={
                                row.second_count ??
                                ""
                              }
                              onChange={(e) =>
                                setCountValue(
                                  row.id,
                                  e.target.value
                                )
                              }
                              className="w-28 rounded-lg border px-3 py-2 text-right outline-none focus:border-gray-900"
                            />

                          ) : (

                            <span>
                              {row.second_count ===
                              null
                                ? "-"
                                : formatNumber(
                                    row.second_count
                                  )}
                            </span>

                          )}

                        </td>


                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            row.second_difference !==
                              null &&
                            row.second_difference !== 0
                              ? "text-red-600"
                              : row.second_difference !==
                                  null
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {row.second_difference ===
                          null
                            ? "-"
                            : row.second_difference > 0
                            ? `+${formatNumber(
                                row.second_difference
                              )}`
                            : formatNumber(
                                row.second_difference
                              )}
                        </td>


                        {/* THIRD COUNT */}

                        <td className="px-4 py-3 text-right">

                          {stage ===
                            "THIRD_COUNT" ? (

                            <input
                              type="number"
                              min="0"
                              value={
                                row.third_count ??
                                ""
                              }
                              onChange={(e) =>
                                setCountValue(
                                  row.id,
                                  e.target.value
                                )
                              }
                              className="w-28 rounded-lg border px-3 py-2 text-right outline-none focus:border-gray-900"
                            />

                          ) : (

                            <span>
                              {row.third_count ===
                              null
                                ? "-"
                                : formatNumber(
                                    row.third_count
                                  )}
                            </span>

                          )}

                        </td>


                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            row.third_difference !==
                              null &&
                            row.third_difference !== 0
                              ? "text-red-600"
                              : row.third_difference !==
                                  null
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {row.third_difference ===
                          null
                            ? "-"
                            : row.third_difference > 0
                            ? `+${formatNumber(
                                row.third_difference
                              )}`
                            : formatNumber(
                                row.third_difference
                              )}
                        </td>


                        {/* FINAL */}

                        <td className="px-4 py-3 text-right font-bold">
                          {row.final_stock ===
                          null
                            ? "-"
                            : formatNumber(
                                row.final_stock
                              )}
                        </td>


                        {/* STATUS */}

                        <td className="px-4 py-3 text-center">

                          {currentValue === null ? (

                            <span className="text-xs text-gray-400">
                              Belum dihitung
                            </span>

                          ) : currentDifference ===
                              0 ? (

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                              <CheckCircle2 size={15} />
                              MATCH
                            </span>

                          ) : (

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                              <XCircle size={15} />
                              DIFFERENCE
                            </span>

                          )}

                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>
      </div>


      {/* =================================================
          SAVE BUTTON
      ================================================= */}

      {sessionId &&
        stage !== "COMPLETED" && (

          <div className="mt-5 flex justify-end">

            <button
              onClick={saveCurrentCount}
              disabled={
                saving ||
                rows.length === 0
              }
              className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving ? (
                <RefreshCw
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Save size={18} />
              )}

              Save {stageLabel(stage)}
            </button>

          </div>
        )}


      {/* =================================================
          COMPLETED
      ================================================= */}

      {stage === "COMPLETED" && (

        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">

          <div className="flex items-center gap-3">

            <CheckCircle2
              size={25}
              className="text-green-600"
            />

            <div>
              <p className="font-bold text-green-900">
                Counting Completed
              </p>

              <p className="mt-1 text-sm text-green-700">
                First Count, Second Count dan Third Count
                telah selesai.
              </p>
            </div>

          </div>

        </div>
      )}


      {/* =================================================
          PHYSICAL COUNT MODAL
      ================================================= */}

      {physicalModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b p-5">

              <div>

                <div className="flex items-center gap-2">

                  <MapPin
                    size={20}
                    className="text-gray-700"
                  />

                  <h2 className="text-lg font-bold text-gray-900">
                    Physical Count
                  </h2>

                </div>

                <p className="mt-1 text-sm text-gray-500">
                  SKU:{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedSku}
                  </span>
                </p>

              </div>

              <button
                onClick={() =>
                  setPhysicalModal(false)
                }
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>

            </div>


            {/* MODAL BODY */}

            <div className="max-h-[65vh] overflow-y-auto p-5">

              {loadingPhysical ? (

                <div className="flex items-center justify-center py-12">

                  <RefreshCw
                    size={22}
                    className="animate-spin text-gray-500"
                  />

                </div>

              ) : (

                <>

                  {/* ADD LOCATION */}

                  <div className="mb-5 rounded-2xl border bg-gray-50 p-4">

                    <p className="mb-3 font-semibold text-gray-900">
                      Tambah Lokasi Fisik
                    </p>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                      <input
                        value={newLocation}
                        onChange={(e) =>
                          setNewLocation(
                            e.target.value
                          )
                        }
                        placeholder="Contoh: A01"
                        className="rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                      />

                      <input
                        type="number"
                        min="0"
                        value={newPhysicalQty}
                        onChange={(e) =>
                          setNewPhysicalQty(
                            e.target.value
                          )
                        }
                        placeholder="Physical Qty"
                        className="rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                      />

                      <button
                        onClick={addPhysicalLocation}
                        disabled={savingPhysical}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                      >

                        {savingPhysical ? (
                          <RefreshCw
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <MapPin size={16} />
                        )}

                        Tambah Lokasi
                      </button>

                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Jika lokasi tidak terdapat pada
                      inventory sistem, Stock Existing
                      otomatis dianggap 0 dan physical
                      stock akan terdeteksi sebagai EXCESS.
                    </p>

                  </div>


                  {/* LOCATION TABLE */}

                  <div className="overflow-hidden rounded-xl border">

                    <table className="w-full text-sm">

                      <thead className="bg-gray-900 text-xs uppercase text-white">

                        <tr>

                          <th className="px-4 py-3 text-left">
                            Location
                          </th>

                          <th className="px-4 py-3 text-right">
                            Stock Existing
                          </th>

                          <th className="px-4 py-3 text-right">
                            Physical Qty
                          </th>

                          <th className="px-4 py-3 text-right">
                            Difference
                          </th>

                          <th className="px-4 py-3 text-center">
                            Status
                          </th>

                          <th className="px-4 py-3 text-center">
                            Action
                          </th>

                        </tr>

                      </thead>

                      <tbody className="divide-y">

                        {physicalRows.length === 0 ? (

                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-10 text-center text-gray-400"
                            >
                              Belum ada lokasi physical
                              count.
                            </td>
                          </tr>

                        ) : (

                          physicalRows.map(
                            (item) => (
                              <tr
                                key={
                                  item.id ??
                                  `${item.sku}-${item.location}`
                                }
                                className="hover:bg-gray-50"
                              >

                                <td className="px-4 py-3 font-semibold">
                                  {item.location}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  {formatNumber(
                                    item.stock_existing
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">

                                  {item.id ? (

                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        item.physical_qty
                                      }
                                      onChange={(e) =>
                                        updatePhysicalQty(
                                          item,
                                          e.target.value
                                        )
                                      }
                                      className="w-28 rounded-lg border px-3 py-2 text-right outline-none focus:border-gray-900"
                                    />

                                  ) : (

                                    <span className="text-gray-400">
                                      Belum dihitung
                                    </span>

                                  )}

                                </td>

                                <td
                                  className={`px-4 py-3 text-right font-semibold ${
                                    item.difference > 0
                                      ? "text-orange-600"
                                      : item.difference < 0
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {item.difference > 0
                                    ? `+${formatNumber(
                                        item.difference
                                      )}`
                                    : formatNumber(
                                        item.difference
                                      )}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {compareBadge(
                                    item.compare_status
                                  )}
                                </td>

                                <td className="px-4 py-3 text-center">

                                  {item.id && (
                                    <button
                                      onClick={() =>
                                        deletePhysicalLocation(
                                          item
                                        )
                                      }
                                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                      title="Hapus lokasi"
                                    >
                                      <XCircle
                                        size={17}
                                      />
                                    </button>
                                  )}

                                </td>

                              </tr>
                            )
                          )

                        )}

                      </tbody>

                    </table>

                  </div>


                  {/* SUMMARY */}

                  {physicalRows.length > 0 && (

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

                      <div className="rounded-xl border bg-gray-50 p-3">

                        <p className="text-xs text-gray-500">
                          System
                        </p>

                        <p className="mt-1 font-bold">
                          {formatNumber(
                            physicalRows.reduce(
                              (sum, item) =>
                                sum +
                                Number(
                                  item.stock_existing ||
                                    0
                                ),
                              0
                            )
                          )}
                        </p>

                      </div>


                      <div className="rounded-xl border bg-gray-50 p-3">

                        <p className="text-xs text-gray-500">
                          Physical
                        </p>

                        <p className="mt-1 font-bold">
                          {formatNumber(
                            physicalRows.reduce(
                              (sum, item) =>
                                sum +
                                Number(
                                  item.physical_qty ||
                                    0
                                ),
                              0
                            )
                          )}
                        </p>

                      </div>


                      <div className="rounded-xl border bg-orange-50 p-3">

                        <p className="text-xs text-orange-600">
                          Excess
                        </p>

                        <p className="mt-1 font-bold text-orange-700">
                          {formatNumber(
                            physicalRows.reduce(
                              (sum, item) =>
                                sum +
                                Math.max(
                                  Number(
                                    item.physical_qty ||
                                      0
                                  ) -
                                    Number(
                                      item.stock_existing ||
                                        0
                                    ),
                                  0
                                ),
                              0
                            )
                          )}
                        </p>

                      </div>


                      <div className="rounded-xl border bg-red-50 p-3">

                        <p className="text-xs text-red-600">
                          Shortage
                        </p>

                        <p className="mt-1 font-bold text-red-700">
                          {formatNumber(
                            physicalRows.reduce(
                              (sum, item) =>
                                sum +
                                Math.max(
                                  Number(
                                    item.stock_existing ||
                                      0
                                  ) -
                                    Number(
                                      item.physical_qty ||
                                        0
                                    ),
                                  0
                                ),
                              0
                            )
                          )}
                        </p>

                      </div>

                    </div>
                  )}

                </>

              )}

            </div>


            {/* MODAL FOOTER */}

            <div className="flex justify-end gap-2 border-t p-5">

              <button
                onClick={() =>
                  setPhysicalModal(false)
                }
                className="rounded-xl border bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Tutup
              </button>

              <button
                onClick={savePhysicalSummary}
                disabled={loadingPhysical}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                <Save size={16} />
                Simpan Physical
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
