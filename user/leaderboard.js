import { db } from "../firebase.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const myPhone = localStorage.getItem("ff_phone");
    if (!myPhone) {
        window.location.replace("../auth/login.html");
        return;
    }

    const leaderboardList = document.getElementById("leaderboardList");

    try {
        const usersRef = collection(db, "users");
        // Get all users ordered by points descending
        const q = query(usersRef, orderBy("points", "desc"));
        const snapshot = await getDocs(q);

        leaderboardList.innerHTML = "";

        if (snapshot.empty) {
            leaderboardList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No users found.</div>`;
            return;
        }

        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const points = data.points || 0;
            const name = data.name || "Unknown User";
            const isMe = data.phone === myPhone;
            const initial = name.charAt(0).toUpperCase();
            
            const card = document.createElement("div");
            card.className = `rank-card glass-panel rank-${rank} ${isMe ? 'my-rank' : ''}`;
            
            card.innerHTML = `
                <div class="rank-number">#${rank}</div>
                <div class="rank-avatar">${initial}</div>
                <div class="rank-info">
                    <div class="rank-name">${name} ${isMe ? '(You)' : ''}</div>
                </div>
                <div class="rank-points">${points} pts</div>
            `;
            
            leaderboardList.appendChild(card);
            rank++;
        });

    } catch (e) {
        console.error("Error loading leaderboard:", e);
        leaderboardList.innerHTML = `<div style="color:var(--error); text-align:center; padding: 20px;">Failed to load leaderboard.</div>`;
    }
});
