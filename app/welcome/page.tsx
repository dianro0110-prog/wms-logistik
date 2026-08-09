
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function WelcomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("Loading...");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setUsername(profile?.username || user.email || "User");
    };

    loadUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <header className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-6 py-5">

          <h1 className="text-2xl font-bold text-blue-950">
            Support System For All Processes
          </h1>

        </div>
      </header>

      {/* BODY */}
      <div className="flex justify-center items-center h-[80vh]">

        <div className="bg-white shadow-xl rounded-2xl p-12 text-center w-[700px]">

          <h2 className="text-5xl font-bold text-blue-950">
            Welcome
          </h2>

          <p className="mt-5 text-3xl font-semibold">
            {username}
          </p>

          <p className="mt-4 text-gray-500 text-lg">
            Selamat datang di
            <br />
            Warehouse Management System
          </p>

          <div className="mt-10 flex justify-center gap-6">

            <button
              onClick={() => router.push("/dashboard")}
              className="px-10 py-4 bg-blue-950 text-white rounded-xl text-xl font-semibold hover:bg-blue-700 transition"
            >
              📊 Dashboard
            </button>

            <button
              onClick={() => router.push("/system")}
              className="px-10 py-4 bg-green-950 text-white rounded-xl text-xl font-semibold hover:bg-green-700 transition"
            >
              🚀 Let's Go
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
