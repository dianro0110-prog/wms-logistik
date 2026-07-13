"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function PickingListPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("order_header")
        .select("*")
        .eq("status", "ALLOCATED")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="flex justify-between mb-6">

        <h1 className="text-2xl font-bold">
          Picking List
        </h1>

        <button
          onClick={() => router.back()}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back
        </button>

      </div>

      <div className="bg-white rounded shadow overflow-x-auto">

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
                Action
              </th>
            </tr>

          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-10"
                >
                  Loading...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-10"
                >
                  No Allocated Order
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>

                  <td className="border p-2 font-semibold">
                    {order.order_no}
                  </td>

                  <td className="border p-2">
                    {order.customer_name}
                  </td>

                  <td className="border p-2">
                    {order.status}
                  </td>

                  <td className="border p-2">

                    <button
                      onClick={() =>
                        router.push(
                          `/outbound/picking/${order.order_no}`
                        )
                      }
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Start Picking
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