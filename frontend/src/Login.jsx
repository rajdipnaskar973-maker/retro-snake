import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Login({ onLogin }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOTP(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Valid email required"); return; }
    if (!phone.trim() || phone.length < 10) { setError("Valid 10 digit mobile required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone }),
      });
      if (!res.ok) throw new Error("Failed to send OTP");
      setStep(2);
    } catch {
      setError("Could not send OTP. Check your connection.");
    }
    setLoading(false);
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError("");
    if (!otp.trim() || otp.length !== 6) { setError("Enter 6 digit OTP"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, name, phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Wrong OTP"); setLoading(false); return; }
      const user = { name, email, phone };
      localStorage.setItem("rajdip_user", JSON.stringify(user));
      onLogin(user);
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <p className="login-logo">RAJDIP.SYS</p>
        <p className="login-sub">// access terminal — identify yourself</p>

        {step === 1 && (
          <form className="login-form" onSubmit={handleSendOTP}>
            <div className="login-field">
              <label>NAME_</label>
              <input
                type="text"
                placeholder="your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="login-field">
              <label>EMAIL_</label>
              <input
                type="email"
                placeholder="your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label>MOBILE_</label>
              <input
                type="tel"
                placeholder="10 digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
              />
            </div>
            {error && <p className="login-error">⚠ {error}</p>}
            <button className="btn login-btn" type="submit" disabled={loading}>
              {loading ? "SENDING OTP..." : "▶ SEND OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="login-form" onSubmit={handleVerifyOTP}>
            <p className="login-otp-msg">
              OTP sent to <strong>{email}</strong><br/>
              Check your inbox!
            </p>
            <div className="login-field">
              <label>ENTER OTP_</label>
              <input
                type="text"
                placeholder="6 digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <p className="login-error">⚠ {error}</p>}
            <button className="btn login-btn" type="submit" disabled={loading}>
              {loading ? "VERIFYING..." : "▶ ENTER TERMINAL"}
            </button>
            <button
              type="button"
              className="btn login-btn"
              style={{marginTop: "8px", opacity: 0.6, fontSize: "0.9rem"}}
              onClick={() => { setStep(1); setError(""); setOtp(""); }}
            >
              ← GO BACK
            </button>
          </form>
        )}
      </div>
    </div>
  );
}