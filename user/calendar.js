import { db } from "../firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const myPhone = localStorage.getItem("ff_phone");
    if (!myPhone) {
        window.location.replace("../auth/login.html");
        return;
    }

    const grid = document.getElementById("calendarGrid");
    const monthTitle = document.getElementById("monthYear");

    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth(); // 0-11
    const todayNum = date.getDate();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Calculate days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Setup day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let gridHTML = '';
    dayNames.forEach(day => {
        gridHTML += `<div class="day-name">${day}</div>`;
    });

    // Add empty slots for first day offset
    for (let i = 0; i < firstDay; i++) {
        gridHTML += `<div class="calendar-day empty"></div>`;
    }

    // Add days
    for (let i = 1; i <= daysInMonth; i++) {
        gridHTML += `<div class="calendar-day" id="day-${i}">${i}</div>`;
    }

    grid.innerHTML = gridHTML;

    try {
        // Fetch votes for this month
        const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const votesRef = collection(db, "votes");
        const q = query(votesRef, where("phone", "==", myPhone));
        const snapshot = await getDocs(q);

        const votedDays = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const dateStr = data.date; // "YYYY-MM-DD"
            if (dateStr && dateStr.startsWith(prefix)) {
                const dayStr = dateStr.split("-")[2];
                votedDays.add(parseInt(dayStr, 10));
            }
        });

        // Apply colors
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.getElementById(`day-${i}`);
            if (!dayEl) continue;

            if (i < todayNum) {
                // Past days
                if (votedDays.has(i)) {
                    dayEl.classList.add("status-completed");
                } else {
                    dayEl.classList.add("status-missing");
                }
            } else if (i === todayNum) {
                // Today
                if (votedDays.has(i)) {
                    dayEl.classList.add("status-completed");
                } else {
                    dayEl.classList.add("status-pending");
                }
            }
            // Future days remain unstyled (default glass look)
        }

    } catch (error) {
        console.error("Error loading calendar data:", error);
    }
});
