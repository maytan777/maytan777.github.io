// Estadísticas del sitio (Supabase): visitas por página y descargas por programa.
// Requiere la tabla public.site_stats (ver README del proyecto / SQL compartido).
(function () {
  'use strict';
  var URL_ = 'https://bidintbjpgpeyscirxwl.supabase.co';
  var KEY = 'sb_publishable_SRTEcmIyxh0rnHYBZfBpJQ_s9hl5cZq';
  var HEAD = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  var page = location.pathname.split('/').pop() || 'index.html';
  var fmt = new Intl.NumberFormat('es-PE');

  function getVal(key) {
    return fetch(URL_ + '/rest/v1/site_stats?key=eq.' + encodeURIComponent(key) + '&select=value', { headers: HEAD })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j[0] ? Number(j[0].value) : 0; })
      .catch(function () { return null; });
  }

  function bump(key) {
    return getVal(key).then(function (cur) {
      if (cur === null) return;
      return fetch(URL_ + '/rest/v1/site_stats', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ key: key, value: cur + 1, updated_at: new Date().toISOString() }])
      }).catch(function () {});
    });
  }

  try {
    var seen = 'mstat:' + page;
    if (!sessionStorage.getItem(seen)) {
      sessionStorage.setItem(seen, '1');
      bump('visita:' + page);
    }
  } catch (e) { bump('visita:' + page); }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-stat]') : null;
    if (a) bump(a.getAttribute('data-stat'));
  });

  function renderAll() {
    return fetch(URL_ + '/rest/v1/site_stats?select=key,value', { headers: HEAD })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!rows) return;
        var map = {}, dl = 0, vi = 0;
        rows.forEach(function (row) {
          map[row.key] = Number(row.value) || 0;
          if (row.key.indexOf('descarga:') === 0) dl += map[row.key];
          if (row.key.indexOf('visita:') === 0) vi += map[row.key];
        });
        document.querySelectorAll('[data-total-descargas]').forEach(function (el) { el.textContent = fmt.format(dl); });
        document.querySelectorAll('[data-total-visitas]').forEach(function (el) { el.textContent = fmt.format(vi); });
        document.querySelectorAll('.stats-totals').forEach(function (el) { el.hidden = false; });
        document.querySelectorAll('[data-count-for]').forEach(function (el) {
          var v = map['descarga:' + el.getAttribute('data-count-for')] || 0;
          el.textContent = v > 0 ? fmt.format(v) + (v === 1 ? ' descarga' : ' descargas') : '';
        });
      })
      .catch(function () {});
  }

  window.mStats = { bump: bump, renderAll: renderAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(renderAll, 400); });
  } else {
    setTimeout(renderAll, 400);
  }
})();
