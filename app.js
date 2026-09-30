const $ = (selector) => document.querySelector(selector);
const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dateLabel = (value) => new Intl.DateTimeFormat('es-ES', {dateStyle:'medium'}).format(new Date(value));
let species = [];
let photos = {};
let filter = 'all';
let deferredInstall;
let editingId = null;
let pendingPhotos = [];
const objectUrls = new Set();

function photoFor(item) { return photos[item.scientific]?.[0]?.file || ''; }
function categoryLabel(item) { return item.status === 'toxic' ? 'Tóxica' : item.status === 'avoid' ? 'No recomendada' : 'Comestible'; }
function view() {
  const current = location.hash === '#hallazgos' ? 'hallazgos' : location.hash === '#offline' ? 'offline' : 'guia';
  $('#guide-view').hidden = current !== 'guia';
  $('#findings-view').hidden = current !== 'hallazgos';
  $('#about-view').hidden = current !== 'offline';
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === current));
  if (current === 'hallazgos') renderFindings();
  if (location.hash === '#catalogo') requestAnimationFrame(() => $('#catalogo').scrollIntoView());
  else window.scrollTo(0, 0);
}

function renderSpecies() {
  const query = fold($('#search').value.trim());
  const found = species.filter((item) => (filter === 'all' || item.status === filter) && fold(`${item.name} ${item.spanishName} ${item.scientific} ${item.note}`).includes(query));
  $('#result-count').textContent = `${found.length} ${found.length === 1 ? 'especie' : 'especies'}`;
  $('#empty-search').hidden = found.length > 0;
  $('#species-grid').innerHTML = found.map((item) => `<button class="species-card" data-species="${esc(item.id)}" aria-label="Abrir ficha de ${esc(item.name)}">${photoFor(item) ? `<img class="card-image" src="./${esc(photoFor(item))}" alt="${esc(item.name)}" loading="lazy">` : '<div class="card-placeholder" aria-hidden="true">✳</div>'}<div class="card-content"><span class="card-tag ${item.status}">${categoryLabel(item)} · ${esc(item.category)}</span><h3>${esc(item.name)}</h3><em>${esc(item.scientific)}</em><p>${esc(item.note)}</p><div class="card-footer"><span>${esc(item.habitat || 'Cataluña')}</span><span aria-hidden="true">↗</span></div></div></button>`).join('');
}

function openSpecies(id) {
  const item = species.find((entry) => entry.id === id);
  if (!item) return;
  const pictures = photos[item.scientific] || [];
  const similar = item.lookalikes.map((lookalike) => species.find((entry) => entry.id === lookalike)).filter(Boolean);
  $('#species-detail').innerHTML = `<div class="detail-header"><div><span class="status-tag ${item.status}">${categoryLabel(item)} · ${esc(item.category)}</span><h2 class="detail-title">${esc(item.name)}</h2><div class="detail-scientific">${item.spanishName ? `${esc(item.spanishName)} · ` : ''}<em>${esc(item.scientific)}</em></div></div><button class="icon-button close-dialog" aria-label="Cerrar ficha">×</button></div>${pictures.length ? `<div class="detail-gallery">${pictures.map((image) => `<img src="./${esc(image.file)}" alt="Ejemplo de ${esc(item.scientific)}" loading="lazy">`).join('')}</div>` : ''}<div class="detail-body"><p class="detail-note">${esc(item.note)}</p><dl class="detail-facts"><div><dt>Hábitat</dt><dd>${esc(item.habitat || 'Consultar fuente')}</dd></div><div><dt>Altitud</dt><dd>${esc(item.altitude || 'Variable')}</dd></div><div><dt>Temporada</dt><dd>${esc(item.season || 'Según la zona')}</dd></div></dl>${similar.length ? `<h3>Posibles confusiones</h3><div class="lookalikes">${similar.map((entry) => `<button data-species="${esc(entry.id)}">${esc(entry.name)} · ${categoryLabel(entry)}</button>`).join('')}</div>` : ''}<h3>Fotos y fuentes</h3><div class="detail-sources"><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">Ficha de referencia en Bolets Atles ↗</a>${pictures.length ? `<ul>${pictures.map((image) => `<li><a href="${esc(image.source)}" target="_blank" rel="noopener noreferrer">${esc(image.title)}</a> · ${esc(image.author)} · <a href="${esc(image.licenseUrl || image.source)}" target="_blank" rel="noopener noreferrer">${esc(image.license)}</a></li>`).join('')}</ul>` : '<p>No se pudo incluir una imagen con licencia abierta para esta especie.</p>'}</div><button class="button button-primary detail-action" data-new-finding="${esc(item.id)}">+ Guardar hallazgo parecido</button><p class="small-print">La categoría corresponde a la especie descrita; una foto no identifica un ejemplar encontrado.</p></div>`;
  if (!$('#species-dialog').open) $('#species-dialog').showModal();
}

function updateConnection() {
  const online = navigator.onLine;
  $('#connection').textContent = online ? '● Con conexión' : '● Sin cobertura';
  $('#connection').classList.toggle('offline', !online);
}

