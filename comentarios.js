(function () {
  const db = window.__sb;
  const form = document.getElementById('comments-form');
  const input = document.getElementById('comments-message');
  const label = document.getElementById('comments-label');
  const cancel = document.getElementById('comments-cancel');
  const status = document.getElementById('comments-status');
  const list = document.getElementById('comments-list');
  const submit = form.querySelector('button[type="submit"]');
  if (!db) { status.textContent = 'No se pudieron cargar los comentarios.'; return; }

  let user = null;
  let parentId = null;
  let loading = false;
  const adminEmail = 'marcoalexsandiomaytanhuaraca@gmail.com';
  const setStatus = text => { status.textContent = text; };

  function resetReply() {
    parentId = null;
    label.textContent = 'Escribe una sugerencia';
    cancel.hidden = true;
  }
  cancel.addEventListener('click', resetReply);

  function makeComment(item, isReply) {
    const article = document.createElement('article');
    article.className = 'comment';
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const author = document.createElement('strong');
    author.textContent = item.autor;
    meta.appendChild(author);
    if (item.es_admin) {
      const badge = document.createElement('span');
      badge.className = 'comment-admin';
      badge.textContent = 'Administrador';
      meta.appendChild(badge);
    }
    const time = document.createElement('time');
    time.className = 'comment-time';
    time.dateTime = item.creado_en;
    time.textContent = new Date(item.creado_en).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    meta.appendChild(time);
    const message = document.createElement('p');
    message.className = 'comment-message';
    message.textContent = item.mensaje;
    article.append(meta, message);
    if (!isReply) {
      const reply = document.createElement('button');
      reply.type = 'button';
      reply.className = 'comment-action';
      reply.textContent = 'Responder';
      reply.addEventListener('click', () => {
        parentId = item.id;
        label.textContent = 'Responder a ' + item.autor;
        cancel.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      });
      article.appendChild(reply);
    }
    if (user && (user.email || '').toLowerCase() === adminEmail) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'comment-action';
      remove.textContent = 'Eliminar';
      remove.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este comentario y sus respuestas?')) return;
        const { error } = await db.from('comentarios_programas').delete().eq('id', item.id);
        if (error) setStatus('No se pudo eliminar el comentario.');
        else await loadComments();
      });
      article.appendChild(remove);
    }
    return article;
  }

  async function loadComments() {
    if (loading) return;
    loading = true;
    try {
      const { data, error } = await db.from('comentarios_programas')
        .select('id,parent_id,autor,es_admin,mensaje,creado_en')
        .order('creado_en', { ascending: true });
      if (error) throw error;
      const fragment = document.createDocumentFragment();
      const replies = new Map();
      for (const item of data) {
        if (item.parent_id != null) {
          if (!replies.has(item.parent_id)) replies.set(item.parent_id, []);
          replies.get(item.parent_id).push(item);
        }
      }
      const roots = data.filter(item => item.parent_id == null).reverse();
      for (const item of roots) {
        const wrapper = document.createElement('div');
        wrapper.appendChild(makeComment(item, false));
        const children = replies.get(item.id) || [];
        if (children.length) {
          const container = document.createElement('div');
          container.className = 'comment-replies';
          children.forEach(child => container.appendChild(makeComment(child, true)));
          wrapper.appendChild(container);
        }
        fragment.appendChild(wrapper);
      }
      list.replaceChildren(fragment);
      setStatus(roots.length ? '' : 'Sé el primero en dejar una sugerencia.');
    } catch (error) {
      console.error('Comentarios:', error);
      setStatus('No se pudieron cargar los comentarios. Inténtalo más tarde.');
    } finally { loading = false; }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!user) {
      setStatus('Para publicar, inicia sesión con Google arriba en la página.');
      document.getElementById('hero-auth').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const message = input.value.trim();
    if (!message) return;
    submit.disabled = true;
    setStatus('Publicando…');
    try {
      const { error } = await db.from('comentarios_programas').insert({ mensaje: message, parent_id: parentId });
      if (error) throw error;
      input.value = '';
      resetReply();
      await loadComments();
    } catch (error) {
      console.error('Comentarios:', error);
      setStatus('No se pudo publicar el comentario. Inténtalo de nuevo.');
    } finally { submit.disabled = false; }
  });

  db.auth.getSession().then(({ data }) => { user = data.session && data.session.user; loadComments(); });
  db.auth.onAuthStateChange((_event, session) => {
    user = session && session.user;
    setTimeout(loadComments, 0);
  });
  setInterval(() => { if (!document.hidden) loadComments(); }, 30000);
})();
