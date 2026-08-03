"use client";

import {
  Eye,
  EyeOff,
  ArrowRight,
  LogIn,
} from "lucide-react";

export default function MobileLogin({

  email,
  setEmail,

  password,
  setPassword,

  showPassword,
  setShowPassword,

  loading,
  error,

  handleLogin,

}: any) {

  return (

    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#0f172a 0%, #1e3a8a 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "30px 25px",
          boxShadow: "0 15px 40px rgba(0,0,0,.20)",
        }}
      >

        {/* Logo */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "18px",
          }}
        >

          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "#03163f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >

            <LogIn size={34} />

          </div>

        </div>

        {/* Judul */}

        <h2
          style={{
            textAlign: "center",
            fontSize: "28px",
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Masuk
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginTop: "10px",
            marginBottom: "30px",
            fontSize: "14px",
            lineHeight: "22px",
          }}
        >
          Login ke
          <br />
          Warehouse Management System
        </p>

        {/* Error */}

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* FORM DIMULAI DI BAGIAN 2 */}
        <form onSubmit={handleLogin}>

                      {/* Email */}

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#374151",
              fontSize: "14px",
            }}
          >
            Email
          </label>

          <input
            type="email"
            placeholder="Masukkan email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "15px",
              marginBottom: "20px",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          {/* Password */}

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#374151",
              fontSize: "14px",
            }}
          >
            Password
          </label>

          <div
            style={{
              position: "relative",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                paddingRight: "50px",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                fontSize: "15px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {/* Opsi */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              marginBottom: "28px",
              fontSize: "13px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#4b5563",
                cursor: "pointer",
              }}
            >
              <input type="checkbox" />
              Ingat Saya
            </label>

            <span
              style={{
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Lupa Password?
            </span>
          </div>

          {/* Tombol Login */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: "12px",
              background: "#03163f",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {loading ? "Loading..." : "Masuk ke Dashboard"}

            {!loading && <ArrowRight size={18} />}
          </button>

          {/* Divider */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "28px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "#e5e7eb",
              }}
            />

            <span
              style={{
                margin: "0 12px",
                color: "#9ca3af",
                fontSize: "13px",
              }}
            >
              atau
            </span>

            <div
              style={{
                flex: 1,
                height: "1px",
                background: "#e5e7eb",
              }}
            />
          </div>

                    {/* Belum punya akun */}

          <div
            style={{
              textAlign: "center",
              marginBottom: "20px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Belum punya akun?{" "}
            <button
              type="button"
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Daftar
            </button>
          </div>

        </form>

        {/* Footer */}

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "18px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            🔒 Login aman menggunakan SSL/TLS
          </div>

          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              color: "#9ca3af",
              lineHeight: "18px",
            }}
          >
            Warehouse Management System
            <br />
            Version 1.0
          </div>
        </div>

      </div>

    </div>

  );
}