// Dashboard page logic
(function(){
  const baseURL = 'http://localhost:3000';
  const q = s => document.querySelector(s);

  // DOM
  const balanceEl = q('#balance');
  const transactionsEl = q('#transactions');
  const transferForm = q('#transferForm');
  const transferMsg = q('#transferMsg');
  const signOutBtn = q('#signOutBtn');
  const refreshBtn = q('#refreshBtn');
  const avatarImg = q('#avatarImg');
  const avatarUpload = q('#avatarUpload');
  const profileUsername = q('#profileUsername');
  const profileSince = q('#profileSince');
  const toggleBalanceBtn = q('#toggleBalanceBtn');
  const profileEmail = q('#profileEmail');
  const accountNumber = q('#accountNumber');

  // Shortcuts and modals
  const airtimeBtn = q('#airtimeBtn');
  const dataBtn = q('#dataBtn');
  const cableBtn = q('#cableBtn');
  const airtimeModal = q('#airtimeModal');
  const dataModal = q('#dataModal');
  const cableModal = q('#cableModal');
  const airtimeForm = q('#airtimeForm');
  const dataForm = q('#dataForm');
  const cableForm = q('#cableForm');
  const airtimeMsg = q('#airtimeMsg');
  const dataMsg = q('#dataMsg');
  const cableMsg = q('#cableMsg');
  const cableProvider = q('#cableProvider');
  const cablePlan = q('#cablePlan');

  let state = { account: { balance: 0, transactions: [] } };

  // Cable provider plans (key, label, amount in NGN)
  const cablePlans = {
    dstv: [
      { key: 'padi', label: 'Padi', amount: 4400 },
      { key: 'yanga', label: 'Yanga', amount: 6000 },
      { key: 'confam', label: 'Confam', amount: 11000 },
      { key: 'compact', label: 'Compact', amount: 19000 },
      { key: 'compactplus', label: 'Compact Plus', amount: 30000 },
      { key: 'streampremium', label: 'Stream Premium', amount: 44000 },
      { key: 'premium', label: 'Premium', amount: 44500 }
    ],
    gotv: [
      { key: 'jinja', label: 'Jinja', amount: 3900 },
      { key: 'jolli', label: 'Jolli', amount: 5800 },
      { key: 'max', label: 'Max', amount: 8500 },
      { key: 'supa', label: 'Supa', amount: 11400 },
      { key: 'supaplus', label: 'Supa Plus', amount: 16800 }
    ],
    startimes: [
      { key: 'classic', label: 'Classic', amount: 6000 },
      { key: 'super', label: 'Super', amount: 9800 },
      { key: 'basic', label: 'Basic', amount: 4000 },
      { key: 'nova', label: 'Nova', amount: 2100 }
    ]
  };

  function populateCablePlans(provider){
    cablePlan.innerHTML = '<option value="">Select plan</option>';
    const plans = cablePlans[provider] || [];
    plans.forEach(p => {
      const opt = document.createElement('option');
      opt.value = `${p.key}-${p.amount}`;
      opt.textContent = `${p.label} - ₦${p.amount.toLocaleString('en-NG')}`;
      cablePlan.appendChild(opt);
    });
  }

  // Check if user is authenticated, redirect to login if not
  function checkAuth(){
    const token = localStorage.getItem('sb_token');
    if(!token) window.location.href = 'index.html';
    return token;
  }

  function formatCurrency(n){
    return n.toLocaleString('en-NG', {style:'currency',currency:'NGN'});
  }

  function renderBalance(){
    balanceEl.textContent = formatCurrency(state.account.balance || 0);
  }

  function toggleBalance(){
    balanceEl.classList.toggle('hidden-balance');
    toggleBalanceBtn.textContent = balanceEl.classList.contains('hidden-balance') ? '👁️‍🗨️' : '👁️';
  }

  function renderTransactions(){
    transactionsEl.innerHTML = '';
    (state.account.transactions || []).slice().reverse().forEach(tx => {
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.innerHTML = `<strong>${tx.description}</strong><div class="muted" style="font-size:.85rem">${new Date(tx.date).toLocaleString()}</div>`;
      const right = document.createElement('div');
      right.innerHTML = `<div style="text-align:right">${formatCurrency(tx.amount)}</div>`;
      li.appendChild(left); li.appendChild(right);
      transactionsEl.appendChild(li);
    });
  }

  async function api(path, opts = {}){
    const headers = opts.headers || {};
    headers['Content-Type'] = 'application/json';
    const token = localStorage.getItem('sb_token');
    if(token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(baseURL + path, Object.assign({}, opts, { headers }));
    if(res.status === 401){
      signOut();
      throw new Error('Unauthorized');
    }
    return res.json();
  }

  async function loadAccount(){
    try{
      const bal = await api('/balance', { method: 'GET' });
      const tx = await api('/transactions', { method: 'GET' });
      state.account.balance = bal.balance;
      state.account.transactions = tx.transactions || [];
      renderBalance();
      renderTransactions();
    }catch(err){
      console.warn('Failed to load account', err);
    }
  }

  async function loadProfile(){
    try{
      const profile = await api('/profile', { method: 'GET' });
      profileUsername.textContent = profile.username;
      const joined = new Date(profile.joined).toLocaleDateString();
      profileSince.textContent = `Member since ${joined}`;
      profileEmail.textContent = `Email: ${profile.email}`;
      accountNumber.textContent = profile.accountNumber;
      if(profile.avatar) avatarImg.src = profile.avatar;
    }catch(err){
      console.warn('Failed to load profile', err);
    }
  }

  avatarUpload.addEventListener('change', async function(e){
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = async function(event){
      const base64 = event.target.result;
      try{
        const res = await api('/profile/avatar', { method: 'POST', body: JSON.stringify({ avatar: base64 }) });
        if(res.error){ console.warn(res.error); return; }
        avatarImg.src = base64;
      }catch(err){
        console.warn('Failed to upload avatar', err);
      }
    };
    reader.readAsDataURL(file);
  });

  transferForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const to = transferForm.to.value.trim();
    const amount = parseFloat(transferForm.amount.value);
    if(!to || isNaN(amount) || amount <= 0){
      transferMsg.textContent = 'Please provide a valid recipient and amount.'; transferMsg.hidden = false; return;
    }
    try{
      const res = await api('/transfer', { method: 'POST', body: JSON.stringify({ to, amount }) });
      if(res.error){ transferMsg.textContent = res.error; transferMsg.hidden = false; return; }
      state.account.balance = res.balance;
      state.account.transactions.push(res.transaction);
      transferMsg.textContent = `Sent ${formatCurrency(amount)} to ${to}.`; transferMsg.hidden = false;
      transferForm.reset();
      renderBalance();
      renderTransactions();
      setTimeout(()=> transferMsg.hidden = true, 3500);
    }catch(err){
      transferMsg.textContent = 'Transfer failed.'; transferMsg.hidden = false;
    }
  });

  signOutBtn.addEventListener('click', function(){ signOut(); });

  function signOut(){
    localStorage.removeItem('sb_token');
    window.location.href = 'index.html';
  }

  refreshBtn.addEventListener('click', function(){ loadAccount(); });

  toggleBalanceBtn.addEventListener('click', function(){ toggleBalance(); });

  // Shortcuts modal handlers
  function openModal(modal){ modal.classList.remove('hidden'); }
  function closeModal(modal){ modal.classList.add('hidden'); }

  airtimeBtn.addEventListener('click', () => openModal(airtimeModal));
  dataBtn.addEventListener('click', () => openModal(dataModal));
  cableBtn.addEventListener('click', () => openModal(cableModal));

  q('#closeAirtime').addEventListener('click', () => closeModal(airtimeModal));
  q('#closeData').addEventListener('click', () => closeModal(dataModal));
  q('#closeCable').addEventListener('click', () => closeModal(cableModal));

  // populate cable plans when provider changes
  if(cableProvider){
    cableProvider.addEventListener('change', (e) => {
      populateCablePlans(e.target.value);
    });
    // initial populate if provider has a value
    if(cableProvider.value) populateCablePlans(cableProvider.value);
  }

  airtimeForm.addEventListener('submit', function(e){
    e.preventDefault();
    (async function(){
      const network = airtimeForm.network.value;
      const phone = airtimeForm.phone.value.trim();
      const amount = parseFloat(airtimeForm.amount.value);
      if(!network || !phone || isNaN(amount) || amount <= 0){ airtimeMsg.textContent = 'Invalid airtime details'; airtimeMsg.hidden = false; return; }
      try{
        const res = await api('/purchase/airtime', { method: 'POST', body: JSON.stringify({ network, phone, amount }) });
        if(res.error){ airtimeMsg.textContent = res.error; airtimeMsg.hidden = false; return; }
        state.account.balance = res.balance;
        state.account.transactions.push(res.transaction);
        airtimeMsg.textContent = `✓ Airtime of ${formatCurrency(amount)} sent to ${phone}. Balance: ${formatCurrency(state.account.balance)}`;
        airtimeMsg.hidden = false;
        renderBalance(); renderTransactions();
        setTimeout(() => { closeModal(airtimeModal); airtimeMsg.hidden = true; airtimeForm.reset(); }, 2500);
      }catch(err){ airtimeMsg.textContent = 'Airtime purchase failed'; airtimeMsg.hidden = false; }
    })();
  });

  dataForm.addEventListener('submit', function(e){
    e.preventDefault();
    (async function(){
      const network = dataForm.network.value;
      const phone = dataForm.phone.value.trim();
      const plan = dataForm.plan.value;
      if(!network || !phone || !plan){ dataMsg.textContent = 'Invalid data purchase'; dataMsg.hidden = false; return; }
      const [planKey, amtStr] = plan.split('-');
      const amount = parseFloat(amtStr);
      try{
        const res = await api('/purchase/data', { method: 'POST', body: JSON.stringify({ network, phone, plan: planKey, amount }) });
        if(res.error){ dataMsg.textContent = res.error; dataMsg.hidden = false; return; }
        state.account.balance = res.balance;
        state.account.transactions.push(res.transaction);
        dataMsg.textContent = `✓ Data plan ${planKey} purchased for ${phone}. Balance: ${formatCurrency(state.account.balance)}`;
        dataMsg.hidden = false;
        renderBalance(); renderTransactions();
        setTimeout(() => { closeModal(dataModal); dataMsg.hidden = true; dataForm.reset(); }, 2500);
      }catch(err){ dataMsg.textContent = 'Data purchase failed'; dataMsg.hidden = false; }
    })();
  });

  cableForm.addEventListener('submit', function(e){
    e.preventDefault();
    (async function(){
      const provider = cableForm.provider.value;
      const plan = cableForm.plan.value;
      const smartcard = cableForm.smartcard.value.trim();
      if(!provider || !plan || !smartcard){ cableMsg.textContent = 'Please provide provider, plan and smartcard'; cableMsg.hidden = false; return; }
      const [planKey, amtStr] = plan.split('-');
      try{
        const res = await api('/purchase/cable', { method: 'POST', body: JSON.stringify({ provider, planKey, smartcard }) });
        if(res.error){ cableMsg.textContent = res.error; cableMsg.hidden = false; return; }
        state.account.balance = res.balance;
        state.account.transactions.push(res.transaction);
        cableMsg.textContent = `✓ ${provider.toUpperCase()} ${res.transaction.description} activated. Balance: ${formatCurrency(state.account.balance)}`;
        cableMsg.hidden = false;
        renderBalance(); renderTransactions();
        setTimeout(() => { closeModal(cableModal); cableMsg.hidden = true; cableForm.reset(); }, 2500);
      }catch(err){ cableMsg.textContent = 'Cable purchase failed'; cableMsg.hidden = false; }
    })();
  });

  // Close modals on background click
  [airtimeModal, dataModal, cableModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if(e.target === modal) closeModal(modal);
    });
  });

  // init
  checkAuth();
  loadProfile();
  loadAccount();
})();
