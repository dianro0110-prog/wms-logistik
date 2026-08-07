"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageCheck } from "lucide-react";
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

  async function loadOrders() {
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
    }

    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="p-6">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <div>

          <h1 className="text-3xl font-bold">
            Packing List
          </h1>

          <p className="text-gray-500">
            Daftar Order yang siap dipacking
          </p>

        </div>

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
        >
          <ArrowLeft size={18} />
          Back
        </button>

      </div>

      {/* TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-blue-600 text-white">

            <tr>

              <th className="px-4 py-3 text-left">
                Order No
              </th>

              <th className="px-4 py-3 text-left">
                Customer
              </th>

              <th className="px-4 py-3 text-left">
                Order Date
              </th>

              <th className="px-4 py-3 text-center">
                Status
              </th>

              <th className="px-4 py-3 text-center">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>

                <td
                  colSpan={5}
                  className="text-center py-10"
                >
                  Loading...
                </td>

              </tr>

            ) : orders.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="text-center py-10 text-gray-500"
                >
                  Tidak ada order yang siap dipacking.
                </td>

              </tr>

            ) : (

              orders.map((order) => (

                <tr
                  key={order.id}
                  className="border-b hover:bg-gray-50"
                >

                  <td className="px-4 py-3 font-medium">
                    {order.order_no}
                  </td>

                  <td className="px-4 py-3">
                    {order.customer_name}
                  </td>

                  <td className="px-4 py-3">
                    {new Date(
                      order.created_at
                    ).toLocaleDateString("id-ID")}
                  </td>

                  <td className="px-4 py-3 text-center">

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

                      {order.status}

                    </span>

                  </td>

                  <td className="px-4 py-3 text-center">

                    <button
                      onClick={() =>
                        router.push(
                          `/outbound/packing/${order.order_no}`
                        )
                      }
                      className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      <PackageCheck size={18} />
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