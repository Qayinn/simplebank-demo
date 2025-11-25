// Login and Sign-up page logic
(function(){
  const baseURL = 'http://localhost:3000';
  const q = s => document.querySelector(s);

  // DOM
  const loginForm = q('#loginForm');
  const loginError = q('#loginError');
  const toggleSignUp = q('#toggleSignUp');

  const signUpView = q('#signUpView');
  const signUpForm = q('#signUpForm');
  const signUpError = q('#signUpError');
  const toggleLogin = q('#toggleLogin');

  const loginView = q('#loginView');

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

  loginForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const credential = loginForm.credential.value.trim();
    const pass = loginForm.password.value;
    try{
      const res = await fetch(baseURL + '/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, password: pass })
      });
      const payload = await res.json();
      if(!res.ok){ loginError.textContent = payload.error || 'Login failed'; loginError.hidden = false; return; }
      localStorage.setItem('sb_token', payload.token);
      window.location.href = 'dashboard.html';
    }catch(err){
      loginError.textContent = 'Unable to contact server.'; loginError.hidden = false;
    }
  });

  signUpForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const user = signUpForm.username.value.trim();
    const email = signUpForm.email.value.trim();
    const pass = signUpForm.password.value;
    const confirm = signUpForm.confirmPassword.value;

    if(!user || !email || !pass || !confirm){
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
        body: JSON.stringify({ username: user, email, password: pass })
      });
      const payload = await res.json();
      if(!res.ok){ signUpError.textContent = payload.error || 'Sign up failed'; signUpError.hidden = false; return; }
      localStorage.setItem('sb_token', payload.token);
      window.location.href = 'dashboard.html';
    }catch(err){
      signUpError.textContent = 'Unable to contact server.'; signUpError.hidden = false;
    }
  });

  // toggle handlers
  toggleSignUp.addEventListener('click', toggleToSignUp);
  toggleLogin.addEventListener('click', toggleToLogin);
})();
