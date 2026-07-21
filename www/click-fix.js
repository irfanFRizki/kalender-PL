/* ============================================================
   click-fix.js — HANYA dipakai di build APK (tidak menyentuh
   kalender.txt asli sama sekali).

   Masalah: klik di sebagian sel kalender (tanggal sudah lewat)
   kadang tidak terdeteksi kalau tap-nya kena elemen dekoratif
   di dalam sel (ring warna, dsb) alih-alih sel-nya sendiri.

   Solusi: dengarkan klik di FASE CAPTURE pada #calendarGrid
   (jadi kepicu duluan sebelum ada elemen lain yang berpotensi
   menghentikan event), lalu cari sel tanggal terdekat dari titik
   yang diklik dan buka modalnya secara manual — terlepas dari
   elemen persis apa yang kena klik di dalam sel itu.

   Ini murni LAPISAN TAMBAHAN (tidak menghapus/replace listener
   asli) — kalau listener asli sudah jalan normal, ini cuma
   render ulang modal yang sama, tidak ada efek samping.
   ============================================================ */
(function () {
  function findCellFromPoint(x, y) {
    if (!document.elementsFromPoint) return null;
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].dataset && stack[i].dataset.dateStr) return stack[i];
    }
    return null;
  }

  function handleCellActivate(cellEl) {
    if (!cellEl) return;
    var dateStr = cellEl.dataset.dateStr;
    if (!dateStr) return;

    var activeData = typeof currentTab !== 'undefined' && currentTab === 'gudang' ? gudangData : eventsData;
    var dayEvents = (activeData && activeData[dateStr]) || [];
    var holiday = typeof holidays !== 'undefined' ? holidays[dateStr] : null;

    // Sama seperti syarat asli: hanya buka kalau memang ada PL atau hari libur.
    if (dayEvents.length === 0 && !holiday) return;
    if (typeof openModal === 'function') openModal(dateStr, dayEvents, holiday);
  }

  function attach() {
    var grid = document.getElementById('calendarGrid');
    if (!grid) return;

    // Klik mouse (desktop / APK webview)
    grid.addEventListener(
      'click',
      function (e) {
        var cellEl = e.target.closest && e.target.closest('[data-date-str]');
        if (!cellEl) cellEl = findCellFromPoint(e.clientX, e.clientY);
        handleCellActivate(cellEl);
      },
      true // capture phase — kepicu lebih dulu, tidak bisa "dimakan" elemen lain
    );

    // Tap di layar sentuh — jaga-jaga kalau touchend handler bawaan tidak nyala
    grid.addEventListener(
      'touchend',
      function (e) {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        var t = e.changedTouches[0];
        var cellEl = findCellFromPoint(t.clientX, t.clientY);
        handleCellActivate(cellEl);
      },
      true
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
