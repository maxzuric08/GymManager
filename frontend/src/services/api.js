const API_URL = "http://localhost:3000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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

export async function getUsersRequest() {
  const response = await fetch(`${API_URL}/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener usuarios");
  }

  return data;
}


export async function createUserRequest(userData) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear usuario");
  }

  return data;
}

export async function getInstructorsRequest() {
  const response = await fetch(`${API_URL}/instructors`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener instructores");
  }

  return data;
}

export async function createInstructorRequest(instructorData) {
  const response = await fetch(`${API_URL}/instructors`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(instructorData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear instructor");
  }

  return data;
}

export async function getPlansRequest() {
  const response = await fetch(`${API_URL}/plans`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener planes");
  }

  return data;
}

export async function createPlanRequest(planData) {
  const response = await fetch(`${API_URL}/plans`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(planData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear plan");
  }

  return data;
}

export async function getClassesRequest() {
  const response = await fetch(`${API_URL}/classes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener clases");
  }

  return data;
}

export async function createClassRequest(classData) {
  const response = await fetch(`${API_URL}/classes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(classData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al crear la clase");
  }

  return data;
}

export async function updateUserRequest(id, userData) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al actualizar usuario");
  }

  return data;
}

export async function deleteUserRequest(id) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al eliminar usuario");
  }

  return data;
}

export async function updateInstructorRequest(id, instructorData) {
  const response = await fetch(`${API_URL}/instructors/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(instructorData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al actualizar instructor");
  }

  return data;
}

export async function deleteInstructorRequest(id) {
  const response = await fetch(`${API_URL}/instructors/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al eliminar instructor");
  }

  return data;
}

export async function updatePlanRequest(id, planData) {
  const response = await fetch(`${API_URL}/plans/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(planData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al actualizar plan");
  }

  return data;
}

export async function deletePlanRequest(id) {
  const response = await fetch(`${API_URL}/plans/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al eliminar plan");
  }

  return data;
}

export async function updateClassRequest(id, classData) {
  const response = await fetch(`${API_URL}/classes/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(classData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al actualizar clase");
  }

  return data;
}

export async function deleteClassRequest(id) {
  const response = await fetch(`${API_URL}/classes/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al eliminar clase");
  }

  return data;
}

export async function updateUserPlanRequest(userId, planId) {
  const response = await fetch(`${API_URL}/plans/user/${userId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan_id: planId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al asignar membresía");
  }

  return data;
}

// --- RUTAS DE RESERVAS ---
export async function getUserBookingsRequest() {
  const response = await fetch(`${API_URL}/bookings/my-bookings`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

export async function createBookingRequest(bookingData) {
  const response = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(bookingData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

export async function cancelBookingRequest(bookingId) {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

export async function getMyMedicalCertificateRequest() {
  const response = await fetch(`${API_URL}/medical-certificates/me`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener apto medico");
  return data;
}

export async function uploadMedicalCertificateRequest(filePayload) {
  const response = await fetch(`${API_URL}/medical-certificates/me`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(filePayload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al subir apto medico");
  return data;
}

export async function getMedicalCertificatesRequest(status = "") {
  const query = status ? `?status=${status}` : "";

  const response = await fetch(`${API_URL}/medical-certificates${query}`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener aptos medicos");
  return data;
}

export async function reviewMedicalCertificateRequest(id, status, rejection_reason = "") {
  const response = await fetch(`${API_URL}/medical-certificates/${id}/review`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, rejection_reason }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al revisar apto medico");
  return data;
}

export async function openMedicalCertificateFile(id) {
  const response = await fetch(`${API_URL}/medical-certificates/${id}/file`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Error al abrir archivo");
  }

  const blob = await response.blob();
  const fileUrl = URL.createObjectURL(blob);
  window.open(fileUrl, "_blank");
}

export async function getClassStudentsRequest(classId) {
  const response = await fetch(`${API_URL}/bookings/class/${classId}/students`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener estudiantes");
  return data;
}

export async function reactivateUserRequest(id) {
  const response = await fetch(`${API_URL}/users/${id}/reactivate`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al reactivar usuario");
  }

  return data;
}

export async function reactivateInstructorRequest(id) {
  const response = await fetch(`${API_URL}/instructors/${id}/reactivate`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al reactivar instructor");
  }

  return data;
}

export async function deactivatePlanRequest(id) {
  const response = await fetch(`${API_URL}/plans/${id}/deactivate`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al desactivar plan");
  }

  return data;
}

export async function reactivatePlanRequest(id) {
  const response = await fetch(`${API_URL}/plans/${id}/reactivate`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al reactivar plan");
  }

  return data;
}

export async function removeMembershipRequest(userId) {
  const response = await fetch(`${API_URL}/plans/user/${userId}/remove-membership`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al remover membresía");
  }

  return data;
}

export async function getAttendanceOverviewRequest(dateFrom, dateTo) {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
  const response = await fetch(`${API_URL}/attendance/statistics/overview?${params}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener estadisticas de asistencia");
  return data;
}

export async function getClassAttendanceRequest(classId) {
  const response = await fetch(`${API_URL}/attendance/classes/${classId}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener asistencia de la clase");
  return data;
}

export async function saveClassAttendanceRequest(classId, attendances) {
  const response = await fetch(`${API_URL}/attendance/classes/${classId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ attendances }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al guardar asistencia");
  return data;
}

export async function getClassAttendanceStatisticsRequest(classId) {
  const response = await fetch(`${API_URL}/attendance/classes/${classId}/statistics`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener estadisticas de la clase");
  return data;
}

export async function getMyPaymentsRequest() {
  const response = await fetch(`${API_URL}/payments/me`, { headers: getAuthHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al obtener los pagos");
  return data;
}

export async function createCheckoutRequest(planId) {
  const response = await fetch(`${API_URL}/payments/checkout`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ planId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Error al iniciar el pago");
  return data;
}