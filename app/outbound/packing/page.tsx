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

export default function PackingListPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadOrders() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("order_header")
        .select("*")
        .eq("status", "PICKED")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-3xl font-bold">
            Packing List
          </h1>

          <p className="text-gray-500">
            Order yang sudah selesai Picking
          </p>
        </div>

        <div className="flex gap-2">

          <button
            onClick={refreshData}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => router.back()}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Back
          </button>

        </div>

      </div>

      <div className="bg-white rounded shadow overflow-x-auto">

        <table className="w-full">

          <thead className="bg-slate-200">

            <tr>

              <th className="border p-3 text-left">
                No
              </th>

              <th className="border p-3 text-left">
                Order No
              </th>

              <th className="border p-3 text-left">
                Customer
              </th>

              <th className="border p-3 text-center">
                Status
              </th>

              <th className="border p-3 text-center">
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

            ) : orders.length === 0 ? (

              <tr>
                <td
                  colSpan={5}
                  className="text-center p-10"
                >
                  Tidak ada Order yang siap Packing
                </td>
              </tr>

            ) : (

              orders.map((order, index) => (

                <tr
                  key={order.id}
                  className="hover:bg-slate-50"
                >

                  <td className="border p-2">
                    {index + 1}
                  </td>

                  <td className="border p-2 font-semibold">
                    {order.order_no}
                  </td>

                  <td className="border p-2">
                    {order.customer_name}
                  </td>

                  <td className="border p-2 text-center">

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {order.status}
                    </span>

                  </td>

                  <td className="border p-2 text-center">

                    <button
                      onClick={() =>
                        router.push(
                          `/outbound/packing/${encodeURIComponent(
                            order.order_no
                          )}`
                        )
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                    >
                      Start Packing
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