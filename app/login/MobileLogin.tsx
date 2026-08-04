"use client";

import React from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";

interface MobileLoginProps {
  name: string;
  setusername: (value: string) => void;

  password: string;
  setPassword: (value: string) => void;

  showPassword: boolean;
  setShowPassword: (value: boolean) => void;

  loading: boolean;
  error: string;

  handleLogin: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function MobileLogin({
  name,
  setusername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  error,
  handleLogin,
}: MobileLoginProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#edf3ef",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 18,
          padding: 30,
          boxShadow: "0 10px 25px rgba(0,0,0,.12)",
        }}
      >
        {/* ICON */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 25,
          }}
        >
          <div
            style={{
              width: 75,
              height: 75,
              borderRadius: 16,
              background: "#03163f",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
            }}
          >
            <LogIn size={32} />
          </div>
        </div>

        {/* TITLE */}

        <h2
          style={{
            textAlign: "center",
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          Login WMS
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: 30,
          }}
        >
          Gunakan username untuk masuk
        </p>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: 12,
              borderRadius: 10,
              textAlign: "center",
              marginBottom: 20,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleLogin}>
          {/* USERNAME */}

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Username
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setusername(e.target.value)}
              placeholder="Masukkan username"
              required
              style={{
                width: "100%",
                padding: 15,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* PASSWORD */}

          <div style={{ marginBottom: 25 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                style={{
                  width: "100%",
                  padding: 15,
                  paddingRight: 55,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 16,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 15,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* LOGIN */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#03163f",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: 15,
              fontWeight: "bold",
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
            }}
          >
            {loading ? "Loading..." : "Masuk"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* FOOTER */}

        <div
          style={{
            marginTop: 30,
            textAlign: "center",
            color: "#888",
            fontSize: 13,
          }}
        >
          Warehouse Management System
          <br />
          Version 1.0
        </div>
      </div>
    </div>
  );
}