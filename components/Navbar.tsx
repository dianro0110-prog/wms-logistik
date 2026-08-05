"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");

  useEffect(() => {
    const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setUserName("Guest");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profile) {
    setUserName(profile.username);
  } else {
    setUserName(user.email ?? "User");
  }
};

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-white shadow-sm border-b">
  <div className="flex items-center justify-between px-6 py-4">

    {/* Kiri */}
    <div className="flex items-center gap-4">

      <button
        onClick={() => router.push("/welcome")}
        className="p-2 rounded-lg hover:bg-gray-100 transition"
        title="Kembali"
      >
        <ArrowLeft
          size={22}
          className="text-gray-700"
        />
      </button>

      <h1 className="text-xl font-bold">
        Warehouse Dashboard
      </h1>

    </div>

    {/* Kanan */}
    <div className="flex items-center gap-3">

      <UserCircle
        size={36}
        className="text-blue-600"
      />

      <div className="flex flex-col">
        <span className="text-sm text-gray-500">
          Users Name
        </span>

        <span className="font-semibold text-gray-800">
          {userName}
        </span>
      </div>

    </div>

  </div>
</header>
  );
}