// Efecto de escritura automática para el logo "MM.Ingeniería"
(function () {
  var logo = document.querySelector('.nav-logo');
  if (!logo) return;

  var full = 'MM.Ingeniería';
  var accentLen = 2; // "MM" en color de acento

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // dejar el texto estático
  }

  var cursor = document.createElement('span');
  cursor.className = 'logo-cursor';
  cursor.textContent = '|';

  function type() {
    var i = 0;
    function step() {
      if (i <= full.length) {
        var acc = full.slice(0, Math.min(i, accentLen));
        var rest = full.slice(Math.min(i, accentLen), i);
        logo.innerHTML = '';
        if (acc) {
          var a = document.createElement('span');
          a.className = 'logo-acc';
          a.textContent = acc;
          logo.appendChild(a);
        }
        if (rest) logo.appendChild(document.createTextNode(rest));
        logo.appendChild(cursor);
        i++;
        setTimeout(step, 110);
      } else {
        setTimeout(type, 2800);
      }
    }
    step();
  }

  type();
})();
