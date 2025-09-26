const STORAGE_KEY = 'PrivacyPlannerData';
const PASSWORD_KEY = 'AppMasterPassword'; 

let APP_DATA = {
    todos: [],
    sessions: [],
    notes: "",
    mood: 3
};

// ====================================================================
// I. Kernfunktionen: Speichern und Laden (Synchron)
// ====================================================================

const APP = {
    // Einfache Hash-Funktion (nur zum Vergleichen des Passworts)
    hashPassword: function(password) {
        let hash = 0;
        if (password.length === 0) return hash;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; 
        }
        return hash.toString();
    },

    saveData: function() {
        // Speichert APP_DATA unverschlüsselt
        localStorage.setItem(STORAGE_KEY, JSON.stringify(APP_DATA));
        document.getElementById('save-button').textContent = "✅ Gespeichert!";
        setTimeout(() => document.getElementById('save-button').textContent = "💾 Speichern", 2000);
    },

    loadData: function() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            APP_DATA = JSON.parse(data);
        } else {
            APP_DATA = { todos: [], sessions: [], notes: "", mood: 3 }; 
        }
        APP.renderAll();
    },

    initApp: function() {
        const password = document.getElementById('master-password').value;
        const storedHash = localStorage.getItem(PASSWORD_KEY);
        const inputHash = APP.hashPassword(password);
        
        if (!password) { alert("Bitte ein Passwort eingeben."); return; }

        if (!storedHash) {
            // ERSTER START: Passwort festlegen
            localStorage.setItem(PASSWORD_KEY, inputHash);
            APP.saveData(); 
            alert("Passwort festgelegt. Daten werden lokal gespeichert.");
        } else if (storedHash !== inputHash) {
            // FALSCHES PASSWORT
            document.getElementById('password-info').textContent = "Falsches Passwort! Bitte erneut versuchen.";
            return;
        }

        // Erfolg: Daten laden und UI anzeigen
        APP.loadData();
        document.getElementById('password-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'grid';
    },
    
    toggleMode: function() {
        const body = document.body;
        body.classList.toggle('dark-mode');
        body.classList.toggle('light-mode');
        document.getElementById('mode-toggle').textContent = body.classList.contains('dark-mode') ? "🌙" : "☀️";
    },

    renderAll: function() {
        // To-Dos
        const todoList = document.getElementById('todo-list');
        todoList.innerHTML = APP_DATA.todos.map(t => `
            <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
                <span onclick="TODO.toggleDone(${t.id})">${t.text} ${t.isRecurring ? '🔄' : ''}</span>
                <button onclick="TODO.deleteTask(${t.id})">x</button>
            </div>
        `).join('');
        
        // Timer-Sessions
        const sessionLog = document.getElementById('session-log');
        sessionLog.innerHTML = APP_DATA.sessions.slice(-5).reverse().map(s => {
            const duration = Math.floor(s.durationMs / 1000);
            const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
            const seconds = String(duration % 60).padStart(2, '0');
            return `<li>${s.name}: ${minutes}:${seconds}</li>`;
        }).join('');
        document.getElementById('tracked-time-count').textContent = APP_DATA.sessions.length;

        // Notizen
        document.getElementById('notes-input').value = APP_DATA.notes;

        // Mood-Slider
        const moodSlider = document.getElementById('mood-slider');
        moodSlider.value = APP_DATA.mood;
        moodSlider.dispatchEvent(new Event('input')); 
    }
};

// ====================================================================
// II. Aufgaben (To-Do List), Mood Tracker & Timer
// ====================================================================

const TODO = {
    add: function() {
        const input = document.getElementById('todo-input');
        const text = input.value.trim();
        if (text === "") return;

        const isRecurring = confirm("Soll diese Aufgabe wöchentlich wiederholt werden (🔄)?");

        APP_DATA.todos.push({ id: Date.now(), text: text, done: false, isRecurring: isRecurring });

        input.value = '';
        APP.renderAll();
        APP.saveData();
    },

    toggleDone: function(id) {
        const task = APP_DATA.todos.find(t => t.id === id);
        if (task) {
            task.done = !task.done;
            
            if (task.done && task.isRecurring) {
                APP_DATA.todos.push({ id: Date.now(), text: task.text, done: false, isRecurring: true });
            }
            
            APP.renderAll();
            APP.saveData();
        }
    },

    deleteTask: function(id) {
        APP_DATA.todos = APP_DATA.todos.filter(t => t.id !== id);
        APP.renderAll();
        APP.saveData();
    }
};

const moodSlider = document.getElementById('mood-slider');
moodSlider.addEventListener('input', () => {
    const value = moodSlider.value;
    const moodLabels = ["Sehr schlecht 😠", "Schlecht 🙁", "Neutral 😐", "Gut 🙂", "Sehr gut 😄"];
    document.getElementById('mood-output').textContent = moodLabels[value - 1] + ` (${value}/5)`;
    APP_DATA.mood = value;
});

const TIMER = {
    interval: null,
    startTime: 0,
    elapsedTime: 0,
    isRunning: false,
    
    startStop: function() {
        if (!TIMER.isRunning) {
            TIMER.startTime = Date.now() - TIMER.elapsedTime;
            TIMER.interval = setInterval(TIMER.updateDisplay, 1000);
            TIMER.isRunning = true;
            document.querySelector('.column:nth-child(2) button:nth-child(4)').textContent = 'Stopp';
        } else {
            clearInterval(TIMER.interval);
            TIMER.isRunning = false;
            document.querySelector('.column:nth-child(2) button:nth-child(4)').textContent = 'Weiter';
        }
    },
    
    updateDisplay: function() {
        TIMER.elapsedTime = Date.now() - TIMER.startTime;
        const totalSeconds = Math.floor(TIMER.elapsedTime / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        document.getElementById('timer-display').textContent = `${hours}:${minutes}:${seconds}`;
    },

    saveSession: function() {
        if (TIMER.elapsedTime === 0) return;
        
        const name = document.getElementById('timer-name').value.trim();
        if (name === "") { alert("Bitte geben Sie einen Titel für die Session ein."); return; }

        clearInterval(TIMER.interval);
        
        APP_DATA.sessions.push({ name: name, durationMs: TIMER.elapsedTime });

        TIMER.elapsedTime = 0;
        TIMER.isRunning = false;
        document.getElementById('timer-name').value = '';
        document.getElementById('timer-display').textContent = "00:00:00";
        document.querySelector('.column:nth-child(2) button:nth-child(4)').textContent = 'Start';
        
        APP.renderAll();
        APP.saveData();
    }
};

window.addEventListener('beforeunload', () => {
    APP.saveData(); 
});
