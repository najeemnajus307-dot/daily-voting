import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc, doc, updateDoc, orderBy, limit, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const app = initializeApp({
    apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
    authDomain: "daily-voting-793ee.firebaseapp.com",
    projectId: "daily-voting-793ee",
    storageBucket: "daily-voting-793ee.appspot.com",
    messagingSenderId: "1065830068376"
});
const db = getFirestore(app);
const VAPID_KEY = 'BKIGPXFbPybxBpilFawNRuivEOv28HVuj7Yfa9SSw6lZDYXyPQZFr7XqvFcFICwr22TVErvfamU9BNIdAIus_5g';

let messaging = null;
try {
    // Check if messaging is supported in the browser before initializing
    messaging = getMessaging(app);
} catch (err) {
    console.warn("Firebase Messaging is not supported or failed to initialize in this browser:", err);
}

// Register device for FCM push notifications
async function registerFCMToken() {
    try {
        if (!messaging) return;
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const swReg = await navigator.serviceWorker.register('/faith-and-fitnesss/firebase-messaging-sw.js', { scope: '/faith-and-fitnesss/' });
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
        if (!token) return;

        // Save token to Firestore user doc
        const userSnap = await getDocsByPhone('users', phone);
        if (!userSnap.empty) {
            const uDoc = userSnap.docs[0];
            const existing = uDoc.data().fcmTokens || [];
            if (!existing.includes(token)) {
                await updateDoc(uDoc.ref, { fcmTokens: [...existing, token] });
            }
        }
        console.log('FCM token registered ✅');
    } catch (e) {
        console.warn('FCM registration skipped:', e.message);
    }
}

// Show notification when app is OPEN (foreground)
if (messaging) {
    try {
        onMessage(messaging, (payload) => {
            const title = payload.notification?.title || '🕊️ Faith & Fitness';
            const body  = payload.notification?.body  || '';
            if (Notification.permission === 'granted') {
                new Notification(title, { body, icon: '../photo/logo.png' });
            }
        });
    } catch (e) {
        console.warn("FCM onMessage listener could not be registered:", e);
    }
}

// Helper for type-immune queries (matches string or number phone numbers)
async function getDocsByPhone(collectionName, phoneVal, extraQueries = []) {
    let snap = await getDocs(query(collection(db, collectionName), where("phone", "==", String(phoneVal)), ...extraQueries));
    if (snap.empty && !isNaN(phoneVal)) {
        snap = await getDocs(query(collection(db, collectionName), where("phone", "==", Number(phoneVal)), ...extraQueries));
    }
    return snap;
}

const phone = localStorage.getItem("userPhone");
if (!phone) location.replace("../auth/login.html");

// Register Service Worker for Mobile Native Lockscreen/Pull-Down Statusbar Notifications
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js')
        .then(reg => console.log('Service Worker Registered successfully', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
}

const LANG = {
    en: { home: "Home", leaderboard: "Leaderboard", calendar: "Progress", workout: "Workout", settings: "Settings", submitVote: "Submit Vote", topPerformers: "Top Performers", save: "Save Settings", logout: "Logout" },
    ml: { home: "ഹോം", leaderboard: "ലീഡർബോർഡ്", calendar: "കലണ്ടർ", workout: "വർക്ക്ഔട്ട്", settings: "സെറ്റിംഗ്സ്", submitVote: "വോട്ട് സമർപ്പിക്കുക", topPerformers: "മികച്ച പ്രകടകർ", save: "സേവ് ചെയ്യുക", logout: "ലോഗ് ഔട്ട്" }
};

// Global Helpers
// Returns local date as YYYY-MM-DD (avoids UTC timezone shift bugs)
window.localDateStr = (d) => {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
};

window.getVoteDate = () => {
    const now = new Date();
    const hrs = now.getHours();
    const d = new Date(now);
    if (hrs < 12) d.setDate(d.getDate() - 1); // Before Noon is for yesterday
    return localDateStr(d);
};

window.showSection = (id) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const btn = [...document.querySelectorAll('.nav-item')].find(b => b.onclick.toString().includes(id));
    if(btn) btn.classList.add('active');
    
    // Auto Load Data
    if (id === 'homeSection') loadHome();
    if (id === 'leaderboardSection') loadLeaderboard();
    if (id === 'calendarSection') renderCalendar();
    if (id === 'workoutSection') loadWorkouts();
    if (id === 'settingsSection') loadProfileData();
};

window.switchToAdminPanel = () => {
    window.location.href = '../admin/admin.html';
};

// --- WORKOUT LIBRARY ---
window.loadWorkouts = async () => {
    const snap = await getDocs(collection(db, "library"));
    // Filter out inactive items
    const activeDocs = snap.docs.filter(d => d.data().active !== false);
    const cats = [...new Set(activeDocs.map(d => d.data().cat))];
    const catBox = document.getElementById("workoutCats");
    catBox.innerHTML = "";
    
    // Reset view
    document.getElementById("workoutCats").style.display = "grid";
    const itemBox = document.getElementById("workoutItems");
    itemBox.style.display = "none";
    itemBox.innerHTML = "";
    
    const backBtn = document.getElementById("libBackBtn");
    if (backBtn) backBtn.style.display = "none";

    cats.forEach(c => {
        const catDocs = activeDocs.filter(d => d.data().cat === c);
        const firstDoc = catDocs[0];
        
        let coverHtml = `<div style="font-size:2.5rem; margin-bottom:10px;">📂</div>`;
        if (firstDoc) {
            const x = firstDoc.data();
            if (x.type === "video") {
                coverHtml = `<video src="${x.url}" autoplay muted loop playsinline style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-bottom:10px; pointer-events:none;"></video>`;
            } else {
                coverHtml = `<img src="${x.url}" style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-bottom:10px;">`;
            }
        }

        const div = document.createElement("div");
        div.className = "panel animate-fade-in cat-card";
        div.style.cssText = "padding:12px; text-align:center; cursor:pointer; background:white; border: 1px solid var(--border-light); border-radius:16px; transition: all 0.3s; box-shadow: var(--shadow-sm);";
        div.innerHTML = `${coverHtml}<b style="color:var(--primary); font-size:0.9rem;">${c}</b>`;
        
        div.onclick = () => {
            const isActive = div.classList.contains("active-cat");
            
            // Remove active style from all category cards
            document.querySelectorAll(".cat-card").forEach(el => {
                el.classList.remove("active-cat");
                el.style.borderColor = "var(--border-light)";
                el.style.transform = "none";
                el.style.boxShadow = "var(--shadow-sm)";
            });

            if (isActive) {
                // Toggle off
                itemBox.style.display = "none";
                itemBox.innerHTML = "";
            } else {
                // Toggle on
                div.classList.add("active-cat");
                div.style.borderColor = "var(--primary)";
                div.style.transform = "translateY(-4px)";
                div.style.boxShadow = "var(--shadow-md)";
                
                showCategoryItems(c, snap.docs);
            }
        };
        catBox.appendChild(div);
    });
};

