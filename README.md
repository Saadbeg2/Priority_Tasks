# TaskManager

A lightweight, mobile-first task manager built with pure HTML, CSS, and JavaScript.

## What Was Achieved

- Reworked the UI into a modern dark theme with responsive layout.
- Added priority levels including `Extremely High`.
- Kept core task functionality intact:
  - Add task
  - Sort tasks
  - Active / Completed tabs
  - Mark complete / restore
  - Delete task
  - Clear completed
  - LocalStorage persistence
- Added inline priority editing per task (change between all priority levels).
- Added dedicated top section behavior for `Extremely High` tasks.
- Added calendar integration flow:
  - `📅` action for `Extremely High` tasks
  - Opens a separate calendar setup page
  - Collects `Date`, `Time`, and `Duration`
  - Downloads an `.ics` file for manual add to iCalendar
- Improved mobile behavior and fixed calendar input overflow on phone view.

## Project Structure

- `index.html`  
  Main task app UI.

- `styles.css`  
  Shared styling for task and calendar pages.

- `app.js`  
  Task state management, rendering, priority editing, and calendar-page routing.

- `calendar.html`  
  Dedicated form page for calendar event setup.

- `calendar.js`  
  Calendar form logic, task lookup from localStorage, `.ics` generation/download.

## How Calendar Flow Works

1. Create or update a task to `Extremely High`.
2. Tap/click the `📅` icon on that task.
3. Enter `Date`, `Time`, and `Duration` on the calendar page.
4. Tap `Add to iCalendar` to download the `.ics` file.
5. Open the downloaded `.ics` file and add it to Calendar.

## Tech Notes

- No frameworks, no external libraries, no backend.
- Works as a static GitHub Pages site.
- Data is stored in browser localStorage under key `priority_tasks_v1`.
