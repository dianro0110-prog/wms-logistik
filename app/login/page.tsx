"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      localStorage.setItem(
        "wms_token",
        data.session?.access_token || ""
      );

      router.push("/dashboard");
    }

    setLoading(false);
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      alert("Akun berhasil dibuat");
      setTab("login");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#cdd0f8",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "360px",
          background: "rgba(29, 4, 172, 0.25)",
          borderRadius: "30px",
          padding: "35px",
          boxShadow: "0 10px 30px rgba(160, 4, 4, 0.15)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: "50px",
            marginBottom: "10px",
          }}
        >
          👤
        </div>

        <h1
          style={{
            textAlign: "center",
            marginBottom: "25px",
            color: "#ffffff",
          }}
        >
          User Login
        </h1>

        {error && (
          <div
            style={{
              background: "#2c00a3",
              color: "red",
              padding: "10px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "25px",
                border: "none",
                marginBottom: "15px",
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "25px",
                border: "none",
                marginBottom: "15px",
              }}
            />

            <div
              style={{
                textAlign: "center",
                marginBottom: "15px",
              }}
            >
              Forgot Password?
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#003f7f",
                color: "white",
                cursor: "pointer",
              }}
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: "15px",
              }}
            >
              <button
                type="button"
                onClick={() => setTab("register")}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Belum punya akun? Register
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "25px",
                border: "none",
                marginBottom: "15px",
              }}
            />

            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "25px",
                border: "none",
                marginBottom: "15px",
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "25px",
                border: "none",
                marginBottom: "15px",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#003f7f",
                color: "white",
                cursor: "pointer",
              }}
            >
              {loading ? "Loading..." : "Register"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: "15px",
              }}
            >
              <button
                type="button"
                onClick={() => setTab("login")}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Sudah punya akun? Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}