import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp({
    apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
    authDomain: "daily-voting-793ee.firebaseapp.com",
    projectId: "daily-voting-793ee",
    storageBucket: "daily-voting-793ee.appspot.com"
});
const db = getFirestore(app);
const storage = getStorage(app);

// Auth check with bypass and Firestore role authorization
const phone = localStorage.getItem("userPhone");
const bypass = localStorage.getItem("admin_bypass_auth") === "true";
const adminNumbers = ["7904302567"]; // Default admin list

let isAuthorized = false;

// 1. Check direct phone list
if (phone && adminNumbers.includes(String(phone))) {
    isAuthorized = true;
}

// 2. If not in hardcoded list, check Firestore u.role
if (!isAuthorized && phone) {
    try {
        let snap = await getDocs(query(collection(db, "users"), where("phone", "==", String(phone)), where("role", "==", "admin")));
        if (snap.empty && !isNaN(phone)) {
            snap = await getDocs(query(collection(db, "users"), where("phone", "==", Number(phone)), where("role", "==", "admin")));
        }
        if (!snap.empty) {
            isAuthorized = true;
        }
    } catch (e) {
        console.error("Firestore admin check failed:", e);
    }
}

// 3. Fallback to password prompt if not authorized and no bypass
if (!isAuthorized && !bypass) {
    if (prompt("Admin password") !== "5") {
        location.replace("../index.html");
    } else {
        // If they enter "5", authorize them
        localStorage.setItem("admin_bypass_auth", "true");
    }
} else {
    // Keep bypass authorized
    localStorage.setItem("admin_bypass_auth", "true");
}

window.showPage = (id) => {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if(id === 'dash') dashLoad();
    if(id === 'task') taskInit();
    if(id === 'user') userInit();
    if(id === 'lib') libLoad();
    if(id === 'settings') {
        settingsLoad();
        loadRecentMessages();
    }
};

let editLibId = null;
let currentFileUrl = "";

window.resetLibForm = () => {
    editLibId = null;
    currentFileUrl = "";
    document.getElementById("l_title").value = "";
    document.getElementById("l_cat").value = "";
    document.getElementById("l_type").value = "video";
    document.getElementById("l_file").value = "";
    document.getElementById("l_local").value = "";
    
    document.getElementById("libFormTitle").textContent = "Add to Library";
    const btn = document.querySelector("#page-lib .btn-primary");
    if (btn) btn.textContent = "Save to Library";
    
    const cancelBtn = document.getElementById("l_cancel");
    if (cancelBtn) cancelBtn.style.display = "none";
};

window.libEdit = (id, title, cat, type, url) => {
    editLibId = id;
    currentFileUrl = url;
    document.getElementById("l_title").value = title;
    document.getElementById("l_cat").value = cat;
    document.getElementById("l_type").value = type;
    document.getElementById("l_file").value = ""; // Clear file selector
    
    if (url.startsWith("../photo/")) {
        document.getElementById("l_local").value = url.replace("../photo/", "");
    } else {
        document.getElementById("l_local").value = "";
    }
    
    document.getElementById("libFormTitle").textContent = "Edit Library Item";
    const btn = document.querySelector("#page-lib .btn-primary");
    if (btn) btn.textContent = "Update Library Item";
    
    const cancelBtn = document.getElementById("l_cancel");
    if (cancelBtn) cancelBtn.style.display = "inline-block";
    
    document.getElementById("page-lib").scrollIntoView({ behavior: 'smooth' });
};

window.libSave = async () => {
    const title = document.getElementById("l_title").value.trim();
    const cat = document.getElementById("l_cat").value.trim();
    const type = document.getElementById("l_type").value;
    const file = document.getElementById("l_file").files[0];
    const local = document.getElementById("l_local").value.trim();
    
    if (!title || !cat) return alert("Fill Title and Category at least");

    const btn = document.querySelector("#page-lib .btn-primary");
    btn.disabled = true;
    btn.textContent = editLibId ? "Updating..." : "Saving...";

    try {
        let url = "";
        if (file) {
            console.log("Uploading file...");
            const fileRef = ref(storage, `library/${Date.now()}_${file.name}`);
            const result = await uploadBytes(fileRef, file);
            url = await getDownloadURL(result.ref);
        } else if (local) {
            // Use the specific local file name in the photo folder
            url = `../photo/${local}`;
        } else if (editLibId && currentFileUrl) {
            // Keep the existing file URL if editing and no new file/local is selected
            url = currentFileUrl;
        } else {
            // Default automatic matching based on Title
            const ext = type === "video" ? "mp4" : "jpg";
            url = `../photo/${title}.${ext}`;
        }

        const data = { 
            title, 
            cat, 
            type, 
            url, 
            createdAt: new Date() 
        };
        
        if (!editLibId) {
            data.active = true; // Set active: true by default on creation
        }

        if (editLibId) {
            await updateDoc(doc(db, "library", editLibId), data);
            alert("Updated successfully!");
        } else {
            await addDoc(collection(db, "library"), data);
            alert("Saved successfully!");
        }
        
        window.resetLibForm();
        libLoad();
    } catch (e) {
        console.error("Save failed:", e);
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = editLibId ? "Update Library Item" : "Save to Library";
    }
};