function db() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('boletus-findings', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('findings', {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function dbAll() {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('findings', 'readonly');
    const request = transaction.objectStore('findings').getAll();
    request.onsuccess = () => resolve(request.result.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}
async function dbPut(value) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('findings', 'readwrite');
    transaction.objectStore('findings').put(value);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}
async function dbDelete(id) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('findings', 'readwrite');
    transaction.objectStore('findings').delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}
function clearObjectUrls() { objectUrls.forEach((url) => URL.revokeObjectURL(url)); objectUrls.clear(); }
function imageUrl(blob) { const url = URL.createObjectURL(blob); objectUrls.add(url); return url; }
async function renderFindings() {
  clearObjectUrls();
  let records;
  try { records = await dbAll(); } catch { $('#findings-list').innerHTML = '<p class="empty-findings">No se puede abrir el almacenamiento local en este navegador.</p>'; return; }
  if (location.hash !== '#hallazgos') return;
  $('#findings-list').innerHTML = records.length ? records.map((item) => { const candidate = species.find((entry) => entry.id === item.speciesId); return `<article class="finding-card">${item.photos?.[0] ? `<img src="${imageUrl(item.photos[0])}" alt="Foto del hallazgo">` : '<div class="finding-no-image" aria-hidden="true">◎</div>'}<div class="finding-card-body"><h3>${esc(candidate?.name || 'Sin identificar')}</h3><span class="finding-meta">${esc(dateLabel(item.createdAt))} · Guardado en este móvil</span><p>${esc(item.notes || 'Sin notas')}</p><div class="finding-actions"><button class="text-button" data-edit="${esc(item.id)}">Ver y revisar ↗</button><button class="text-button danger" data-delete="${esc(item.id)}">Eliminar</button></div></div></article>`; }).join('') : '<div class="empty-findings"><span aria-hidden="true" style="font-size:32px">◎</span><strong>Aún no hay hallazgos</strong><p>Guarda una foto cuando salgas al bosque. Seguirá aquí sin conexión.</p></div>';
}

function previewPhotos(blobs) {
  $('#photo-preview').innerHTML = blobs.map((blob) => `<img src="${imageUrl(blob)}" alt="Vista previa de la foto">`).join('');
}
function renderCandidateSummary() {
  const item = species.find((entry) => entry.id === $('#finding-species').value);
  $('#candidate-summary').hidden = !item;
  if (!item) { $('#candidate-summary').innerHTML = ''; return; }
  const related = item.lookalikes.map((id) => species.find((entry) => entry.id === id)?.name).filter(Boolean);
  $('#candidate-summary').innerHTML = `${photoFor(item) ? `<img src="./${esc(photoFor(item))}" alt="Foto de referencia de ${esc(item.name)}">` : ''}<div><span class="status-tag ${item.status}">${categoryLabel(item)} · ${esc(item.category)}</span><strong>${esc(item.name)}</strong><p>${esc(item.note)}</p>${related.length ? `<small>Comparar también con: ${esc(related.join(', '))}</small>` : ''}<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">Consultar ficha de origen con conexión ↗</a></div>`;
}
function openFinding(speciesId = '', record = null) {
  editingId = record?.id || null;
  pendingPhotos = record?.photos ? [...record.photos] : [];
  $('#finding-dialog-title').textContent = record ? 'Revisar hallazgo' : 'Nuevo hallazgo';
  $('#finding-form').reset();
  $('#finding-species').value = record?.speciesId || speciesId;
  renderCandidateSummary();
  $('#finding-notes').value = record?.notes || '';
  $('#finding-photos').value = '';
  previewPhotos(pendingPhotos);
  $('#finding-dialog').showModal();
}
async function compressPhoto(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', .78));
  } catch { return file; }
}
async function saveFinding(event) {
  event.preventDefault();
  const files = [...$('#finding-photos').files];
  const compressed = await Promise.all(files.slice(0, Math.max(0, 5 - pendingPhotos.length)).map(compressPhoto));
  const record = {id:editingId || crypto.randomUUID(), createdAt:editingId ? (await dbAll()).find((entry) => entry.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(), speciesId:$('#finding-species').value, notes:$('#finding-notes').value.trim(), photos:[...pendingPhotos, ...compressed].slice(0,5)};
  try { await dbPut(record); $('#finding-dialog').close(); if ($('#species-dialog').open) $('#species-dialog').close(); location.hash = '#hallazgos'; await renderFindings(); }
  catch { alert('No se pudo guardar. Comprueba el espacio libre del móvil o exporta una copia de tus hallazgos.'); }
}
function fileAsDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
async function exportFindings() {
  const records = await dbAll();
  const portable = await Promise.all(records.map(async (record) => ({...record, photos:await Promise.all((record.photos || []).map(fileAsDataUrl))})));
  const blob = new Blob([JSON.stringify({format:'boletus-findings-v1', exportedAt:new Date().toISOString(), findings:portable}, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `boletus-hallazgos-${new Date().toISOString().slice(0,10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function dataUrlToBlob(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) throw new Error('Foto no válida');
  const [header, data] = value.split(',');
  const binary = atob(data); const bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {type:header.slice(5).split(';')[0]});
}
async function importFindings(file) {
  const backup = JSON.parse(await file.text());
  if (backup.format !== 'boletus-findings-v1' || !Array.isArray(backup.findings)) throw new Error('Copia no válida');
  for (const item of backup.findings) {
    if (typeof item.id !== 'string' || typeof item.createdAt !== 'string' || !Array.isArray(item.photos) || item.photos.length > 5) throw new Error('Copia no válida');
    await dbPut({id:item.id, createdAt:item.createdAt, speciesId:String(item.speciesId || ''), notes:String(item.notes || ''), photos:item.photos.map(dataUrlToBlob)});
  }
  await renderFindings();
}

async function registerOffline() {
  if (!('serviceWorker' in navigator)) { $('#offline-status').textContent = 'Este navegador no permite instalar la guía offline.'; return; }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    const status = await new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 5000);
      channel.port1.onmessage = (event) => { clearTimeout(timer); resolve(event.data); };
      (navigator.serviceWorker.controller || registration.active)?.postMessage({type:'CACHE_STATUS'}, [channel.port2]);
    });
    $('#offline-status').textContent = status?.ready ? `Guía descargada: ${status.cached} archivos disponibles sin conexión.` : 'La descarga continúa. Mantén esta página abierta con conexión unos minutos.';
  } catch { $('#offline-status').textContent = 'No se pudo completar la descarga offline. Recarga con conexión e inténtalo de nuevo.'; }
}

async function init() {
  try {
    [species, photos] = await Promise.all([fetch('./data/species.json').then((r) => r.json()), fetch('./data/photos.json').then((r) => r.json())]);
  } catch { $('#species-grid').innerHTML = '<p class="empty-state">No se pudo cargar la guía. Abre la app con conexión una vez para descargarla.</p>'; return; }
  species.sort((a,b) => a.name.localeCompare(b.name, 'ca'));
  const rovello = species.find((item) => item.id === 'lactarius-sanguifluus');
  if (rovello && photoFor(rovello)) $('#featured-image').src = `./${photoFor(rovello)}`;
  $('#finding-species').innerHTML += species.map((item) => `<option value="${esc(item.id)}">${esc(item.name)} · ${esc(item.scientific)}</option>`).join('');
  renderSpecies(); view(); updateConnection(); registerOffline();
  window.addEventListener('hashchange', view);
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  $('#search').addEventListener('input', renderSpecies);
  $('#filters').addEventListener('click', (event) => { const button = event.target.closest('[data-filter]'); if (!button) return; filter = button.dataset.filter; document.querySelectorAll('.filter').forEach((entry) => { const active = entry === button; entry.classList.toggle('active', active); entry.setAttribute('aria-pressed', active); }); renderSpecies(); });
  $('#species-grid').addEventListener('click', (event) => { const card = event.target.closest('[data-species]'); if (card) openSpecies(card.dataset.species); });
  $('#featured').addEventListener('click', () => openSpecies('lactarius-sanguifluus'));
  $('#species-dialog').addEventListener('click', (event) => { if (event.target === $('#species-dialog') || event.target.closest('.close-dialog')) $('#species-dialog').close(); const similar = event.target.closest('[data-species]'); if (similar) openSpecies(similar.dataset.species); const finding = event.target.closest('[data-new-finding]'); if (finding) openFinding(finding.dataset.newFinding); });
  $('#finding-dialog').addEventListener('click', (event) => { if (event.target === $('#finding-dialog') || event.target.closest('.close-dialog')) $('#finding-dialog').close(); });
  $('#new-finding').addEventListener('click', () => openFinding());
  $('#finding-form').addEventListener('submit', saveFinding);
  $('#finding-photos').addEventListener('change', () => { const files = [...$('#finding-photos').files].slice(0,5); previewPhotos([...pendingPhotos,...files].slice(0,5)); });
  $('#finding-species').addEventListener('change', renderCandidateSummary);
  $('#findings-list').addEventListener('click', async (event) => { const edit = event.target.closest('[data-edit]'); const remove = event.target.closest('[data-delete]'); if (edit) { const record = (await dbAll()).find((item) => item.id === edit.dataset.edit); if (record) openFinding('', record); } if (remove && confirm('¿Eliminar este hallazgo del móvil?')) { await dbDelete(remove.dataset.delete); await renderFindings(); } });
  $('#export-button').addEventListener('click', () => exportFindings().catch(() => alert('No se pudo exportar la copia.')));
  $('#import-button').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async () => { const file = $('#import-file').files[0]; if (!file) return; try { await importFindings(file); alert('Copia importada.'); } catch { alert('El archivo no es una copia válida de Boletus.'); } $('#import-file').value = ''; });
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstall = event; $('#install-button').hidden = false; });
  $('#install-button').addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('#install-button').hidden = true; });
}
init();