window.showWorkoutCats = () => {
    document.getElementById("workoutCats").style.display = "grid";
    document.getElementById("workoutItems").style.display = "none";
    document.getElementById("libBackBtn").style.display = "none";
};

window.closeCategory = () => {
    // Remove active style from all category cards
    document.querySelectorAll(".cat-card").forEach(el => {
        el.classList.remove("active-cat");
        el.style.borderColor = "var(--border-light)";
        el.style.transform = "none";
        el.style.boxShadow = "var(--shadow-sm)";
    });
    
    const itemBox = document.getElementById("workoutItems");
    itemBox.style.display = "none";
    itemBox.innerHTML = "";
    
    // Smooth scroll back to categories top
    document.getElementById("workoutCats").scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.showCategoryItems = (cat, docs) => {
    const itemBox = document.getElementById("workoutItems");
    itemBox.style.display = "block";
    itemBox.innerHTML = "";

    // Filter out inactive items
    const activeDocs = docs.filter(d => d.data().active !== false);
    const filteredDocs = activeDocs.filter(d => d.data().cat === cat);
    
    // Header for expanding section below with a clear Close button
    itemBox.innerHTML = `
        <h3 class="font-serif" style="color: var(--primary); margin: 25px 0 15px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>${cat} Workouts</span>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 0.8rem; font-family: sans-serif; color: var(--text-muted); background: #f1f5f9; padding: 4px 10px; border-radius: 12px;">${filteredDocs.length} items</span>
                <button class="btn-secondary btn-sm" onclick="closeCategory()" style="width: auto; padding: 4px 8px; border-radius: 8px; font-size: 0.8rem; border-color: var(--error); color: var(--error); cursor: pointer;">✕ Close</button>
            </div>
        </h3>
    `;

    filteredDocs.forEach(d => {
        const x = d.data();
        let media = "";
        if (x.type === "video") {
            media = `<video controls autoplay muted loop playsinline style="width:100%; border-radius:12px; margin-bottom:10px; box-shadow: var(--shadow-sm);"><source src="${x.url}" type="video/mp4"></video>`;
        } else {
            media = `<img src="${x.url}" style="width:100%; border-radius:12px; margin-bottom:10px; box-shadow: var(--shadow-sm);">`;
        }
        
        itemBox.innerHTML += `
            <div class="panel animate-fade-in" style="padding:15px; margin-bottom:15px; background:white; border-radius:16px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
                <h4 class="font-serif" style="margin-bottom:10px; color: var(--primary); font-size:1.1rem;">${x.title}</h4>
                ${media}
            </div>`;
    });

    // Smooth scroll down to view workouts list
    setTimeout(() => {
        itemBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

// --- HOME LOGIC ---
async function loadHome() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById("todayDate").textContent = now.toLocaleDateString('en-US', options);

    // Calculate Points from Votes
    let totalPoints = 0;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = localDateStr(sevenDaysAgo); // use local date to avoid UTC shift

    const votesSnap = await getDocsByPhone("votes", phone);
    votesSnap.forEach(d => {
        const v = d.data();
        const pts = Number(v.points || 0);
        totalPoints += pts;
    });

    // Calculate actual weekly rank among all users
    const allUsersSnap = await getDocs(collection(db, "users"));
    const allVotesSnap = await getDocs(collection(db, "votes"));
    
    const weeklyPointsMap = {};
    allVotesSnap.forEach(d => {
        const v = d.data();
        const pts = Number(v.points || 0);
        const date = v.date || "";
        if (date >= sevenDaysAgoStr) {
            weeklyPointsMap[v.phone] = (weeklyPointsMap[v.phone] || 0) + pts;
        }
    });

    const userList = [];
    allUsersSnap.forEach(u => {
        const d = u.data();
        userList.push({
            phone: d.phone,
            weeklyPoints: weeklyPointsMap[d.phone] || 0
        });
    });

    // Sort users by weekly points descending
    userList.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    // Determine logged in user's rank with tie-handling
    let myWeeklyRank = 1;
    let prevPoints = null;
    let actualRank = 1;
    for (let i = 0; i < userList.length; i++) {
        const currentPoints = userList[i].weeklyPoints;
        if (prevPoints !== null && currentPoints < prevPoints) {
            actualRank = i + 1;
        }
        if (String(userList[i].phone) === String(phone)) {
            myWeeklyRank = actualRank;
            break;
        }
        prevPoints = currentPoints;
    }
    
    document.getElementById("userPoints").textContent = totalPoints;
    document.getElementById("statWeeklyRank").textContent = `#${myWeeklyRank}`;

    // Load User Data & Handle Streak
    const userSnap = await getDocsByPhone("users", phone);
    if (!userSnap.empty) {
        const uDoc = userSnap.docs[0];
        const u = uDoc.data();
        document.getElementById("userNameHeader").textContent = u.name || "User";
        document.getElementById("editName").value = u.name || "";

        // Check if user is admin to display Switch to Admin Banner
        const adminNumbers = ["7904302567"];
        const isAdmin = adminNumbers.includes(String(phone)) || u.role === "admin";
        const adminBanner = document.getElementById("adminSwitchBanner");
        if (adminBanner) {
            adminBanner.style.display = isAdmin ? "flex" : "none";
        }

        // Streak Logic: Check last vote date
        const todayStr = getVoteDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let streak = u.streak || 0;
        const lastVote = u.lastVoteDate || "";

        if (lastVote !== todayStr && lastVote !== yesterdayStr && lastVote !== "") {
            streak = 0; // Reset if more than a day gap
            await updateDoc(uDoc.ref, { streak: 0 });
        }
        document.getElementById("streakCounter").textContent = streak;
        
        // Update Streak Milestone Badge
        const badgeEl = document.getElementById("streakBadge");
        if (badgeEl) {
            if (streak === 0) {
                badgeEl.innerHTML = "🌱 Seedling Streak";
            } else if (streak >= 1 && streak < 3) {
                badgeEl.innerHTML = "🌱 Seedling Badge";
            } else if (streak >= 3 && streak < 7) {
                badgeEl.innerHTML = "🥉 Bronze Streak Badge";
            } else if (streak >= 7 && streak < 15) {
                badgeEl.innerHTML = "🥈 Silver Streak Badge";
            } else {
                badgeEl.innerHTML = "👑 Golden Warrior Badge";
            }
        }
    }

    // Load Daily Scripture / Fitness Quotes
    const DAILY_QUOTES = [
        { text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", ref: "Isaiah 40:31" },
        { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
        { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
        { text: "She is clothed with strength and dignity, and she laughs without fear of the future.", ref: "Proverbs 31:25" },
        { text: "Commit your work to the Lord, and your plans will be established.", ref: "Proverbs 16:3" },
        { text: "Do you not know that your body is a temple of the Holy Spirit?", ref: "1 Corinthians 6:19" },
        { text: "The Lord is my strength and my shield; in Him my heart trusts.", ref: "Psalm 28:7" }
    ];
    
    const dayOfWeek = new Date().getDay();
    const dailyQuote = DAILY_QUOTES[dayOfWeek % DAILY_QUOTES.length];
    const quoteTextEl = document.getElementById("dailyQuoteText");
    const quoteRefEl = document.getElementById("dailyQuoteRef");
    if (quoteTextEl) quoteTextEl.textContent = `"${dailyQuote.text}"`;
    if (quoteRefEl) quoteRefEl.textContent = `- ${dailyQuote.ref}`;

    // Initialize Interactive Water Tracker
    updateWaterUI();

    // Load Broadcast Reminders & Announcements
    await checkBroadcastMessages();
    
    // Load voting tasks
    await loadTasks();
}

window.toggleNotificationPanel = (event) => {
    event.stopPropagation();
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;
    const isHidden = panel.style.display === "none";
    
    panel.style.display = isHidden ? "block" : "none";
    
    if (isHidden) {
        markAllNotificationsAsRead();
    }
};

// Close panel when clicking outside
document.addEventListener("click", () => {
    const panel = document.getElementById("notificationPanel");
    if (panel) panel.style.display = "none";
});

// Prevent closure when clicking inside the panel itself
document.getElementById("notificationPanel")?.addEventListener("click", (e) => {
    e.stopPropagation();
});

window.markAllNotificationsAsRead = () => {
    const activeIds = window.currentlyActiveMsgIds || [];
    const readMsgIds = JSON.parse(localStorage.getItem("read_notifications") || "[]");
    
    activeIds.forEach(id => {
        if (!readMsgIds.includes(id)) {
            readMsgIds.push(id);
        }
    });
    
    localStorage.setItem("read_notifications", JSON.stringify(readMsgIds));
    
    // Clear badge count
    const badge = document.getElementById("notificationBadge");
    if (badge) badge.style.display = "none";
    
    // Re-run to paint read states in list instantly
    checkBroadcastMessages();
};

async function checkBroadcastMessages() {
    try {
        // 1. Ask for browser notification permission gently
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const todayStr = getVoteDate();
        const votedSnap = await getDocs(query(
            collection(db, "votes"),
            where("phone", "==", phone),
            where("date", "==", todayStr)
        ));
        const hasVoted = !votedSnap.empty;

        // Query messages
        const msgSnap = await getDocs(query(
            collection(db, "messages"),
            orderBy("timestamp", "desc")
        ));

        const list = document.getElementById("notificationList");
        const badge = document.getElementById("notificationBadge");
        if (!list || !badge) return;

        // Ensure home screen messageBox is hidden as requested
        const staticMsgBox = document.getElementById("messageBox");
        if (staticMsgBox) staticMsgBox.style.display = "none";

        if (msgSnap.empty) {
            list.innerHTML = `<div style="text-align:center; font-size:0.8rem; color:var(--text-muted); padding:15px;">No notifications.</div>`;
            badge.style.display = "none";
            return;
        }

        const activeMessages = [];
        const activeIds = [];

        // Filter messages to find active ones
        msgSnap.forEach(d => {
            const m = d.data();
            let isActive = false;

            if (m.schedType === "immediate") {
                isActive = true;
            } else if (m.schedType === "scheduled" && m.schedTime) {
                const [sHour, sMin] = m.schedTime.split(":").map(Number);
                const now = new Date();
                const nowHour = now.getHours();
                const nowMin = now.getMinutes();

                if (nowHour > sHour || (nowHour === sHour && nowMin >= sMin)) {
                    isActive = true;
                }
            }

            if (isActive) {
                // If it's a voting reminder, only show if they haven't voted today
                if (m.type === "reminder" && hasVoted) {
                    return; // Skip reminder if they already voted today
                }
                
                activeMessages.push({ id: d.id, ...m });
                activeIds.push(d.id);
            }
        });

        window.currentlyActiveMsgIds = activeIds;

        if (activeMessages.length === 0) {
            list.innerHTML = `<div style="text-align:center; font-size:0.8rem; color:var(--text-muted); padding:15px;">No new notifications.</div>`;
            badge.style.display = "none";
            return;
        }

        // Calculate unread badge count
        const readMsgIds = JSON.parse(localStorage.getItem("read_notifications") || "[]");
        const unreadCount = activeMessages.filter(m => !readMsgIds.includes(m.id)).length;

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = "block";
        } else {
            badge.style.display = "none";
        }

        // Populate notification dropdown list
        list.innerHTML = "";
        activeMessages.forEach(m => {
            const isUnread = !readMsgIds.includes(m.id);
            const bg = isUnread ? "#fffbeb" : "#ffffff";
            const border = isUnread ? "1px solid #fef3c7" : "1px solid var(--border-light)";
            const badgeColor = m.type === "announcement" ? "#0369a1" : "#b45309";
            const badgeBg = m.type === "announcement" ? "#f0f9ff" : "#fffbeb";
            const typeLabel = m.type === "announcement" ? "📢 Announcement" : "⏳ Reminder";

            list.innerHTML += `
                <div style="padding:12px; border:${border}; border-radius:12px; background:${bg}; display:flex; flex-direction:column; gap:6px; box-shadow:var(--shadow-sm); position:relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.65rem; background:${badgeBg}; color:${badgeColor}; padding:2px 6px; border-radius:6px; font-weight:700;">${typeLabel}</span>
                        ${isUnread ? '<span style="width:8px; height:8px; background:var(--error); border-radius:50%;"></span>' : ''}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-primary); font-weight: 500; line-height:1.4; padding-right:10px;">${m.text}</div>
                </div>
            `;

            // Native Browser Notifications (using Service Worker for Mobile Android lockscreen/pull-down native drawers!)
            if (isUnread && typeof Notification !== "undefined" && Notification.permission === "granted" && !localStorage.getItem("notified_" + m.id)) {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(typeLabel, {
                            body: m.text,
                            icon: '../photo/logo.png',
                            badge: '../photo/logo.png',
                            vibrate: [200, 100, 200],
                            tag: m.id,
                            requireInteraction: true
                        });
                    });
                } else {
                    new Notification(typeLabel, {
                        body: m.text,
                        icon: "../photo/logo.png"
                    });
                }
                localStorage.setItem("notified_" + m.id, "true");
            }
        });
    } catch (e) {
        console.error("Check broadcast messages failed:", e);
    }
}

// --- PROGRESS BAR HELPER ---
window.updateTaskProgressBar = () => {
    const total = document.querySelectorAll("#taskBox input[type='checkbox']").length;
    const checked = document.querySelectorAll("#taskBox input[type='checkbox']:checked").length;
    const progressCard = document.getElementById("progressCard");
    
    if (total === 0) {
        if (progressCard) progressCard.style.display = "none";
        return;
    }
    
    if (progressCard) progressCard.style.display = "block";
    const percent = Math.round((checked / total) * 100);
    
    const fill = document.getElementById("progressBarFill");
    const text = document.getElementById("progressText");
    
    if (fill) fill.style.width = percent + "%";
    if (text) text.textContent = `${checked} of ${total} (${percent}%)`;
};

// --- INTERACTIVE WATER TRACKER ---
window.incrementWater = (e) => {
    e.stopPropagation();
    const todayStr = getVoteDate();
    let current = Number(localStorage.getItem("water_" + todayStr) || "0");
    if (current >= 12) return; // Cap at 12 glasses
    current += 1;
    localStorage.setItem("water_" + todayStr, current);
    updateWaterUI(current);
};

window.decrementWater = (e) => {
    e.stopPropagation();
    const todayStr = getVoteDate();
    let current = Number(localStorage.getItem("water_" + todayStr) || "0");
    if (current <= 0) return;
    current -= 1;
    localStorage.setItem("water_" + todayStr, current);
    updateWaterUI(current);
};

window.updateWaterUI = (count) => {
    const todayStr = getVoteDate();
    const current = count !== undefined ? count : Number(localStorage.getItem("water_" + todayStr) || "0");
    
    const countText = document.getElementById("waterCount");
    const percentText = document.getElementById("waterPercent");
    const fill = document.getElementById("waterProgressFill");
    
    if (countText) countText.textContent = current;
    
    const percent = Math.min(Math.round((current / 8) * 100), 100);
    if (percentText) percentText.textContent = percent + "%";
    if (fill) fill.style.width = percent + "%";
};

function isTaskActive(task) {
    const now = new Date();
    const hrs = now.getHours();
    
    // Active only from 8 PM (20:00) to 12 PM (12:00)
    const isActiveTime = (hrs >= 20 || hrs < 12);
    if (!isActiveTime) return false;

    const today = now.getDay();
    const yesterday = (today + 6) % 7;
    const targetDay = (hrs >= 20) ? today : yesterday;

    return (task.days || []).includes(targetDay);
}

async function loadTasks() {
    const todayStr = getVoteDate();
    const votedSnap = await getDocsByPhone("votes", phone, [where("date", "==", todayStr)]);
    
    if (!votedSnap.empty) {
        startTimer("Today voting is complete ✅");
        return;
    }

    const now = new Date();
    const hrs = now.getHours();
    if (hrs >= 12 && hrs < 20) {
        startTimer("Voting window is closed 🔒");
        return;
    }

    const tasksSnap = await getDocs(collection(db, "tasks"));
    const taskBox = document.getElementById("taskBox");
    taskBox.innerHTML = "";
    let hasActiveTasks = false;
    
    tasksSnap.forEach(d => {
        const t = d.data();
        if (!isTaskActive(t)) return;
        
        hasActiveTasks = true;
        taskBox.innerHTML += `
            <div class="panel animate-fade-in" style="padding:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:600;">${t.text}</div>
                    <div style="font-size:0.7rem; color:var(--secondary);">+${t.points} pts</div>
                </div>
                <input type="checkbox" data-points="${t.points}" data-id="${d.id}" style="width:20px; height:20px;" onchange="updateTaskProgressBar()">
            </div>`;
    });

    if (!hasActiveTasks) {
        startTimer("No active tasks for now.");
    } else {
        updateTaskProgressBar();
    }
}

function startTimer(msg) {
    const nextVoteBox = document.getElementById("nextVoteBox");
    const submitBtn = document.getElementById("submitBtn");
    nextVoteBox.style.display = "block";
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    document.getElementById("taskBox").innerHTML = "";

    const tick = () => {
        const now = new Date();
        const t = new Date();
        t.setHours(20, 0, 0, 0);
        if (now.getHours() >= 20) t.setDate(t.getDate() + 1);
        
        const diff = t - now;
        if (diff <= 0) { location.reload(); return; }
        
        const h = Math.floor(diff / 36e5);
        const m = Math.floor(diff % 36e5 / 6e4);
        const s = Math.floor(diff % 6e4 / 1000);
        nextVoteBox.innerHTML = `${msg}<br>Next window opens in <b>${h}h ${m}m ${s}s</b>`;
        setTimeout(tick, 1000);
    };
    tick();
}

window.submitVote = async () => {
    const checked = document.querySelectorAll("#taskBox input:checked");
    if (!checked.length) return alert("Select at least one task");
    
    let totalPts = 0;
    const todayStr = getVoteDate();
    
    for (let c of checked) {
        totalPts += Number(c.dataset.points);
        await addDoc(collection(db, "votes"), { 
            phone, 
            points: Number(c.dataset.points), 
            taskId: c.dataset.id, 
            date: todayStr, 
            timestamp: new Date() 
        });
    }

    const userSnap = await getDocsByPhone("users", phone);
    if(!userSnap.empty){
        const uDoc = userSnap.docs[0];
        const uData = uDoc.data();
        const lastVote = uData.lastVoteDate || "";
        
        let newStreak = uData.streak || 0;
        if (lastVote !== todayStr) {
            newStreak += 1;
        }

        await updateDoc(uDoc.ref, {
            points: increment(totalPts),
            streak: newStreak,
            lastVoteDate: todayStr
        });
    }

    alert("Vote submitted! ✅");
    location.reload();
};

// --- LEADERBOARD & TOP 3 ---
let currentRange = 'week';

window.setLeaderboardRange = (range) => {
    currentRange = range;
    document.querySelectorAll('#leaderboardSection .btn-secondary').forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase().includes(range.toLowerCase()));
    });
    loadLeaderboard();
};

