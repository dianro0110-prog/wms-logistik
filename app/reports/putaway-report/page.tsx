
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftCircle,
  RefreshCw,
  Search,
  FileText,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type PutawayDetail = {
  id: number;
  putaway_id?: number | null;
  receiving_no: string;
  sku: string;
  quantity: number;
  deskripsi?: string | null;
  location?: string | null;
  putaway_by?: string | null;
  putaway_at?: string | null;
};

type Product = {
  sku: string;
  deskripsi?: string | null;
};

export default function PutawayReportPage() {
  const router = useRouter();

  const [data, setData] = useState<PutawayDetail[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);

  const [selectedReceiving, setSelectedReceiving] =
    useState("");

  const [selectedLocation, setSelectedLocation] =
    useState("");

  const [search, setSearch] = useState("");

  // ============================
  // CLEAN VALUE
  // ============================
  function clean(value: any) {
    return (value ?? "")
      .toString()
      .trim()
      .toLowerCase();
  }

  // ============================
  // LOAD PUTAWAY REPORT
  // ============================
  async function loadPutawayReport() {
    setLoading(true);

    const { data: putawayData, error } = await supabase
      .from("putaway_details")
      .select(`
        id,
        putaway_id,
        receiving_no,
        sku,
        quantity,
        deskripsi,
        location,
        putaway_by,
        putaway_at
      `)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Putaway report error:",
        error
      );

      alert(
        `Gagal mengambil data putaway: ${error.message}`
      );

      setLoading(false);
      return;
    }

    setData(putawayData || []);

    setLoading(false);
  }

  // ============================
  // LOAD PRODUCTS
  // ============================
  async function loadProducts() {
    const { data, error } = await supabase
      .from("product")
      .select("sku, deskripsi");

    if (error) {
      console.error(
        "Product error:",
        error
      );

      return;
    }

    setProducts(data || []);
  }

  // ============================
  // INITIAL LOAD
  // ============================
  useEffect(() => {
    loadPutawayReport();
    loadProducts();
  }, []);

  // ============================
  // GET DESCRIPTION
  // ============================
  function getDescription(
    row: PutawayDetail
  ) {
    if (row.deskripsi) {
      return row.deskripsi;
    }

    const product = products.find(
      (p) =>
        clean(p.sku) === clean(row.sku)
    );

    return product?.deskripsi || "-";
  }

  // ============================
  // RECEIVING LIST
  // ============================
  const receivingList = useMemo(() => {
    const values = data
      .map((item) => item.receiving_no)
      .filter(Boolean);

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // LOCATION LIST
  // ============================
  const locationList = useMemo(() => {
    const values = data
      .map((item) => item.location)
      .filter(Boolean) as string[];

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  // ============================
  // FILTER DATA
  // ============================
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchReceiving =
        !selectedReceiving ||
        item.receiving_no ===
          selectedReceiving;

      const matchLocation =
        !selectedLocation ||
        clean(item.location) ===
          clean(selectedLocation);

      const keyword =
        search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        clean(item.receiving_no).includes(
          keyword
        ) ||
        clean(item.sku).includes(
          keyword
        ) ||
        clean(
          getDescription(item)
        ).includes(keyword) ||
        clean(
          item.location
        ).includes(keyword);

      return (
        matchReceiving &&
        matchLocation &&
        matchSearch
      );
    });
  }, [
    data,
    selectedReceiving,
    selectedLocation,
    search,
    products,
  ]);

  // ============================
  // TOTAL QTY
  // ============================
  const totalQty = useMemo(() => {
    return filteredData.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0),
      0
    );
  }, [filteredData]);

  // ============================
  // TOTAL RECEIVING
  // ============================
  const totalReceiving = useMemo(() => {
    const values = filteredData
      .map(
        (item) =>
          item.receiving_no
      )
      .filter(Boolean);

    return new Set(values).size;
  }, [filteredData]);

  // ============================
  // TOTAL SKU
  // ============================
  const totalSku = useMemo(() => {
    const values = filteredData
      .map((item) => item.sku)
      .filter(Boolean);

    return new Set(
      values.map((sku) => clean(sku))
    ).size;
  }, [filteredData]);

  // ============================
  // TOTAL LOCATION
  // ============================
  const totalLocation = useMemo(() => {
    const values = filteredData
      .map((item) => item.location)
      .filter(Boolean);

    return new Set(
      values.map((loc) => clean(loc))
    ).size;
  }, [filteredData]);

  // ============================
  // REFRESH
  // ============================
  async function refresh() {
    await loadPutawayReport();
  }

  // ============================
  // RENDER
  // ============================
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="max-w-7xl mx-auto space-y-5">

        {/* ================= HEADER ================= */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-center gap-3">

              {/* BACK */}
              <button
                onClick={() =>
                  router.push("/system")
                }
                className="
                  flex
                  items-center
                  gap-2
                  bg-gray-600
                  hover:bg-gray-700
                  text-white
                  px-3
                  py-2
                  rounded-lg
                  transition
                "
              >
                <ArrowLeftCircle
                  size={19}
                />

                <span>
                  Back
                </span>
              </button>

              {/* TITLE */}
              <div>

                <div className="flex items-center gap-2">

                  <FileText
                    size={24}
                    className="text-purple-600"
                  />

                  <h1 className="text-xl md:text-2xl font-bold">
                    Putaway Report
                  </h1>

                </div>

                <p className="text-sm text-gray-500 mt-1">
                  Report hasil putaway inbound
                </p>

              </div>

            </div>

            {/* REFRESH */}
            <button
              onClick={refresh}
              disabled={loading}
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-purple-600
                hover:bg-purple-700
                disabled:bg-gray-400
                text-white
                px-4
                py-2
                rounded-lg
                transition
              "
            >

              <RefreshCw
                size={18}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>

        </div>

        {/* ================= FILTER ================= */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* RECEIVING */}
            <select
              value={selectedReceiving}
              onChange={(e) =>
                setSelectedReceiving(
                  e.target.value
                )
              }
              className="
                border
                rounded-lg
                px-3
                py-2
                w-full
                focus:outline-none
                focus:ring-2
                focus:ring-purple-500
              "
            >

              <option value="">
                Semua Receiving
              </option>

              {receivingList.map(
                (receiving) => (
                  <option
                    key={receiving}
                    value={receiving}
                  >
                    {receiving}
                  </option>
                )
              )}

            </select>

            {/* LOCATION */}
            <select
              value={selectedLocation}
              onChange={(e) =>
                setSelectedLocation(
                  e.target.value
                )
              }
              className="
                border
                rounded-lg
                px-3
                py-2
                w-full
                focus:outline-none
                focus:ring-2
                focus:ring-purple-500
              "
            >

              <option value="">
                Semua Location
              </option>

              {locationList.map(
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

            {/* SEARCH */}
            <div className="relative">

              <Search
                size={18}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Cari receiving, SKU, lokasi..."
                className="
                  border
                  rounded-lg
                  pl-10
                  pr-3
                  py-2
                  w-full
                  focus:outline-none
                  focus:ring-2
                  focus:ring-purple-500
                "
              />

            </div>

          </div>

        </div>

        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* TOTAL BARIS */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Baris
            </p>

            <p className="text-2xl font-bold mt-1">
              {filteredData.length}
            </p>

          </div>

          {/* TOTAL QTY */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Qty Putaway
            </p>

            <p className="text-2xl font-bold mt-1">
              {totalQty}
            </p>

          </div>

          {/* TOTAL RECEIVING */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Receiving
            </p>

            <p className="text-2xl font-bold mt-1">
              {totalReceiving}
            </p>

          </div>

          {/* TOTAL LOCATION */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">

            <p className="text-sm text-gray-500">
              Total Location
            </p>

            <p className="text-2xl font-bold mt-1">
              {totalLocation}
            </p>

          </div>

        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="bg-gray-100">

                  <th className="border p-3 text-left">
                    No
                  </th>

                  <th className="border p-3 text-left">
                    Receiving No
                  </th>

                  <th className="border p-3 text-left">
                    SKU
                  </th>

                  <th className="border p-3 text-left">
                    Deskripsi
                  </th>

                  <th className="border p-3 text-right">
                    Qty Putaway
                  </th>

                  <th className="border p-3 text-left">
                    Location
                  </th>

                  <th className="border p-3 text-left">
                    User
                  </th>

                  <th className="border p-3 text-left">
                    Putaway_at
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="border p-8 text-center"
                    >

                      <div className="flex justify-center items-center gap-2 text-gray-500">

                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />

                        Loading data...

                      </div>

                    </td>

                  </tr>

                ) : filteredData.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="border p-8 text-center text-gray-500"
                    >
                      Tidak ada hasil putaway
                    </td>

                  </tr>

                ) : (

                  filteredData.map(
                    (item, index) => (

                      <tr
                        key={item.id}
                        className="hover:bg-purple-50"
                      >

                        {/* NO */}
                        <td className="border p-3">
                          {index + 1}
                        </td>

                        {/* RECEIVING */}
                        <td className="border p-3 font-medium">
                          {item.receiving_no}
                        </td>

                        {/* SKU */}
                        <td className="border p-3 font-mono">
                          {item.sku}
                        </td>

                        {/* DESKRIPSI */}
                        <td className="border p-3">
                          {getDescription(
                            item
                          )}
                        </td>

                        {/* QTY */}
                        <td className="border p-3 text-right font-semibold">
                          {Number(
                            item.quantity || 0
                          )}
                        </td>

                        {/* LOCATION */}
                        <td className="border p-3 font-medium">
                          {item.location || "-"}
                        </td>

                        {/* PUTAWAY ID */}
                        <td className="border p-3">
                          {item.putaway_by || "-"}
                        </td>

                        <td className="border p-3">
                          {item.putaway_at || "-"}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}

