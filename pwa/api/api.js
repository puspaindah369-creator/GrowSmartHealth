// utils/api.js
// Base URL backend untuk versi PWA.
const BASE_URL = "http://192.168.110.231:5000";

// Mengirim data form ke endpoint prediksi backend.
export async function predictMalaria(formData) {
  // Request POST membawa body JSON dari input user.
  const response = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  // Jika backend mengembalikan error, lempar error agar UI bisa menanganinya.
  if (!response.ok) {
    throw new Error("Gagal menghubungi server");
  }

  // Kembalikan hasil prediksi dalam bentuk JSON.
  return await response.json();
}

// Mengecek status kesehatan backend.
export async function checkHealth() {
  const response = await fetch(`${BASE_URL}/health`);
  // Endpoint health mengembalikan status JSON dari server.
  return await response.json();
}
