import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Panel de Usuario</h1>
      <p>Bienvenido {user?.username}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}