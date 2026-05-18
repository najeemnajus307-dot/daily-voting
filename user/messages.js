import { db } from "../firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const myPhone = localStorage.getItem("ff_phone");
    if (!myPhone) {
        window.location.replace("../auth/login.html");
        return;
    }

    const feedContainer = document.getElementById("feedContainer");

    try {
        const msgsRef = collection(db, "messages");
        const q = query(msgsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);

        feedContainer.innerHTML = "";

        if (snapshot.empty) {
            feedContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No new messages.</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const text = data.text || "";
            const dateStr = data.date || "Recently";
            const mediaUrl = data.mediaUrl || null;
            const mediaType = data.mediaType || "image"; // 'image' or 'video'

            let mediaHTML = "";
            if (mediaUrl) {
                if (mediaType === "video") {
                    mediaHTML = `<video src="${mediaUrl}" class="post-video" controls></video>`;
                } else {
                    mediaHTML = `<img src="${mediaUrl}" class="post-media" alt="Attachment">`;
                }
            }

            const card = document.createElement("div");
            card.className = "post-card glass-panel";
            card.innerHTML = `
                <div class="post-header">
                    <div class="admin-avatar">A</div>
                    <div class="post-meta">
                        <h3>Admin</h3>
                        <div class="post-date">${dateStr}</div>
                    </div>
                </div>
                <div class="post-content">${text}</div>
                ${mediaHTML}
            `;
            feedContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading messages:", error);
        feedContainer.innerHTML = `<div style="color:var(--error); text-align:center; padding: 20px;">Failed to load messages.</div>`;
    }
});