window.libToggleActive = async (id, currentStatus) => {
    try {
        await updateDoc(doc(db, "library", id), { active: !currentStatus });
        libLoad();
    } catch (e) {
        console.error("Toggle active failed:", e);
        alert("Error: " + e.message);
    }
};

window.libLoad = async () => {
    const snap = await getDocs(collection(db, "library"));
    const body = document.getElementById("l_body");
    body.innerHTML = "";
    snap.forEach(d => {
        const x = d.data();
        const isActive = x.active !== false; // Default true if undefined
        const statusText = isActive ? `<span style="color:var(--success); font-weight:700;">Active</span>` : `<span style="color:var(--text-muted);">Hidden</span>`;
        const toggleBtnText = isActive ? "Hide" : "Show";
        const toggleBtnColor = isActive ? "#64748b" : "var(--success)"; // Grey for Hide, Green for Show
        
        const escapedTitle = (x.title || "").replace(/'/g, "\\'");
        const escapedCat = (x.cat || "").replace(/'/g, "\\'");
        const escapedUrl = (x.url || "").replace(/'/g, "\\'");
        
        body.innerHTML += `<tr>
            <td>${x.cat}</td>
            <td>${x.title}</td>
            <td>${x.type}</td>
            <td>${statusText}</td>
            <td>
                <button class="btn-primary btn-sm" onclick="libToggleActive('${d.id}', ${isActive})" style="margin-right: 5px; background: ${toggleBtnColor}; border-color: ${toggleBtnColor};">${toggleBtnText}</button>
                <button class="btn-primary btn-sm" onclick="libEdit('${d.id}', '${escapedTitle}', '${escapedCat}', '${x.type}', '${escapedUrl}')" style="margin-right: 5px;">Edit</button>
                <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error);" onclick="libDel('${d.id}')">Delete</button>
            </td>
        </tr>`;
    });
};

window.libDel = async (id) => {
    if (!confirm("Delete?")) return;
    await deleteDoc(doc(db, "library", id));
    if (editLibId === id) window.resetLibForm();
    libLoad();
};

const today = () => new Date().toISOString().split("T")[0];

// --- DASHBOARD ---
window.dashLoad = async () => {
    try {
        const users = await getDocs(collection(db, "users"));
        const votes = await getDocs(collection(db, "votes"));
        document.getElementById("d_users").textContent = users.size;
        
        // Load pending backdate requests
        await loadPendingRequests();

        const from = document.getElementById("d_from").value;
        const to = document.getElementById("d_to").value || from;
        const map = {};

        votes.forEach(v => {
            const x = v.data();
            if (from) {
                if (!x.date || x.date < from || x.date > to) return;
            }
            map[x.phone] = (map[x.phone] || 0) + Number(x.points || 0);
        });

        window.allUsersRows = [];
        users.forEach(u => {
            const d = u.data();
            window.allUsersRows.push({ name: d.name || "Unknown", phone: d.phone || "---", total: map[d.phone] || 0 });
        });

        renderDashTable();
    } catch (e) {
        console.error(e);
        alert("Dashboard Load Error: " + e.message);
    }
};

window.renderDashTable = () => {
    const term = (document.getElementById("d_search")?.value || "").toLowerCase();
    if (!window.allUsersRows) return;
    const rows = window.allUsersRows.filter(r => 
        (r.name || "").toLowerCase().includes(term) || (r.phone || "").includes(term)
    );

    rows.sort((a, b) => b.total - a.total);
    const body = document.getElementById("dashBody");
    body.innerHTML = "";
    let rank = 0, prev = null, sl = 0;

    rows.forEach(r => {
        if (prev === null || r.total < prev) rank++;
        prev = r.total; sl++;
        const tr = document.createElement("tr");
        if (rank <= 3) tr.className = `rank-${rank}`;
        tr.innerHTML = `
            <td>${sl}</td><td>${rank}</td><td>${r.name}</td><td>${r.phone}</td><td>${r.total}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    <input id="p_${r.phone}" type="number" style="width:60px; padding:5px; border-radius:5px; border:1px solid #ddd;" placeholder="Pts">
                    <button class="btn-primary btn-sm" onclick="addPoint('${r.phone}', 'add')">+</button>
                    <button class="btn-primary btn-sm" style="background:#444;" onclick="addPoint('${r.phone}', 'set')">Set</button>
                </div>
            </td>`;
        body.appendChild(tr);
    });
    document.getElementById("d_shown").textContent = sl;
};

window.dashFilter = () => {
    renderDashTable();
};

window.addPoint = async (phone, mode) => {
    const vInput = document.getElementById("p_" + phone);
    let v = Number(vInput.value);
    
    if (mode === 'set') {
        const userRow = window.allUsersRows.find(r => r.phone === phone);
        const currentTotal = userRow ? userRow.total : 0;
        v = v - currentTotal; // Calculate difference
    }

    if (v === 0) return;
    await addDoc(collection(db, "votes"), { phone, points: v, date: today(), source: "admin" });
    vInput.value = "";
    dashLoad();
};

// --- TASK REPORT ---
async function taskInit() {
    const sel = document.getElementById("t_task");
    sel.innerHTML = "";
    const snap = await getDocs(collection(db, "tasks"));
    snap.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.data().text;
        sel.appendChild(opt);
    });
}

window.taskLoad = async () => {
    const users = await getDocs(collection(db, "users"));
    const votes = await getDocs(collection(db, "votes"));
    const map = {};
    votes.forEach(v => {
        const x = v.data();
        map[x.phone] = (map[x.phone] || 0) + Number(x.points || 0);
    });

    const votedBody = document.getElementById("t_voted");
    const notBody = document.getElementById("t_not");
    votedBody.innerHTML = ""; notBody.innerHTML = "";

    const userList = [];
    users.forEach(u => {
        userList.push(u.data());
    });

    // Sort alphabetically by name
    userList.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

    userList.forEach(u => {
        const p = u.phone, n = u.name;
        if (map[p]) votedBody.innerHTML += `<tr><td>${n}</td><td>${p}</td><td style="color:var(--success); font-weight:700;">${map[p]} pts</td></tr>`;
        else notBody.innerHTML += `<tr><td>${n}</td><td>${p}</td><td><button class="btn-primary btn-sm" onclick="addPoint('${p}')">Add Pts</button></td></tr>`;
    });
};

// --- USER REPORT ---
async function userInit() {
    const sel = document.getElementById("u_user");
    sel.innerHTML = "";
    const snap = await getDocs(collection(db, "users"));
    
    const userList = [];
    snap.forEach(d => {
        userList.push(d.data());
    });

    // Sort alphabetically by name
    userList.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

    userList.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.phone;
        opt.textContent = (u.name || "Unknown") + " (" + (u.phone || "") + ")";
        sel.appendChild(opt);
    });
}

