"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftCircle } from "lucide-react";
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

return ( <div className="min-h-screen bg-slate-50 p-3 sm:p-6">


  {/* ========================================
      BACK BUTTON - POJOK KIRI ATAS
  ======================================== */}
  <button
    onClick={() => router.back()}
    className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 flex items-center gap-1 sm:gap-2 bg-gray-500 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow hover:bg-gray-600 transition text-sm sm:text-base"
  >
    <ArrowLeftCircle size={18} className="sm:w-5 sm:h-5" />
    <span>Back</span>
  </button>

  {/* ========================================
      HEADER
  ======================================== */}
  <div className="flex justify-between items-center mb-4 sm:mb-6 pt-12">

    <h1 className="text-xl sm:text-2xl font-bold">
      Picking List
    </h1>

    <button
      onClick={loadOrders}
      className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
    >
      Refresh
    </button>

  </div>

  {/* ========================================
      TABLE
  ======================================== */}
  <div className="bg-white rounded-lg shadow overflow-x-auto">

    <table className="w-full text-sm sm:text-base">

      <thead className="bg-slate-200">

        <tr>

          <th className="border p-2 sm:p-3 whitespace-nowrap">
            Order No
          </th>

          <th className="border p-2 sm:p-3">
            Customer
          </th>

          <th className="border p-2 sm:p-3 whitespace-nowrap">
            Status
          </th>

          <th className="border p-2 sm:p-3 whitespace-nowrap">
            Action
          </th>

        </tr>

      </thead>

      <tbody>

        {loading ? (

          <tr>
            <td
              colSpan={4}
              className="text-center p-8 sm:p-10"
            >
              Loading...
            </td>
          </tr>

        ) : orders.length === 0 ? (

          <tr>
            <td
              colSpan={4}
              className="text-center p-8 sm:p-10"
            >
              No Allocated Order
            </td>
          </tr>

        ) : (

          orders.map((order) => (

            <tr
              key={order.id}
              className="hover:bg-slate-50"
            >

              <td className="border p-2 sm:p-2 font-semibold whitespace-nowrap">
                {order.order_no}
              </td>

              <td className="border p-2 sm:p-2">
                <div className="max-w-[140px] sm:max-w-none truncate sm:whitespace-normal">
                  {order.customer_name}
                </div>
              </td>

              <td className="border p-2 sm:p-2 whitespace-nowrap">
                {order.status}
              </td>

              <td className="border p-2 sm:p-2 text-center">

                <button
                  onClick={() =>
                    router.push(
                      `/outbound/picking/${order.order_no}`
                    )
                  }
                  className="bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded hover:bg-blue-700 transition text-xs sm:text-sm whitespace-nowrap"
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
