const API_URL = "http://localhost:3000";
function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

export async function loginRequest(loginData) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error en login");
  }

  return data;
}

export async function getUsersRequest() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/users`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener usuarios");
  }

  return data;
}

export async function logoutRequest() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error en logout");
  }

  return data;
}

export async function createUserRequest(userData) {
  const token = localStorage.getItem("token"); // Buscamos la pulsera VIP

  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` // Le mostramos la pulsera al backend
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear usuario");
  }

  return data;
}

export async function getClassesRequest() {
  const response = await fetch(`${API_URL}/classes`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener clases");
  }

  return data;
}

export async function createClassRequest(classData) {
  const response = await fetch(`${API_URL}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear la clase");
  }

  return data;
}

export async function getInstructorsRequest() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/instructors`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener instructores");
  }

  return data;
}

export async function createInstructorRequest(instructorData) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/instructors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(instructorData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear instructor");
  }

  return data;
}