# Kedai Kopi Kenangan Senja API

Backend Express dengan basis data MySQL/MariaDB (sebelumnya PostgreSQL). Menyediakan endpoint autentikasi, produk, settings dan integrasi XMPP opsional.

## Stack
- Node.js + Express
- MySQL / MariaDB (`mysql2`)
- JWT (`jsonwebtoken`)
- Bcrypt untuk hash password
- CORS + dotenv
- XMPP client (`@xmpp/client`) opsional

## Struktur Direktori
```
server/
  package.json
  .env.example
  schema.sql
  src/
    index.js           # entrypoint Express
  db.js              # koneksi MySQL Pool
    middleware/
      auth.js          # authRequired & adminOnly
    routes/
      auth.js          # register, login
      products.js      # CRUD produk
      settings.js      # get/set konfigurasi
```

## Menjalankan (Windows PowerShell)
1. Buat database MySQL / MariaDB (misal nama: `kedaikopi`).
2. Jalankan migrasi MySQL:
```powershell
mysql -u <user> -p kedaikopi < server/schema.mysql.sql
```
  (File `schema.sql` lama PostgreSQL disimpan hanya sebagai referensi.)
3. Salin `.env.example` menjadi `.env` dan isi `DATABASE_URL` (format: `mysql://user:pass@host:3306/kedaikopi`) + `JWT_SECRET`.
4. Install dependensi:
```powershell
cd server
npm install
npm run dev
```
API berjalan di `http://localhost:3001`.

## Endpoint Utama
### Health
GET /api/health -> { ok: true }

### Auth
POST /api/auth/register {username, email?, password, role?} -> user
POST /api/auth/login {username, password} -> {token, user}

### Products
GET /api/products?active=true -> list produk
GET /api/products/:id -> detail + images
POST /api/products (admin) -> buat produk
PUT /api/products/:id (admin) -> update
DELETE /api/products/:id (admin) -> hapus

### Settings
GET /api/settings/:key
PUT /api/settings/:key (admin) { value: <json> }

### XMPP (Opsional)
GET /api/xmpp/status -> status koneksi & config (tanpa password)
POST /api/xmpp/send (admin) { to, body } -> kirim pesan direct ke JID
POST /api/xmpp/room (admin) { body } -> kirim pesan ke room MUC yang dikonfigurasi

## Auth Header
Gunakan: `Authorization: Bearer <JWT>` untuk endpoint yang membutuhkan.

## Catatan Keamanan
- Ganti `JWT_SECRET` dengan string panjang acak.
- Simpan password dengan bcrypt (sudah diterapkan saat register).
- Tambah rate limit & helmet (bisa ditambahkan nanti).

## Konfigurasi XMPP
Isi variabel pada `.env`:
- XMPP_SERVICE: URL WebSocket/BOSH server XMPP (contoh Prosody: ws://localhost:5280/xmpp-websocket)
- XMPP_DOMAIN: domain XMPP (opsional, tergantung server)
- XMPP_JID: JID akun yang dipakai backend (contoh: bot@localhost)
- XMPP_PASSWORD: password akun bot
- XMPP_RESOURCE: resource label (default kedai-api)
- XMPP_ROOM_JID: JID room MUC (contoh: kedai@muc.localhost) opsional
- XMPP_ROOM_NICK: nickname backend di room (default backend)

Setelah terisi dan server jalan, uji cepat:
- GET /api/xmpp/status -> pastikan `ready: true`
- POST /api/xmpp/send {"to":"user@domain","body":"Halo dari API"}
- POST /api/xmpp/room {"body":"Pesan ke room"} (jika XMPP_ROOM_JID diisi)

## Ide Pengembangan Lanjut
- Endpoint order & cart
- Upload gambar via presigned URL / CDN
- Audit log penulisan (produk, settings)
- Paginasi & pencarian nama produk
- Role tambahan (staff, barista)
- Integrasi frontend langsung ke API (menggantikan LocalStorage menu)

## Catatan Migrasi PostgreSQL -> MySQL
Perubahan utama:
- UUID diganti menjadi `CHAR(36)` dan dihasilkan di sisi aplikasi (library `uuid`).
- Tipe `JSONB` diganti `JSON`.
- Constraint `CHECK` diganti dengan `ENUM` atau dihilangkan.
- Fungsi waktu `NOW()` tetap kompatibel; kolom `updated_at` memakai `ON UPDATE CURRENT_TIMESTAMP`.

Jika Anda masih ingin menjalankan di PostgreSQL, gunakan file `schema.sql` dan sesuaikan kembali `db.js` dengan driver `pg`.

Silakan minta jika Anda ingin saya menambahkan order/cart atau integrasi upload gambar berikutnya.
