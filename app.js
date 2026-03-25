const SUPABASE_URL = "https://meojzujitnmrgyhkpkec.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lb2p6dWppdG5tcmd5aGtwa2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTM0MjIsImV4cCI6MjA5MDAyOTQyMn0.NZkoCkFJjs9IVd-v4zDs9H8WQ3KjJI8WWwt0luAeV9M";

// --- State ---
let accessToken = null;
let currentUser = null;
let todos = [];

// --- DOM ---
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleLink = document.getElementById("auth-toggle-link");
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const info = document.getElementById("info");
const remaining = document.getElementById("remaining");
const clearDoneBtn = document.getElementById("clear-done");

let isLoginMode = true;

// --- Auth helpers ---
function authHeaders() {
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
}

function showMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
    authMessage.classList.remove("hidden");
}

function hideMessage() {
    authMessage.classList.add("hidden");
}

function showApp(user) {
    currentUser = user;
    accessToken = user.accessToken;
    userEmailEl.textContent = user.email;
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    fetchTodos();
}

function showAuth() {
    currentUser = null;
    accessToken = null;
    todos = [];
    localStorage.removeItem("sb_session");
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    hideMessage();
    authEmail.value = "";
    authPassword.value = "";
}

// --- Auth: toggle login/register ---
authToggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    hideMessage();
    if (isLoginMode) {
        authSubmit.textContent = "Giris Yap";
        authToggleText.textContent = "Hesabin yok mu?";
        authToggleLink.textContent = "Kayit Ol";
    } else {
        authSubmit.textContent = "Kayit Ol";
        authToggleText.textContent = "Zaten hesabin var mi?";
        authToggleLink.textContent = "Giris Yap";
    }
});

// --- Auth: submit ---
authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (isLoginMode) {
        // Login
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            const session = { accessToken: data.access_token, refreshToken: data.refresh_token, email: data.user.email };
            localStorage.setItem("sb_session", JSON.stringify(session));
            showApp(session);
        } else {
            showMessage(data.error_description || data.msg || "Giris basarisiz. E-postanizi onayladiginizdan emin olun.", "error");
        }
    } else {
        // Register
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: "POST",
            headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            showMessage("Kayit basarili! E-postaniza gelen onay linkine tiklayin, sonra giris yapin.", "success");
            isLoginMode = true;
            authSubmit.textContent = "Giris Yap";
            authToggleText.textContent = "Hesabin yok mu?";
            authToggleLink.textContent = "Kayit Ol";
        } else {
            showMessage(data.error_description || data.msg || "Kayit basarisiz.", "error");
        }
    }
});

// --- Auth: logout ---
logoutBtn.addEventListener("click", () => {
    showAuth();
});

// --- Auth: check URL hash for token (email confirmation redirect) ---
function handleAuthRedirect() {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (token) {
            // Fetch user info
            fetch(`${SUPABASE_URL}/auth/v1/user`, {
                headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
            })
            .then(r => r.json())
            .then(user => {
                const session = { accessToken: token, refreshToken, email: user.email };
                localStorage.setItem("sb_session", JSON.stringify(session));
                window.location.hash = "";
                showApp(session);
            });
            return true;
        }
    }
    return false;
}

// --- Auth: restore session ---
function restoreSession() {
    if (handleAuthRedirect()) return;
    const stored = localStorage.getItem("sb_session");
    if (stored) {
        const session = JSON.parse(stored);
        // Verify token is still valid
        fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${session.accessToken}` }
        })
        .then(r => {
            if (r.ok) return r.json();
            throw new Error("expired");
        })
        .then(user => {
            session.email = user.email;
            showApp(session);
        })
        .catch(() => showAuth());
    }
}

// --- Todo CRUD ---
async function fetchTodos() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?order=created_at.asc`, { headers: authHeaders() });
    todos = await res.json();
    render();
}

async function addTodo(text) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text, done: false, user_id: currentUser.email ? undefined : null })
    });
    // user_id is set automatically via RLS auth.uid()
    const [newTodo] = await res.json();
    todos.push(newTodo);
    render();
}

async function updateTodo(id, done) {
    await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ done })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.done = done;
    render();
}

async function deleteTodo(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
        method: "DELETE",
        headers: authHeaders()
    });
    todos = todos.filter(t => t.id !== id);
    render();
}

async function clearDone() {
    await fetch(`${SUPABASE_URL}/rest/v1/todos?done=eq.true`, {
        method: "DELETE",
        headers: authHeaders()
    });
    todos = todos.filter(t => !t.done);
    render();
}

function render() {
    list.innerHTML = "";
    todos.forEach(todo => {
        const li = document.createElement("li");
        if (todo.done) li.classList.add("done");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = todo.done;
        checkbox.addEventListener("change", () => updateTodo(todo.id, checkbox.checked));

        const span = document.createElement("span");
        span.textContent = todo.text;

        const delBtn = document.createElement("button");
        delBtn.textContent = "\u00d7";
        delBtn.addEventListener("click", () => deleteTodo(todo.id));

        li.append(checkbox, span, delBtn);
        list.appendChild(li);
    });

    const left = todos.filter(t => !t.done).length;
    remaining.textContent = left;
    info.classList.toggle("hidden", todos.length === 0);
}

// --- Todo form ---
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addTodo(text);
});

clearDoneBtn.addEventListener("click", clearDone);

// --- Init ---
restoreSession();
