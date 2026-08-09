  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { supabase } from "../../lib/supabase";

  import {
    ArrowRight,
    Shield,
    Users,
    Smartphone,
    Package,
    Eye,
    EyeOff,
    LogIn,
  } from "lucide-react";

  import { Capacitor } from "@capacitor/core";
  import MobileLogin from "./MobileLogin";

  export default function LoginPage() {

    

    const router = useRouter();
const [isMobileApp, setIsMobileApp] = useState<boolean | null>(null);
    const [tab, setTab] = useState<"login" | "register">("login");

    // LOGIN
    const [username, setusername] = useState("");
    const [password, setPassword] = useState("");

    // REGISTER
    const [name, setName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    
    useEffect(() => {
  setMounted(true);

  setCurrentTime(new Date());

  // Tunggu Capacitor siap
  const platform = Capacitor.getPlatform();

  setIsMobileApp(
    platform === "android" ||
    platform === "ios"
  );

  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

    // ============================
    // LOGIN
    // ============================

    const handleLogin = async (e: any) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    // Cari email berdasarkan username
    const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("email")
  .eq("username", username.trim())
  .single();

    if (profileError || !profile) {
      setError("Username tidak ditemukan");
      setLoading(false);
      return;
    }

    // Login menggunakan email yang ditemukan
    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });



    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    localStorage.setItem(
      "wms_token",
      data.session?.access_token || ""
    );

    router.push("/welcome");
  };

    // ============================
    // REGISTER
    // ============================

    const handleRegister = async (e: any) => {
      e.preventDefault();

      setLoading(true);
      setError("");

      const { data, error } =
        await supabase.auth.signUp({
          email: regEmail,
          password: regPassword,
        });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("User gagal dibuat.");
        setLoading(false);
        return;
      }

      const { error: profileError } =
        await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            username: name,
            email: regEmail,
          });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      alert("Registrasi berhasil.");

      setName("");
      setRegEmail("");
      setRegPassword("");

      setTab("login");

      setLoading(false);
    };

    const tanggal = currentTime
    ? currentTime.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  const jam = currentTime
    ? currentTime.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  /*
  ================================
  MOBILE CAPACITOR VIEW
  ================================
  */

