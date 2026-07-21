package com.aqilla.kalenderbarang;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Plugin kecil untuk auto-update APK dari GitHub Releases tanpa Play Store.
 *
 * Dipanggil dari JS (www/update-checker.js) lewat:
 *   Capacitor.Plugins.ApkInstaller.canInstall()
 *   Capacitor.Plugins.ApkInstaller.requestInstallPermission()
 *   Capacitor.Plugins.ApkInstaller.install({ path: "<absolute path file .apk>" })
 *
 * Catatan penting (lihat prompt master):
 * - Tap konfirmasi terakhir dari sistem Android TIDAK bisa dilewati (D4).
 *   Jadi alurnya: cek -> download -> notifikasi -> user tap "Install Sekarang"
 *   -> Android tampilkan dialog instal -> user tap "Install" sekali lagi.
 * - Butuh permission REQUEST_INSTALL_PACKAGES + FileProvider (sudah didaftarkan
 *   di AndroidManifest.xml bawaan Capacitor).
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean allowed;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            allowed = getContext().getPackageManager().canRequestPackageInstalls();
        } else {
            // Di bawah Android 8, cukup izin instal dari "unknown sources" global (selalu true di sini)
            allowed = true;
        }
        JSObject ret = new JSObject();
        ret.put("value", allowed);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("Parameter 'path' wajib diisi (path lengkap file .apk hasil download)");
            return;
        }

        File apkFile = new File(path);
        if (!apkFile.exists()) {
            call.reject("File APK tidak ditemukan di path: " + path);
            return;
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            call.resolve();
        } catch (Exception e) {
            call.reject("Gagal membuka installer: " + e.getMessage(), e);
        }
    }
}