async function loadLeaderboard() {
    const uSnap = await getDocs(collection(db, "users"));
    const vSnap = await getDocs(collection(db, "votes"));
    
    const now = new Date();
    
    // Monday to Sunday logic — use LOCAL date to avoid UTC timezone shift (IST = UTC+5:30)
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStr = localDateStr(startOfWeek); // LOCAL date — fixes IST timezone bug

    // 1st of the Month logic — use LOCAL date
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = localDateStr(startOfMonth); // LOCAL date — fixes IST timezone bug

    const mapTotal = {};
    const mapWeekly = {};
    const mapMonthly = {};
    const dayCounts = {};
    const streaks = [];

    let totalWeeklyVotes = 0;
    let totalWeeklyPoints = 0;

    vSnap.forEach(v => {
        const d = v.data();
        const pts = Number(d.points || 0);
        const date = d.date || "";
        const phoneKey = String(d.phone);
        
        mapTotal[phoneKey] = (mapTotal[phoneKey] || 0) + pts;
        if (date >= weekStr) {
            totalWeeklyVotes++;
            totalWeeklyPoints += pts;
            mapWeekly[phoneKey] = (mapWeekly[phoneKey] || 0) + pts;
            const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
        if (date >= monthStr) {
            mapMonthly[phoneKey] = (mapMonthly[phoneKey] || 0) + pts;
        }
    });

    let allUsers = [];
    let streaksCount = 0;
    uSnap.forEach(u => {
        const d = u.data();
        const phoneKey = String(d.phone);
        const score = currentRange === 'week' ? (mapWeekly[phoneKey] || 0) : 
                      currentRange === 'month' ? (mapMonthly[phoneKey] || 0) : 
                      (mapTotal[phoneKey] || 0);
        
        allUsers.push({ 
            name: d.name, 
            phone: d.phone, 
            score: score,
            weekly: mapWeekly[phoneKey] || 0,
            streak: d.streak || 0
        });
        if (d.streak >= 5) streaksCount++;
    });

    allUsers.sort((a, b) => b.score - a.score);

    // Current User Card
    const me = allUsers.find(u => String(u.phone) === String(phone));
    if (me) {
        // Calculate correct tie-handled rank for leaderboard card
        let myLeaderboardRank = 1;
        let prevScore = null;
        let actualRank = 1;
        for (let i = 0; i < allUsers.length; i++) {
            const currentScore = allUsers[i].score;
            if (prevScore !== null && currentScore < prevScore) {
                actualRank = i + 1;
            }
            if (String(allUsers[i].phone) === String(phone)) {
                myLeaderboardRank = actualRank;
                break;
            }
            prevScore = currentScore;
        }

        document.getElementById("myRank").textContent = myLeaderboardRank;
        document.getElementById("myName").textContent = me.name;
        document.getElementById("myStreak").textContent = me.streak;
        document.getElementById("myPoints").textContent = me.score;
    }

    // Podium
    const weeklySorted = [...allUsers].sort((a,b) => b.weekly - a.weekly);
    const p1 = weeklySorted[0], p2 = weeklySorted[1], p3 = weeklySorted[2];
    if (p1) { document.getElementById("p1_name").textContent = p1.name; document.getElementById("p1_pts").textContent = p1.weekly + " pts"; }
    if (p2) { document.getElementById("p2_name").textContent = p2.name; document.getElementById("p2_pts").textContent = p2.weekly + " pts"; }
    if (p3) { document.getElementById("p3_name").textContent = p3.name; document.getElementById("p3_pts").textContent = p3.weekly + " pts"; }

    // Group Pulse
    document.getElementById("g_sessions").textContent = totalWeeklyVotes;
    document.getElementById("g_streaks").textContent = streaksCount;
    document.getElementById("g_avg").textContent = Math.round(totalWeeklyPoints / (Object.keys(mapWeekly).length || 1));
    const topDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b, "--");
    document.getElementById("g_topday").textContent = topDay;

    // Full List
    const body = document.getElementById("leaderboardBody");
    body.innerHTML = "";
    let rank = 1, prev = null;
    allUsers.forEach((r) => {
        if (prev !== null && r.score < prev) rank++;
        let cls = "background: rgba(255,255,255,0.7); border-radius: 16px; padding: 16px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.5); box-shadow: var(--shadow-sm); transition: transform 0.2s;";
        let rankColor = "#64748b";
        let scoreColor = "var(--primary)";
        let icon = "";
        
        if (rank === 1) {
            cls = "background: linear-gradient(135deg, #fdf4ff 0%, #fef08a 100%); border-radius: 16px; padding: 16px; margin-bottom: 10px; border: 1px solid #fde047; box-shadow: 0 8px 20px rgba(234,179,8,0.2); transform: scale(1.02); z-index: 3; position: relative;";
            rankColor = "#854d0e";
            scoreColor = "#b45309";
            icon = "👑 ";
        } else if (rank === 2) {
            cls = "background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px; padding: 16px; margin-bottom: 10px; border: 1px solid #cbd5e1; box-shadow: 0 6px 15px rgba(148,163,184,0.15); transform: scale(1.01); z-index: 2; position: relative;";
            rankColor = "#334155";
            scoreColor = "#475569";
            icon = "🥈 ";
        } else if (rank === 3) {
            cls = "background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%); border-radius: 16px; padding: 16px; margin-bottom: 10px; border: 1px solid #fdba74; box-shadow: 0 6px 15px rgba(251,146,60,0.15); transform: scale(1.01); z-index: 1; position: relative;";
            rankColor = "#9a3412";
            scoreColor = "#c2410c";
            icon = "🥉 ";
        }

        body.innerHTML += `
            <div style="display: flex; align-items: center; ${cls}" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='${rank <= 3 ? (rank === 1 ? 'scale(1.02)' : 'scale(1.01)') : 'scale(1)'}'">
                <div style="width: 45px; font-weight: 800; font-size: 1.2rem; color: ${rankColor}; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">${rank}</div>
                <div style="flex-grow: 1; font-weight: 700; color: #1e293b; font-size: 1.05rem;">${icon}${r.name}</div>
                <div style="font-weight: 800; color: ${scoreColor}; font-size: 1.1rem;">${r.score} <span style="font-size:0.7rem; font-weight:600;">pts</span></div>
            </div>`;
        prev = r.score;
    });
}

