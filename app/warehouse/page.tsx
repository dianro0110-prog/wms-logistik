import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/Statcard";

export default function Dashboard() {
  return (
    <div className="flex bg-slate-100">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-6">
          <div className="grid grid-cols-4 gap-4">
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
        </div>
      </div>
    </div>
  );
}