if (isMobileApp === null) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#03163f",
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
      }}
    >
      Loading...
    </div>
  );
}

  if (isMobileApp) {
    return (
      <MobileLogin
        name={username}
        setusername={setusername}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loading={loading}
        error={error}
        handleLogin={handleLogin}
      />
    );
  }

  /*
  ================================
  WEBSITE VIEW START
  ================================
  */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#edf3ef",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          background: "#fff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 10px 35px rgba(0,0,0,.1)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "#03163f",
            padding: "22px 35px",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                background: "rgba(255,255,255,.1)",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Package size={28} />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                  }}
                >
                  Warehouse Management System
                </div>

                <div
                  style={{
                    opacity: 0.85,
                  }}
                >
                  Integrated System
                </div>
              </div>

              <div
                style={{
                  textAlign: "right",
                  background: "rgba(255,255,255,.1)",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  minWidth: "220px",
                }}
              >
                <div
                  suppressHydrationWarning
                  style={{
                    fontSize: "20px",
                    fontWeight: 500,
                  }}
                >
                  {mounted ? tanggal : ""}
                </div>

                <div
                  suppressHydrationWarning
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginTop: "4px",
                    letterSpacing: "2px",
                  }}
                >
                  {mounted ? jam : "--:--:--"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
          }}
        >

        {/* =========================
        PANEL KIRI
  ========================= */}

  <div
    style={{
      padding: "40px",
      background: "#03163fe3",
    }}
  >
    <h1
      style={{
        fontSize: "38px",
        fontWeight: "700",
        lineHeight: "50px",
        color: "#ffffff",
      }}
    >
      Management Warehouse Activity
    </h1>

    <p
      style={{
        marginTop: "18px",
        color: "#ffffff",
        fontSize: "17px",
      }}
    >
      Optimalkan operasi harian anda dengan tracking real-time,
      kontrol akses multi-user dan reporting lengkap.
    </p>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "18px",
        marginTop: "35px",
      }}
    >
      <div
        style={{
          background: "#ccdaf1",
          padding: "20px",
          borderRadius: "12px",
        }}
      >
        <Package color="#000" />

        <h3>Real-time Tracking</h3>

        <p style={{ color: "#666" }}>
          Monitor stok secara live
        </p>
      </div>

      <div
        style={{
          background: "#ccdaf1",
          padding: "20px",
          borderRadius: "12px",
        }}
      >
        <Shield color="#000" />

        <h3>Multi-user Access</h3>

        <p style={{ color: "#666" }}>
          Role-based permissions
        </p>
      </div>

      <div
        style={{
          background: "#ccdaf1",
          padding: "20px",
          borderRadius: "12px",
        }}
      >
        <Users color="#000" />

        <h3>500+ Clients</h3>

        <p style={{ color: "#666" }}>
          Perusahaan terpercaya
        </p>
      </div>

      <div
        style={{
          background: "#ccdaf1",
          padding: "20px",
          borderRadius: "12px",
        }}
      >
        <Smartphone color="#000" />

        <h3>Mobile Ready</h3>

        <p style={{ color: "#666" }}>
          Akses via smartphone
        </p>
      </div>
    </div>

    <div
      style={{
        marginTop: "40px",
        background: "#ccdaf1",
        padding: "20px",
        borderRadius: "12px",
      }}
    >
      <h3>Cara Login</h3>

      <ul
        style={{
          paddingLeft: "20px",
          lineHeight: "35px",
          color: "#555",
        }}
      >
        <li>Masukkan Username</li>
        <li>Masukkan Password</li>
        <li>Klik Masuk ke Wms</li>
      </ul>
    </div>

    <div
      style={{
        marginTop: "35px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#fff",
        opacity: 0.8,
        fontSize: "14px",
      }}
    >
      <span>Warehouse Management System</span>
      <span>Version 1.0</span>
    </div>
  </div>

  {/* =========================
        PANEL KANAN
  ========================= */}

  <div
    style={{
      borderLeft: "1px solid #eee",
      padding: "60px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#ffffff",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#03163f",
            width: "70px",
            height: "70px",
            borderRadius: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <LogIn size={30} />
        </div>
      </div>

      <h2
        style={{
          textAlign: "center",
          fontSize: "34px",
          fontWeight: "bold",
        }}
      >
        Masuk ke Dashboard
      </h2>

      <p
        style={{
          textAlign: "center",
          color: "#666",
          marginTop: "10px",
          marginBottom: "35px",
        }}
      >
        Gunakan username untuk login
      </p>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {tab === "login" ? (
        <form onSubmit={handleLogin}>
          {/* EMAIL */}

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Username
            </label>

            <input
              type="text"
              placeholder="Masukkan username..."
              value={username}
              onChange={(e) => setusername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* PASSWORD */}

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
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
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "14px",
                  paddingRight: "55px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
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
                  border: "none",
                  background: "transparent",
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

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#03163f",
              color: "#fff",
              padding: "15px",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {loading ? "Loading..." : "Masuk ke Wms"}

            {!loading && <ArrowRight size={18} />}
          </button>

          <div
            style={{
              textAlign: "center",
              marginTop: "30px",
            }}
          >
            Belum punya akun?

            <button
              type="button"
              onClick={() => setTab("register")}
              style={{
                border: "none",
                background: "transparent",
                color: "#03163f",
                fontWeight: "bold",
                marginLeft: "5px",
                cursor: "pointer",
              }}
            >
              Daftar
            </button>
          </div>
        </form>

      ):
  (
    <form onSubmit={handleRegister}>

      {/* NAMA */}

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
          }}
        >
          Nama Lengkap
        </label>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan nama lengkap"
          required
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* EMAIL */}

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
          }}
        >
          Email
        </label>

        <input
          type="email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          placeholder="Masukkan email"
          required
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* PASSWORD */}

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
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
            type={showRegPassword ? "text" : "password"}
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "14px",
              paddingRight: "55px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          <button
            type="button"
            onClick={() => setShowRegPassword(!showRegPassword)}
            style={{
              position: "absolute",
              right: "15px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {showRegPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>
      </div>

      {/* REGISTER BUTTON */}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px",
          background: "#03163f",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          fontWeight: "bold",
          fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Loading..." : "Daftar Sekarang"}
      </button>

      <div
        style={{
          textAlign: "center",
          marginTop: "25px",
        }}
      >
        Sudah punya akun?

        <button
          type="button"
          onClick={() => setTab("login")}
          style={{
            border: "none",
            background: "transparent",
            color: "#03163f",
            fontWeight: "bold",
            marginLeft: "5px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>

    </form>
  )}
        </div>
      </div>
      </div>
  </div>
  </div>
  
    );
  }