// --- CALENDAR ---
let curMonth = new Date().getMonth(), curYear = new Date().getFullYear();
window.prevMonth = () => { curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } renderCalendar(); };
window.nextMonth = () => { curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } renderCalendar(); };

async function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    document.getElementById("calTitle").textContent = new Date(curYear, curMonth).toLocaleString("default", { month: "long", year: "numeric" });

    const snap = await getDocsByPhone("votes", phone);
    const votedData = {};
    snap.forEach(d => {
        const v = d.data();
        if (!votedData[v.date]) votedData[v.date] = [];
        votedData[v.date].push(v);
    });

    const days = new Date(curYear, curMonth + 1, 0).getDate();
    const firstDay = new Date(curYear, curMonth, 1).getDay();
    const start = (firstDay === 0 ? 6 : firstDay - 1);

    for (let i = 0; i < start; i++) grid.innerHTML += "<div></div>";

    for (let i = 1; i <= days; i++) {
        const dDate = new Date(curYear, curMonth, i);
        const ds = localDateStr(dDate); // LOCAL date — fixes IST timezone bug
        
        // Logic for Colors
        let cls = "future";
        const votes = votedData[ds];
        
        // Window end for this date is next day 12 PM (Noon)
        const windowEnd = new Date(curYear, curMonth, i + 1); windowEnd.setHours(12, 0, 0, 0);
        const now = new Date();

        if (votes) {
            cls = "done"; // Green if voted
        } else {
            const todayStr = getVoteDate();
            if (now > windowEnd) {
                cls = "missed"; // Red if 12 PM next day passed
            } else if (ds === todayStr) {
                cls = "pending"; // Yellow if current window and not voted
            }
        }
        
        const dayEl = document.createElement("div");
        dayEl.className = `cal-day ${cls}`;
        dayEl.textContent = i;
        dayEl.onclick = () => showDayTasks(ds, votes);
        grid.appendChild(dayEl);
    }
}

