const STORAGE_KEY = "priority_tasks_v1";
const SETTINGS_KEY = "priority_tasks_settings_v1";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const notesInput = document.getElementById("task-notes");
const prioritySelect = document.getElementById("task-priority");
const addToggleBtn = document.getElementById("add-toggle");
const addPanel = document.getElementById("add-panel");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const sortEl = document.getElementById("sort");
const clearCompletedBtn = document.getElementById("clear-completed");

const tabActive = document.getElementById("tab-active");
const tabCompleted = document.getElementById("tab-completed");

let view = "active"; // "active" | "completed"
let tasks = loadTasks();
let settings = loadSettings();

function uid() {
    return crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2);
}

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map(t => ({
            ...t,
            notes: typeof t.notes === "string" ? t.notes : "",
            finishBy: t.finishBy || t.dueDate || null,
            durationMin: Number.isFinite(Number(t.durationMin)) ? Number(t.durationMin) : null,
            calendarTime: typeof t.calendarTime === "string" ? t.calendarTime : null,
            priorityUpdatedAt: Number.isFinite(Number(t.priorityUpdatedAt))
                ? Number(t.priorityUpdatedAt)
                : Number(t.createdAt) || Date.now()
        }));
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadSettings() {
    const defaults = {
        transitions: {
            lowMedium: { enabled: false, hours: 24 },
            mediumHigh: { enabled: false, hours: 24 },
            highExtreme: { enabled: false, hours: 24 }
        }
    };
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const toHours = (value, fallback) => {
            const n = Number(value);
            return Number.isFinite(n) && n > 0 ? n : fallback;
        };
        const t = parsed?.transitions || {};
        const oldEnabled = Boolean(parsed?.autoEscalateToHigh);
        const oldHours = toHours(parsed?.escalateAfterHours, 24);
        return {
            transitions: {
                lowMedium: {
                    enabled: Boolean(t?.lowMedium?.enabled),
                    hours: toHours(t?.lowMedium?.hours, defaults.transitions.lowMedium.hours)
                },
                mediumHigh: {
                    enabled: oldEnabled || Boolean(t?.mediumHigh?.enabled),
                    hours: toHours(t?.mediumHigh?.hours, oldHours)
                },
                highExtreme: {
                    enabled: Boolean(t?.highExtreme?.enabled),
                    hours: toHours(t?.highExtreme?.hours, defaults.transitions.highExtreme.hours)
                }
            }
        };
    } catch {
        return defaults;
    }
}

function runAutoEscalation() {
    settings = loadSettings();
    const rules = settings.transitions;
    if (!rules) return false;
    const now = Date.now();
    let changed = false;

    tasks = tasks.map(t => {
        if (t.completedAt) return t;
        const inPriorityMs = now - (Number(t.priorityUpdatedAt) || Number(t.createdAt) || now);

        if (t.priority === 1 && rules.lowMedium.enabled) {
            const threshold = rules.lowMedium.hours * 60 * 60 * 1000;
            if (inPriorityMs >= threshold) {
                changed = true;
                return { ...t, priority: 2, priorityUpdatedAt: now };
            }
        }

        if (t.priority === 2 && rules.mediumHigh.enabled) {
            const threshold = rules.mediumHigh.hours * 60 * 60 * 1000;
            if (inPriorityMs >= threshold) {
                changed = true;
                return { ...t, priority: 3, priorityUpdatedAt: now };
            }
        }

        if (t.priority === 3 && rules.highExtreme.enabled) {
            const threshold = rules.highExtreme.hours * 60 * 60 * 1000;
            if (inPriorityMs >= threshold) {
                changed = true;
                return { ...t, priority: 4, priorityUpdatedAt: now };
            }
        }

        return t;
    });

    return changed;
}

function setAddPanelOpen(open) {
    addPanel.classList.toggle("collapsed", !open);
    addToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    addToggleBtn.textContent = open ? "Close" : "Add Task";
}

function sortTasks(list) {
    const mode = sortEl.value;

    const byCreatedAsc = (a, b) => a.createdAt - b.createdAt;
    const byCreatedDesc = (a, b) => b.createdAt - a.createdAt;
    const byPriorityDesc = (a, b) => (b.priority - a.priority) || byCreatedDesc(a, b);
    const byPriorityAsc = (a, b) => (a.priority - b.priority) || byCreatedDesc(a, b);

    if (mode === "newest") return [...list].sort(byCreatedDesc);
    if (mode === "oldest") return [...list].sort(byCreatedAsc);
    if (mode === "priority_asc") return [...list].sort(byPriorityAsc);
    return [...list].sort(byPriorityDesc);
}

function visibleTasks() {
    const base = tasks.filter(t => view === "active" ? !t.completedAt : !!t.completedAt);
    return sortTasks(base);
}

