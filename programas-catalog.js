// Programas destacados (carpeta programas/TOP). Se muestran arriba del catálogo.
// [nombre del archivo, tamaño del RAR en bytes, cantidad de archivos]
const topPrograms = [
  ['CLASIFICACIÓN DE SUELOS', 31326, 7],
  ['DISEÑO DE VIGAS', 50590, 1],
  ['DYSAB_FULL', 84846, 1],
  ['MAYTAN', 135934, 39],
  ['MUROS', 145022, 3],
  ['PUENTES', 1670782, 5]
];

// Resto de programas (carpeta programas/). Un RAR verificado por carpeta. Los nombres originales se conservan.
const programArchives = [
  ['1D KINAMATICAS', 785662, 9],
  ['ANESH PRO', 206974, 7],
  ['ANESH PRO 2', 297006, 9],
  ['AREA DE UN POLIGONO PEQUEÑO', 7502, 4],
  ['ARMADURAS', 69102, 5],
  ['ARMADURAS ISOSTÁTICAS 1.0', 2918654, 7],
  ['ATMADURAS V2', 64014, 4],
  ['ATMOSFERIC AIR PROPERTIES 1.0', 168510, 5],
  ['AZIMUT Y DISTANCIAS', 1006, 1],
  ['BISHOP', 3086, 2],
  ['CALCULO DE LADRILLO', 45646, 9],
  ['CANALES', 152190, 8],
  ['CIRCULO DE MORH', 125102, 9],
  ['codeviewer', 8670, 5],
  ['DH CANALES 1.0', 51470, 3],
  ['DYSAB V2', 766046, 8],
  ['EECSOLVER', 2229918, 9],
  ['ESCALA', 8286, 4],
  ['FORMUL AREAS Y VOL 2.0', 3470, 4],
  ['GALERRY', 1516526, 13],
  ['GEODETIC CONVERSION BETWEEN WGS84 AND POTSDAM 1.03', 13630, 3],
  ['GeorefConverter 1.00', 13454, 4],
  ['GRANULOMETRIA', 11678, 5],
  ['Gustavo_met_desp', 5630, 1],
  ['hardy_cross', 8590, 3],
  ['HCANALES', 30142, 7],
  ['HCANALES2', 76574, 7],
  ['Interpol de curvas', 17566, 4],
  ['LINEA DE INFLEUNCIA', 11566, 5],
  ['MATERIALES', 531198, 4],
  ['MEP_AE2', 2910, 1],
  ['MERCATOR SAILING', 202670, 7],
  ['MET DE GAUSS SEIDEL', 65518, 6],
  ['METNUM', 15774, 6],
  ['METODOS NUMERICOS 2', 15966, 3],
  ['METODOS NUMEROS 1', 11422, 3],
  ['MODOS DE VIVRACION', 650670, 7],
  ['PipeCalc', 102638, 7],
  ['PLANETARIA BASICA', 9086, 4],
  ['RAMADURAS V2_2', 66190, 4],
  ['SEC HP', 1233982, 35],
  ['SISMOS', 349694, 3],
  ['TABLA PERIODICA', 527598, 8],
  ['TOPOAC', 1630622, 6],
  ['TOPOMINIG', 2681230, 5],
  ['VIGA G3', 2886302, 50],
  ['VIGA HPRO V5', 70760878, 13],
  ['viga2018', 70590, 4],
  ['viga2019', 121662, 9],
  ['Volumen y suoerficie, geometric', 734478, 5]
];

(function () {
  const topCatalog = document.getElementById('program-catalog-top');
  const catalog = document.getElementById('program-catalog');
  if (!catalog || !topCatalog) return;
  const search = document.getElementById('program-search');
  const count = document.getElementById('catalog-status');
  const empty = document.getElementById('catalog-empty');
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const number = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
  const sizeLabel = bytes => bytes >= 1048576
    ? `${number.format(bytes / 1048576)} MB` : `${number.format(bytes / 1024)} KB`;
  const archiveIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M10 3v2m2 0v2m-2 0v2m2 0v2"/><rect x="9" y="13" width="4" height="5" rx="1"/></svg>';
  const downloadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
  const byName = (a, b) => a[0].localeCompare(b[0], 'es', { numeric: true, sensitivity: 'base' });
  const groups = [
    { list: topPrograms.slice().sort(byName), container: topCatalog, block: document.getElementById('catalog-top'), folder: 'TOP/', entries: [] },
    { list: programArchives.slice().sort(byName), container: catalog, block: document.getElementById('catalog-rest'), folder: '', entries: [] }
  ];
  const entries = [];

  for (const group of groups) {
    const fragment = document.createDocumentFragment();
    for (const [name, bytes, files] of group.list) {
      const card = document.createElement('article');
      card.className = 'prog-card' + (group.folder ? ' prog-card-top' : '');
      const header = document.createElement('div');
      header.className = 'prog-header';
      const icon = document.createElement('span');
      icon.className = 'prog-icon';
      icon.innerHTML = archiveIcon;
      const badge = document.createElement('span');
      badge.className = 'prog-badge';
      badge.textContent = '.rar';
      header.append(icon, badge);
      const title = document.createElement('h2');
      title.className = 'prog-title';
      title.textContent = name;
      const info = document.createElement('p');
      info.className = 'prog-info';
      info.textContent = `${sizeLabel(bytes)} · ${files} ${files === 1 ? 'archivo' : 'archivos'}`;
      const link = document.createElement('a');
      link.className = 'btn-download';
      link.href = 'programas/' + group.folder + encodeURIComponent(name + '.rar');
      link.download = name + '.rar';
      link.setAttribute('aria-label', `Descargar ${name}`);
      link.innerHTML = downloadIcon;
      const mono = document.createElement('img');
      mono.className = 'prog-mono';
      mono.src = 'mono.ico';
      mono.alt = '';
      mono.setAttribute('aria-hidden', 'true');
      card.append(header, title, info, link, mono);
      fragment.appendChild(card);
      const entry = { card, name: normalize(name), group };
      group.entries.push(entry);
      entries.push(entry);
    }
    group.container.replaceChildren(fragment);
  }

  function filter() {
    const query = normalize(search.value);
    let shown = 0;
    for (const group of groups) {
      let groupShown = 0;
      for (const entry of group.entries) {
        const matches = entry.name.includes(query);
        entry.card.hidden = !matches;
        if (matches) { groupShown++; shown++; }
      }
      if (group.block) group.block.hidden = groupShown === 0;
    }
    count.textContent = query ? `${shown} de ${entries.length} programas` : `${entries.length} programas`;
    empty.hidden = shown !== 0;
  }
  search.addEventListener('input', filter);
  filter();
})();