window.submitBackdateRequest = async (date) => {
    const chks = document.querySelectorAll(".backdate-task-chk:checked");
    if (!chks.length) return alert("Select at least one task first");
    
    const selectedTasks = [];
    let totalPoints = 0;
    
    chks.forEach(chk => {
        const pts = Number(chk.dataset.points);
        selectedTasks.push({
            id: chk.dataset.id,
            text: chk.dataset.text,
            points: pts
        });
        totalPoints += pts;
    });

    try {
        const userName = document.getElementById("userNameHeader").textContent || "User";
        
        await addDoc(collection(db, "backdate_requests"), {
            phone: phone,
            name: userName,
            date: date,
            tasks: selectedTasks,
            totalPoints: totalPoints,
            status: "pending",
            createdAt: new Date().toISOString()
        });
        
        alert("Backdate request submitted successfully! Pending Admin approval. ⏳");
        renderCalendar();
        // Clear details
        document.getElementById("calendarTaskDetails").innerHTML = "";
    } catch (e) {
        console.error("Backdate request failed:", e);
        alert("Error: " + e.message);
    }
};

async function showDayTasks(date, votes) {
    const details = document.getElementById("calendarTaskDetails");
    if (!details) return;
    
    details.innerHTML = `<h4 class="font-serif" style="margin-bottom:10px;">Tasks on ${date}</h4>`;
    
    // Check if there is an existing backdate request for this date
    const reqSnap = await getDocsByPhone("backdate_requests", phone, [where("date", "==", date)]);
    
    if (!reqSnap.empty) {
        const req = reqSnap.docs[0].data();
        if (req.status === "pending") {
            details.innerHTML += `
                <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 12px; margin-top: 10px;">
                    <div style="font-weight: 700; color: #b45309; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">⏳ Request Pending Approval</div>
                    <p style="font-size: 0.8rem; color: #666; margin-bottom: 8px;">You requested backdate points for completing:</p>
                    <ul style="font-size: 0.8rem; color: #444; padding-left: 15px; margin-bottom: 10px;">
                        ${req.tasks.map(t => `<li>${t.text} (+${t.points} pts)</li>`).join("")}
                    </ul>
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--primary);">Total requested: +${req.totalPoints} pts</div>
                </div>
            `;
            return;
        } else if (req.status === "approved") {
            details.innerHTML += `
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 12px; margin-top: 10px;">
                    <div style="font-weight: 700; color: #166534; display: flex; align-items: center; gap: 6px;">✅ Approved by Admin</div>
                    <p style="font-size: 0.8rem; color: #666; margin-top: 4px;">Points of this request are added to your total score.</p>
                </div>
            `;
            return;
        } else if (req.status === "rejected") {
            details.innerHTML += `
                <div style="background: #fff1f2; border: 1px solid #ffe4e6; padding: 15px; border-radius: 12px; margin-top: 10px;">
                    <div style="font-weight: 700; color: #9f1239; display: flex; align-items: center; gap: 6px;">❌ Rejected by Admin</div>
                    <p style="font-size: 0.8rem; color: #666; margin-top: 4px;">This request was rejected by the admin.</p>
                </div>
            `;
            return;
        }
    }
    
    if (!votes || votes.length === 0) {
        // Since no votes and no requests, check if it's a past missed date
        const todayStr = getVoteDate();
        if (date < todayStr) {
            // Missed past date! Show request backdate form
            const tasksSnap = await getDocs(collection(db, "tasks"));
            let taskCheckboxes = "";
            tasksSnap.forEach(tDoc => {
                const t = tDoc.data();
                taskCheckboxes += `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding: 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div>
                            <div style="font-size: 0.85rem; font-weight:600; color: var(--text-primary);">${t.text}</div>
                            <div style="font-size:0.7rem; color:var(--secondary);">+${t.points} pts</div>
                        </div>
                        <input type="checkbox" class="backdate-task-chk" data-id="${tDoc.id}" data-text="${t.text}" data-points="${t.points}" style="width:18px; height:18px;">
                    </div>
                `;
            });
            
            details.innerHTML += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 16px; margin-top: 10px; box-shadow: var(--shadow-sm);">
                    <div style="font-weight:700; color: var(--primary); margin-bottom: 8px; font-size: 0.95rem;">Request Backdate Points</div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">Forgetting to vote happens! Select the tasks you completed on this day to submit to the admin for point approval.</p>
                    <div style="margin-bottom: 15px;">${taskCheckboxes}</div>
                    <button class="btn-primary" onclick="submitBackdateRequest('${date}')" style="padding: 10px 20px; font-size: 0.85rem; width: 100%;">Submit Request</button>
                </div>
            `;
        } else {
            details.innerHTML += `<p style="font-size:0.8rem; color:var(--text-muted);">No tasks recorded for this day.</p>`;
        }
        return;
    }

    // Existing votes logic
    const tasksSnap = await getDocs(collection(db, "tasks"));
    const taskMap = {};
    tasksSnap.forEach(t => taskMap[t.id] = t.data().text);

    votes.forEach(v => {
        const ts = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
        const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let taskName = "Custom Task";
        if (v.taskId === "backdate_consolidated") {
            taskName = v.tasks || "Completed Tasks (Backdate)";
        } else {
            taskName = taskMap[v.taskId] || "Custom Task";
        }

        details.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                <div style="max-width: 75%;">
                    <div style="font-size:0.85rem; font-weight:600; line-height: 1.3;">${taskName}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top: 2px;">${timeStr}</div>
                </div>
                <div style="font-weight:700; color:var(--success); font-size:0.85rem;">+${v.points} pts</div>
            </div>
        `;
    });
}