function render() {
    if (runAutoEscalation()) {
        saveTasks();
    }

    const data = visibleTasks();
    listEl.innerHTML = "";

    emptyEl.style.display = data.length ? "none" : "block";

    const activeCount = tasks.filter(t => !t.completedAt).length;
    const completedCount = tasks.filter(t => !!t.completedAt).length;
    countEl.textContent = view === "active"
        ? `${activeCount} active`
        : `${completedCount} completed`;

    clearCompletedBtn.style.display = completedCount ? "inline-flex" : "none";

    const extreme = data.filter(t => t.priority === 4);
    const regular = data.filter(t => t.priority !== 4);

    const ordered = [...extreme];
    if (extreme.length && regular.length) ordered.push({ __divider: true });
    ordered.push(...regular);

    for (const t of ordered) {
        if (t.__divider) {
            const divider = document.createElement("li");
            divider.className = "section-divider";
            divider.textContent = "Other tasks";
            listEl.appendChild(divider);
            continue;
        }

        const li = document.createElement("li");
        li.className = "item" + (t.completedAt ? " done" : "");

        const left = document.createElement("div");
        left.className = "left";

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = t.title;
        title.title = t.title;

        const tags = document.createElement("div");
        tags.className = "tags";

        const time = document.createElement("span");
        const d = new Date(t.createdAt);
        time.textContent = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

        const priorityEdit = document.createElement("select");
        priorityEdit.className = "priority-edit";
        priorityEdit.setAttribute("aria-label", `Change priority for ${t.title}`);
        priorityEdit.innerHTML = `
            <option value="4">Extremely High</option>
            <option value="3">High</option>
            <option value="2">Medium</option>
            <option value="1">Low</option>
        `;
        priorityEdit.value = String(t.priority);
        priorityEdit.onchange = () => updatePriority(t.id, Number(priorityEdit.value));

        tags.appendChild(priorityEdit);
        tags.appendChild(time);

        const details = document.createElement("div");
        details.className = "details";

        const hasNotes = Boolean(t.notes && t.notes.trim());
        if (hasNotes) {
            const noteBlock = document.createElement("div");
            noteBlock.className = "note-block";
            noteBlock.textContent = t.notes.trim();
            details.appendChild(noteBlock);
        }

        left.appendChild(title);
        left.appendChild(tags);
        left.appendChild(details);

        const actions = document.createElement("div");
        actions.className = "actions";

        if (t.priority === 4) {
            const cal = document.createElement("div");
            cal.className = "icon";
            cal.title = "Open Calendar Setup";
            cal.textContent = "📅";
            cal.onclick = () => {
                window.location.href = `calendar.html?task=${encodeURIComponent(t.id)}`;
            };
            actions.appendChild(cal);
        }

        const toggle = document.createElement("div");
        toggle.className = "icon";
        toggle.title = t.completedAt ? "Restore" : "Mark complete";
        toggle.textContent = t.completedAt ? "↩️" : "✅";
        toggle.onclick = () => toggleComplete(t.id);

        const del = document.createElement("div");
        del.className = "icon";
        del.title = "Delete";
        del.textContent = "🗑️";
        del.onclick = () => deleteTask(t.id);

        actions.appendChild(toggle);
        actions.appendChild(del);

        li.appendChild(left);
        li.appendChild(actions);
        listEl.appendChild(li);

        const isTitleCut = title.scrollWidth > title.clientWidth;
        const shouldShowMore = hasNotes || isTitleCut;
        if (shouldShowMore) {
            const moreBtn = document.createElement("button");
            moreBtn.className = "show-more";
            moreBtn.type = "button";
            moreBtn.textContent = "Show more";
            let expanded = false;
            moreBtn.onclick = () => {
                expanded = !expanded;
                li.classList.toggle("expanded", expanded);
                moreBtn.textContent = expanded ? "Show less" : "Show more";
            };
            left.appendChild(moreBtn);
        } else {
            details.remove();
        }
    }
}

function addTask(title, priority, notes) {
    const now = Date.now();
    tasks.unshift({
        id: uid(),
        title,
        notes,
        priority,
        createdAt: now,
        priorityUpdatedAt: now,
        completedAt: null,
        finishBy: null,
        durationMin: null,
        calendarTime: null
    });
    saveTasks();
    render();
}

function updatePriority(id, nextPriority) {
    tasks = tasks.map(t => {
        if (t.id !== id) return t;
        const base = {
            ...t,
            priority: nextPriority,
            priorityUpdatedAt: Date.now()
        };
        if (nextPriority === 4) return base;
        return { ...base, finishBy: null, durationMin: null, calendarTime: null, dueDate: null };
    });
    saveTasks();
    render();
}

function toggleComplete(id) {
    tasks = tasks.map(t => {
        if (t.id !== id) return t;
        return { ...t, completedAt: t.completedAt ? null : Date.now() };
    });
    saveTasks();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
}

function clearCompleted() {
    tasks = tasks.filter(t => !t.completedAt);
    saveTasks();
    render();
}

function setView(next) {
    view = next;
    tabActive.classList.toggle("active", view === "active");
    tabCompleted.classList.toggle("active", view === "completed");
    render();
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const notes = notesInput.value.trim();
    const priority = Number(prioritySelect.value);
    if (!title) return;
    addTask(title, priority, notes);
    titleInput.value = "";
    notesInput.value = "";
    setAddPanelOpen(false);
    titleInput.focus();
});

addToggleBtn.addEventListener("click", () => {
    const nextOpen = addPanel.classList.contains("collapsed");
    setAddPanelOpen(nextOpen);
    if (nextOpen) {
        titleInput.focus();
    }
});

sortEl.addEventListener("change", render);
clearCompletedBtn.addEventListener("click", clearCompleted);

tabActive.addEventListener("click", () => setView("active"));
tabCompleted.addEventListener("click", () => setView("completed"));

setAddPanelOpen(false);
render();
