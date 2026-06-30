/* ── ANIMASI ── */

function animateCounter(el, target, duration) {
  const start = performance.now();

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);

    el.textContent = Math.floor(eased * target).toLocaleString('id-ID');

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

const statNumbers = document.querySelectorAll('.stat-number');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el     = entry.target;
      const target = parseInt(el.getAttribute('data-target'));
      animateCounter(el, target, 1800);
      observer.unobserve(el);
    }
  });
}, { threshold: 0.3 });

statNumbers.forEach(el => observer.observe(el));

/* ── SLIDER ── */
function initSlider(sliderId, prevId, nextId, dotsId) {
  const slider  = document.getElementById(sliderId);
  const wrap    = slider?.parentElement;
  const outer   = wrap?.parentElement;
  const btnPrev = document.getElementById(prevId);
  const btnNext = document.getElementById(nextId);
  const dotsBox = dotsId ? document.getElementById(dotsId) : null;

  if (!slider || !wrap || !outer || !btnPrev || !btnNext) return;

  const gap = 24;
  let offset    = 0;   /* posisi geseran sekarang, dalam pixel */
  let maxScroll = 0;
  let pageStep  = 0;   /* lebar satu "halaman" = sejumlah kartu yang muat */

  function getCardStep() {
    const card = slider.children[0];
    return card ? card.offsetWidth + gap : 0;
  }

  function getMaxScroll() {
    /* lebar area tampil = clientWidth dikurangi padding kiri-kanan wrap */
    const cs       = getComputedStyle(wrap);
    const padX     = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const viewport = wrap.clientWidth - padX;
    const overflow = slider.scrollWidth - viewport;

    return Math.max(0, overflow);
  }

  /* berapa kartu yang muat dalam satu layar → menentukan jumlah titik */
  function getPageStep() {
    const step = getCardStep();
    if (!step) return 0;
    const perView = Math.max(1, Math.floor((wrap.clientWidth + gap) / step));
    return perView * step;
  }

  function getPageCount() {
    if (maxScroll <= 0 || pageStep <= 0) return 1;
    return Math.ceil(maxScroll / pageStep) + 1;
  }

  function getActivePage() {
    const count = getPageCount();
    if (pageStep <= 0 || count <= 1) return 0;

    /* kalau sudah mentok kanan → titik terakhir */
    if (offset >= maxScroll - 1) return count - 1;

    /* selain mentok, jangan klaim titik terakhir dulu */
    return Math.min(Math.round(offset / pageStep), count - 2);
  }

  function clamp(px) {
    return Math.max(0, Math.min(px, maxScroll));
  }

  /* snap ke kelipatan lebar kartu terdekat → langkah selalu rata */
  function snap(px) {
    const step = getCardStep();
    if (!step) return clamp(px);
    return clamp(Math.round(px / step) * step);
  }

  /* bikin ulang titik sesuai jumlah halaman (dipanggil saat init & resize) */
  function buildDots() {
    if (!dotsBox) return;
    const count = getPageCount();
    dotsBox.innerHTML = '';
    if (count <= 1) return; /* ga perlu titik kalau muat semua */

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ke halaman ${i + 1}`);
      dot.addEventListener('click', () => setOffset(i * pageStep, true));
      dotsBox.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsBox) return;
    const active = getActivePage();
    [...dotsBox.children].forEach((dot, i) =>
      dot.classList.toggle('active', i === active)
    );
  }

  function render() {
    slider.style.transform = `translateX(-${offset}px)`;

    const atStart = offset <= 0.5;
    const atEnd   = maxScroll === 0 || offset >= maxScroll - 0.5;

    outer.classList.toggle('fade-left', !atStart);
    outer.classList.toggle('fade-right', !atEnd);

    btnPrev.style.opacity       = atStart ? '0.3' : '1';
    btnPrev.style.pointerEvents = atStart ? 'none' : 'auto';
    btnNext.style.opacity       = atEnd   ? '0.3' : '1';
    btnNext.style.pointerEvents = atEnd   ? 'none' : 'auto';

    updateDots();
  }

  /* pindah ke posisi tertentu; animate=true pakai transisi CSS, false = langsung */
  function setOffset(px, animate) {
    maxScroll = getMaxScroll();
    pageStep  = getPageStep();
    offset = clamp(px);
    slider.style.transition = animate ? '' : 'none';
    render();
  }

  /* ── tombol panah: geser satu kartu ── */
  btnNext.addEventListener('click', () => setOffset(snap(offset + getCardStep()), true));
  btnPrev.addEventListener('click', () => setOffset(snap(offset - getCardStep()), true));

  /* ── drag (mouse) + swipe (touch) lewat Pointer Events ── */
  let dragging = false;
  let startX = 0;
  let startOffset = 0;
  let moved = 0;

  wrap.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    dragging    = true;
    startX      = e.clientX;
    startOffset = offset;
    moved       = 0;
    maxScroll   = getMaxScroll();
    slider.style.transition = 'none';
    wrap.setPointerCapture?.(e.pointerId);
    wrap.classList.add('dragging');
  });

  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.abs(dx);
    offset = clamp(startOffset - dx);
    slider.style.transform = `translateX(-${offset}px)`;
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('dragging');
    wrap.releasePointerCapture?.(e.pointerId);
    setOffset(snap(offset), true); /* lepas → snap ke kartu terdekat */
  }
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);

  /* kalau habis nge-drag, jangan sampai memicu klik di kartu */
  wrap.addEventListener('click', (e) => {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* matikan ghost-drag bawaan gambar */
  slider.querySelectorAll('img').forEach(img => (img.draggable = false));

  window.addEventListener('resize', () => {
    maxScroll = getMaxScroll();
    pageStep  = getPageStep();
    buildDots();
    setOffset(snap(offset), false);
  });

  setOffset(0, false);
  buildDots();
  updateDots();
}

window.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.getElementById('counter-users');
  if (counterEl) {
    setTimeout(() => animateCounter(counterEl, 1500, 1800), 900);
  }

  initSlider('heroSlider', 'heroPrev', 'heroNext', 'heroDots');
  initSlider('testiSlider', 'testiPrev', 'testiNext', 'testiDots');
});

/* ── SCROLL REVEAL + PROGRESS BAR ── */
window.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* progress bar mulai dari 0, diisi saat kartunya terlihat */
  const fills = document.querySelectorAll('.progress-fill');
  fills.forEach(f => {
    f.dataset.target = f.style.width || '0%';
    if (!reduceMotion) f.style.width = '0';
  });

  const revealEls = [...document.querySelectorAll(
    '.section-header, .donation-card, .katalog-item, .stat-item, ' +
    '#para-hero .slider-outer, #testimoni .slider-outer'
  )];
  revealEls.forEach(el => el.classList.add('reveal'));

  /* beri jeda bertahap (stagger) untuk elemen dalam grid yang sama */
  const stagger = (selector, step, cap = 6) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${(i % cap) * step}s`);
    });
  };
  stagger('.donation-card', 0.1);
  stagger('.stat-item', 0.1);
  stagger('.katalog-item', 0.05, 8);

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');

      /* kalau ini kartu donasi, isi progress bar-nya */
      const fill = el.querySelector && el.querySelector('.progress-fill');
      if (fill && fill.dataset.target) fill.style.width = fill.dataset.target;

      io.unobserve(el);
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => io.observe(el));
});

/* ── LIGHTBOX KATALOG PRODUK ── */
window.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.katalog-item');
  if (!items.length) return;

  /* buat elemen lightbox sekali saja */
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML =
    '<div class="lightbox-content">' +
      '<button class="lightbox-close" aria-label="Tutup">&times;</button>' +
      '<img class="lightbox-img" src="" alt="" />' +
      '<span class="lightbox-caption"></span>' +
    '</div>';
  document.body.appendChild(lb);

  const lbImg     = lb.querySelector('.lightbox-img');
  const lbCaption = lb.querySelector('.lightbox-caption');
  const lbClose   = lb.querySelector('.lightbox-close');

  function openLightbox(src, label, alt) {
    lbImg.src = src;
    lbImg.alt = alt || label || '';
    lbCaption.textContent = label || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden'; /* kunci scroll di belakang */
  }

  function closeLightbox() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  items.forEach(item => {
    item.addEventListener('click', () => {
      const img   = item.querySelector('img');
      const label = item.querySelector('.katalog-label');
      if (!img) return;
      openLightbox(img.src, label ? label.textContent.trim() : '', img.alt);
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
  });
});
