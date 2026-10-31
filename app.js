// =====================================
// EVERYDAY 1.0
// Główna logika aplikacji
// =====================================

const $ = (selector) => document.querySelector(selector);

const STORAGE_KEY = "everyday_data_v1";

let data = {
  tasks: [],
  reminders: [],
  notes: []
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      data = {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : []
      };
    }
  } catch (error) {
    console.error("Nie udało się wczytać danych:", error);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// =====================================
// ZAKŁADKI
// =====================================

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.remove("active");
    });

    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.remove("active");
    });

    button.classList.add("active");
    $("#" + button.dataset.tab).classList.add("active");
  });
});

// =====================================
// MOTYW
// =====================================

const savedTheme = localStorage.getItem("everyday_theme");

if (savedTheme === "light") {
  document.body.classList.add("light");
}

function updateThemeButton() {
  $("#themeButton").textContent =
    document.body.classList.contains("light") ? "☾" : "☀";
}

$("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("light");

  const theme = document.body.classList.contains("light")
    ? "light"
    : "dark";

  localStorage.setItem("everyday_theme", theme);
  updateThemeButton();
});

updateThemeButton();

// =====================================
// ZADANIA
// =====================================

$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("#taskInput");
  const title = input.value.trim();

  if (!title) return;

  data.tasks.push({
    id: createId(),
    title,
    done: false,
    createdAt: Date.now()
  });

  input.value = "";
  saveData();
  render();
  showToast("Dodano zadanie!");
});

function toggleTask(id) {
  const task = data.tasks.find(item => item.id === id);
  if (!task) return;

  task.done = !task.done;
  saveData();
  render();
}

function deleteTask(id) {
  data.tasks = data.tasks.filter(item => item.id !== id);
  saveData();
  render();
}

function renderTasks() {
  const list = $("#taskList");
  list.replaceChildren();

  if (data.tasks.length === 0) {
    list.innerHTML = "<li class='empty'>Brak zadań. Dodaj pierwsze!</li>";
    return;
  }

  data.tasks.forEach(task => {
    const item = document.createElement("li");
    item.className = "item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Oznacz zadanie jako wykonane");
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = task.title;

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.textContent = "Usuń";
    remove.addEventListener("click", () => deleteTask(task.id));

    item.append(checkbox, text, remove);
    list.append(item);
  });
}

// =====================================
// POWIADOMIENIA
// =====================================

$("#notificationButton").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("Ta przeglądarka nie obsługuje powiadomień.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    showToast("Powiadomienia włączone!");
  } else {
    showToast("Nie przyznano uprawnienia.");
  }
});

function sendNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body,
        icon: "./icon.svg",
        badge: "./icon.svg"
      });
    }).catch(error => {
      console.error("Błąd powiadomienia:", error);
    });
  } else {
    new Notification(title, { body });
  }
}

// =====================================
// PRZYPOMNIENIA
// =====================================

$("#reminderForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#reminderInput").value.trim();
  const date = $("#reminderDate").value;

  if (!title || !date) return;

  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    showToast("Wybierz przyszłą datę i godzinę.");
    return;
  }

  data.reminders.push({
    id: createId(),
    title,
    time: timestamp,
    notified: false
  });

  $("#reminderInput").value = "";
  $("#reminderDate").value = "";

  saveData();
  render();
  showToast("Przypomnienie dodane!");
});

function deleteReminder(id) {
  data.reminders = data.reminders.filter(item => item.id !== id);
  saveData();
  render();
}

function renderReminders() {
  const list = $("#reminderList");
  list.replaceChildren();

  if (data.reminders.length === 0) {
    list.innerHTML = "<li class='empty'>Brak przypomnień.</li>";
    return;
  }

  [...data.reminders]
    .sort((a, b) => a.time - b.time)
    .forEach(reminder => {
      const item = document.createElement("li");
      item.className = "item";

      const text = document.createElement("span");
      text.className = "item-text";

      const title = document.createElement("strong");
      title.textContent = reminder.title;

      const date = document.createElement("small");
      date.textContent = new Date(reminder.time).toLocaleString("pl-PL");

      text.append(title, document.createElement("br"), date);

      const remove = document.createElement("button");
      remove.className = "delete-button";
      remove.textContent = "Usuń";
      remove.addEventListener("click", () => deleteReminder(reminder.id));

      item.append(text, remove);
      list.append(item);
    });
}

function checkReminders() {
  const now = Date.now();
  let changed = false;

  data.reminders.forEach(reminder => {
    if (!reminder.notified && reminder.time <= now) {
      sendNotification("EVERYDAY — Przypomnienie", reminder.title);
      reminder.notified = true;
      changed = true;
    }
  });

  if (changed) {
    saveData();
    renderReminders();
  }
}

// Sprawdzanie przypomnień podczas działania aplikacji.
setInterval(checkReminders, 5000);

// =====================================
// NOTATKI
// =====================================

$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#noteTitle").value.trim();
  const content = $("#noteContent").value.trim();

  if (!title || !content) return;

  data.notes.push({
    id: createId(),
    title,
    content,
    createdAt: Date.now()
  });

  $("#noteTitle").value = "";
  $("#noteContent").value = "";

  saveData();
  render();
  showToast("Notatka zapisana!");
});

function deleteNote(id) {
  data.notes = data.notes.filter(item => item.id !== id);
  saveData();
  render();
}

function renderNotes() {
  const list = $("#noteList");
  list.replaceChildren();

  if (data.notes.length === 0) {
    list.textContent = "Nie masz jeszcze żadnych notatek.";
    return;
  }

  [...data.notes].reverse().forEach(note => {
    const card = document.createElement("article");
    card.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const content = document.createElement("p");
    content.textContent = note.content;

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.textContent = "Usuń notatkę";
    remove.addEventListener("click", () => deleteNote(note.id));

    card.append(title, content, remove);
    list.append(card);
  });
}

// =====================================
// STATYSTYKI I RENDEROWANIE
// =====================================

function render() {
  renderTasks();
  renderReminders();
  renderNotes();

  $("#taskCount").textContent =
    data.tasks.filter(task => !task.done).length;

  $("#reminderCount").textContent = data.reminders.length;
  $("#noteCount").textContent = data.notes.length;
}

// =====================================
// SERVICE WORKER
// =====================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("EVERYDAY: Service Worker działa."))
      .catch(error => console.error("Service Worker:", error));
  });
}

// =====================================
// START
// =====================================

loadData();
render();
checkReminders();
