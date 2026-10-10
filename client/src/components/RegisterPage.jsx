import { useState } from "react";
import { Link, useNavigate } from "react-router";

const basePath = "http://localhost:8080";

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [redirectSeconds, setRedirectSeconds] = useState(0);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: formData.name.trim() || "Rekha",
      email: formData.email.trim() || "rekha@gmail.com",
      password: formData.password || "12345",
    };

    if (!payload.name || !payload.email || !payload.password) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch(`${basePath}/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Registration failed");
        return;
      }

      setSuccessMessage(
        result.message || "Registration successful! Redirecting...",
      );
      setRedirectSeconds(3);

      const countdown = setInterval(() => {
        setRedirectSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            navigate("/");
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Register error", error);
      alert("Something went wrong while registering");
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
            <Link className="auth-link" to="/login">
              Login
            </Link>
            <Link className="auth-link active" to="/register">
              Register
            </Link>
          </div>
        </header>

        <section className="auth-panel">
          <p className="eyebrow">CREATE ACCOUNT</p>
          <h2>Create your free account</h2>

          {successMessage && (
            <p className="success-message">
              {successMessage} {redirectSeconds > 0 && `in ${redirectSeconds}s`}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
              />
            </label>

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
              Create account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default RegisterPage;