window.userLoad = async () => {
    const phone = document.getElementById("u_user").value;
    const from = document.getElementById("u_from").value;
    const to = document.getElementById("u_to").value;
    const votesSnap = await getDocs(collection(db, "votes"));
    
    // Group votes by date to show daily total points
    const dateGroups = {};

    votesSnap.forEach(v => {
        const x = v.data();
        if (x.phone !== phone) return;
        if (from && (x.date < from || (to && x.date > to))) return;
        
        const dateKey = x.date || "no-date";
        if (!dateGroups[dateKey]) {
            dateGroups[dateKey] = {
                date: x.date || "",
                points: 0,
                sources: new Set(),
                ids: []
            };
        }
        dateGroups[dateKey].points += Number(x.points || 0);
        dateGroups[dateKey].sources.add(x.source || "user");
        dateGroups[dateKey].ids.push(v.id);
    });

    const rows = Object.values(dateGroups);
    rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const body = document.getElementById("u_body");
    body.innerHTML = "";
    rows.forEach(r => {
        const sourceStr = Array.from(r.sources).join(", ");
        body.innerHTML += `
            <tr>
                <td>${r.date || "-"}</td>
                <td style="font-weight: 700; color: var(--primary);">${r.points}</td>
                <td style="text-transform: capitalize;">${sourceStr}</td>
                <td>
                    <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error);" onclick="delVotes('${r.ids.join(",")}')">Delete</button>
                </td>
            </tr>`;
    });
};

