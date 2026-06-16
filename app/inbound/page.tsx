import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/Statcard";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* SIDEBAR (support submenu - no change needed) */}
      <Sidebar />

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">

        {/* TOP NAVBAR */}
        <Navbar />

        {/* CONTENT */}
        <main className="p-6 space-y-6">

          {/* HEADER */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Dashboard WMS
            </h1>
            <p className="text-slate-500">
              Ringkasan aktivitas warehouse
            </p>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <StatCard
              title="Total Barang"
              value="250"
            />

            <StatCard
              title="Stok"
              value="12.500"
            />

            <StatCard
              title="Barang Masuk"
              value="320"
            />

            <StatCard
              title="Barang Keluar"
              value="180"
            />

          </div>

        </main>

      </div>
    </div>
  );
}