// Take Off — shared mega-menu.
// Modern translucent / blurred background. Same menu on Gateway, Padel, Pilates.
// Public API:
//   window.takeOffMenu.open()  / close() / toggle()
(() => {
  if (window.takeOffMenu) return;

  const NAVY = '#0c2350';
  const LIME = '#c4ef3f';
  const CREAM = '#f4f5ee';

  const MENU = {
    padel: {
      label: 'Padel',
      sections: [
        { n: '01', title: 'Play', links: [
          { label: 'Book a court',   desc: '20 DT a share · 80 DT the full court', href: 'Take Off - Padel.dc.html#book' },
          { label: 'Tournaments',    desc: 'Cups, americanos & seasonal cups',      href: 'Take Off - Padel.dc.html#tournaments' },
          { label: 'Ladder',         desc: 'Monthly club leaderboard',              href: 'Take Off - Padel.dc.html#ladder' },
          { label: 'Coaches',        desc: 'Meet the full coaching team',           href: 'Take Off - Coaches.dc.html' },
          { label: 'Coaching inquiry', desc: 'Book private or group sessions',      href: 'Take Off - Padel.dc.html#coaching-form' },
          { label: 'Court rental',   desc: 'Rent the full court for your event',    href: 'Take Off - Padel.dc.html#book' },
        ]},
        { n: '02', title: 'Padel Shop', links: [
          { label: 'Rackets',          href: 'Take Off - Store.dc.html?cat=rackets' },
          { label: 'Overgrips',        href: 'Take Off - Store.dc.html?cat=accessories' },
          { label: 'Hand protectors',  desc: 'Our signature protège-main',          href: 'Take Off - Store.dc.html?cat=accessories' },
          { label: 'Balls & tubes',    href: 'Take Off - Store.dc.html?cat=accessories' },
          { label: 'Bags',             href: 'Take Off - Store.dc.html?cat=accessories' },
          { label: 'Apparel',          href: 'Take Off - Store.dc.html?cat=padelwear' },
        ]},
      ],
      thumbs: [
        { label: 'Book a court', href: 'Take Off - Padel.dc.html#book', img: './photos/intense-padel-play-stockcake.webp' },
        { label: 'The pro shop', href: 'Take Off - Store.dc.html?cat=rackets', img: './photos/698d8cbb156292a5a7895eac_raquettes-main-filet-padelshot.webp' },
      ],
    },
    pilates: {
      label: 'Pilates',
      sections: [
        { n: '01', title: 'Classes', links: [
          { label: 'Reformer Flow',    desc: 'Spring-loaded, full-body strength',   href: 'Take Off - Pilates.dc.html#classes' },
          { label: 'Mat Foundations',  desc: 'Where every body begins',             href: 'Take Off - Pilates.dc.html#classes' },
          { label: 'Sculpt & Tone',    desc: 'Higher tempo, deeper burn',           href: 'Take Off - Pilates.dc.html#classes' },
          { label: 'Private session',  desc: 'One-on-one with an instructor',       href: 'Take Off - Pilates.dc.html#experts' },
          { label: 'Prenatal',         desc: 'Gentle, expert-led',                  href: 'Take Off - Pilates.dc.html#classes' },
        ]},
        { n: '02', title: 'Studio', links: [
          { label: 'This week',         desc: 'Live schedule + spot counts',        href: 'Take Off - Pilates.dc.html#schedule' },
          { label: 'Instructors',       desc: 'Meet the team',                      href: 'Take Off - Pilates.dc.html#experts' },
          { label: 'Member stories',    href: 'Take Off - Pilates.dc.html#schedule' },
        ]},
        { n: '03', title: 'Pilates Shop', links: [
          { label: 'Grip socks',        href: 'Take Off - Store.dc.html?cat=pilates' },
          { label: 'Studio towels',     href: 'Take Off - Store.dc.html?cat=towels' },
          { label: 'Resistance bands',  href: 'Take Off - Store.dc.html?cat=pilates' },
          { label: 'Apparel',           href: 'Take Off - Store.dc.html?cat=pilates' },
        ]},
      ],
      thumbs: [
        { label: 'The studio', href: 'Take Off - Pilates.dc.html#classes',  img: './photos/Reformer_pilates_pose.jpg' },
        { label: 'The shop',   href: 'Take Off - Pilates.dc.html#shop',     img: './photos/Mat_pilates.jpg' },
      ],
    },
    shop: {
      label: 'Shop',
      sections: [
        { n: '01', title: 'Padel Gear', links: [
          { label: 'Rackets',           href: 'Take Off - Store.dc.html?cat=rackets' },
          { label: 'Grips & protectors', href: 'Take Off - Store.dc.html?cat=accessories' },
          { label: 'Balls',             href: 'Take Off - Store.dc.html?cat=accessories' },
          { label: 'Bags',              href: 'Take Off - Store.dc.html?cat=accessories' },
        ]},
        { n: '02', title: 'Pilates Gear', links: [
          { label: 'Grip socks',        href: 'Take Off - Store.dc.html?cat=pilates' },
          { label: 'Resistance bands',  href: 'Take Off - Store.dc.html?cat=pilates' },
          { label: 'Studio towels',     href: 'Take Off - Store.dc.html?cat=towels' },
        ]},
        { n: '03', title: 'Lifestyle', links: [
          { label: 'Apparel',           href: 'Take Off - Store.dc.html?cat=padelwear' },
          { label: 'Caps & bottles',    href: 'Take Off - Store.dc.html?cat=lifestyle' },
          { label: 'Gift cards',        desc: 'Coming soon',                        href: '#' },
        ]},
      ],
      thumbs: [
        { label: 'Bestsellers', href: 'Take Off - Padel.dc.html#shop',  img: './photos/698d8cbb156292a5a7895eac_raquettes-main-filet-padelshot.webp' },
        { label: 'New in',      href: 'Take Off - Pilates.dc.html#shop', img: './photos/ThePilatesClubDublin-56-1.png' },
      ],
    },
    membership: {
      label: 'Membership',
      sections: [
        { n: '01', title: 'Plans', links: [
          { label: 'Padel Pass',       desc: '8 shares / month · priority booking', href: 'Take Off - Padel.dc.html#plans' },
          { label: 'Pilates Monthly',  desc: 'Unlimited reformer + mat',            href: 'Take Off - Pilates.dc.html#plans' },
          { label: 'All-Access',       desc: 'Both sports, no caps',                href: 'Take Off - Padel.dc.html#plans' },
          { label: 'Corporate',        desc: 'Team plans on request',               href: '#' },
        ]},
        { n: '02', title: 'Credits & packs', links: [
          { label: 'Wallet top-up',    desc: 'Pay once, spend anywhere',            href: '#wallet' },
          { label: '10-class pack',    desc: 'Pilates · valid 3 months',            href: 'Take Off - Pilates.dc.html#plans' },
          { label: 'Court credits',    desc: 'Bulk shares at a discount',           href: 'Take Off - Padel.dc.html#plans' },
        ]},
      ],
      thumbs: [
        { label: 'Memberships', href: 'Take Off - Padel.dc.html#plans', img: './photos/Volley_Routines_with_a_Partner.webp' },
      ],
    },
    club: {
      label: 'The Club',
      sections: [
        { n: '01', title: 'Discover', links: [
          { label: 'Our story',        desc: 'The signature behind Take Off',       href: '#' },
          { label: 'The space',        desc: 'Inside the club',                     href: '#' },
          { label: 'Coaches & instructors', href: 'Take Off - Coaches.dc.html' },
        ]},
        { n: '02', title: 'Visit', links: [
          { label: 'Hours & location', desc: 'Open 7/7 · near the airport',         href: '#' },
          { label: 'Contact',          href: '#' },
          { label: 'FAQ',              href: 'Take Off - Pilates.dc.html#faq' },
          { label: 'Careers',          desc: 'Come work with us',                   href: '#' },
        ]},
      ],
      thumbs: [
        { label: 'The space', href: '#', img: './photos/padelgirl.jpg' },
      ],
    },
  };

  const ORDER = ['padel', 'pilates', 'shop', 'membership', 'club'];

  // CSS
  const css = `
    .tk-menu-root{position:fixed;inset:0;z-index:200;display:none;font-family:'Space Grotesk',sans-serif;}
    .tk-menu-root.open{display:block;}
    .tk-menu-backdrop{position:absolute;inset:0;background:rgba(7,15,36,.42);backdrop-filter:blur(34px) saturate(140%);-webkit-backdrop-filter:blur(34px) saturate(140%);animation:tkMenuFade .35s ease both;}
    .tk-menu-panel{position:absolute;inset:0;display:flex;flex-direction:column;color:${CREAM};animation:tkMenuFade .4s ease both;}
    @keyframes tkMenuFade{from{opacity:0;}to{opacity:1;}}
    @keyframes tkMenuIn{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    .tk-menu-top{display:flex;align-items:center;justify-content:space-between;padding:28px 7vw 0;}
    .tk-menu-close{display:flex;align-items:center;gap:14px;cursor:pointer;font-family:'Space Mono';font-size:11px;letter-spacing:.22em;color:${CREAM};opacity:.85;}
    .tk-menu-close:hover{opacity:1;}
    .tk-menu-x{position:relative;width:26px;height:26px;}
    .tk-menu-x span{position:absolute;top:12px;left:0;width:26px;height:2px;background:${CREAM};}
    .tk-menu-x span:nth-child(1){transform:rotate(45deg);}
    .tk-menu-x span:nth-child(2){transform:rotate(-45deg);}
    .tk-menu-brand{display:flex;align-items:center;gap:12px;}
    .tk-menu-brand img{width:88px;height:auto;display:block;}
    .tk-menu-brand .tag{font-family:'Space Mono';font-size:10px;letter-spacing:.3em;color:rgba(244,245,238,.55);}
    .tk-menu-util{display:flex;gap:24px;font-family:'Space Mono';font-size:11px;letter-spacing:.2em;color:rgba(244,245,238,.7);}
    .tk-menu-util span{cursor:pointer;transition:color .2s;}
    .tk-menu-util span:hover{color:${LIME};}
    .tk-menu-body{flex:1;display:grid;grid-template-columns:1.05fr 1.5fr 1fr;gap:3vw;padding:5vh 7vw 4vh;min-height:0;}
    .tk-menu-cats{display:flex;flex-direction:column;gap:14px;align-self:center;}
    .tk-menu-cat{font-weight:700;font-size:clamp(30px,3.6vw,58px);line-height:1.04;letter-spacing:-.01em;cursor:pointer;color:rgba(244,245,238,.32);transition:color .25s ease, transform .25s ease;animation:tkMenuIn .5s ease both;}
    .tk-menu-cat:hover{transform:translateX(6px);}
    .tk-menu-cat.active{color:${CREAM};}
    .tk-menu-cat .tk-menu-cat-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:${LIME};margin-right:14px;opacity:0;transform:scale(.5);transition:all .3s ease;vertical-align:middle;}
    .tk-menu-cat.active .tk-menu-cat-dot{opacity:1;transform:scale(1);}
    .tk-menu-sections{display:flex;flex-wrap:wrap;gap:36px 6%;align-content:flex-start;align-self:center;border-left:1px solid rgba(244,245,238,.14);padding-left:3vw;}
    .tk-menu-section{min-width:200px;animation:tkMenuIn .5s ease both;}
    .tk-menu-section-title{font-family:'Space Mono';font-size:11px;letter-spacing:.24em;color:${LIME};margin-bottom:16px;}
    .tk-menu-links{display:flex;flex-direction:column;gap:14px;}
    .tk-menu-link{display:block;color:rgba(244,245,238,.85);text-decoration:none;cursor:pointer;transition:color .2s ease, transform .2s ease;width:fit-content;}
    .tk-menu-link:hover{transform:translateX(5px);}
    .tk-menu-link .lbl{font-size:17px;font-weight:600;color:${CREAM};display:block;}
    .tk-menu-link:hover .lbl{color:${LIME};}
    .tk-menu-link .dsc{font-family:'Space Mono';font-size:11px;letter-spacing:.04em;color:rgba(244,245,238,.5);margin-top:3px;display:block;}
    .tk-menu-thumbs{display:flex;flex-direction:column;gap:18px;align-self:center;}
    .tk-menu-thumb{cursor:pointer;animation:tkMenuIn .5s ease both;display:block;text-decoration:none;color:inherit;}
    .tk-menu-thumb-img{width:100%;height:150px;border-radius:14px;background:rgba(244,245,238,.06);background-size:cover;background-position:center;border:1px solid rgba(244,245,238,.1);transition:transform .3s ease, border-color .3s ease;}
    .tk-menu-thumb:hover .tk-menu-thumb-img{transform:scale(1.02);border-color:rgba(196,239,63,.5);}
    .tk-menu-thumb-label{font-family:'Space Mono';font-size:10px;letter-spacing:.22em;color:rgba(244,245,238,.6);margin-top:10px;text-transform:uppercase;}
    .tk-menu-foot{display:flex;align-items:center;justify-content:space-between;padding:0 7vw 30px;font-family:'Space Mono';font-size:10px;letter-spacing:.3em;color:rgba(244,245,238,.5);}
    .tk-menu-foot img{width:64px;height:auto;display:block;opacity:.85;}
    @media (max-width:900px){
      .tk-menu-body{grid-template-columns:1fr;gap:30px;padding:3vh 6vw;}
      .tk-menu-cats{flex-direction:row;flex-wrap:wrap;gap:10px 22px;}
      .tk-menu-cat{font-size:24px;}
      .tk-menu-sections{border-left:none;padding-left:0;border-top:1px solid rgba(244,245,238,.14);padding-top:24px;}
      .tk-menu-thumbs{display:none;}
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // root
  const root = document.createElement('div');
  root.className = 'tk-menu-root';
  document.body.appendChild(root);

  let activeKey = 'padel';

  function render() {
    const m = MENU[activeKey];
    root.innerHTML = `
      <div class="tk-menu-backdrop" data-close="1"></div>
      <div class="tk-menu-panel">
        <div class="tk-menu-top">
          <div class="tk-menu-close" data-close="1"><div class="tk-menu-x"><span></span><span></span></div>CLOSE</div>
          <div class="tk-menu-brand"><img src="./Logo/LOGO.svg" alt="Take Off"><span class="tag">PADEL · PILATES</span></div>
          <div class="tk-menu-util"><span data-act="search">SEARCH</span><span data-act="cart">CART</span><span data-act="account">ACCOUNT</span></div>
        </div>
        <div class="tk-menu-body">
          <div class="tk-menu-cats">
            ${ORDER.map((k, i) => `
              <div class="tk-menu-cat ${k === activeKey ? 'active' : ''}" data-cat="${k}" style="animation-delay:${i * .05}s;">
                <span class="tk-menu-cat-dot"></span>${MENU[k].label}
              </div>`).join('')}
          </div>
          <div class="tk-menu-sections">
            ${m.sections.map((s, i) => `
              <div class="tk-menu-section" style="animation-delay:${.1 + i * .08}s;">
                <div class="tk-menu-section-title">${s.n} — ${s.title}</div>
                <div class="tk-menu-links">
                  ${s.links.map(l => `
                    <a class="tk-menu-link" href="${l.href || '#'}">
                      <span class="lbl">${l.label}</span>
                      ${l.desc ? `<span class="dsc">${l.desc}</span>` : ''}
                    </a>`).join('')}
                </div>
              </div>`).join('')}
          </div>
          <div class="tk-menu-thumbs">
            ${(m.thumbs || []).map((t, i) => `
              <a class="tk-menu-thumb" href="${t.href || '#'}" style="animation-delay:${.2 + i * .1}s;">
                <div class="tk-menu-thumb-img" style="${t.img ? `background-image:url('${t.img}');` : ''}"></div>
                <div class="tk-menu-thumb-label">${t.label}</div>
              </a>`).join('')}
          </div>
        </div>
        <div class="tk-menu-foot">
          <span>TUNIS · NEAR THE AIRPORT</span>
          <img src="./Logo/LOGO.svg" alt="Take Off">
          <span>OPEN 7/7 · 7AM — 11PM</span>
        </div>
      </div>
    `;
  }

  root.addEventListener('click', (e) => {
    const target = e.target.closest('[data-close], [data-cat], [data-act]');
    if (!target) return;
    if (target.dataset.close) { close(); return; }
    if (target.dataset.cat) { activeKey = target.dataset.cat; render(); return; }
    if (target.dataset.act) {
      const a = target.dataset.act;
      if (a === 'account' || a === 'cart' || a === 'search') {
        if (window.takeOffAuth && (a === 'account')) { close(); window.takeOffAuth.openAccount(); return; }
        if (window.takeOffAuth && (a === 'search')) { /* no-op for now */ return; }
      }
    }
  });

  function open(initialKey) {
    if (initialKey && MENU[initialKey]) activeKey = initialKey;
    render();
    root.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    root.classList.remove('open');
    document.documentElement.style.overflow = '';
  }
  function toggle() { root.classList.contains('open') ? close() : open(); }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  window.takeOffMenu = { open, close, toggle };
})();