window.delVotes = async (idsStr) => {
    if (!confirm("Are you sure you want to delete all voting records for this date? This will also automatically deduct the points from the user's total score!")) return;
    
    try {
        const ids = idsStr.split(",");
        let totalDeductedPoints = 0;
        let userPhone = null;

        for (let id of ids) {
            const voteRef = doc(db, "votes", id);
            const voteSnap = await getDoc(voteRef);
            if (voteSnap.exists()) {
                totalDeductedPoints += Number(voteSnap.data().points || 0);
                userPhone = voteSnap.data().phone;
                await deleteDoc(voteRef);
            }
        }

        // Deduct points from the user profile document in users collection
        if (userPhone && totalDeductedPoints > 0) {
            const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", userPhone)));
            if (!userSnap.empty) {
                const uDoc = userSnap.docs[0];
                const currentPoints = uDoc.data().points || 0;
                await updateDoc(uDoc.ref, {
                    points: Math.max(0, currentPoints - totalDeductedPoints)
                });
            }
        }

        alert("Records deleted successfully, and user points updated! ✅");
        userLoad();
    } catch (e) {
        console.error("Delete votes failed:", e);
        alert("Error: " + e.message);
    }
};

// --- SETTINGS (Original Points) ---
window.settingsLoad = async () => {
    const from = document.getElementById("s_from").value;
    const to = document.getElementById("s_to").value;
    const usersSnap = await getDocs(collection(db, "users"));
    const votesSnap = await getDocs(collection(db, "votes"));

    const nameMap = {};
    usersSnap.forEach(u => nameMap[u.data().phone] = u.data().name);

    const pointMap = {};
    votesSnap.forEach(v => {
        const x = v.data();
        if (x.source === "admin") return;
        if (from && (x.date < from || (to && x.date > to))) return;
        pointMap[x.phone] = (pointMap[x.phone] || 0) + Number(x.points || 0);
    });

    let rows = [];
    for (const p in pointMap) rows.push({ name: nameMap[p] || "Unknown", points: pointMap[p] });
    rows.sort((a, b) => b.points - a.points);

    const body = document.getElementById("s_body");
    body.innerHTML = "";
    let sl = 0, rank = 0, prev = null;

    rows.forEach(r => {
        sl++;
        if (prev === null || r.points < prev) rank++;
        prev = r.points;
        const tr = document.createElement("tr");
        if (rank <= 3) tr.className = `rank-${rank}`;
        tr.innerHTML = `<td>${sl}</td><td>${rank}</td><td>${r.name}</td><td>${r.points}</td>`;
        body.appendChild(tr);
    });
};

