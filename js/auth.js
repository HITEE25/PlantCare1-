
const Auth = {
    async hash(text) {
        const buf = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(text)
        );

        return [...new Uint8Array(buf)]
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    user() {
        return Store.get('session', null);
    },

    signOut() {
        localStorage.removeItem('pc_session');
        location.href = 'signin.html';
    },

    require() {
        if (!Auth.user()) {
            location.href = 'signin.html';
        }
    }
};


if (document.body.dataset.page === 'signin') {
    const $ = selector => document.querySelector(selector);

    let mode = 'in';

    function showView() {
        const user = Auth.user();

        $('#formView').hidden = !!user;
        $('#profileView').hidden = !user;

        if (user) {
            $('#who').textContent = user.name;
            $('#whoEmail').textContent = user.email;
        }
    }

    function setMode(newMode) {
        mode = newMode;

        const isRegistering = mode === 'up';

        $('#nameWrap').hidden = !isRegistering;

        $('#title').textContent = isRegistering
            ? 'Create account'
            : 'Login';

        $('#submitBtn').textContent = isRegistering
            ? 'Create account'
            : 'Login';

        $('#switchText').textContent = isRegistering
            ? 'Already have an account?'
            : 'New here?';

        $('#switchBtn').textContent = isRegistering
            ? 'Sign in'
            : 'Create account';

        $('#password').autocomplete = isRegistering
            ? 'new-password'
            : 'current-password';

        $('#err').textContent = '';
        $('#password').value = '';
    }

    $('#switchBtn').onclick = () => {
        setMode(mode === 'in' ? 'up' : 'in');
    };

    $('#signOutBtn').onclick = Auth.signOut;

    $('#authForm').onsubmit = async event => {
        event.preventDefault();

        const name = $('#name').value.trim();
        const email = $('#email').value.trim().toLowerCase();
        const password = $('#password').value;

        const showError = message => {
            $('#err').textContent = message;
        };

        // Validate form
        if (mode === 'up' && name.length < 2) {
            return showError('Please enter your name.');
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return showError('Enter a valid email address.');
        }

        if (password.length < 6) {
            return showError('Password must be at least 6 characters.');
        }

        try {
            const users = Store.get('users', []);
            const hash = await Auth.hash(password);

            if (mode === 'up') {
                // Create account
                if (users.some(user => user.email === email)) {
                    return showError(
                        'An account with this email already exists.'
                    );
                }

                users.push({
                    name,
                    email,
                    hash
                });

                Store.set('users', users);
                Store.set('session', { name, email });

                toast('Account created ✓');
            } else {
                // Sign in
                const user = users.find(
                    user => user.email === email && user.hash === hash
                );

                if (!user) {
                    return showError('Wrong email or password.');
                }

                Store.set('session', {
                    name: user.name,
                    email: user.email
                });
                
            }

            setTimeout(() => {
                location.href = 'index.html';
            }, 700);

        } catch (error) {
            console.error('Authentication error:', error);
            showError(
                'Something went wrong. Please try again using localhost.'
            );
        }
    };

    setMode('in');
    showView();
}
