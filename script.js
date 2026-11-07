/* =====================================================
   FOODBRIDGE AI — INTERACTIVE WEBSITE DEMO
   Demo data is stored in this browser using localStorage.
   NGO profiles and matching scores are illustrative only.
===================================================== */

(() => {
  'use strict';

  const STORAGE = {
    registrations: 'foodbridgeRegistrations',
    donations: 'foodbridgeDonations'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function readStore(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn(`Could not read ${key} from localStorage.`, error);
      return [];
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save ${key}.`, error);
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  // 1. MOBILE NAVIGATION
  const menuToggle = $('#menuToggle');
  const navLinks = $('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      menuToggle.textContent = isOpen ? '✕' : '☰';
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    $$('.nav-links a').forEach(link => link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      menuToggle.textContent = '☰';
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // 2. DONOR / NGO REGISTRATION MODAL
  const registrationModal = $('#registrationModal');
  const formTitle = $('#formTitle');
  const registrationForm = $('#registrationForm');
  const formMessage = $('#formMessage');
  let selectedRegistrationType = 'donor';

  window.openForm = function (type = 'donor') {
    if (!registrationModal || !registrationForm) return;
    selectedRegistrationType = type === 'ngo' ? 'ngo' : 'donor';
    if (formTitle) formTitle.textContent = selectedRegistrationType === 'ngo'
      ? 'Join as an NGO' : 'Become a Food Donor';
    registrationForm.reset();
    if (formMessage) formMessage.textContent = '';
    registrationModal.classList.add('active');
    registrationModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstInput = $('input', registrationForm);
    if (firstInput) firstInput.focus({ preventScroll: true });
  };

  window.closeForm = function () {
    if (!registrationModal) return;
    registrationModal.classList.remove('active');
    registrationModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (registrationModal) {
    registrationModal.addEventListener('click', event => {
      if (event.target === registrationModal) window.closeForm();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.closeForm();
  });

  if (registrationForm) {
    registrationForm.addEventListener('submit', event => {
      event.preventDefault();
      const organisation = $('#orgName')?.value.trim() || '';
      const contact = $('#contactName')?.value.trim() || '';
      const email = $('#email')?.value.trim() || '';
      const location = $('#location')?.value.trim() || '';

      if (!organisation || !contact || !email || !location) {
        if (formMessage) formMessage.textContent = 'Please complete all the fields.';
        return;
      }

      const registrations = readStore(STORAGE.registrations);
      registrations.push({
        id: `REG-${Date.now()}`,
        organisation, contact, email, location,
        type: selectedRegistrationType,
        date: new Date().toISOString()
      });

      const saved = writeStore(STORAGE.registrations, registrations);
      if (formMessage) {
        formMessage.textContent = saved
          ? 'Thank you! Your registration has been recorded in this demo.'
          : 'Your browser could not save this demo registration. Please check browser storage settings.';
      }
      if (saved) {
        registrationForm.reset();
        window.setTimeout(window.closeForm, 1800);
      }
    });
  }

  // 3. SMOOTH SCROLL FOR INTERNAL LINKS
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (event) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', targetId);
      }
    });
  });

  // 4. SCROLL REVEAL
  const revealElements = $$('.section, .ai-section, .impact-strip, .join-section');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealElements.forEach(element => {
      element.classList.add('reveal');
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach(element => element.classList.add('visible'));
  }

  // 5. DEMO NGO DIRECTORY + MATCHING ENGINE
  // Fictional sample partners. These are not real/verified organisations.
  const demoNGOs = [
    { name: 'Community Food Support Centre', area: 'Bengaluru', accepts: ['Cooked meals', 'Fresh vegetables', 'Fruits', 'Bakery items', 'Packaged food'], capacity: 250, distance: 2.4, note: 'Community meal distribution' },
    { name: 'Hope Meals Network', area: 'Indiranagar', accepts: ['Cooked meals', 'Bakery items', 'Packaged food'], capacity: 120, distance: 4.1, note: 'Ready-to-serve meal support' },
    { name: 'City Care Food Collective', area: 'Koramangala', accepts: ['Fresh vegetables', 'Fruits', 'Packaged food'], capacity: 180, distance: 5.8, note: 'Fresh produce redistribution' },
    { name: 'Neighbourhood Share Kitchen', area: 'Whitefield', accepts: ['Cooked meals', 'Fruits', 'Bakery items'], capacity: 90, distance: 7.2, note: 'Local community kitchen' }
  ];

  const matchForm = $('#matchForm');
  const matchResult = $('#matchResult');

  function scoreNGO(ngo, foodType, quantity, donorLocation) {
    let score = 35;
    if (ngo.accepts.includes(foodType)) score += 35;
    if (quantity <= ngo.capacity) score += 20;
    else score += Math.max(0, 20 - Math.round((quantity - ngo.capacity) / 10));
    const donorWords = donorLocation.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const ngoWords = ngo.area.toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (donorWords.some(word => word.length > 2 && ngoWords.includes(word))) score += 10;
    return Math.min(98, score);
  }

  function renderMatch(donation) {
    if (!matchResult) return;
    const ranked = demoNGOs
      .map(ngo => ({ ...ngo, score: scoreNGO(ngo, donation.foodType, donation.quantity, donation.location) }))
      .sort((a, b) => b.score - a.score);
    const topMatches = ranked.slice(0, 3);

    matchResult.classList.add('show');
    matchResult.innerHTML = `
      <div class="fb-result-heading"><span class="fb-result-check">✳</span><div><h3>Matching analysis complete!</h3><p>Here are the strongest sample matches for this donation.</p></div></div>
      <div class="fb-donation-summary">
        <span><strong>Food</strong>${escapeHTML(donation.foodType)}</span>
        <span><strong>Quantity</strong>${donation.quantity} portions</span>
        <span><strong>Area</strong>${escapeHTML(donation.location)}</span>
        <span><strong>Pickup by</strong>${escapeHTML(donation.deadline)}</span>
      </div>
      <h4 class="fb-subheading">Suggested NGO partners</h4>
      <div class="fb-match-list">${topMatches.map((ngo, index) => `
        <article class="fb-match-item">
          <div class="fb-match-rank">${index + 1}</div>
          <div class="fb-match-copy"><h4>${escapeHTML(ngo.name)}</h4><p>${escapeHTML(ngo.note)} · Sample area: ${escapeHTML(ngo.area)}</p><div class="fb-match-meter"><span style="width:${ngo.score}%"></span></div><small>${ngo.score}% demo compatibility · capacity ${ngo.capacity} portions</small></div>
          <span class="fb-match-distance">~${ngo.distance.toFixed(1)} km*</span>
        </article>`).join('')}</div>
      <p class="fb-demo-disclaimer">*Illustrative demo data only. NGO names, distances, capacity and compatibility scores are sample values—not live availability, verified distance, or actual AI predictions. Confirm food safety and recipient availability before any real handover.</p>
      <button type="button" class="fb-primary-button" id="saveDonationButton">Save donation to demo tracker</button>
    `;

    $('#saveDonationButton', matchResult)?.addEventListener('click', () => {
      const donations = readStore(STORAGE.donations);
      const savedDonation = { ...donation, id: `FB-${Date.now()}`, status: 'Matched', matchedNGO: topMatches[0]?.name || 'Pending', createdAt: new Date().toISOString() };
      donations.unshift(savedDonation);
      if (writeStore(STORAGE.donations, donations)) {
        renderWorkspace();
        const button = $('#saveDonationButton', matchResult);
        if (button) {
          button.textContent = '✓ Saved to donation tracker';
          button.disabled = true;
        }
      }
    });
  }

  if (matchForm && matchResult) {
    matchForm.addEventListener('submit', event => {
      event.preventDefault();
      const foodType = $('#foodType')?.value || '';
      const quantity = Number($('#foodQuantity')?.value || 0);
      const location = $('#foodLocation')?.value.trim() || '';
      const deadline = $('#foodDeadline')?.value || '';
      if (!foodType || !quantity || !location || !deadline) {
        alert('Please complete all fields.');
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity greater than zero.');
        return;
      }
      if (quantity > 10000) {
        alert('For this demo, please enter up to 10,000 portions.');
        return;
      }
      renderMatch({ foodType, quantity, location, deadline });
      matchResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // 6. ADD A SMALL LIVE DEMO WORKSPACE BELOW THE MATCHING PANEL
  function addWorkspace() {
    const matchSection = $('#match-demo');
    if (!matchSection || $('#foodbridge-workspace')) return;
    const workspace = document.createElement('section');
    workspace.id = 'foodbridge-workspace';
    workspace.className = 'fb-workspace';
    workspace.innerHTML = `
      <div class="fb-workspace-top"><div><span class="fb-eyebrow">YOUR DEMO CONTROL CENTRE</span><h2>Food rescue <em>dashboard</em></h2><p>Track sample donations and see the impact of your actions in this browser.</p></div><span class="fb-local-tag">LOCAL DEMO</span></div>
      <div class="fb-stat-grid" id="fbStats"></div>
      <div class="fb-workspace-columns">
        <div class="fb-panel"><div class="fb-panel-heading"><h3>Donation tracker</h3><span>Latest activity</span></div><div id="fbDonationList" class="fb-donation-list"></div></div>
        <div class="fb-panel"><div class="fb-panel-heading"><h3>Community partners</h3><span>Sample profiles</span></div><div id="fbNgoList" class="fb-ngo-list"></div></div>
      </div>
      <p class="fb-safety-note"><strong>Food safety first:</strong> only offer food that has been handled and stored safely, is within its safe consumption period, and has clear ingredient/allergen information. This demo does not inspect, certify or guarantee food safety.</p>
      <button type="button" class="fb-reset-button" id="resetDemoButton">Reset demo data on this device</button>
    `;
    matchSection.appendChild(workspace);
  }

  function renderWorkspace() {
    const donations = readStore(STORAGE.donations);
    const stats = $('#fbStats');
    const donationList = $('#fbDonationList');
    const ngoList = $('#fbNgoList');
    if (!stats || !donationList || !ngoList) return;

    const totalPortions = donations.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const completed = donations.filter(item => item.status === 'Completed').length;
    const matched = donations.filter(item => item.status === 'Matched' || item.status === 'Pickup scheduled').length;
    stats.innerHTML = `
      <article class="fb-stat"><span>Donations posted</span><strong>${donations.length}</strong><small>Saved in this browser</small></article>
      <article class="fb-stat"><span>Portions listed</span><strong>${totalPortions.toLocaleString('en-IN')}</strong><small>Potential meals, not verified</small></article>
      <article class="fb-stat"><span>Active matches</span><strong>${matched}</strong><small>Demo matches</small></article>
      <article class="fb-stat"><span>Completed pickups</span><strong>${completed}</strong><small>Manually updated demo status</small></article>
    `;

    donationList.innerHTML = donations.length ? donations.slice(0, 6).map(item => `
      <article class="fb-donation-row"><div><strong>${escapeHTML(item.foodType)}</strong><p>${Number(item.quantity)} portions · ${escapeHTML(item.location)}</p><small>${escapeHTML(item.matchedNGO || 'No match yet')}</small></div><div class="fb-donation-actions"><span class="fb-status status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${escapeHTML(item.status)}</span><select aria-label="Update status for ${escapeHTML(item.id)}" data-status-id="${escapeHTML(item.id)}"><option ${item.status === 'Matched' ? 'selected' : ''}>Matched</option><option ${item.status === 'Pickup scheduled' ? 'selected' : ''}>Pickup scheduled</option><option ${item.status === 'Completed' ? 'selected' : ''}>Completed</option></select></div></article>
    `).join('') : '<div class="fb-empty-state"><span>🥬</span><strong>No donations yet</strong><p>Use the matching form above to create your first sample donation.</p></div>';

    ngoList.innerHTML = demoNGOs.map(ngo => `
      <article class="fb-ngo-row"><span class="fb-ngo-icon">♡</span><div><strong>${escapeHTML(ngo.name)}</strong><p>${escapeHTML(ngo.area)} · Capacity: ${ngo.capacity} portions</p><small>Accepts: ${escapeHTML(ngo.accepts.join(', '))}</small></div></article>
    `).join('');

    $$('[data-status-id]', donationList).forEach(select => {
      select.addEventListener('change', () => {
        const allDonations = readStore(STORAGE.donations);
        const item = allDonations.find(donation => donation.id === select.dataset.statusId);
        if (item) {
          item.status = select.value;
          item.updatedAt = new Date().toISOString();
          writeStore(STORAGE.donations, allDonations);
          renderWorkspace();
        }
      });
    });
  }

  addWorkspace();
  renderWorkspace();

  $('#resetDemoButton')?.addEventListener('click', () => {
    const confirmed = window.confirm('Clear all FoodBridge demo registrations and donations saved in this browser?');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE.registrations);
    localStorage.removeItem(STORAGE.donations);
    renderWorkspace();
    if (matchResult) {
      matchResult.classList.remove('show');
      matchResult.innerHTML = '';
    }
  });

  console.log('🌱 FoodBridge AI loaded successfully!');
  console.log('Rescue Food. Restore Hope.');
})();
