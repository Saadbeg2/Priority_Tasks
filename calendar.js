const STORAGE_KEY = "priority_tasks_v1";

const taskNameEl = document.getElementById("calendar-task-name");
const formEl = document.getElementById("calendar-form");
const errorEl = document.getElementById("calendar-error");
const dateEl = document.getElementById("event-date");
const timeEl = document.getElementById("event-time");
const durationEl = document.getElementById("event-duration");

const params = new URLSearchParams(window.location.search);
const taskId = params.get("task");

let tasks = loadTasks();
let task = tasks.find(t => t.id === taskId);

initialize();

function initialize() {
    if (!taskId || !task) {
        showError("Task not found. Go back and pick an Extremely High task.");
        formEl.style.display = "none";
        taskNameEl.textContent = "";
        return;
    }

    if (task.priority !== 4) {
        showError("Calendar setup is available only for Extremely High tasks.");
        formEl.style.display = "none";
        taskNameEl.textContent = task.title;
        return;
    }

    taskNameEl.textContent = `Task: ${task.title}`;

    if (task.finishBy) dateEl.value = task.finishBy;
    if (task.calendarTime) timeEl.value = task.calendarTime;
    if (Number.isFinite(Number(task.durationMin)) && Number(task.durationMin) > 0) {
        durationEl.value = String(Math.round(Number(task.durationMin)));
    }
}

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map(t => ({
            ...t,
            finishBy: t.finishBy || t.dueDate || null,
            durationMin: Number.isFinite(Number(t.durationMin)) ? Number(t.durationMin) : null,
            calendarTime: typeof t.calendarTime === "string" ? t.calendarTime : null
        }));
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function normalizeDuration(value) {
    const next = Number(value);
    return Number.isFinite(next) && next > 0 ? Math.round(next) : null;
}

function showError(message) {
    errorEl.textContent = message;
}

function clearError() {
    errorEl.textContent = "";
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

function downloadCalendarEvent(currentTask, dateValue, timeValue, durationValue) {
    const start = new Date(`${dateValue}T${timeValue}:00`);
    if (Number.isNaN(start.getTime())) {
        showError("Invalid date/time.");
        return;
    }

    const end = new Date(start.getTime() + durationValue * 60 * 1000);
    const now = new Date();
    const uidValue = `${currentTask.id}@prioritytasks.local`;

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
        `SUMMARY:${escapeIcsText(currentTask.title)}`,
        "DESCRIPTION:Created from Priority Tasks",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = currentTask.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "task";
    a.href = url;
    a.download = `${safeTitle}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!task) return;

    clearError();

    const dateValue = dateEl.value;
    const timeValue = timeEl.value;
    const durationValue = normalizeDuration(durationEl.value);

    if (!dateValue) {
        showError("Please select a date.");
        return;
    }

    if (!timeValue) {
        showError("Please select a time.");
        return;
    }

    if (durationValue === null) {
        showError("Please enter a valid duration in minutes.");
        return;
    }

    tasks = tasks.map(t => {
        if (t.id !== task.id) return t;
        return {
            ...t,
            finishBy: dateValue,
            calendarTime: timeValue,
            durationMin: durationValue
        };
    });
    saveTasks();

    task = tasks.find(t => t.id === task.id) || task;
    downloadCalendarEvent(task, dateValue, timeValue, durationValue);
});