// --- SETTINGS & PROFILE ---
window.selectedProfilePhotoBase64 = null;
window.previewEditPhoto = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        window.selectedProfilePhotoBase64 = e.target.result;
        const preview = document.getElementById("editPhotoPreview");
        if (preview) {
            preview.style.background = `url(${e.target.result}) no-repeat center center`;
            preview.style.backgroundSize = "cover";
            preview.textContent = "";
        }
    };
    reader.readAsDataURL(file);
};

window.saveSettings = async () => {
    const name = document.getElementById("editName").value.trim();
    if (!name) return alert("Name cannot be empty");
    
    const age = Number(document.getElementById("editAge").value) || "";
    const height = Number(document.getElementById("editHeight").value) || "";
    const weight = Number(document.getElementById("editWeight").value) || "";
    
    const langEl = document.getElementById("langSelect");
    const lang = langEl ? langEl.value : "en";
    try {
        const userSnap = await getDocsByPhone("users", phone);
        if (!userSnap.empty) {
            const docRef = userSnap.docs[0].ref;
            const updateData = {
                name,
                age,
                height,
                weight,
                language: lang
            };
            if (window.selectedProfilePhotoBase64) {
                updateData.photo = window.selectedProfilePhotoBase64;
            }
            await updateDoc(docRef, updateData);
            alert("Profile updated successfully! ✅");
            location.reload();
        }
    } catch (e) {
        console.error("Save profile failed:", e);
        alert("Failed to update profile: " + e.message);
    }
};

