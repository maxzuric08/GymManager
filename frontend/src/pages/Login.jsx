import { useState } from "react";
import { loginRequest } from "../services/api";

export default function Login() {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const result = await loginRequest({
        username,
        password,
        role,
      });

      setMessage(`Bienvenido ${result.user.username} (${result.role})`);

      console.log("Respuesta backend:", result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/logo.png" alt="GymManager" style={styles.logo} />

        <div style={styles.roles}>
          <button
            type="button"
            onClick={() => setRole("admin")}
            style={role === "admin" ? styles.activeRole : styles.roleBtn}
          >
            Administrador
          </button>

          <button
            type="button"
            onClick={() => setRole("instructor")}
            style={role === "instructor" ? styles.activeRole : styles.roleBtn}
          >
            Profesor
          </button>

          <button
            type="button"
            onClick={() => setRole("user")}
            style={role === "user" ? styles.activeRole : styles.roleBtn}
          >
            Usuario
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label>Usuario</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ingresa tu usuario"
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            required
          />

          <button type="submit" style={styles.loginBtn}>
            Log In
          </button>
        </form>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#eef2f7",
  },
  card: {
    width: "420px",
    background: "white",
    padding: "2rem",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    textAlign: "center",
  },
  logo: {
    width: "230px",
    marginBottom: "1rem",
  },
  roles: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  roleBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
  },
  activeRole: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #0b5ed7",
    background: "#0b5ed7",
    color: "white",
    cursor: "pointer",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    textAlign: "left",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  loginBtn: {
    width: "100%",
    padding: "12px",
    background: "#0b5ed7",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  success: {
    marginTop: "1rem",
    color: "green",
    fontWeight: "bold",
  },
  error: {
    marginTop: "1rem",
    color: "red",
    fontWeight: "bold",
  },
};