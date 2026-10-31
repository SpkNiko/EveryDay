const $ = selector => document.querySelector(selector);
const STORAGE_KEY = "everyday_data_v1";

let data = {
  tasks: [],
  reminders: [],
  notes: []
};

let installPrompt = null;

// ================================
// ZAPIS I ODCZYT DANYCH
// ================================

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
    console.error("Błąd odczytu danych:", error);
    showToast("Nie udało się odczytać danych.");
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Błąd zapisu danych:", error);
    showToast("Nie udało się zapisać danych.");
    return false;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// ================================
// LICZNIKI
// ================================

function updateCounters() {
  $("#taskCount").textContent =
    data.tasks.filter(task => !task.done).length;

  $("#reminderCount").textContent =
    data.reminders.filter(reminder => !reminder.notified).length;

  $("#noteCount").textContent = data.notes.length;
}

// ================================
// GŁÓWNE ODŚWIEŻANIE
// ================================

function render() {
  renderTasks();
  renderReminders();
  renderNotes();
  updateCounters();
}

// ================================
// ZAKŁADKI
// ================================

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab =>
      tab.classList.remove("active")
    );

    document.querySelectorAll(".panel").forEach(panel =>
      panel.classList.remove("active")
    );

    button.classList.add("active");

    const panel = $("#" + button.dataset.tab);
    if (panel) panel.classList.add("active");
  });
});

// ================================
// MOTYW
// ================================

try {
  if (localStorage.getItem("everyday_theme") === "light") {
    document.body.classList.add("light");
  }
} catch (error) {
  console.error("Błąd motywu:", error);
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

  try {
    localStorage.setItem("everyday_theme", theme);
  } catch (error) {
    console.error(error);
  }

  updateThemeButton();
});

updateThemeButton();

// ================================
// ZADANIA
// ================================

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

  if (!data.tasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Brak zadań. Dodaj pierwsze!";
    list.append(empty);
    return;
  }

  data.tasks.forEach(task => {
    const item = document.createElement("li");
    item.className = "item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Oznacz jako wykonane");
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = task.title;

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "Usuń";
    remove.addEventListener("click", () => deleteTask(task.id));

    item.append(checkbox, text, remove);
    list.append(item);
  });
}

// ================================
// POWIADOMIENIA SYSTEMOWE
// ================================

$("#notificationButton").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("Ta przeglądarka nie obsługuje powiadomień.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      showToast("Powiadomienia włączone!");
    } else {
      showToast("Nie przyznano uprawnienia.");
    }
  } catch (error) {
    console.error(error);
    showToast("Nie udało się włączyć powiadomień.");
  }
});

async function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification(title, {
        body,
        icon: "./icon.svg",
        badge: "./icon.svg",
        tag: "everyday-" + Date.now()
      });
    } else {
      new Notification(title, { body });
    }
  } catch (error) {
    console.error("Błąd powiadomienia:", error);
  }
}

// ================================
// PRZYPOMNIENIA
// ================================

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

  if (!data.reminders.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Brak przypomnień.";
    list.append(empty);
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
      remove.type = "button";
      remove.textContent = "Usuń";
      remove.addEventListener("click", () => deleteReminder(reminder.id));

      item.append(text, remove);
      list.append(item);
    });
}

async function checkReminders() {
  const now = Date.now();
  let changed = false;

  for (const reminder of data.reminders) {
    if (!reminder.notified && reminder.time <= now) {
      reminder.notified = true;
      changed = true;

      await sendNotification(
        "EVERYDAY — Przypomnienie",
        reminder.title
      );
    }
  }

  if (changed) {
    saveData();
    render();
  }
}

setInterval(checkReminders, 5000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkReminders();
});

// ================================
// NOTATKI
// ================================

$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#noteTitle").value.trim();
  const content = $("#noteContent").value.trim();

  if (!title || !content) {
    showToast("Wpisz tytuł i treść notatki.");
    return;
  }

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

  if (!data.notes.length) {
    list.textContent = "Nie masz jeszcze żadnych notatek.";
    return;
  }

  [...data.notes]
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach(note => {
      const card = document.createElement("article");
      card.className = "note-card";

      const title = document.createElement("h3");
      title.textContent = note.title;

      const content = document.createElement("p");
      content.textContent = note.content;

      const remove = document.createElement("button");
      remove.className = "delete-button";
      remove.type = "button";
      remove.textContent = "Usuń notatkę";
      remove.addEventListener("click", () => deleteNote(note.id));

      card.append(title, content, remove);
      list.append(card);
    });
}

// ================================
// INSTALACJA PWA
// ================================

const installNotice = $("#browserInstallNotice");
const installButton = $("#installButton");

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function updateInstallNotice() {
  if (installNotice) {
    installNotice.hidden = isStandalone();
  }
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
});

installButton.addEventListener("click", async () => {
  if (isStandalone()) return;

  if (installPrompt) {
    installPrompt.prompt();

    const result = await installPrompt.userChoice;
    installPrompt = null;

    if (result.outcome === "accepted") {
      showToast("EVERYDAY zostało zainstalowane!");
    } else {
      showToast("Instalacja została anulowana.");
    }

    updateInstallNotice();
  } else {
    showToast("Chrome: menu ⋮ → Zainstaluj aplikację.");
  }
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  updateInstallNotice();
});

updateInstallNotice();

// ================================
// SERVICE WORKER
// ================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("EVERYDAY: Service Worker działa."))
      .catch(error => console.error("Service Worker:", error));
  });
}

// ================================
// START APLIKACJI
// ================================

loadData();
render();
checkReminders();
