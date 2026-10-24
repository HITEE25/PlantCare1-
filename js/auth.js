// Demo authentication using localStorage (NOT secure – replace with a real backend later)
const Auth = {
  // Hash passwords so they are not stored as plain text
  async hash(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },
  user() { return Store.get('session', null); },          // current signed-in user or null
  signOut() { localStorage.removeItem('pc_session'); location.href = 'signin.html'; },
  require() { if (!Auth.user()) location.href = 'signin.html'; }  // call on pages you want to protect
};

// ---- Everything below only runs on the sign-in page ----
if (document.body.dataset.page === 'signin') {
  const $ = s => document.querySelector(s);
  let mode = 'in'; // 'in' = sign in, 'up' = create account

  function showView() {
    const u = Auth.user();
    $('#formView').hidden = !!u;
    $('#profileView').hidden = !u;
    if (u) { $('#who').textContent = u.name; $('#whoEmail').textContent = u.email; }
  }

  function setMode(m) {
    mode = m;
    const up = m === 'up';
    $('#nameWrap').hidden = !up;
    $('#title').textContent = up ? 'Create account' : 'Welcome back';
    $('#sub').textContent = up ? 'Join PlantCare in a minute' : 'Sign in to take care of your plants';
    $('#submitBtn').textContent = up ? 'Create account' : 'Sign in';
    $('#switchText').textContent = up ? 'Already have an account?' : 'New here?';
    $('#switchBtn').textContent = up ? 'Sign in' : 'Create account';
    $('#err').textContent = '';
  }

  $('#switchBtn').onclick = () => setMode(mode === 'in' ? 'up' : 'in');
  $('#signOutBtn').onclick = Auth.signOut;

  $('#authForm').onsubmit = async e => {
    e.preventDefault();
    const name = $('#name').value.trim();
    const email = $('#email').value.trim().toLowerCase();
    const pass = $('#password').value;
    const err = msg => { $('#err').textContent = msg; };

    // Validation
    if (mode === 'up' && name.length < 2) return err('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return err('Enter a valid email address.');
    if (pass.length < 6) return err('Password must be at least 6 characters.');

    const users = Store.get('users', []);
    const hash = await Auth.hash(pass);

    if (mode === 'up') {
      if (users.some(u => u.email === email)) return err('An account with this email already exists.');
      users.push({ name, email, hash });
      Store.set('users', users);
      Store.set('session', { name, email });
      toast('Account created ✓');
    } else {
      const u = users.find(u => u.email === email && u.hash === hash);
      if (!u) return err('Wrong email or password.');
      Store.set('session', { name: u.name, email: u.email });
      toast('Welcome back, ' + u.name + ' 🌿');
    }
    setTimeout(() => location.href = 'index.html', 700);
  };

  showView();
}
