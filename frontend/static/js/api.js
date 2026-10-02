const API_BASE_URL = 'http://localhost:5000/api';



function getAccessToken()  { return localStorage.getItem('access_token'); }
function getRefreshToken() { return localStorage.getItem('refresh_token'); }

function setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
}

function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}

function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}



async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = {
        method: options.method || 'GET',
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    let response = await fetch(url, config);

    if (response.status === 401 && getRefreshToken()) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            headers['Authorization'] = `Bearer ${getAccessToken()}`;
            response = await fetch(url, { ...config, headers });
        } else {
            clearTokens();
            window.location.href = '/login';
            throw new Error('Session expirée');
        }
    }

    let data;
    try { data = await response.json(); } catch { data = {}; }

    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
}



async function tryRefreshToken() {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) return false;

        const data = await response.json();
        setTokens(data.access_token, null);
        return true;
    } catch {
        return false;
    }
}



const api = {
    get:    (endpoint)       => apiRequest(endpoint),
    post:   (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
    put:    (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body }),
    delete: (endpoint)       => apiRequest(endpoint, { method: 'DELETE' }),
};




function requireAuth(allowedRoles = null) {
    const token = getAccessToken();
    const user = getUser();

    if (!token || !user) {
        window.location.href = '/login';
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const home = { customer: '/customer', gestionnaire: '/manager', admin: '/admin' };
        window.location.href = home[user.role] || '/';
        return null;
    }

    return user;
}



function logout() {
    clearTokens();
    window.location.href = '/login';
}