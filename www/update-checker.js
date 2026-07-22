/* ============================================================
   update-checker.js
   Auto-update dari GitHub Releases (repo PUBLIC, tanpa token).
   Alur: cek versi terbaru -> kalau ada yang baru, download di
   background -> tampilkan tombol "Install Update" -> user tap
   sekali -> Android tampilkan dialog instal (tap sekali lagi,
   ini TIDAK BISA dilewati, itu proteksi sistem Android).

   Juga melapor status pengecekan ke window._onUpdateStatus(status)
   kalau ada yang "berlangganan" (dipakai tab Tentang Aplikasi),
   selain tetap menampilkan banner mengambang seperti biasa.
   status.state salah satu dari:
     'checking' | 'up-to-date' | 'update-ready' | 'downloading' | 'error'
   ============================================================ */
(function () {
  // GANTI dua baris ini sesuai repo Anda setelah dibuat di GitHub:
  var GITHUB_OWNER = 'irfanFRizki';
  var GITHUB_REPO = 'kalender-PL';

  // Diisi otomatis oleh GitHub Actions saat build (lihat workflow),
  // jangan diedit manual. Fallback 'dev' untuk build lokal.
  var CURRENT_VERSION = '__APP_VERSION__';
  window.APP_CURRENT_VERSION = CURRENT_VERSION; // dibaca tab "Tentang Aplikasi"

  var STORAGE_KEY_VERSION = 'kalender_downloaded_version';
  var STORAGE_KEY_PATH = 'kalender_downloaded_path';
  var API_URL =
    'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/releases/latest';

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  // Bandingkan versi model "1.2.3" / "v1.2.3". Return true kalau `a` > `b`.
  function isNewerVersion(a, b) {
    var clean = function (v) {
      return String(v).replace(/^v/i, '').split('.').map(function (n) {
        return parseInt(n, 10) || 0;
      });
    };
    var pa = clean(a);
    var pb = clean(b);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || 0;
      var y = pb[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }

  // Lapor status ke pendengar luar (tab Tentang Aplikasi), kalau ada.
  function report(status) {
    if (typeof window._onUpdateStatus === 'function') {
      try { window._onUpdateStatus(status); } catch (e) {}
    }
  }

  function showUpdateBanner(onInstallClick) {
    if (document.getElementById('apkUpdateBanner')) return;
    var el = document.createElement('div');
    el.id = 'apkUpdateBanner';
    el.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
      'background:#1d4ed8;color:#fff;padding:12px 16px;' +
      'display:flex;align-items:center;justify-content:space-between;' +
      'font:14px system-ui,sans-serif;box-shadow:0 -2px 10px rgba(0,0,0,.2);';
    el.innerHTML =
      '<span>Update baru tersedia</span>' +
      '<button id="apkUpdateBtn" style="background:#fff;color:#1d4ed8;border:none;' +
      'padding:8px 14px;border-radius:6px;font-weight:600;">Install Sekarang</button>';
    document.body.appendChild(el);
    document.getElementById('apkUpdateBtn').addEventListener('click', onInstallClick);
  }

  async function downloadApk(downloadUrl, versionTag) {
    var Filesystem = window.Capacitor.Plugins.Filesystem;
    var response = await fetch(downloadUrl);
    var blob = await response.blob();
    var base64Data = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        resolve(reader.result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    var fileName = 'update-' + versionTag.replace(/[^a-zA-Z0-9.\-]/g, '') + '.apk';
    var result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: 'CACHE',
    });

    localStorage.setItem(STORAGE_KEY_VERSION, versionTag);
    localStorage.setItem(STORAGE_KEY_PATH, result.uri.replace('file://', ''));
    return result.uri.replace('file://', '');
  }

  async function installDownloaded(path) {
    var ApkInstaller = window.Capacitor.Plugins.ApkInstaller;
    var canInstall = await ApkInstaller.canInstall();
    if (!canInstall.value) {
      await ApkInstaller.requestInstallPermission();
      // Beri kesempatan user aktifkan izin, lalu tap banner/tombol lagi untuk lanjut.
      return;
    }
    await ApkInstaller.install({ path: path });
  }
  window._installDownloadedUpdate = function () {
    var path = localStorage.getItem(STORAGE_KEY_PATH);
    if (path) installDownloaded(path);
  };

  async function checkForUpdate() {
    if (!isNative()) {
      report({ state: 'error', message: 'Cek update hanya berjalan di dalam APK, bukan browser.' });
      return;
    }

    report({ state: 'checking' });

    try {
      var res = await fetch(API_URL);
      if (!res.ok) {
        report({ state: 'error', message: 'Belum ada rilis di GitHub, atau gagal menghubungi server.' });
        return;
      }
      var release = await res.json();
      var latestTag = release.tag_name || '';
      if (!latestTag || !isNewerVersion(latestTag, CURRENT_VERSION)) {
        report({ state: 'up-to-date', currentVersion: CURRENT_VERSION });
        return;
      }

      var apkAsset = (release.assets || []).find(function (a) {
        return /\.apk$/i.test(a.name);
      });
      if (!apkAsset) {
        report({ state: 'error', message: 'Rilis ' + latestTag + ' ada, tapi belum ada file APK terlampir.' });
        return;
      }

      // Sudah pernah didownload sebelumnya untuk versi yang sama? langsung tawarkan install.
      var downloadedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
      var downloadedPath = localStorage.getItem(STORAGE_KEY_PATH);

      if (downloadedVersion === latestTag && downloadedPath) {
        report({ state: 'update-ready', latestVersion: latestTag });
        showUpdateBanner(function () {
          installDownloaded(downloadedPath);
        });
        return;
      }

      // Download di background, baru tawarkan tombol install setelah selesai.
      report({ state: 'downloading', latestVersion: latestTag });
      var path = await downloadApk(apkAsset.browser_download_url, latestTag);
      report({ state: 'update-ready', latestVersion: latestTag });
      showUpdateBanner(function () {
        installDownloaded(path);
      });
    } catch (err) {
      console.warn('[update-checker] gagal cek update:', err);
      report({ state: 'error', message: 'Gagal cek update: koneksi bermasalah.' });
    }
  }

  // Cek saat app dibuka. Bisa juga dipanggil manual: window.checkForAppUpdate()
  window.checkForAppUpdate = checkForUpdate;
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(checkForUpdate, 2000); // tunda dikit biar tidak ganggu load awal
  });
})();