window.logout = () => { localStorage.clear(); location.replace("../auth/login.html"); };

// --- MY PROFILE DASHBOARD LOAD ---
window.toggleEditProfileModal = (e) => {
    e.stopPropagation();
    const modal = document.getElementById("editProfileModal");
    if (!modal) return;
    const isHidden = modal.style.display === "none";
    modal.style.display = isHidden ? "block" : "none";
    if (isHidden) {
        document.getElementById("editName").value = document.getElementById("profileName").textContent;
        document.getElementById("editAge").value = window.currentUserAge || "";
        document.getElementById("editHeight").value = window.currentUserHeight || "";
        document.getElementById("editWeight").value = window.currentUserWeight || "";
        document.getElementById("settingsSubpanel").style.display = "none";
    }
};

window.toggleSettingsSubpanel = (e) => {
    e.stopPropagation();
    const subpanel = document.getElementById("settingsSubpanel");
    if (!subpanel) return;
    const isHidden = subpanel.style.display === "none";
    subpanel.style.display = isHidden ? "block" : "none";
    if (isHidden) {
        document.getElementById("editProfileModal").style.display = "none";
    }
};

window.loadProfileData = async () => {
    try {
        const todayStr = getVoteDate();
        
        // Update stats updated time
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const updateTimeEl = document.getElementById("statsUpdateTime");
        if (updateTimeEl) updateTimeEl.textContent = `UPDATED • TODAY ${hrs}:${mins}`;

        const userSnap = await getDocsByPhone("users", phone);
        console.log("DEBUG PROFILE LOAD:", {
            loggedInPhone: phone,
            phoneType: typeof phone,
            userFound: !userSnap.empty,
            userDocCount: userSnap.size
        });
        if (userSnap.empty) {
            console.error("FAILED to find user document for phone number:", phone);
            const profNameEl = document.getElementById("profileName");
            if (profNameEl) profNameEl.textContent = `Profile Not Found (${phone})`;
            return;
        }
        const uDoc = userSnap.docs[0];
        const u = uDoc.data();

        // 1. Profile Banner Setup & Image Fallback logic
        const name = u.name || "User";
        const profNameEl = document.getElementById("profileName");
        const profAvatarEl = document.getElementById("profileAvatar");
        const previewEl = document.getElementById("editPhotoPreview");
        
        if (profNameEl) profNameEl.textContent = name;
        
        // Cache user details for edit inputs
        window.currentUserAge = u.age || "";
        window.currentUserHeight = u.height || "";
        window.currentUserWeight = u.weight || "";

        // Profile Photo Setup
        if (u.photo) {
            if (profAvatarEl) {
                profAvatarEl.style.background = `url(${u.photo}) no-repeat center center`;
                profAvatarEl.style.backgroundSize = "cover";
                profAvatarEl.textContent = "";
            }
            if (previewEl) {
                previewEl.style.background = `url(${u.photo}) no-repeat center center`;
                previewEl.style.backgroundSize = "cover";
                previewEl.textContent = "";
            }
        } else {
            if (profAvatarEl) {
                profAvatarEl.style.background = "linear-gradient(135deg, #a855f7, #6366f1)";
                profAvatarEl.textContent = name[0].toUpperCase();
            }
            if (previewEl) {
                previewEl.style.background = "linear-gradient(135deg, #a855f7, #6366f1)";
                previewEl.textContent = name[0].toUpperCase();
            }
        }
        
        // Member Join Date (format join date if exists, else fallback to standard date)
        let joinDate = "2026-05-09";
        if (u.createdAt) {
            try {
                if (typeof u.createdAt === "string") {
                    joinDate = u.createdAt.split('T')[0];
                } else if (u.createdAt.seconds) {
                    joinDate = new Date(u.createdAt.seconds * 1000).toISOString().split('T')[0];
                } else if (u.createdAt.toDate) {
                    joinDate = u.createdAt.toDate().toISOString().split('T')[0];
                } else {
                    joinDate = new Date(u.createdAt).toISOString().split('T')[0];
                }
            } catch (err) {
                console.warn("Failed to parse join date:", err);
            }
        }
        const profJoinEl = document.getElementById("profileJoinDate");
        if (profJoinEl) profJoinEl.textContent = `MEMBER SINCE ${joinDate}`;
        
        // Pills: Age/Phone Pill + Streak Pill
        const profPhoneEl = document.getElementById("profilePhonePill");
        const profStreakValEl = document.getElementById("profileStreakVal");
        if (profPhoneEl) {
            if (u.age) {
                profPhoneEl.innerHTML = `🎂 <span>${u.age} years</span>`;
            } else {
                profPhoneEl.innerHTML = `📞 <span>${phone}</span>`;
            }
        }
        const streak = u.streak || 0;
        if (profStreakValEl) profStreakValEl.textContent = streak;

        // Circular Streak Dial progress ring calculation
        const deg = Math.min((streak / 7) * 360, 360);
        const goalDialEl = document.getElementById("profileGoalDial");
        const goalTextEl = document.getElementById("profileGoalText");
        if (goalDialEl) goalDialEl.style.background = `conic-gradient(#22c55e ${deg}deg, #e2e8f0 ${deg}deg)`;
        if (goalTextEl) goalTextEl.textContent = `${streak}/7`;

        // 2. Fetch User Votes History for Stats Cards & Weekly Node Grid
        const votesSnap = await getDocsByPhone("votes", phone);
        const voteDatesSet = new Set();
        let totalPoints = 0;
        votesSnap.forEach(d => {
            const v = d.data();
            voteDatesSet.add(v.date);
            totalPoints += Number(v.points || 0);
        });

        // Set Stats values
        const statPointsEl = document.getElementById("statTotalPoints");
        const statStreakEl = document.getElementById("statBestStreak");
        const statSessionsEl = document.getElementById("statSessions");
        if (statPointsEl) statPointsEl.textContent = totalPoints;
        if (statStreakEl) statStreakEl.textContent = Math.max(streak, u.points ? 1 : 0);
        if (statSessionsEl) statSessionsEl.textContent = voteDatesSet.size;

        // Calculate Ranking Positions
        const allUsersSnap = await getDocs(collection(db, "users"));
        const userList = [];
        allUsersSnap.forEach(d => {
            const ud = d.data();
            userList.push({
                phone: ud.phone,
                points: ud.points || 0,
                weeklyPoints: ud.weeklyPoints || 0
            });
        });

        // Weekly Rank Calculation
        userList.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
        let myWeeklyRank = 1;
        let prevPoints = null;
        let actualRank = 1;
        for (let i = 0; i < userList.length; i++) {
            const currentPoints = userList[i].weeklyPoints;
            if (prevPoints !== null && currentPoints < prevPoints) {
                actualRank = i + 1;
            }
            if (String(userList[i].phone) === String(phone)) {
                myWeeklyRank = actualRank;
                break;
            }
            prevPoints = currentPoints;
        }
        const statWRankEl = document.getElementById("statProfileWeeklyRank");
        if (statWRankEl) statWRankEl.textContent = `#${myWeeklyRank}`;

        // All-Time Rank Calculation
        userList.sort((a, b) => b.points - a.points);
        let myAllTimeRank = 1;
        prevPoints = null;
        actualRank = 1;
        for (let i = 0; i < userList.length; i++) {
            const currentPoints = userList[i].points;
            if (prevPoints !== null && currentPoints < prevPoints) {
                actualRank = i + 1;
            }
            if (String(userList[i].phone) === String(phone)) {
                myAllTimeRank = actualRank;
                break;
            }
            prevPoints = currentPoints;
        }
        const statATRankEl = document.getElementById("statAllTimeRank");
        const statMRankEl = document.getElementById("statMonthlyRank");
        if (statATRankEl) statATRankEl.textContent = `#${myAllTimeRank}`;
        if (statMRankEl) statMRankEl.textContent = `#${myAllTimeRank}`; // Fallback to overall monthly rank

        // 3. This Week activity cells calculations (Monday - Sunday)
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
        const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
        
        const mon = new Date(today);
        mon.setDate(today.getDate() + distanceToMon);
        
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        
        // Date range display
        const opt = { month: 'short', day: 'numeric' };
        const thisWDateEl = document.getElementById("thisWeekDatesRange");
        if (thisWDateEl) thisWDateEl.textContent = `${mon.toLocaleDateString('en-US', opt).toUpperCase()} — ${sun.toLocaleDateString('en-US', opt).toUpperCase()}`;

        // Loop Monday to Sunday (index 0 to 6)
        let weekSessionsCount = 0;
        let weekPointsSum = 0;
        let weekMissCount = 0;

        const ty = today.getFullYear();
        const tm = String(today.getMonth() + 1).padStart(2, '0');
        const td = String(today.getDate()).padStart(2, '0');
        const todayStrLocal = `${ty}-${tm}-${td}`;

        for (let i = 0; i < 7; i++) {
            const loopDate = new Date(mon);
            loopDate.setDate(mon.getDate() + i);
            
            const y = loopDate.getFullYear();
            const m = String(loopDate.getMonth() + 1).padStart(2, '0');
            const d = String(loopDate.getDate()).padStart(2, '0');
            const loopDateStr = `${y}-${m}-${d}`;

            const cell = document.getElementById(`weeklyNode-${i}`);
            if (!cell) continue;

            const isVoted = voteDatesSet.has(loopDateStr);
            const isFuture = loopDate > today && loopDateStr !== todayStrLocal;

            if (isVoted) {
                cell.style.background = "#22c55e"; // Green check
                cell.style.color = "white";
                cell.innerHTML = "✔";
                weekSessionsCount++;
                
                // Get points earned on this day
                votesSnap.forEach(d => {
                    const v = d.data();
                    if (v.date === loopDateStr) {
                        weekPointsSum += Number(v.points || 0);
                    }
                });
            } else if (isFuture) {
                cell.style.background = "#e2e8f0"; // Grey circle
                cell.style.color = "var(--text-muted)";
                cell.innerHTML = "";
            } else {
                cell.style.background = "#ef4444"; // Red cross
                cell.style.color = "white";
                cell.innerHTML = "✕";
                weekMissCount++;
            }
        }

        // Render Activity Summary Text
        const weeklySumEl = document.getElementById("weeklyActivitySummary");
        if (weeklySumEl) {
            weeklySumEl.innerHTML = `
                <span><b>${weekSessionsCount}</b> sessions</span>
                <span>•</span>
                <span><b style="color: var(--success);">${weekPointsSum}</b> pts</span>
                <span>•</span>
                <span><b style="color: var(--error);">${weekMissCount}</b> miss</span>
            `;
        }
    } catch (e) {
        console.error("Load profile failed:", e);
        alert("Profile Load Error: " + e.message + "\nStack: " + e.stack);
    }
};

window.switchToAdminPanel = () => {
    localStorage.setItem("admin_bypass_auth", "true");
    location.assign("../admin/admin.html");
};

// Init
loadHome();
loadLeaderboard();
renderCalendar();
registerFCMToken(); // Register for push notifications
