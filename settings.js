const SETTINGS_KEY = "priority_tasks_settings_v1";

const formEl = document.getElementById("settings-form");
const msgEl = document.getElementById("settings-msg");

const controls = {
    lowMedium: {
        toggle: document.getElementById("auto-low-medium"),
        hours: document.getElementById("hours-low-medium")
    },
    mediumHigh: {
        toggle: document.getElementById("auto-medium-high"),
        hours: document.getElementById("hours-medium-high")
    },
    highExtreme: {
        toggle: document.getElementById("auto-high-xhigh"),
        hours: document.getElementById("hours-high-xhigh")
    }
};

const defaults = {
    transitions: {
        lowMedium: { enabled: false, hours: 24 },
        mediumHigh: { enabled: false, hours: 24 },
        highExtreme: { enabled: false, hours: 24 }
    }
};

initialize();

function toPositiveHours(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};

        const oldEnabled = Boolean(parsed?.autoEscalateToHigh);
        const oldHours = toPositiveHours(parsed?.escalateAfterHours, 24);

        const t = parsed?.transitions || {};
        return {
            transitions: {
                lowMedium: {
                    enabled: Boolean(t?.lowMedium?.enabled),
                    hours: toPositiveHours(t?.lowMedium?.hours, 24)
                },
                mediumHigh: {
                    enabled: oldEnabled || Boolean(t?.mediumHigh?.enabled),
                    hours: toPositiveHours(t?.mediumHigh?.hours, oldHours)
                },
                highExtreme: {
                    enabled: Boolean(t?.highExtreme?.enabled),
                    hours: toPositiveHours(t?.highExtreme?.hours, 24)
                }
            }
        };
    } catch {
        return defaults;
    }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function syncDisabledState() {
    Object.values(controls).forEach(({ toggle, hours }) => {
        hours.disabled = !toggle.checked;
    });
}

function initialize() {
    const settings = loadSettings();

    controls.lowMedium.toggle.checked = settings.transitions.lowMedium.enabled;
    controls.lowMedium.hours.value = String(settings.transitions.lowMedium.hours);

    controls.mediumHigh.toggle.checked = settings.transitions.mediumHigh.enabled;
    controls.mediumHigh.hours.value = String(settings.transitions.mediumHigh.hours);

    controls.highExtreme.toggle.checked = settings.transitions.highExtreme.enabled;
    controls.highExtreme.hours.value = String(settings.transitions.highExtreme.hours);

    syncDisabledState();
}

Object.values(controls).forEach(({ toggle }) => {
    toggle.addEventListener("change", syncDisabledState);
});

formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    msgEl.textContent = "";

    const settings = {
        transitions: {
            lowMedium: {
                enabled: controls.lowMedium.toggle.checked,
                hours: toPositiveHours(controls.lowMedium.hours.value, 24)
            },
            mediumHigh: {
                enabled: controls.mediumHigh.toggle.checked,
                hours: toPositiveHours(controls.mediumHigh.hours.value, 24)
            },
            highExtreme: {
                enabled: controls.highExtreme.toggle.checked,
                hours: toPositiveHours(controls.highExtreme.hours.value, 24)
            }
        }
    };

    const invalid = Object.entries(controls).some(([key, pair]) => {
        if (!pair.toggle.checked) return false;
        const value = Number(pair.hours.value);
        if (Number.isFinite(value) && value > 0) return false;
        const label = key === "lowMedium"
            ? "Low → Medium"
            : key === "mediumHigh"
                ? "Medium → High"
                : "High → Extremely High";
        msgEl.textContent = `Please enter a valid hour value for ${label}.`;
        return true;
    });

    if (invalid) return;

    saveSettings(settings);
    msgEl.textContent = "Settings saved.";
});
