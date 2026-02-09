const STORAGE_KEY = "priority_tasks_v1";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const prioritySelect = document.getElementById("task-priority");
const finishByWrap = document.getElementById("task-finish-wrap");
const finishByInput = document.getElementById("task-finish-by");
const durationWrap = document.getElementById("task-duration-wrap");
const durationInput = document.getElementById("task-duration");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const sortEl = document.getElementById("sort");
const clearCompletedBtn = document.getElementById("clear-completed");

const tabActive = document.getElementById("tab-active");
const tabCompleted = document.getElementById("tab-completed");

let view = "active"; // "active" | "completed"
let tasks = loadTasks();

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
            finishBy: t.finishBy || t.dueDate || null,
            durationMin: Number.isFinite(Number(t.durationMin)) ? Number(t.durationMin) : null
        }));
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function priorityLabel(p) {
    if (p === 4) return { text: "Extremely High", cls: "p-xhigh" };
    if (p === 3) return { text: "High", cls: "p-high" };
    if (p === 2) return { text: "Medium", cls: "p-med" };
    return { text: "Low", cls: "p-low" };
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
    return [...list].sort(byPriorityDesc); // default: priority_desc
}

function visibleTasks() {
    const base = tasks.filter(t => view === "active" ? !t.completedAt : !!t.completedAt);
    return sortTasks(base);
}

