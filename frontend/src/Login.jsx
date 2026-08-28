import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(m) { setMode(m); setError(""); }

  async function handleLogin(e) {
    e.preventDefault(); setError("");
    if (!email.includes("@")) { setError("Valid email required"); return; }
    if (!password) { setError("Password required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Login failed"); setLoading(false); return; }
      localStorage.setItem("rajdip_user", JSON.stringify(data));
      onLogin(data);
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault(); setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.includes("@")) { setError("Valid email required"); return; }
    if (phone.length < 10) { setError("Valid 10 digit phone required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Signup failed"); setLoading(false); return; }
      localStorage.setItem("rajdip_user", JSON.stringify(data));
      onLogin(data);
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <p className="login-logo">RAJDIP.SYS</p>
        <p className="login-sub">// access terminal — identify yourself</p>

        <div className="auth-toggle">
          <button className={`auth-tab ${mode==="login"?"active":""}`}
            onClick={() => switchMode("login")}>LOGIN</button>
          <button className={`auth-tab ${mode==="signup"?"active":""}`}
            onClick={() => switchMode("signup")}>SIGN UP</button>
        </div>

        {mode === "login" && (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label>EMAIL_</label>
              <input type="email" placeholder="your email"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="login-field">
              <label>PASSWORD_</label>
              <input type="password" placeholder="your password"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="login-error">⚠ {error}</p>}
            <button className="btn login-btn" type="submit" disabled={loading}>
              {loading ? "LOGGING IN..." : "▶ LOGIN"}
            </button>
            <p className="auth-switch">
              No account? <span onClick={() => switchMode("signup")}>SIGN UP</span>
            </p>
          </form>
        )}

        {mode === "signup" && (
          <form className="login-form" onSubmit={handleSignup}>
            <div className="login-field">
              <label>NAME_</label>
              <input type="text" placeholder="your name"
                value={name} onChange={e => setName(e.target.value)} maxLength={30} />
            </div>
            <div className="login-field">
              <label>EMAIL_</label>
              <input type="email" placeholder="your email"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="login-field">
              <label>PHONE_</label>
              <input type="tel" placeholder="10 digit mobile"
                value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} />
            </div>
            <div className="login-field">
              <label>PASSWORD_</label>
              <input type="password" placeholder="min 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="login-field">
              <label>CONFIRM PASSWORD_</label>
              <input type="password" placeholder="repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {error && <p className="login-error">⚠ {error}</p>}
            <button className="btn login-btn" type="submit" disabled={loading}>
              {loading ? "CREATING..." : "▶ CREATE ACCOUNT"}
            </button>
            <p className="auth-switch">
              Have account? <span onClick={() => switchMode("login")}>LOGIN</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}