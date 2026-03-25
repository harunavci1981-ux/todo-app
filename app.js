const SUPABASE_URL = "https://meojzujitnmrgyhkpkec.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lb2p6dWppdG5tcmd5aGtwa2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTM0MjIsImV4cCI6MjA5MDAyOTQyMn0.NZkoCkFJjs9IVd-v4zDs9H8WQ3KjJI8WWwt0luAeV9M";

const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const info = document.getElementById("info");
const remaining = document.getElementById("remaining");
const clearDoneBtn = document.getElementById("clear-done");

let todos = [];

async function fetchTodos() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?order=created_at.asc`, { headers });
    todos = await res.json();
    render();
}

async function addTodo(text) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, done: false })
    });
    const [newTodo] = await res.json();
    todos.push(newTodo);
    render();
}

async function updateTodo(id, done) {
    await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ done })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.done = done;
    render();
}

async function deleteTodo(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
        method: "DELETE",
        headers
    });
    todos = todos.filter(t => t.id !== id);
    render();
}

async function clearDone() {
    await fetch(`${SUPABASE_URL}/rest/v1/todos?done=eq.true`, {
        method: "DELETE",
        headers
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

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addTodo(text);
});

clearDoneBtn.addEventListener("click", clearDone);

fetchTodos();
