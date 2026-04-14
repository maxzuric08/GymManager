import { useNavigate } from "react-router-dom";
import { logoutRequest } from "../services/api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.log(error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    navigate("/");
  };

  return (
    <div>
      <h1>Panel Admin</h1>

      <button onClick={handleLogout}>
        Cerrar sesión
      </button>
    </div>
  );
}