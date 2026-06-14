// MAOS gränssnittslogik: tema, navigation, räknare, klocka, formulär.

const html = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');

// Ringen, MAOS-märket: delad generator i js/ring.js garanterar att nav,
// favicon och kortens glyf i 3D-scenen är exakt samma märke (12 linjer, seed 7).
document.querySelectorAll('.ring-logo').forEach(el => { el.innerHTML = window.MAOSRing.svg(12, 7); });
document.querySelector('link[rel="icon"]')?.setAttribute('href', window.MAOSRing.faviconURI(12, 7));

function applyTheme(mode, animate) {
  html.classList.toggle('dark', mode === 'dark');
  localStorage.setItem('maos-theme', mode);
  if (themeMeta) themeMeta.setAttribute('content', mode === 'dark' ? '#000000' : '#F5F5F5');
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    if (animate) toggle.classList.toggle('flipped');
  }
  window.MAOSHero?.setTheme(mode);
}

applyTheme(localStorage.getItem('maos-theme') || 'dark', false);
window.addEventListener('maos:hero-ready', () => {
  window.MAOSHero?.setTheme(html.classList.contains('dark') ? 'dark' : 'light');
});

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  applyTheme(html.classList.contains('dark') ? 'light' : 'dark', true);
});

// Mobilmeny
const menuBtn = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuBtn?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});
mobileMenu?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  })
);

// Sveparäknaren i heron
const counter = document.getElementById('sweep-count');
window.addEventListener('maos:sweep', e => {
  if (!counter) return;
  counter.textContent = e.detail.count;
  counter.animate(
    [{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
    { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  );
});

// Statusradens klocka, svensk lokal
const clockEl = document.getElementById('status-clock');
function tick() {
  if (!clockEl) return;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  });
  clockEl.textContent = fmt.format(now);
}
tick();
setInterval(tick, 30000);

// Demoformulär: skickar direkt till info@maos.se via Web3Forms (statisk sajt, ingen egen backend).
// Bot-spärr: dold honungsfälla (company_website) avbryter tyst om ifylld; Web3Forms har eget spamfilter.
// AKTIVERA: hämta en gratis access key kopplad till info@maos.se på web3forms.com och lägg in nedan.
const WEB3FORMS_KEY = '68fc42d6-edf9-4632-9c0b-c1bca0174d64';
const form = document.getElementById('demo-form');
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

form?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(form);
  // Honungsfälla: människor ser inte fältet. Är det ifyllt är det en bot, avbryt tyst.
  if ((data.get('company_website') || '').toString().trim()) return;
  const namn = (data.get('namn') || '').toString().trim();
  const epost = (data.get('epost') || '').toString().trim();
  if (!namn || !epost) {
    showToast('Fyll i namn och e-post så kan vi svara.');
    return;
  }
  if (!WEB3FORMS_KEY || WEB3FORMS_KEY === 'DIN_WEB3FORMS_ACCESS_KEY') {
    showToast('Formuläret är inte aktiverat än. Lägg in Web3Forms-nyckeln.');
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  data.delete('company_website');
  data.append('access_key', WEB3FORMS_KEY);
  data.append('subject', 'Demobokning MAOS: ' + namn);
  data.append('from_name', 'maos.se');
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: data
    });
    const json = await res.json();
    if (json.success) {
      form.reset();
      showToast('Tack, vi har tagit emot din förfrågan och återkommer inom en arbetsdag.');
    } else {
      showToast('Något gick fel. Mejla oss gärna direkt på info@maos.se.');
    }
  } catch (err) {
    showToast('Kunde inte skicka just nu. Mejla oss gärna direkt på info@maos.se.');
  } finally {
    if (btn) btn.disabled = false;
  }
});

// Årtal i sidfoten
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