// --- BACKDATE REQUESTS APPROVAL ---
window.loadPendingRequests = async () => {
    try {
        const snap = await getDocs(query(
            collection(db, "backdate_requests"),
            where("status", "==", "pending")
        ));
        
        const panel = document.getElementById("pendingRequestsPanel");
        const list = document.getElementById("requestsList");
        const badge = document.getElementById("requestsCountBadge");
        
        if (snap.empty) {
            panel.style.display = "none";
            list.innerHTML = "";
            badge.textContent = "0 pending";
            return;
        }
        
        panel.style.display = "block";
        badge.textContent = `${snap.size} pending`;
        list.innerHTML = "";
        
        snap.forEach(d => {
            const r = d.data();
            list.innerHTML += `
                <div class="panel" style="padding: 15px; border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: #fffdf5; border-radius: 12px; margin-bottom: 5px; box-shadow: var(--shadow-sm);">
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: var(--primary);">${r.name} (${r.phone})</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                            Requested Date: <b>${r.date}</b> • Points: <b style="color: var(--success);">+${r.totalPoints} pts</b>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; font-style: italic;">
                            Tasks: ${r.tasks.map(t => t.text).join(", ")}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary btn-sm" onclick="approveRequest('${d.id}')" style="background: var(--success); border-color: var(--success); padding: 6px 12px; font-size: 0.8rem; cursor: pointer; color: white;">Approve</button>
                        <button class="btn-secondary btn-sm" onclick="rejectRequest('${d.id}')" style="color: var(--error); border-color: var(--error); padding: 6px 12px; font-size: 0.8rem; cursor: pointer;">Reject</button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Load requests failed:", e);
    }
};

window.approveRequest = async (id) => {
    if (!confirm("Are you sure you want to approve this request?")) return;
    
    try {
        const docRef = doc(db, "backdate_requests", id);
        const reqSnap = await getDoc(docRef);
        if (!reqSnap.exists()) return alert("Request not found");
        
        const r = reqSnap.data();
        
        // 1. Add a single consolidated vote entry for the total points of all selected tasks
        await addDoc(collection(db, "votes"), {
            phone: r.phone,
            points: Number(r.totalPoints),
            taskId: "backdate_consolidated",
            date: r.date,
            timestamp: new Date().toISOString(),
            source: "backdate_approval",
            tasks: r.tasks.map(t => t.text).join(", ")
        });
        
        // 2. Update user's points
        const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", r.phone)));
        if (!userSnap.empty) {
            const uDoc = userSnap.docs[0];
            await updateDoc(uDoc.ref, {
                points: (uDoc.data().points || 0) + Number(r.totalPoints)
            });
        }
        
        // 3. Mark request as approved
        await updateDoc(docRef, { status: "approved" });
        
        alert("Request approved successfully! Points added. ✅");
        dashLoad(); // Reload dashboard to update scores and requests list
    } catch (e) {
        console.error("Approve failed:", e);
        alert("Error: " + e.message);
    }
};

window.rejectRequest = async (id) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    
    try {
        await updateDoc(doc(db, "backdate_requests", id), { status: "rejected" });
        alert("Request rejected. ❌");
        dashLoad(); // Reload dashboard
    } catch (e) {
        console.error("Reject failed:", e);
        alert("Error: " + e.message);
    }
};

// --- BROADCAST MESSAGES ---
window.toggleSchedTime = () => {
    const type = document.getElementById("msg_sched_type").value;
    document.getElementById("sched_time_wrapper").style.display = type === "scheduled" ? "block" : "none";
};

window.saveMessage = async () => {
    const text = document.getElementById("msg_text").value.trim();
    const type = document.getElementById("msg_type").value;
    const schedType = document.getElementById("msg_sched_type").value;
    const schedTime = document.getElementById("msg_sched_time").value;

    if (!text) return alert("Write a message first");

    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            type: type,
            schedType: schedType,
            schedTime: schedType === "scheduled" ? schedTime : "",
            timestamp: new Date().toISOString()
        });

        alert("Message broadcasted successfully! 🎉");
        document.getElementById("msg_text").value = "";
        loadRecentMessages();
    } catch (e) {
        console.error("Save message failed:", e);
        alert("Error: " + e.message);
    }
};

window.loadRecentMessages = async () => {
    try {
        const snap = await getDocs(query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(5)));
        const list = document.getElementById("recent_messages_list");
        if (snap.empty) {
            list.innerHTML = `<div style="text-align:center; font-size:0.85rem; color:var(--text-muted); padding:10px;">No broadcasts yet.</div>`;
            return;
        }
        
        list.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const timeInfo = m.schedType === "scheduled" ? `⏰ Daily at ${m.schedTime}` : "⚡ Immediate";
            const typeInfo = m.type === "announcement" ? "📢 Announcement" : "⏳ Reminder";
            
            list.innerHTML += `
                <div style="padding:12px; border:1px solid var(--border-light); border-radius:8px; display:flex; justify-content:space-between; align-items:center; background:#fafafa; margin-bottom: 5px;">
                    <div style="max-width:80%;">
                        <div style="font-size:0.85rem; font-weight:600;">${m.text}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
                            <span style="background:var(--primary); color:white; padding:2px 6px; border-radius:4px; font-size:0.65rem; font-weight:bold; margin-right:4px;">${typeInfo}</span> 
                            <span>${timeInfo}</span>
                        </div>
                    </div>
                    <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error); padding:4px 8px; font-size:0.75rem;" onclick="deleteMessage('${d.id}')">Delete</button>
                </div>
            `;
        });
    } catch (e) {
        console.error("Load broadcasts failed:", e);
    }
};

window.deleteMessage = async (id) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    try {
        await deleteDoc(doc(db, "messages", id));
        alert("Broadcast deleted successfully. ✅");
        loadRecentMessages();
    } catch (e) {
        console.error("Delete failed:", e);
        alert("Error: " + e.message);
    }
};

// Init
dashLoad();