function render() {
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
    if (extreme.length && regular.length) {
        ordered.push({ __divider: true });
    }
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

        const tags = document.createElement("div");
        tags.className = "tags";

        const pill = document.createElement("span");
        const { text, cls } = priorityLabel(t.priority);
        pill.className = `pill ${cls}`;
        pill.textContent = text;

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

        tags.appendChild(pill);
        tags.appendChild(time);

        if (t.priority === 4) {
            const finish = document.createElement("span");
            finish.className = "due-pill";
            if (t.finishBy) {
                const finishDate = new Date(`${t.finishBy}T00:00:00`);
                finish.textContent = `Finish by ${finishDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
            } else {
                finish.textContent = "No finish date";
            }
            tags.appendChild(finish);

            const durationTag = document.createElement("span");
            durationTag.className = "due-pill";
            durationTag.textContent = t.durationMin ? `${t.durationMin} min` : "No duration";
            tags.appendChild(durationTag);

            const finishEdit = document.createElement("input");
            finishEdit.className = "due-edit";
            finishEdit.type = "date";
            finishEdit.value = t.finishBy || "";
            finishEdit.setAttribute("aria-label", `Set finish date for ${t.title}`);
            finishEdit.onchange = () => updateExtremeFields(t.id, {
                finishBy: finishEdit.value || null,
                durationMin: t.durationMin || null
            });
            tags.appendChild(finishEdit);

            const durationEdit = document.createElement("input");
            durationEdit.className = "due-edit due-duration";
            durationEdit.type = "number";
            durationEdit.min = "15";
            durationEdit.step = "15";
            durationEdit.placeholder = "Min";
            durationEdit.value = t.durationMin ? String(t.durationMin) : "";
            durationEdit.setAttribute("aria-label", `Set duration in minutes for ${t.title}`);
            durationEdit.onchange = () => {
                const next = Number(durationEdit.value);
                updateExtremeFields(t.id, {
                    finishBy: t.finishBy || null,
                    durationMin: Number.isFinite(next) && next > 0 ? next : null
                });
            };
            tags.appendChild(durationEdit);
        }

        tags.appendChild(priorityEdit);

        left.appendChild(title);
        left.appendChild(tags);

        const actions = document.createElement("div");
        actions.className = "actions";

        // Complete/Restore
        const toggle = document.createElement("div");
        toggle.className = "icon";
        toggle.title = t.completedAt ? "Restore" : "Mark complete";
        toggle.textContent = t.completedAt ? "↩️" : "✅";
        toggle.onclick = () => toggleComplete(t.id);

        // Delete
        const del = document.createElement("div");
        del.className = "icon";
        del.title = "Delete";
        del.textContent = "🗑️";
        del.onclick = () => deleteTask(t.id);

        if (t.priority === 4) {
            const cal = document.createElement("div");
            cal.className = "icon";
            cal.title = "Add to Calendar (.ics)";
            cal.textContent = "📅";
            cal.onclick = () => downloadCalendarEvent(t);
            actions.appendChild(cal);
        }

        actions.appendChild(toggle);
        actions.appendChild(del);

        li.appendChild(left);
        li.appendChild(actions);
        listEl.appendChild(li);
    }
}

function updatePriority(id, nextPriority) {
    tasks = tasks.map(t => {
        if (t.id !== id) return t;
        if (nextPriority === 4) return { ...t, priority: nextPriority };
        return { ...t, priority: nextPriority, finishBy: null, durationMin: null, dueDate: null };
    });
    saveTasks();
    render();
}

function updateExtremeFields(id, next) {
    tasks = tasks.map(t => {
        if (t.id !== id) return t;
        return { ...t, finishBy: next.finishBy, durationMin: next.durationMin };
    });
    saveTasks();
    render();
}

function addTask(title, priority, finishBy, durationMin) {
    const now = Date.now();
    const hasDuration = Number.isFinite(durationMin) && durationMin > 0;
    tasks.unshift({
        id: uid(),
        title,
        priority,
        createdAt: now,
        completedAt: null,
        finishBy: priority === 4 ? (finishBy || null) : null,
        durationMin: priority === 4 && hasDuration ? durationMin : null
    });
    saveTasks();
    render();
}

function icsDateFromLocal(dateObj) {
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getUTCDate()).padStart(2, "0");
    const hh = String(dateObj.getUTCHours()).padStart(2, "0");
    const mm = String(dateObj.getUTCMinutes()).padStart(2, "0");
    const ss = String(dateObj.getUTCSeconds()).padStart(2, "0");
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function escapeIcsText(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
}

function downloadCalendarEvent(task) {
    if (!task.finishBy || !task.durationMin) {
        alert("Set finish date and duration first.");
        return;
    }

    const start = new Date(`${task.finishBy}T09:00:00`);
    if (Number.isNaN(start.getTime())) {
        alert("Invalid finish date.");
        return;
    }
    const end = new Date(start.getTime() + task.durationMin * 60 * 1000);
    const now = new Date();
    const uidValue = `${task.id}@prioritytasks.local`;

    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Priority Tasks//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${uidValue}`,
        `DTSTAMP:${icsDateFromLocal(now)}`,
        `DTSTART:${icsDateFromLocal(start)}`,
        `DTEND:${icsDateFromLocal(end)}`,
        `SUMMARY:${escapeIcsText(task.title)}`,
        "DESCRIPTION:Created from Priority Tasks",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "task";
    a.href = url;
    a.download = `${safeTitle}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

function syncExtremeFieldsVisibility() {
    const isExtreme = Number(prioritySelect.value) === 4;
    finishByWrap.classList.toggle("is-hidden", !isExtreme);
    durationWrap.classList.toggle("is-hidden", !isExtreme);
    finishByInput.required = isExtreme;
    durationInput.required = isExtreme;
}

/* Events */
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const priority = Number(prioritySelect.value);
    const finishBy = finishByInput.value;
    const durationMin = Number(durationInput.value);
    if (priority === 4 && (!finishBy || !Number.isFinite(durationMin) || durationMin <= 0)) return;
    if (!title) return;
    addTask(title, priority, finishBy, durationMin);
    titleInput.value = "";
    finishByInput.value = "";
    durationInput.value = "";
    syncExtremeFieldsVisibility();
    titleInput.focus();
});

prioritySelect.addEventListener("change", syncExtremeFieldsVisibility);
sortEl.addEventListener("change", render);
clearCompletedBtn.addEventListener("click", clearCompleted);

tabActive.addEventListener("click", () => setView("active"));
tabCompleted.addEventListener("click", () => setView("completed"));

/* Initial */
syncExtremeFieldsVisibility();
render();
