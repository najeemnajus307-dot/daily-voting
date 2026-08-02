import { db } from "../firebase.js";
import { collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allUserDocs = [];
let currentUserLevel = "1";
let selectedLevelTab = "1";

document.addEventListener("DOMContentLoaded", async () => {
    const myPhone = localStorage.getItem("userPhone");
    if (!myPhone) {
        window.location.replace("../auth/login.html");
        return;
    }

    const leaderboardList = document.getElementById("leaderboardList");

    try {
        const sysSnap = await getDoc(doc(db, "settings", "system"));
        if (sysSnap.exists() && sysSnap.data().hideLeaderboard === true) {
            leaderboardList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-weight: 600;">🏆 The Leaderboard is currently hidden by the administrator.</div>`;
            return;
        }

        // Fetch my profile level first
        try {
            const myUserSnap = await getDoc(doc(db, "users", myPhone));
            if (myUserSnap.exists()) {
                currentUserLevel = String(myUserSnap.data().level || 1);
                selectedLevelTab = currentUserLevel;
            }
        } catch(e) {
            console.warn("Could not fetch my user level:", e);
        }

        // Highlight tab
        updateTabUI(selectedLevelTab);

        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("points", "desc"));
        const snapshot = await getDocs(q);

        allUserDocs = [];
        snapshot.forEach(d => {
            const data = d.data();
            allUserDocs.push({
                phone: data.phone,
                name: data.name || "Unknown User",
                points: data.points || 0,
                level: String(data.level || 1)
            });
        });

        renderUserLeaderboard(myPhone);

    } catch (e) {
        console.error("Error loading leaderboard:", e);
        leaderboardList.innerHTML = `<div style="color:var(--error); text-align:center; padding: 20px;">Failed to load leaderboard.</div>`;
    }
});

function updateTabUI(lvl) {
    const tab1 = document.getElementById("tabLevel1");
    const tab2 = document.getElementById("tabLevel2");
    if (tab1 && tab2) {
        if (lvl === "1") {
            tab1.style.background = "var(--primary)";
            tab1.style.color = "white";
            tab2.style.background = "transparent";
            tab2.style.color = "var(--text-muted)";
        } else {
            tab2.style.background = "var(--primary)";
            tab2.style.color = "white";
            tab1.style.background = "transparent";
            tab1.style.color = "var(--text-muted)";
        }
    }
}

window.switchUserLeaderboardTab = (lvl) => {
    selectedLevelTab = lvl;
    updateTabUI(lvl);
    const myPhone = localStorage.getItem("userPhone");
    renderUserLeaderboard(myPhone);
};

function renderUserLeaderboard(myPhone) {
    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = "";

    const filtered = allUserDocs.filter(u => u.level === selectedLevelTab);

    if (filtered.length === 0) {
        leaderboardList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">No users found in Level ${selectedLevelTab}.</div>`;
        return;
    }

    let rank = 1;
    filtered.forEach(u => {
        const points = u.points;
        const name = u.name;
        const isMe = String(u.phone) === String(myPhone);
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
}
