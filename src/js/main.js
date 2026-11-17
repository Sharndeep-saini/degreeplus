/* Degree Plus – front-end behaviour (no dependencies) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  /* ── Language (English / Punjabi) ───────────────────────── */
  function setLang(l) {
    root.lang = l; root.dataset.lang = l;
    $$('[data-pa]').forEach((el) => {
      const txt = l === 'pa' ? el.dataset.pa : el.dataset.en;
      if (el.hasAttribute('data-ph')) el.placeholder = txt; else el.textContent = txt;
    });
    $$('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === l)));
    store.set('dp-lang', l);
    window.dispatchEvent(new Event('dp-lang'));
  }
  $$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));
  const lang = () => root.dataset.lang || 'en';
  if (store.get('dp-lang') === 'pa') setLang('pa');
  const L = (en, pa) => (lang() === 'pa' ? pa : en);

  /* ── Header, progress bar, mobile menu ──────────────────── */
  const header = $('.site-header'), bar = $('.progress i');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      header?.classList.toggle('scrolled', y > 8);
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (!reduce) $$('[data-parallax]').forEach((el) => { el.style.translate = `0 ${(y * parseFloat(el.dataset.parallax)).toFixed(1)}px`; });
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.burger'), nav = $('#nav');
  burger?.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
  nav?.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); burger?.setAttribute('aria-expanded', 'false'); } });

  /* ── Scroll reveal + counters ───────────────────────────── */
  const countUp = (el) => {
    const end = +el.dataset.count; if (reduce) { el.textContent = end; return; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--rd', `${Math.min(sibs.indexOf(el), 5) * 70}ms`);
    io ? io.observe(el) : el.classList.add('in');
  });
  $$('[data-count]').forEach((el) => setTimeout(() => countUp(el), 700));

  /* ── Dialog ─────────────────────────────────────────────── */
  const dlg = $('#lead-dialog');
  $$('[data-open-dialog]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); nav?.classList.remove('open'); dlg?.showModal?.(); }));
  $$('[data-close-dialog]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  /* ── Lead forms: state → district cascade, validation, submit ── */
  const params = new URLSearchParams(location.search);
  let districts = null;
  const getDistricts = () => (districts ||= fetch('/assets/districts.json').then((r) => r.json()).catch(() => ({ Punjab: ['Other / not listed'] })));
  const fillOptions = (sel, items, ph, val) => {
    sel.innerHTML = '';
    const o = new Option(ph, ''); sel.add(o);
    items.forEach((i) => sel.add(new Option(i, i)));
    if (val) sel.value = val;
  };
  const slugMatch = (value, slug) => value.toLowerCase().replace(/\./g, '') === slug;

  $$('form[data-lead]').forEach(async (form) => {
    const stateSel = $('[data-state]', form), distSel = $('[data-district]', form);
    const data = await getDistricts();
    fillOptions(stateSel, Object.keys(data), L('Select state', 'ਰਾਜ ਚੁਣੋ'), 'Punjab');
    fillOptions(distSel, data.Punjab, L('Select district', 'ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ'));
    stateSel.addEventListener('change', () => {
      fillOptions(distSel, data[stateSel.value] || [], stateSel.value ? L('Select district', 'ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ') : '…');
    });
    // prefill from ?course= & ?u=
    const cs = params.get('course'), un = params.get('u');
    if (cs) { const o = [...form.course.options].find((x) => slugMatch(x.value, cs)); if (o) form.course.value = o.value; }
    if (un) { const o = [...form.university.options].find((x) => slugMatch(x.value, un)); if (o) form.university.value = o.value; }
    form.source.value = location.pathname;

    form.addEventListener('input', (e) => e.target.classList?.remove('bad'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('.form-status', form), btn = $('button[type=submit]', form);
      const fail = (el, msg) => { el.classList.add('bad'); el.focus(); status.className = 'form-status err'; status.textContent = msg; };
      status.textContent = ''; $$('.bad', form).forEach((x) => x.classList.remove('bad'));
      const phone = form.phone.value.replace(/\D/g, '').slice(-10);
      if (form.name.value.trim().length < 2) return fail(form.name, L('Please enter your name.', 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਂ ਲਿਖੋ।'));
      if (!/^[6-9]\d{9}$/.test(phone)) return fail(form.phone, L('Enter a valid 10-digit Indian mobile number.', 'ਸਹੀ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਲਿਖੋ।'));
      if (!form.course.value) return fail(form.course, L('Please choose a course.', 'ਕਿਰਪਾ ਕਰਕੇ ਕੋਰਸ ਚੁਣੋ।'));
      if (!form.state.value) return fail(form.state, L('Please choose your state.', 'ਕਿਰਪਾ ਕਰਕੇ ਰਾਜ ਚੁਣੋ।'));
      if (!form.district.value) return fail(form.district, L('Please choose your district.', 'ਕਿਰਪਾ ਕਰਕੇ ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ।'));
      if (!form.consent.checked) return fail(form.consent, L('Please tick the consent box.', 'ਕਿਰਪਾ ਕਰਕੇ ਸਹਿਮਤੀ ਤੇ ਟਿਕ ਕਰੋ।'));
      const body = { name: form.name.value.trim(), phone, course: form.course.value, university: form.university.value, state: form.state.value, district: form.district.value, consent: true, website: form.website.value, source: form.source.value };
      btn.disabled = true; status.className = 'form-status'; status.textContent = L('Sending…', 'ਭੇਜ ਰਹੇ ਹਾਂ…');
      try {
        const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error(String(r.status));
        const msg = encodeURIComponent(`Hi Degree Plus, I am ${body.name}. I submitted an enquiry for ${body.course}.`);
        form.innerHTML = `<div class="success"><span class="tick"><svg class="ico"><use href="#i-check"/></svg></span><h3>${L('Thank you!', 'ਧੰਨਵਾਦ!')}</h3><p>${L('We have your details. A counsellor will call you within one working day.', 'ਤੁਹਾਡੇ ਵੇਰਵੇ ਮਿਲ ਗਏ ਹਨ। ਕਾਊਂਸਲਰ ਇੱਕ ਕੰਮਕਾਜੀ ਦਿਨ ਵਿੱਚ ਕਾਲ ਕਰੇਗਾ।')}</p><p><a class="btn btn-accent" href="https://wa.me/919592912356?text=${msg}" target="_blank" rel="noopener">${L('Chat on WhatsApp now', 'ਹੁਣੇ ਵਟਸਐਪ ਕਰੋ')}</a></p></div>`;
      } catch {
        // Backend not reachable: send the same details through WhatsApp so the enquiry is never lost
        btn.disabled = false; status.className = 'form-status';
        const txt = `Hi Degree Plus, please call me.\nName: ${body.name}\nMobile: ${body.phone}\nCourse: ${body.course}\nUniversity: ${body.university}\nLocation: ${body.district}, ${body.state}`;
        status.innerHTML = `${L('Almost done — tap to send your details on WhatsApp:', 'ਲਗਭਗ ਹੋ ਗਿਆ — ਆਪਣੇ ਵੇਰਵੇ ਵਟਸਐਪ ਤੇ ਭੇਜਣ ਲਈ ਟੈਪ ਕਰੋ:')} <a class="btn btn-accent sm" href="https://wa.me/919592912356?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${L('Send on WhatsApp', 'ਵਟਸਐਪ ਤੇ ਭੇਜੋ')}</a> <span class="muted">${L('or call', 'ਜਾਂ ਕਾਲ ਕਰੋ')} <a href="tel:+919592912356">+91 9592912356</a></span>`;
      }
    });
  });

  /* ── Home quick search ──────────────────────────────────── */
  $('[data-quick]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = $('#q-course').value, u = $('#q-uni').value;
    location.href = c && u ? `/compare/?course=${c}&u=${u}` : u ? `/universities/${u}/` : c ? `/courses/${c}/` : '/courses/';
  });

  /* ── Courses page filters ───────────────────────────────── */
  const matrix = $('#matrix');
  if (matrix) {
    let level = 'all', q = '';
    const apply = () => $$('tbody tr', matrix).forEach((r) => { r.hidden = !((level === 'all' || r.dataset.level === level) && r.dataset.text.includes(q)); });
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => { level = b.dataset.filter; $$('[data-filter]').forEach((x) => x.classList.toggle('on', x === b)); apply(); }));
    $('#course-search')?.addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); apply(); });
  }

  /* ── FAQ search ─────────────────────────────────────────── */
  const fs = $('#faq-search');
  if (fs) fs.addEventListener('input', () => {
    const q = fs.value.trim().toLowerCase(); let shown = 0;
    $$('#faq-list .faq').forEach((d) => { const m = !q || d.dataset.q.includes(q); d.hidden = !m; if (m) shown++; if (q && m) d.open = true; });
    $$('#faq-list .faq-group').forEach((g) => { g.hidden = !$$('.faq:not([hidden])', g).length; });
    $('#faq-empty').hidden = shown > 0;
  });

  /* ── Compare tool ───────────────────────────────────────── */
  const app = $('#compare-app');
  if (app) fetch('/assets/data.json').then((r) => r.json()).then((D) => {
    const cSel = $('#cmp-course'), box = $('#cmp-unis'), out = $('#cmp-out');
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const initCourse = params.get('course'); if (initCourse && D.courses.some((c) => c.slug === initCourse)) cSel.value = initCourse;
    let picked = (params.get('u') || '').split(',').filter(Boolean);
    const offers = () => D.universities.filter((u) => u.courses[cSel.value]);
    const drawChips = () => {
      const list = offers(); picked = picked.filter((s) => list.some((u) => u.slug === s));
      if (!picked.length) picked = list.slice(0, 3).map((u) => u.slug);
      box.innerHTML = list.map((u) => `<label><input type="checkbox" value="${u.slug}" ${picked.includes(u.slug) ? 'checked' : ''}><span>${esc(u.short)}</span></label>`).join('');
      limit();
    };
    const limit = () => { const n = $$('input:checked', box).length; $$('input', box).forEach((i) => { i.disabled = !i.checked && n >= 3; }); };
    const draw = () => {
      const c = D.courses.find((x) => x.slug === cSel.value);
      const us = picked.map((s) => D.universities.find((u) => u.slug === s)).filter(Boolean);
      if (!us.length) { out.innerHTML = `<p class="cmp-empty">${L('Tick at least one university above.', 'ਉੱਪਰ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਯੂਨੀਵਰਸਿਟੀ ਚੁਣੋ।')}</p>`; return; }
      const row = (label, f) => `<tr><th scope="row">${label}</th>${us.map((u) => `<td>${f(u)}</td>`).join('')}</tr>`;
      const fee = (u) => u.courses[c.slug].fee ? esc(u.courses[c.slug].fee) : `<span class="muted">${L('Ask for fee quote', 'ਫੀਸ ਪੁੱਛੋ')}</span>`;
      out.innerHTML = `<table class="tbl"><thead><tr><th>${esc(c.short)}</th>${us.map((u) => `<th scope="col"><a href="/universities/${u.slug}/">${esc(u.name)}</a></th>`).join('')}</tr></thead><tbody>
        ${row(L('Location', 'ਸਥਾਨ'), (u) => esc(u.city))}
        ${row(L('Type', 'ਕਿਸਮ'), (u) => esc(u.type))}
        ${row('UGC-DEB ' + D.session, () => `<span class="chip ok sm">✓ ${L('Entitled (online)', 'ਮਾਨਤਾ (ਆਨਲਾਈਨ)')}</span>`)}
        ${row('NAAC', (u) => esc(u.naac || '—'))}
        ${row(L('Duration', 'ਮਿਆਦ'), () => esc(c.duration))}
        ${row(L('Specialisations', 'ਸਪੈਸ਼ਲਾਈਜ਼ੇਸ਼ਨ'), (u) => esc(u.courses[c.slug].spec || '—'))}
        ${row(L('Fee (as published)', 'ਫੀਸ (ਪ੍ਰਕਾਸ਼ਿਤ)'), fee)}
        ${row(L('Eligibility', 'ਯੋਗਤਾ'), () => esc(c.elig))}
        ${row(L('Highlights', 'ਮੁੱਖ ਗੱਲਾਂ'), (u) => `<ul class="check-list">${u.points.slice(0, 3).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`)}
        ${row('', (u) => `<a class="btn btn-primary sm" href="/contact/?course=${c.slug}&u=${u.slug}#apply">${L('Get quote', 'ਕੋਟ ਲਓ')}</a>`)}
      </tbody></table>`;
    };
    cSel.addEventListener('change', () => { drawChips(); draw(); });
    box.addEventListener('change', () => { picked = $$('input:checked', box).map((i) => i.value); limit(); draw(); });
    window.addEventListener('dp-lang', draw);
    drawChips(); draw();
  });
})();
