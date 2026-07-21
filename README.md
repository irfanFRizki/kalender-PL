# Kalender Estimasi Barang — Android App

Aplikasi Android pembungkus (Capacitor/WebView) dari `Kalender Estimasi
Barang` yang datanya diambil langsung dari Google Sheets (GViz). APK
di-build otomatis lewat GitHub Actions dan bisa update sendiri lewat
GitHub Releases — **tanpa Android Studio, tanpa Play Store**, cukup `git`.

## Struktur project

```
kalender-app/
├── www/
│   ├── index.html          ← app kalender aslinya (sudah dari file Anda)
│   └── update-checker.js   ← logic cek & download update dari GitHub Releases
├── android/                 ← project Android native (auto-generate Capacitor)
│   └── app/src/main/java/.../ApkInstallerPlugin.java  ← plugin instal APK
├── .github/workflows/build-release.yml   ← workflow build + sign + release
├── capacitor.config.json
└── package.json
```

## Langkah 1 — Push ke GitHub (repo baru, public)

Di komputer/perangkat Anda yang punya `git` (bisa dari Raspberry Pi
seperti biasa):

```bash
cd kalender-app
git init
git add .
git commit -m "Initial: kalender app dibungkus Capacitor Android"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
git push -u origin main
```

Ganti `USERNAME_ANDA/NAMA_REPO` dengan punya Anda. **Jangan** pakai tanda
`<` `>` di URL — itu akan dibaca shell sebagai redirect dan error.

Kalau push pakai Personal Access Token (bukan SSH key): saat generate
token di GitHub, centang scope **Contents: Read and write** DAN
**Workflows: Read and write** — kalau lupa yang kedua, push khusus ke
`.github/workflows/*.yml` akan ditolak.

## Langkah 2 — Setting repo di GitHub

1. **Settings → Actions → General → Workflow permissions** → pilih
   **"Read and write permissions"**. Ini wajib supaya workflow bisa
   auto-publish Release (kadang default-nya read-only walau sudah ada
   `permissions: contents: write` di file workflow).

## Langkah 3 — Buat keystore signing (SEKALI SAJA, lalu simpan baik-baik)

Ini kunci penandatanganan APK. Kalau tiap build pakai keystore acak,
Android akan menolak install update ("signature mismatch"). Generate
sekali di komputer Anda (butuh `keytool`, bagian dari JDK):

```bash
keytool -genkeypair -v -keystore release.keystore \
  -alias kalenderbarang -keyalg RSA -keysize 2048 -validity 10000
```

Ikuti prompt-nya (isi nama, dsb — boleh asal, yang penting password
diingat). **Simpan file `release.keystore` ini di tempat aman DI LUAR
repo git** — kalau hilang, semua user yang sudah install harus
uninstall dulu untuk bisa update lagi.

Lalu base64-kan untuk dimasukkan ke GitHub Secret:

```bash
base64 -w0 release.keystore > release.keystore.b64
cat release.keystore.b64
```

Copy isinya, lalu di GitHub: **Settings → Secrets and variables →
Actions → New repository secret**, buat 4 secret ini:

| Nama secret | Isi |
|---|---|
| `RELEASE_KEYSTORE_BASE64` | isi file `release.keystore.b64` |
| `RELEASE_KEYSTORE_PASSWORD` | password keystore yang tadi diisi |
| `RELEASE_KEY_ALIAS` | `kalenderbarang` (atau alias yang Anda pakai) |
| `RELEASE_KEY_PASSWORD` | key password yang tadi diisi |

## Langkah 4 — Sambungkan auto-update ke repo Anda

Edit `www/update-checker.js`, ganti dua baris ini dengan punya Anda:

```js
var GITHUB_OWNER = 'USERNAME_ANDA';
var GITHUB_REPO = 'NAMA_REPO';
```

Commit & push perubahan ini.

## Langkah 5 — Build & rilis

- **Push biasa ke `main`** → build percobaan (versi `0.0.0-dev.<nomor>`),
  APK bisa didownload dari tab **Actions** run yang bersangkutan
  (bagian "Artifacts") untuk dites, TAPI tidak dipublish sebagai
  Release resmi dan tidak akan ditawarkan sebagai update ke user lain.
- **Rilis resmi** → beri tag versi semantik lalu push tag-nya:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Workflow otomatis: build → sign pakai keystore dari secrets → publish
ke **GitHub Releases** dengan APK terlampir. Auto-update di app akan
mendeteksi rilis ini.

## Langkah 6 — Install pertama kali

Karena ini rilis pertama, belum ada app terpasang untuk auto-update.
Setelah `v1.0.0` selesai di-build (cek tab **Actions**, atau langsung
di halaman **Releases**), download APK-nya manual ke HP dan install
sekali (perlu izin "Install dari sumber tidak dikenal" — Android akan
minta ini otomatis). Setelah itu, rilis berikutnya akan
ditawarkan otomatis lewat banner "Install Sekarang" di dalam app.

## Alur kerja harian setelahnya

```
Edit www/index.html (atau file lain)
  → git add . && git commit -m "..." && git push
  → (kalau ini rilis resmi) git tag vX.Y.Z && git push origin vX.Y.Z
  → GitHub Actions build otomatis
  → User buka app → auto-cek → auto-download di background →
    tap "Install Sekarang" → selesai
```

## Catatan

- App ID saat ini: `com.aqilla.kalenderbarang`. Kalau mau ganti,
  perlu ubah `applicationId`/`namespace` di `android/app/build.gradle`
  DAN pindahkan folder Java-nya — kalau perlu, bisa saya bantu lagi.
- Repo ini **public**, jadi cek update ke GitHub API tidak butuh token
  (kalau nanti diganti private, `update-checker.js` perlu logic
  tambahan untuk autentikasi — lihat bagian D7 di prompt master).
- Tap konfirmasi terakhir install dari Android **tidak bisa dilewati**
  — itu proteksi sistem, bukan bug. "Auto-update" realistisnya berarti
  cek → download → 1 tap install.
- Data app ini masih fetch langsung dari Google Sheets GViz endpoint
  (public, CORS-friendly) — tidak perlu perubahan backend apapun.
