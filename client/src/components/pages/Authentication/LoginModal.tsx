import React, { useState } from "react";
import AxiosInstance from "../../../AxiosInstance";

interface LoginModalProps {
  role: string;
  onClose: () => void;
  onLoginSuccess: (user: {
    name: string;
    avatar: string;
    role: string;
  }) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  role,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // new state

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true); 

    try {
      const response = await AxiosInstance.post("/login", {
        email,
        password,
        role: role.toLowerCase(),
      });

      if (response.status === 200) {
        // Save token
        localStorage.setItem("authToken", response.data.token || "");

        // Pass user info to parent
        const user = {
          name: response.data.name,
          avatar: "./src/assets/lib-logo.png", // Or use real avatar if available
          role: response.data.role,
        };

        onLoginSuccess(user); // send user info instead of just role
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false); // always stop spinner
    }
  };

  return (
    <div className="overlay">
      <div className="login-modal">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h3>{role} Login</h3>
        <hr className="mt-0 mb-0"/>
        <p className="subtitle">Enter your credentials</p>

        {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
            />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-group">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=" "
            />
            <label htmlFor="password">Password</label>
          </div>

          <div className="show-password-container">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              id="show-password-checkbox"
            />
            <label htmlFor="show-password-checkbox">Show password</label>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading && <span className="spinner-tiny"></span>}
            {loading ? "Logging in..." : "Log In"}
          </button>

          <button type="button" className="exit-btn" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
