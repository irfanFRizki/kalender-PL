
# Debugging Guide: Bug KOLI LYN XP - Data Detail Tidak Muncul

## Root Cause Analysis

### ✅ Implementasi Sudah Benar:
1. **`_lynxpDrill(day, mIdx)`** - Fungsi drill-down sudah 100% benar (baris 4931-4995)
   - Filter logic identik dengan `_bongkarDrill()` yang berfungsi
   - Modal structure lengkap dan ter-load dengan benar
   - Data display template sudah sempurna

2. **`rawGudangList` parsing** - Field `markingan` sudah diekstrak dengan benar (baris 2525)
   ```javascript
   markingan: getSafeText(row.c[idxMarkingan])
   ```

3. **`_isXpLyn()` filter** - Logic sudah benar (baris ~7800-an)
   ```javascript
   function _isXpLyn(item) {
     var mk = String((item && item.markingan) || '').toUpperCase().replace(/\s+/g, ' ').trim();
     return mk === 'XP LYN';
   }
   ```

### ⚠️ Kemungkinan Penyebab Bug:

#### 1️⃣ DATA DI GOOGLE SHEETS BELUM ADA YANG MARKINGAN = 'XP LYN'
**Cek:**
```javascript
// Di Console Browser setelah klik bar chart atau tabel hari:
console.log('[_lynxpDrill] Total XP LYN items in rawGudangList:', xpLynAll.length);
// Jika hasilnya 0 → artinya data belum ada di Google Sheets!
```

**Solusi:**
- Tambahkan data sample di Google Sheets dengan kolom J (Markingan) = "XP LYN"
- Format: harus uppercase "XP LYN" dengan SPASI

#### 2️⃣ FORMAT MARKINGAN BERBEDA DI EXCEL
Data mungkin memiliki format seperti:
- `XPLYN` (tanpa spasi)
- `XP-LYN` (dengan tanda hubung)
- `xp lyn` (huruf kecil)
- `  XP  LYN  ` (spasi berlebih)

**Validasi:**
```javascript
// Cek semua unique markingan values di rawGudangList
var uniqueMarkings = [...new Set(rawGudangList.map(i => i.markingan))];
console.log('Unique markingan values:', uniqueMarkings);
// Cari mana yang mirip dengan "XP LYN" tapi tidak match
```

#### 3️⃣ TANGGAL BONGKAR TIDAK VALID
Kemungkinan `tglBongkarDate` tidak valid (null, NaN, atau tipe salah):
```javascript
// Debug tglBongkarDate
items.forEach(item => {
  console.log({
    packingList: item.packingList,
    tglBongkarDate: item.tglBongkarDate,
    isValid: item.tglBongkarDate instanceof Date && !isNaN(item.tglBongkarDate),
    year: item.tglBongkarDate?.getFullYear(),
    month: item.tglBongkarDate?.getMonth(),
    date: item.tglBongkarDate?.getDate()
  });
});
```

### 🔍 CARA TEST & VERIFIKASI:

1. **Test Manual di Browser:**
   ```
   a. Buka https://kalender-pl.irfanzal.com/
   b. Pilih tab "Gudang" → "Barang Sudah Bongkar"
   c. Klik tab/filter "KOLI LYN XP" (jika ada)
   d. Klik pada bar chart atau baris tabel hari apa saja
   e. Buka Developer Console (F12) → View Console logs
   ```

2. **Check Console Logs:**
   ```
   [_lynxpDrill] Total rawGudangList: XXX
   [_lynxpDrill] Filter: day=X, month=Y, year=Z
   [_lynxpDrill] Filtered items found: N
   
   // Jika N == 0, akan muncul warn:
   [_lynxpDrill] No items found! Checking XP LYN data...
   [_lynxpDrill] Total XP LYN items in rawGudangList: M
   
   // Jika M == 0 → DATA MASIH KOSONG DI GOOGLE SHEETS!
   ```

3. **Perbaiki Google Sheets:**
   - Pastikan sheet "Barang Sudah Bongkar" ada di connected spreadsheet
   - Pastikan kolom J = Markingan, isi dengan "XP LYN" (uppercase + spasi)
   - Refresh data di aplikasi (reload page)

### 📋 Checklist Verifikasi:
- [ ] Data sample dengan MARKINGAN = "XP LYN" sudah ada di Google Sheets
- [ ] Sheet "Barang Sudah Bongkar" ter-konek ke aplikasi
- [ ] Kolom J berisi "XP LYN" (bukan "XPLYN", "XP-LYN", dll)
- [ ] Aplikasi sudah reload (F5) setelah update Google Sheets
- [ ] Console browser tidak menampilkan error JavaScript
- [ ] Function `_isXpLyn()` mengembalikan TRUE untuk data XP LYN

### 🎯 Expected Result:
Setelah perbaikan:
1. Click bar chart/tabel hari → Modal popup muncul
2. Modal berisi list packing list dengan MARKINGAN = "XP LYN"
3. Total koli dan jumlah PL ditampilkan dengan benar
