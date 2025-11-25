// Simple demo app logic for the banking UI
(function(){
  const baseURL = 'http://localhost:3000';
  const q = s => document.querySelector(s);

  // DOM
  const loginView = q('#loginView');
  const loginForm = q('#loginForm');
  const loginError = q('#loginError');
  const toggleSignUp = q('#toggleSignUp');

  const signUpView = q('#signUpView');
  const signUpForm = q('#signUpForm');
  const signUpError = q('#signUpError');
  const toggleLogin = q('#toggleLogin');

  const dashboardView = q('#dashboardView');
  const balanceEl = q('#balance');
  const transactionsEl = q('#transactions');
  const transferForm = q('#transferForm');
  const transferMsg = q('#transferMsg');
  const signOutBtn = q('#signOutBtn');
  const refreshBtn = q('#refreshBtn');

  let state = { loggedIn: false, account: { balance: 0, transactions: [] } };

  function formatCurrency(n){
    return n.toLocaleString(undefined, {style:'currency',currency:'USD'});
  }

  function render(){
    if(localStorage.getItem('sb_token')){
      loginView.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      signOutBtn.hidden = false;
      renderBalance();
      renderTransactions();
    } else {
      loginView.classList.remove('hidden');
      dashboardView.classList.add('hidden');
      signOutBtn.hidden = true;
    }
  }

  function renderBalance(){
    balanceEl.textContent = formatCurrency(state.account.balance || 0);
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
      render();
    }catch(err){
      console.warn('Failed to load account', err);
    }
  }

  loginForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const user = loginForm.username.value.trim();
    const pass = loginForm.password.value;
    try{
      const res = await fetch(baseURL + '/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const payload = await res.json();
      if(!res.ok){ loginError.textContent = payload.error || 'Login failed'; loginError.hidden = false; return; }
      localStorage.setItem('sb_token', payload.token);
      loginError.hidden = true;
      await loadAccount();
    }catch(err){
      loginError.textContent = 'Unable to contact server.'; loginError.hidden = false;
    }
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
      render();
      setTimeout(()=> transferMsg.hidden = true, 3500);
    }catch(err){
      transferMsg.textContent = 'Transfer failed.'; transferMsg.hidden = false;
    }
  });

  signOutBtn.addEventListener('click', function(){ signOut(); });

  function signOut(){
    localStorage.removeItem('sb_token');
    state = { loggedIn: false, account: { balance: 0, transactions: [] } };
    render();
  }

  function toggleToSignUp(e){
    e.preventDefault();
    loginView.classList.add('hidden');
    signUpView.classList.remove('hidden');
    loginError.hidden = true;
    signUpError.hidden = true;
  }

  function toggleToLogin(e){
    e.preventDefault();
    signUpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    loginError.hidden = true;
    signUpError.hidden = true;
  }

  signUpForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const user = signUpForm.username.value.trim();
    const pass = signUpForm.password.value;
    const confirm = signUpForm.confirmPassword.value;

    if(!user || !pass || !confirm){
      signUpError.textContent = 'All fields required.'; signUpError.hidden = false; return;
    }
    if(pass !== confirm){
      signUpError.textContent = 'Passwords do not match.'; signUpError.hidden = false; return;
    }
    if(pass.length < 4){
      signUpError.textContent = 'Password must be at least 4 characters.'; signUpError.hidden = false; return;
    }

    try{
      const res = await fetch(baseURL + '/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const payload = await res.json();
      if(!res.ok){ signUpError.textContent = payload.error || 'Sign up failed'; signUpError.hidden = false; return; }
      localStorage.setItem('sb_token', payload.token);
      signUpError.hidden = true;
      await loadAccount();
    }catch(err){
      signUpError.textContent = 'Unable to contact server.'; signUpError.hidden = false;
    }
  });

  refreshBtn.addEventListener('click', function(){ loadAccount(); });

  // toggle handlers
  toggleSignUp.addEventListener('click', toggleToSignUp);
  toggleLogin.addEventListener('click', toggleToLogin);

  // initial load if token present
  if(localStorage.getItem('sb_token')) loadAccount();
  render();
})();
