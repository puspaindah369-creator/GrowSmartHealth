// GrowSmart Health — Service Worker
// Enables offline usage & installability

// Nama cache versi aplikasi; ubah jika aset perlu di-refresh total.
const CACHE_NAME = 'growsmart-v1';
// Daftar aset inti yang disimpan untuk mode offline.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
];

// Event install berjalan saat service worker pertama kali dipasang.
self.addEventListener('install', event => {
  event.waitUntil(
    // Buka cache lalu simpan aset lokal yang diperlukan.
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS.filter(a => !a.startsWith('https://')));
    })
  );
  // Paksa service worker baru langsung aktif tanpa menunggu tab lama tertutup.
  self.skipWaiting();
});

// Event activate dipakai untuk membersihkan cache lama.
self.addEventListener('activate', event => {
  event.waitUntil(
    // Hapus semua cache yang namanya bukan versi aktif.
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // Ambil kontrol semua client yang sedang terbuka.
  self.clients.claim();
});

// Event fetch mencegat request agar bisa memakai cache terlebih dahulu.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      // Jika request ada di cache, langsung gunakan versi cache.
      if (cached) return cached;
      // Jika tidak ada di cache, ambil dari network.
      return fetch(event.request).then(response => {
        // Response opaque/error tidak disimpan ke cache.
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        // Clone diperlukan karena response hanya bisa dibaca sekali.
        const clone = response.clone();
        // Simpan response sukses ke cache untuk akses berikutnya.
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      // Jika offline dan request gagal, fallback ke index.html.
      }).catch(() => caches.match('./index.html'));
    })
  );
});
