"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface OrderHeader {
  id: number;
  order_no: string;
  customer_name: string;
  status: string;
  created_at: string;
}

export default function OrdersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [filtered, setFiltered] = useState<OrderHeader[]>([]);
  const [search, setSearch] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("order_header")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setOrders(data || []);
      setFiltered(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const keyword = search.toLowerCase();

    const result = orders.filter(
      (o) =>
        o.order_no?.toLowerCase().includes(keyword) ||
        o.customer_name
          ?.toLowerCase()
          .includes(keyword)
    );

    setFiltered(result);
  }, [search, orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-gray-100 text-gray-700";

      case "ALLOCATED":
        return "bg-yellow-100 text-yellow-700";

      case "PICKING":
        return "bg-blue-100 text-blue-700";

      case "PICKED":
        return "bg-indigo-100 text-indigo-700";

      case "PACKED":
        return "bg-orange-100 text-orange-700";

      case "SHIPPED":
        return "bg-purple-100 text-purple-700";

      case "COMPLETED":
        return "bg-green-100 text-green-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Order List
        </h1>

        <div className="flex gap-2">
          <button
            onClick={loadOrders}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Refresh
          </button>

          <button
            onClick={() => router.back()}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-5">
        <input
          type="text"
          placeholder="Cari Order No / Customer"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full md:w-96 border rounded p-2"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">
            Total
          </div>
          <div className="text-xl font-bold">
            {orders.length}
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          NEW :{" "}
          {
            orders.filter(
              (x) => x.status === "NEW"
            ).length
          }
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          ALLOCATED :{" "}
          {
            orders.filter(
              (x) =>
                x.status === "ALLOCATED"
            ).length
          }
        </div>

        <div className="bg-blue-100 p-4 rounded">
          PICKING :{" "}
          {
            orders.filter(
              (x) =>
                x.status === "PICKING"
            ).length
          }
        </div>

        <div className="bg-indigo-100 p-4 rounded">
          PICKED :{" "}
          {
            orders.filter(
              (x) =>
                x.status === "PICKED"
            ).length
          }
        </div>

        <div className="bg-orange-100 p-4 rounded">
          PACKED :{" "}
          {
            orders.filter(
              (x) =>
                x.status === "PACKED"
            ).length
          }
        </div>

        <div className="bg-green-100 p-4 rounded">
          COMPLETED :{" "}
          {
            orders.filter(
              (x) =>
                x.status === "COMPLETED"
            ).length
          }
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-200">
            <tr>
              <th className="border p-3">
                Order No
              </th>

              <th className="border p-3">
                Customer
              </th>

              <th className="border p-3">
                Status
              </th>

              <th className="border p-3">
                Created
              </th>

              <th className="border p-3">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-10"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center p-10"
                >
                  Tidak ada data
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50"
                >
                  <td className="border p-2">
                    {order.order_no}
                  </td>

                  <td className="border p-2">
                    {order.customer_name}
                  </td>

                  <td className="border p-2">
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="border p-2">
                    {new Date(
                      order.created_at
                    ).toLocaleString()}
                  </td>

                  <td className="border p-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/outbound/orders/${order.order_no}`
                        )
                      }
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}