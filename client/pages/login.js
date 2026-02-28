export function initLogin(container, navigateTo) {
  container.innerHTML = `
    <div class="lobby-container animate-fade-in panel" style="max-width: 450px; margin-top: 10vh; padding: 40px; box-shadow: var(--shadow-glow);">
      <h1 class="logo glow" style="font-size: 3rem; margin-bottom: 5px;">🃏 Texas Hold'em</h1>
      <p style="text-align: center; color: var(--gold); margin-bottom: 30px; letter-spacing: 2px; font-size: 0.9rem; text-transform: uppercase;">Staff Login Portal</p>
      
      <div class="login-input-group">
        <input type="text" id="username" class="login-input" placeholder="Enter Username" autocomplete="off" />
        <div class="login-input-icon">👤</div>
      </div>

      <div class="login-input-group">
        <input type="password" id="password" class="login-input" placeholder="Enter Password" />
        <div class="login-input-icon">🔒</div>
      </div>

      <button id="btn-login" class="btn btn-primary" style="margin-top: 35px; width: 100%; padding: 18px; font-size: 1.2rem; letter-spacing: 2px;">
        ENTER CASINO
      </button>

      <div id="login-error" style="color: var(--red); text-align: center; margin-top: 20px; font-weight: bold; min-height: 20px;"></div>
    </div>
  `;

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');

  const handleLogin = async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      errorEl.textContent = 'Please enter username and password.';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        // Save the token and user info
        localStorage.setItem('poker_token', data.token);
        localStorage.setItem('poker_user', JSON.stringify(data.user));

        // Refresh the page or trigger the main app initialization
        window.location.reload();
      } else {
        errorEl.textContent = data.error || 'Authentication failed';
        loginBtn.disabled = false;
        loginBtn.textContent = 'ENTER CASINO';
      }
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Server error. Please try again.';
      loginBtn.disabled = false;
      loginBtn.textContent = 'ENTER CASINO';
    }
  };

  loginBtn.addEventListener('click', handleLogin);
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  usernameInput.focus();
}
