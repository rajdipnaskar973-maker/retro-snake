import { useState } from "react";

export default function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!phone.trim() || phone.length < 10) { setError("Valid 10 digit mobile required"); return; }
    const user = { name: name.trim(), phone: phone.trim() };
    localStorage.setItem("rajdip_user", JSON.stringify(user));
    onLogin(user);
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <p className="login-logo">RAJDIP.SYS</p>
        <p className="login-sub">// access terminal — identify yourself</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>NAME_</label>
            <input type="text" placeholder="your name"
              value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
          </div>
          <div className="login-field">
            <label>MOBILE_</label>
            <input type="tel" placeholder="10 digit mobile"
              value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} />
          </div>
          {error && <p className="login-error">⚠ {error}</p>}
          <button className="btn login-btn" type="submit">▶ ENTER TERMINAL</button>
        </form>
      </div>
    </div>
  );
}