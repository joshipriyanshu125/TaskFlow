# Building Core Functionality

## 1. Defining Core Functionality

**Core Functionality** represents the indispensable engine of an application—the foundational data models, business rules, state transitions, and primary user interactions without which the product cannot fulfill its primary purpose.

Before investing time into animations, complex theme engines, or aesthetic polish, the core business logic must be fully functional, reliable, and decoupled from cosmetic elements.

---

## 2. Core Architecture: Separation of Concerns

A robust web application separates concerns into discrete architectural layers:

```
┌────────────────────────────────────────────────────────┐
│               1. Presentation Layer (UI)               │
│         (HTML Elements, CSS, Event Listeners)          │
└──────────────────────────┬─────────────────────────────┘
                           │ Dispatches User Actions
                           ▼
┌────────────────────────────────────────────────────────┐
│             2. State & Business Logic Layer            │
│         (CRUD Operations, State Stores, Filters)       │
└──────────────────────────┬─────────────────────────────┘
                           │ Requests / Persists Data
                           ▼
┌────────────────────────────────────────────────────────┐
│             3. Data & Service Access Layer             │
│    (REST API Fetch Clients, LocalStorage, Utilities)   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Implementation Blueprint

### Step 1: Model the Data Schema
Design clear, unambiguous structures for application entities before writing logic.

```javascript
/**
 * @typedef {Object} Task
 * @property {string} id - Unique identifier (e.g., UUID or timestamp)
 * @property {string} title - Task title / summary
 * @property {string} description - Detailed task description
 * @property {'low' | 'medium' | 'high'} priority - Priority level
 * @property {string} dueDate - ISO date string
 * @property {boolean} isCompleted - Completion status flag
 * @property {number} createdAt - Creation timestamp
 */
```

---

### Step 2: Implement Pure Business & State Logic
Write decoupled functions that manage state changes predictably without touching the DOM directly.

```javascript
// State container (Single Source of Truth)
let appState = {
  tasks: [],
  filter: 'all' // 'all' | 'active' | 'completed'
};

// Pure CRUD Helper Functions
function createTask(title, description = '', priority = 'medium', dueDate = '') {
  return {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    title: title.trim(),
    description: description.trim(),
    priority,
    dueDate,
    isCompleted: false,
    createdAt: Date.now()
  };
}

function addTask(state, newTask) {
  return {
    ...state,
    tasks: [newTask, ...state.tasks]
  };
}

function toggleTaskStatus(state, taskId) {
  return {
    ...state,
    tasks: state.tasks.map(task => 
      task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
    )
  };
}

function deleteTask(state, taskId) {
  return {
    ...state,
    tasks: state.tasks.filter(task => task.id !== taskId)
  };
}
```

---

### Step 3: Implement Asynchronous Service & API Handlers
For API-driven applications (e.g., Weather Dashboard), encapsulate network communication with robust error handling.

```javascript
/**
 * Weather Service Module
 */
const WeatherService = {
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  API_KEY: 'YOUR_API_KEY_HERE',

  async fetchCurrentWeather(city) {
    if (!city || typeof city !== 'string') {
      throw new Error('Please provide a valid city name.');
    }

    const endpoint = `${this.BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${this.API_KEY}`;
    
    try {
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`City "${city}" not found. Please verify spelling.`);
        }
        if (response.status === 401) {
          throw new Error('Invalid API key or unauthorized request.');
        }
        throw new Error(`Weather fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      return this.transformWeatherData(data);
    } catch (error) {
      console.error('[WeatherService Error]:', error);
      throw error;
    }
  },

  transformWeatherData(apiPayload) {
    return {
      cityName: apiPayload.name,
      country: apiPayload.sys?.country,
      temperature: Math.round(apiPayload.main.temp),
      feelsLike: Math.round(apiPayload.main.feels_like),
      humidity: apiPayload.main.humidity,
      windSpeed: apiPayload.wind.speed,
      condition: apiPayload.weather[0]?.main,
      description: apiPayload.weather[0]?.description,
      iconUrl: `https://openweathermap.org/img/wn/${apiPayload.weather[0]?.icon}@2x.png`
    };
  }
};
```

---

### Step 4: Add Persistence (LocalStorage Layer)
Store and retrieve state reliably between browser sessions.

```javascript
const StorageManager = {
  STORAGE_KEY: 'icp_task_manager_data',

  save(tasks) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Failed to save state to LocalStorage:', err);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Failed to load state from LocalStorage:', err);
      return [];
    }
  }
};
```

---

### Step 5: Connect State to UI Event Handlers & Rendering
Wire user interactions to state actions and update the DOM reactively.

```javascript
function renderTaskList(tasks, containerElement) {
  if (tasks.length === 0) {
    containerElement.innerHTML = `<div class="empty-state">No tasks available. Add one above!</div>`;
    return;
  }

  containerElement.innerHTML = tasks.map(task => `
    <div class="task-card ${task.isCompleted ? 'completed' : ''}" data-id="${task.id}">
      <input type="checkbox" class="task-toggle" ${task.isCompleted ? 'checked' : ''}>
      <div class="task-content">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <p class="task-desc">${escapeHtml(task.description)}</p>
        <span class="badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
      </div>
      <button class="delete-btn" aria-label="Delete Task">&times;</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
```

---

## 4. Key Checkpoints for Core Functionality Validation

Before progressing to styling and secondary enhancements, verify that:
1. **Core User Flow Operates End-to-End:** Users can successfully create, view, mutate, and delete data without exceptions.
2. **Error Boundaries Hold:** Invalid inputs (empty strings, special characters, network dropouts) trigger clean, user-friendly messages rather than uncaught JavaScript exceptions.
3. **State Persists Correctly:** Reloading the browser page preserves user state faithfully.
4. **Logic is Isolated:** Core functions can be tested independently of CSS layout and DOM styling.
