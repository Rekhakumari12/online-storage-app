import { useState } from "react";
import { Link, useNavigate } from "react-router";

const basePath = "http://localhost:8080";

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "test@gmail.com",
    password: "test@12",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      email: formData.email.trim(),
      password: formData.password,
    };

    if (!payload.email || !payload.password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      const response = await fetch(`${basePath}/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Login failed");
        return;
      }

      const dirId = result?.dirId ?? result?.user?.dirId;

      if (!dirId) {
        alert("Could not find your storage folder");
        return;
      }

      alert(result.message || "Login successful");
      navigate(`/directory/${dirId}`);
    } catch (error) {
      console.error("Login error", error);
      alert("Something went wrong while logging in");
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <header className="auth-header">
          <div className="brand-row">
            <span className="brand-mark">⬢</span>
            <span>Drive</span>
          </div>

          <div className="auth-links">
            <Link className="auth-link active" to="/login">
              Login
            </Link>
            <Link className="auth-link" to="/register">
              Register
            </Link>
          </div>
        </header>

        <section className="auth-panel">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Login to your account</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </label>

            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </label>

            <button type="submit" className="auth-submit-button">
              Login
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
