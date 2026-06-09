import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, getDoc, updateDoc, limit, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
let currentAdminPerms = {
    admin_view_only: false,
    admin_settings_only: false,
    admin_task_only: false
};

// 1. Check direct phone list
if (phone && adminNumbers.includes(String(phone))) {
    isAuthorized = true;
}

// Function to load admin roles/permissions asynchronously without blocking script execution
async function checkAdminPermissions() {
    if (phone) {
        try {
            let snap = await getDocs(query(collection(db, "users"), where("phone", "==", String(phone))));
            if (snap.empty && !isNaN(phone)) {
                snap = await getDocs(query(collection(db, "users"), where("phone", "==", Number(phone))));
            }
            if (!snap.empty) {
                const data = snap.docs[0].data();
                if (data.role === "admin") {
                    isAuthorized = true;
                }
                currentAdminPerms.admin_view_only = data.admin_view_only || false;
                currentAdminPerms.admin_settings_only = data.admin_settings_only || false;
                currentAdminPerms.admin_task_only = data.admin_task_only || false;
            }
        } catch (e) {
            console.error("Firestore admin check failed:", e);
        }
    }
}

// Function to enforce bypass auth via password if not authorized
async function enforceAuth() {
    await checkAdminPermissions();
    
    if (!isAuthorized && !bypass) {
        if (prompt("Admin password") !== "5") {
            location.replace("../index.html");
            return false;
        } else {
            // If they enter "5", authorize them
            localStorage.setItem("admin_bypass_auth", "true");
        }
    } else {
        // Keep bypass authorized
        localStorage.setItem("admin_bypass_auth", "true");
    }
    return true;
}

// Function to enforce admin permissions in UI elements
function applyAdminPermissionsUI() {
    const isViewOnly = currentAdminPerms.admin_view_only;
    const isSettingsOnly = currentAdminPerms.admin_settings_only;
    const isTaskOnly = currentAdminPerms.admin_task_only;
    
    if (isSettingsOnly) {
        const toHide = ["nav-dash", "nav-task", "nav-user", "nav-lib", "nav-announcement", "nav-task-editor", "nav-whatsapp"];
        toHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
        setTimeout(() => {
            window.showPage('settings');
        }, 100);
    } else if (isTaskOnly) {
        const toHide = ["nav-dash", "nav-user", "nav-lib", "nav-announcement", "nav-settings", "nav-whatsapp"];
        toHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
        setTimeout(() => {
            window.showPage('task');
        }, 100);
    }
    
    if (isViewOnly) {
        const viewOnlyBanner = document.getElementById("viewOnlyModeBanner");
        if (viewOnlyBanner) viewOnlyBanner.style.display = "flex";
        
        // Disable textareas & inputs for broadcasts
        const bannerText = document.getElementById("banner_text");
        const bannerActive = document.getElementById("banner_active");
        const msgText = document.getElementById("msg_text");
        const msgType = document.getElementById("msg_type");
        const msgSchedType = document.getElementById("msg_sched_type");
        const msgSchedTime = document.getElementById("msg_sched_time");
        
        if (bannerText) bannerText.disabled = true;
        if (bannerActive) bannerActive.disabled = true;
        if (msgText) msgText.disabled = true;
        if (msgType) msgType.disabled = true;
        if (msgSchedType) msgSchedType.disabled = true;
        if (msgSchedTime) msgSchedTime.disabled = true;
        
        const saveBannerBtn = document.querySelector("button[onclick='saveBanner()']");
        if (saveBannerBtn) {
            saveBannerBtn.disabled = true;
            saveBannerBtn.style.opacity = "0.5";
            saveBannerBtn.style.cursor = "not-allowed";
        }
        
        const saveMsgBtn = document.getElementById("save_msg_btn");
        if (saveMsgBtn) {
            saveMsgBtn.disabled = true;
            saveMsgBtn.style.opacity = "0.5";
            saveMsgBtn.style.cursor = "not-allowed";
        }
        
        // Disable library inputs
        const lTitle = document.getElementById("l_title");
        const lCat = document.getElementById("l_cat");
        const lType = document.getElementById("l_type");
        const lFile = document.getElementById("l_file");
        const lLocal = document.getElementById("l_local");
        
        if (lTitle) lTitle.disabled = true;
        if (lCat) lCat.disabled = true;
        if (lType) lType.disabled = true;
        if (lFile) lFile.disabled = true;
        if (lLocal) lLocal.disabled = true;
        
        const libSaveBtn = document.querySelector("button[onclick='libSave()']");
        if (libSaveBtn) {
            libSaveBtn.disabled = true;
            libSaveBtn.style.opacity = "0.5";
            libSaveBtn.style.cursor = "not-allowed";
        }
        
        // Disable weekly reset inputs
        const resetBtn = document.getElementById("weeklyResetBtn");
        if (resetBtn) {
            resetBtn.disabled = true;
            resetBtn.style.opacity = "0.5";
            resetBtn.style.cursor = "not-allowed";
        }
    }
}

// UI customization is now handled directly inside initAdmin() after permissions are successfully loaded

// Safeguard function to block modifying actions for view-only users
function checkViewOnlyBlocked() {
    if (currentAdminPerms.admin_view_only) {
        alert("Permission Denied: You have View-Only access and cannot modify any data.");
        return true;
    }
    return false;
}

window.showPage = (id) => {
    if (currentAdminPerms.admin_settings_only && id !== 'settings') {
        return; // block navigation
    }
    if (currentAdminPerms.admin_task_only && id !== 'task') {
        return; // block navigation
    }

    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    // Safety check to avoid error if event is undefined
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    
    if(id === 'dash') dashLoad();
    if(id === 'task') taskInit();
    if(id === 'user') userInit();
    if(id === 'lib') libLoad();
    if(id === 'announcement') {
        loadRecentMessages();
    }
    if(id === 'settings') {
        settingsLoad();
    }
    if(id === 'whatsapp') {
        whatsappLoad();
    }
    if(id === 'adminlogs') {
        loadAdminLogs();
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
    if (checkViewOnlyBlocked()) return;
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
            await logAdminAction("Edit Library Item", `Updated library item "${title}" in category "${cat}"`);
            alert("Updated successfully!");
        } else {
            await addDoc(collection(db, "library"), data);
            await logAdminAction("Add Library Item", `Created library item "${title}" in category "${cat}"`);
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
    if (checkViewOnlyBlocked()) return;
    try {
        await updateDoc(doc(db, "library", id), { active: !currentStatus });
        
        // Log action
        const docSnap = await getDoc(doc(db, "library", id));
        const title = docSnap.exists() ? docSnap.data().title : "Unknown";
        await logAdminAction("Toggle Library Status", `Changed library item "${title}" visibility to ${!currentStatus ? 'Active' : 'Hidden'}`);
        
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
    const isViewOnly = currentAdminPerms.admin_view_only;
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
                <button class="btn-primary btn-sm" onclick="libToggleActive('${d.id}', ${isActive})" style="margin-right: 5px; background: ${toggleBtnColor}; border-color: ${toggleBtnColor}; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${isViewOnly ? 'disabled' : ''}>${toggleBtnText}</button>
                <button class="btn-primary btn-sm" onclick="libEdit('${d.id}', '${escapedTitle}', '${escapedCat}', '${x.type}', '${escapedUrl}')" style="margin-right: 5px; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${isViewOnly ? 'disabled' : ''}>Edit</button>
                <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error); ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="libDel('${d.id}')" ${isViewOnly ? 'disabled' : ''}>Delete</button>
            </td>
        </tr>`;
    });
};

window.libDel = async (id) => {
    if (checkViewOnlyBlocked()) return;
    if (!confirm("Delete?")) return;
    
    try {
        const docSnap = await getDoc(doc(db, "library", id));
        const title = docSnap.exists() ? docSnap.data().title : "Unknown";
        
        await deleteDoc(doc(db, "library", id));
        await logAdminAction("Delete Library Item", `Removed library item "${title}"`);
        
        if (editLibId === id) window.resetLibForm();
        libLoad();
    } catch (e) {
        console.error("Delete library failed:", e);
        alert("Error: " + e.message);
    }
};

const today = () => new Date().toISOString().split("T")[0];

const cleanPhone = (p) => String(p || "").replace(/[^0-9]/g, "");

const localDateStr = (d) => {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
};

const getVoteDate = () => {
    const now = new Date();
    const hrs = now.getHours();
    const d = new Date(now);
    if (hrs < 12) d.setDate(d.getDate() - 1); // Before Noon is for yesterday
    return localDateStr(d);
};

// --- DASHBOARD ---
window.dashLoad = async () => {
    try {
        const users = await getDocs(collection(db, "users"));
        const votes = await getDocs(collection(db, "votes"));
        document.getElementById("d_users").textContent = users.size;
        
        // Fetch all tasks to identify special task IDs as a backup safeguard
        const tasksSnap = await getDocs(collection(db, "tasks"));
        const specialTaskIds = new Set();
        tasksSnap.forEach(doc => {
            const taskData = doc.data();
            if (taskData.startDate) {
                specialTaskIds.add(doc.id);
            }
        });
        
        // Load pending backdate requests
        await loadPendingRequests();
        
        // Check if weekly reset is overdue (show banner on Sunday=0 or Monday=1)
        const dayOfWeek = new Date().getDay();
        const banner = document.getElementById("weeklyResetBanner");
        if (banner) {
            if (dayOfWeek === 0 || dayOfWeek === 1) {
                // Check if a reset was done this week
                try {
                    const resetSnap = await getDocs(query(
                        collection(db, "weekly_resets"),
                        orderBy("resetAt", "desc"),
                        limit(1)
                    ));
                    let resetDueThisWeek = true;
                    if (!resetSnap.empty) {
                        const lastReset = new Date(resetSnap.docs[0].data().resetAt);
                        // Compute this week's Monday
                        const now = new Date();
                        const diff = (now.getDay() === 0 ? -6 : 1) - now.getDay();
                        const thisMonday = new Date(now);
                        thisMonday.setDate(now.getDate() + diff);
                        thisMonday.setHours(0, 0, 0, 0);
                        if (lastReset >= thisMonday) resetDueThisWeek = false;
                    }
                    banner.style.display = resetDueThisWeek ? "flex" : "none";
                } catch(e) { banner.style.display = "none"; }
            } else {
                banner.style.display = "none";
            }
        }


        const from = document.getElementById("d_from").value;
        const to = document.getElementById("d_to").value || from;
        const map = {};

        votes.forEach(v => {
            const x = v.data();
            const isSpecialTask = x.isSpecial || specialTaskIds.has(x.taskId);
            if (isSpecialTask && !x.pointsCredited) return; // Skip uncredited special task points
            if (from) {
                if (!x.date || x.date < from || x.date > to) return;
            }
            map[x.phone] = (map[x.phone] || 0) + Number(x.points || 0);
        });

        window.allUsersRows = [];
        users.forEach(u => {
            const d = u.data();
            window.allUsersRows.push({ 
                id: u.id, 
                name: d.name || "Unknown", 
                phone: d.phone || "---", 
                total: map[d.phone] || 0, 
                role: d.role || "user", 
                password: d.password || "",
                points: Number(d.points || 0),
                age: d.age || "",
                height: d.height || "",
                weight: d.weight || "",
                photo: d.photo || null,
                admin_view_only: d.admin_view_only || false,
                admin_settings_only: d.admin_settings_only || false,
                admin_task_only: d.admin_task_only || false
            });
        });

        renderDashTable();
        loadWhatsAppDashboardStats();
    } catch (e) {
        console.error(e);
        alert("Dashboard Load Error: " + e.message);
    }
};

window.renderDashTable = () => {
    const term = (document.getElementById("d_search")?.value || "").toLowerCase();
    const roleFilter = document.getElementById("d_role_filter")?.value || "all";
    if (!window.allUsersRows) return;
    const rows = window.allUsersRows.filter(r => 
        ((r.name || "").toLowerCase().includes(term) || (r.phone || "").includes(term)) &&
        (roleFilter === "all" || r.role === roleFilter)
    );

    rows.sort((a, b) => b.total - a.total);
    const body = document.getElementById("dashBody");
    body.innerHTML = "";
    let rank = 0, prev = null, sl = 0;
    const isViewOnly = currentAdminPerms.admin_view_only;

    rows.forEach(r => {
        if (prev === null || r.total < prev) rank++;
        prev = r.total; sl++;
        const tr = document.createElement("tr");
        if (rank <= 3) tr.className = `rank-${rank}`;
        tr.innerHTML = `
            <td onclick="openAdminUserModal('${r.phone}')" style="cursor: pointer; font-weight: 500;">${sl}</td>
            <td onclick="openAdminUserModal('${r.phone}')" style="cursor: pointer; font-weight: 500;">${rank}</td>
            <td onclick="openAdminUserModal('${r.phone}')" style="cursor: pointer;">
                <span style="font-weight: 700; color: var(--primary); text-decoration: underline;" onmouseover="this.style.color='var(--secondary)'" onmouseout="this.style.color='var(--primary)'">${r.name}</span>
                ${r.role === 'admin' ? '👑' : ''}
            </td>
            <td onclick="openAdminUserModal('${r.phone}')" style="cursor: pointer;">${r.phone}</td>
            <td onclick="openAdminUserModal('${r.phone}')" style="cursor: pointer; font-weight: 700; color: var(--primary);">${r.total}</td>
            <td>
                <div style="display:flex; gap:5px; align-items:center; justify-content:center; flex-wrap:wrap;">
                    <input id="p_${r.phone}" type="number" style="width:60px; padding:5px; border-radius:5px; border:1px solid #ddd;" placeholder="Pts" ${isViewOnly ? 'disabled' : ''}>
                    <button class="btn-primary btn-sm" onclick="addPoint('${r.phone}', 'add')" ${isViewOnly ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>+</button>
                    <button class="btn-primary btn-sm" style="background:#444; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="addPoint('${r.phone}', 'set')" ${isViewOnly ? 'disabled' : ''}>Set</button>
                    <button class="btn-primary btn-sm" style="background:${r.role === 'admin' ? 'var(--error)' : '#10b981'}; font-size: 0.7rem; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="toggleAdmin('${r.id}', '${r.role}')" ${isViewOnly ? 'disabled' : ''}>${r.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}</button>
                    <button class="btn-primary btn-sm" style="background:var(--secondary); font-size: 0.7rem;" onclick="openAdminUserModal('${r.phone}')">👤 Manage</button>
                    <button class="btn-primary btn-sm" style="background:#0284c7; font-size: 0.7rem;" onclick="viewUserHistory('${r.phone}')">📜 History</button>
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
    if (checkViewOnlyBlocked()) return;
    const vInput = document.getElementById("p_" + phone);
    let v = Number(vInput.value);
    
    const userRow = window.allUsersRows.find(r => r.phone === phone);
    if (!userRow) return;

    if (mode === 'set') {
        const currentTotal = userRow.total;
        v = v - currentTotal; // Calculate difference
    }

    if (v === 0) return;
    
    // 1. Add record to votes collection
    await addDoc(collection(db, "votes"), { phone, points: v, date: today(), source: "admin" });
    
    // 2. Update points field on users collection so leaderboard matches!
    try {
        const newPointsVal = Number(userRow.points) + v;
        await updateDoc(doc(db, "users", userRow.id), { points: newPointsVal });
    } catch (err) {
        console.error("Failed to sync user doc points directly:", err);
    }
    
    // Log admin action
    await logAdminAction("Adjusted Points", `Manually adjusted points for ${userRow.name} (${phone}) by ${v} points (Mode: ${mode})`);
    
    vInput.value = "";
    dashLoad();
};

window.toggleAdmin = async (userId, currentRole) => {
    if (checkViewOnlyBlocked()) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const msg = newRole === 'admin' ? "Make this user an admin?" : "Remove admin rights from this user?";
    if (!confirm(msg)) return;
    
    try {
        await updateDoc(doc(db, "users", userId), { role: newRole });
        
        // Log action
        const userRow = window.allUsersRows.find(r => r.id === userId);
        const name = userRow ? userRow.name : "Unknown User";
        const phone = userRow ? userRow.phone : "---";
        await logAdminAction("Toggle Role", `Changed role of user ${name} (${phone}) to ${newRole}`);
        
        alert(`User role updated to ${newRole}!`);
        dashLoad();
    } catch (e) {
        console.error("Failed to toggle admin:", e);
        alert("Error: " + e.message);
    }
};

// --- ADMIN MANAGE USER DETAILS MODAL ---
window.selectedAdminEditPhotoBase64 = null;

// Register file select & role compression events
setTimeout(() => {
    const fileInput = document.getElementById("adminEditPhotoInput");
    if (fileInput) {
        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const max_size = 200;
                    if (width > height) {
                        if (width > max_size) {
                            height *= max_size / width;
                            width = max_size;
                        }
                    } else {
                        if (height > max_size) {
                            width *= max_size / height;
                            height = max_size;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                    window.selectedAdminEditPhotoBase64 = compressedBase64;
                    
                    const preview = document.getElementById("adminEditPhotoPreview");
                    if (preview) {
                        preview.style.background = `url(${compressedBase64}) no-repeat center center`;
                        preview.style.backgroundSize = "cover";
                        preview.textContent = "";
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const roleSel = document.getElementById("adminEditRole");
    const permSection = document.getElementById("adminPermSection");
    if (roleSel && permSection) {
        roleSel.addEventListener("change", () => {
            if (roleSel.value === "admin") {
                permSection.style.display = "block";
            } else {
                permSection.style.display = "none";
                document.getElementById("adminEditPermViewOnly").checked = false;
                document.getElementById("adminEditPermSettingsOnly").checked = false;
                document.getElementById("adminEditPermTaskOnly").checked = false;
            }
        });
    }
}, 500);

window.togglePasswordVisibility = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
    } else {
        input.type = "password";
        btn.textContent = "👁️";
    }
};

window.openAdminUserModal = (phone) => {
    const targetClean = cleanPhone(phone);
    let r;
    if (targetClean === "") {
        r = window.allUsersRows.find(user => String(user.phone) === String(phone));
    } else {
        r = window.allUsersRows.find(user => cleanPhone(user.phone) === targetClean);
    }
    if (!r) return alert("User not found!");
    
    const isViewOnly = currentAdminPerms.admin_view_only;

    document.getElementById("adminEditUserId").value = r.id;
    document.getElementById("adminEditOldPhone").value = r.phone;
    document.getElementById("adminEditOldPoints").value = r.total;

    document.getElementById("adminEditName").value = r.name;
    document.getElementById("adminEditPhone").value = r.phone;
    document.getElementById("adminEditPoints").value = r.total;
    document.getElementById("adminEditPassword").value = r.password || "";
    document.getElementById("adminEditRole").value = r.role || "user";
    
    // Bind additional details
    document.getElementById("adminEditAge").value = r.age || "";
    document.getElementById("adminEditHeight").value = r.height || "";
    document.getElementById("adminEditWeight").value = r.weight || "";
    
    // Bind granular permissions
    document.getElementById("adminEditPermViewOnly").checked = r.admin_view_only || false;
    document.getElementById("adminEditPermSettingsOnly").checked = r.admin_settings_only || false;
    document.getElementById("adminEditPermTaskOnly").checked = r.admin_task_only || false;

    // View-Only restrictions in modal fields
    document.getElementById("adminEditName").disabled = isViewOnly;
    document.getElementById("adminEditPhone").disabled = isViewOnly;
    document.getElementById("adminEditPoints").disabled = isViewOnly;
    document.getElementById("adminEditPassword").disabled = isViewOnly;
    document.getElementById("adminEditAge").disabled = isViewOnly;
    document.getElementById("adminEditHeight").disabled = isViewOnly;
    document.getElementById("adminEditWeight").disabled = isViewOnly;
    document.getElementById("adminEditRole").disabled = isViewOnly;
    document.getElementById("adminEditPermViewOnly").disabled = isViewOnly;
    document.getElementById("adminEditPermSettingsOnly").disabled = isViewOnly;
    document.getElementById("adminEditPermTaskOnly").disabled = isViewOnly;
    
    const saveBtn = document.getElementById("adminUserSaveBtn");
    if (saveBtn) {
        saveBtn.style.display = isViewOnly ? "none" : "inline-block";
    }
    
    const photoInputLabel = document.querySelector('label[for="adminEditPhotoInput"]');
    if (photoInputLabel) {
        photoInputLabel.style.display = isViewOnly ? "none" : "inline-block";
    }
    
    // Manage granular permissions section display
    const permSection = document.getElementById("adminPermSection");
    if (permSection) {
        permSection.style.display = r.role === "admin" ? "block" : "none";
    }
    
    // Bind photo preview
    window.selectedAdminEditPhotoBase64 = null;
    const preview = document.getElementById("adminEditPhotoPreview");
    if (preview) {
        if (r.photo) {
            preview.style.background = `url(${r.photo}) no-repeat center center`;
            preview.style.backgroundSize = "cover";
            preview.textContent = "";
        } else {
            preview.style.background = "linear-gradient(135deg, #a855f7, #6366f1)";
            preview.style.backgroundSize = "cover";
            preview.textContent = (r.name || "U").charAt(0).toUpperCase();
        }
    }
    
    // Reset password visibility state
    const passInput = document.getElementById("adminEditPassword");
    if (passInput) passInput.type = "password";
    const passBtn = passInput?.nextElementSibling;
    if (passBtn) passBtn.textContent = "👁️";
    
    document.getElementById("adminUserModal").style.display = "flex";
};

window.closeAdminUserModal = () => {
    document.getElementById("adminUserModal").style.display = "none";
};

window.saveAdminUserChanges = async () => {
    if (checkViewOnlyBlocked()) return;
    const userId = document.getElementById("adminEditUserId").value;
    const oldPhone = document.getElementById("adminEditOldPhone").value;
    const oldPoints = Number(document.getElementById("adminEditOldPoints").value) || 0;

    const name = document.getElementById("adminEditName").value.trim();
    const phone = document.getElementById("adminEditPhone").value.trim();
    const pointsVal = Number(document.getElementById("adminEditPoints").value) || 0;
    const password = document.getElementById("adminEditPassword").value.trim();
    const role = document.getElementById("adminEditRole").value;

    const ageVal = document.getElementById("adminEditAge").value;
    const age = ageVal !== "" ? Number(ageVal) : null;
    
    const heightVal = document.getElementById("adminEditHeight").value;
    const height = heightVal !== "" ? Number(heightVal) : null;
    
    const weightVal = document.getElementById("adminEditWeight").value;
    const weight = weightVal !== "" ? Number(weightVal) : null;

    const admin_view_only = role === "admin" ? document.getElementById("adminEditPermViewOnly").checked : false;
    const admin_settings_only = role === "admin" ? document.getElementById("adminEditPermSettingsOnly").checked : false;
    const admin_task_only = role === "admin" ? document.getElementById("adminEditPermTaskOnly").checked : false;

    if (!name || !phone || !password) {
        return alert("Name, Phone, and Password cannot be empty");
    }

    const saveBtn = document.getElementById("adminUserSaveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        // 1. If points changed, calculate delta and log in votes collection
        const pointsDelta = pointsVal - oldPoints;
        if (pointsDelta !== 0) {
            await addDoc(collection(db, "votes"), { 
                phone: phone, 
                points: pointsDelta, 
                date: today(), 
                source: "admin" 
            });
        }

        // 2. If phone changed, migrate all historical votes to new phone number
        if (phone !== oldPhone) {
            console.log(`Migrating historical votes from ${oldPhone} to ${phone}`);
            
            // Search standard string phone
            const votesSnapStr = await getDocs(query(collection(db, "votes"), where("phone", "==", String(oldPhone))));
            const promises = [];
            votesSnapStr.forEach(d => {
                promises.push(updateDoc(d.ref, { phone: phone }));
            });
            
            // Search number phone fallback
            if (!isNaN(oldPhone)) {
                const votesSnapNum = await getDocs(query(collection(db, "votes"), where("phone", "==", Number(oldPhone))));
                votesSnapNum.forEach(d => {
                    promises.push(updateDoc(d.ref, { phone: phone }));
                });
            }
            
            await Promise.all(promises);
            console.log(`Migrated ${promises.length} vote records successfully.`);
        }

        // 3. Update the main user document in Firestore
        const updateData = {
            name,
            phone,
            password,
            role,
            points: pointsVal, // Sync the points field for the global leaderboard!
            age,
            height,
            weight,
            admin_view_only,
            admin_settings_only,
            admin_task_only
        };
        
        if (window.selectedAdminEditPhotoBase64) {
            updateData.photo = window.selectedAdminEditPhotoBase64;
        }

        await updateDoc(doc(db, "users", userId), updateData);

        // Log action
        await logAdminAction("Updated User Details", `Updated details of user ${name} (${phone}). Points delta: ${pointsDelta}.`);

        alert("User details updated successfully! ✅");
        closeAdminUserModal();
        dashLoad();
    } catch (e) {
        console.error("Failed to save user modifications:", e);
        alert("Failed to update user details: " + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
    }
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
    
    // Set default task report date to current vote date
    const dateInput = document.getElementById("t_date");
    if (dateInput) {
        dateInput.value = getVoteDate();
    }
}

window.addPointForTask = async (phone, taskId, dateVal) => {
    if (checkViewOnlyBlocked()) return;
    
    try {
        const taskSnap = await getDoc(doc(db, "tasks", taskId));
        if (!taskSnap.exists()) return alert("Task not found!");
        const taskData = taskSnap.data();
        const points = Number(taskData.points || 0);
        
        if (confirm(`Mark this task as completed for this user and award ${points} points?`)) {
            // 1. Add to votes collection
            await addDoc(collection(db, "votes"), {
                phone: phone,
                points: points,
                taskId: taskId,
                date: dateVal,
                timestamp: new Date(),
                source: "admin"
            });
            
            // 2. Increment user's total points in the users collection
            const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", phone)));
            if (userSnap.empty && !isNaN(phone)) {
                const userSnapNum = await getDocs(query(collection(db, "users"), where("phone", "==", Number(phone))));
                if (!userSnapNum.empty) {
                    const currentPoints = userSnapNum.docs[0].data().points || 0;
                    await updateDoc(userSnapNum.docs[0].ref, {
                        points: Math.max(0, currentPoints + points)
                    });
                }
            } else if (!userSnap.empty) {
                const currentPoints = userSnap.docs[0].data().points || 0;
                await updateDoc(userSnap.docs[0].ref, {
                    points: Math.max(0, currentPoints + points)
                });
            }
            // Log action
            await logAdminAction("Award Task Points", `Awarded ${points} points to ${phone} for completing task "${taskData.text}" on date ${dateVal}`);
            
            alert("Points added successfully! ✅");
            taskLoad();
        }
    } catch (e) {
        console.error(e);
        alert("Failed to add points: " + e.message);
    }
};

window.taskLoad = async () => {
    const taskId = document.getElementById("t_task").value;
    if (!taskId) return alert("Please select a task.");
    const dateVal = document.getElementById("t_date").value || getVoteDate();
    
    // Fetch the task document to check if it's a special task (has startDate)
    const taskSnap = await getDoc(doc(db, "tasks", taskId));
    const isSpecialTask = taskSnap.exists() && !!taskSnap.data().startDate;
    
    const users = await getDocs(collection(db, "users"));
    
    // Query votes only for this date and task
    const votesSnap = await getDocs(query(
        collection(db, "votes"),
        where("date", "==", dateVal),
        where("taskId", "==", taskId)
    ));
    
    const map = {};
    votesSnap.forEach(v => {
        const x = v.data();
        const cp = cleanPhone(x.phone);
        map[cp] = {
            points: Number(x.points || 0),
            isSpecial: !!x.isSpecial || isSpecialTask,
            pointsCredited: x.pointsCredited !== false,
            voteId: v.id
        };
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
        const cp = cleanPhone(p);
        const voteInfo = map[cp];
        if (voteInfo) {
            let ptsHtml = "";
            if (voteInfo.isSpecial) {
                if (voteInfo.pointsCredited) {
                    ptsHtml = `<span style="color:var(--success); font-weight:700;">${voteInfo.points} pts (Credited ✅)</span>`;
                } else {
                    ptsHtml = `<span style="color:orange; font-weight:700;">${voteInfo.points} pts (Special - Pending)</span>
                               <button class="btn-primary btn-sm" style="background:#10b981; border-color:#10b981; margin-left: 10px;" onclick="creditSpecialPoints('${voteInfo.voteId}', '${p}', ${voteInfo.points})">Add Points</button>`;
                }
            } else {
                ptsHtml = `<span style="color:var(--success); font-weight:700;">${voteInfo.points} pts</span>`;
            }
            votedBody.innerHTML += `<tr><td>${n}</td><td>${p}</td><td>${ptsHtml}</td></tr>`;
        } else {
            notBody.innerHTML += `<tr><td>${n}</td><td>${p}</td><td><button class="btn-primary btn-sm" onclick="addPointForTask('${p}', '${taskId}', '${dateVal}')">Add Pts</button></td></tr>`;
        }
    });
};

window.creditSpecialPoints = async (voteDocId, phoneVal, points) => {
    if (checkViewOnlyBlocked()) return;
    
    if (!confirm(`Are you sure you want to credit ${points} points to this user's profile for completing this Special Task?`)) return;
    
    try {
        await updateDoc(doc(db, "votes", voteDocId), { pointsCredited: true });
        
        const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", phoneVal)));
        if (userSnap.empty && !isNaN(phoneVal)) {
            const userSnapNum = await getDocs(query(collection(db, "users"), where("phone", "==", Number(phoneVal))));
            if (!userSnapNum.empty) {
                const currentPoints = userSnapNum.docs[0].data().points || 0;
                await updateDoc(userSnapNum.docs[0].ref, {
                    points: currentPoints + Number(points)
                });
            } else {
                console.warn(`User with phone ${phoneVal} not found in users collection to add special points!`);
            }
        } else if (!userSnap.empty) {
            const currentPoints = userSnap.docs[0].data().points || 0;
            await updateDoc(userSnap.docs[0].ref, {
                points: currentPoints + Number(points)
            });
        } else {
            console.warn(`User with phone ${phoneVal} not found in users collection to add special points!`);
        }
        
        // Log action
        await logAdminAction("Credit Special Task", `Credited ${points} points to user ${phoneVal} for completed Special Task`);

        alert("Special task points credited successfully! ✅");
        taskLoad();
        if (typeof specialTaskLoad === "function") specialTaskLoad();
    } catch (e) {
        console.error("Failed to credit special points:", e);
        alert("Error: " + e.message);
    }
};

window.switchTaskSubTab = (tab) => {
    document.querySelectorAll('.subtab').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = 'var(--text-secondary)';
    });
    const activeEl = document.getElementById('subtab-' + tab);
    if (activeEl) {
        activeEl.style.background = 'var(--primary)';
        activeEl.style.color = 'white';
    }
    
    if (tab === 'regular') {
        document.getElementById('task-regular-container').style.display = 'block';
        document.getElementById('task-special-container').style.display = 'none';
    } else {
        document.getElementById('task-regular-container').style.display = 'none';
        document.getElementById('task-special-container').style.display = 'block';
        specialTaskLoad();
    }
};

window.specialTaskLoad = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const tasksSnap = await getDocs(collection(db, "tasks"));
        const votesSnap = await getDocs(collection(db, "votes"));

        const userMap = {};
        usersSnap.forEach(u => {
            const d = u.data();
            userMap[cleanPhone(d.phone)] = d.name || "Unknown";
        });

        const taskMap = {};
        const specialTaskIds = new Set();
        tasksSnap.forEach(t => {
            const tData = t.data();
            taskMap[t.id] = tData.text || "Special Task";
            if (tData.startDate) {
                specialTaskIds.add(t.id);
            }
        });

        const specialVotes = [];
        votesSnap.forEach(v => {
            const x = v.data();
            const isSpecialTask = x.isSpecial || specialTaskIds.has(x.taskId);
            if (isSpecialTask) {
                specialVotes.push({
                    id: v.id,
                    phone: x.phone,
                    points: Number(x.points || 0),
                    date: x.date || "",
                    taskId: x.taskId || "",
                    pointsCredited: x.pointsCredited || false,
                    taskText: taskMap[x.taskId] || "Special Task",
                    specialAnswer: x.specialAnswer || ""
                });
            }
        });

        // Sort special votes by date descending
        specialVotes.sort((a, b) => b.date.localeCompare(a.date));

        const body = document.getElementById("t_special_body");
        body.innerHTML = "";
        
        const isViewOnly = currentAdminPerms.admin_view_only;

        if (specialVotes.length === 0) {
            body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No special task votes found.</td></tr>`;
            return;
        }

        specialVotes.forEach((v, index) => {
            const userName = userMap[cleanPhone(v.phone)] || "Unknown";
            const statusHtml = v.pointsCredited 
                ? `<span style="color:var(--success); font-weight:700;">Credited ✅</span>` 
                : `<span style="color:orange; font-weight:700;">Pending ⏳</span>`;

            let actionHtml = "";
            if (!v.pointsCredited) {
                actionHtml += `<button class="btn-primary btn-sm" style="background:#10b981; border-color:#10b981; margin-right:5px; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="creditSpecialPoints('${v.id}', '${v.phone}', ${v.points})" ${isViewOnly ? 'disabled' : ''}>Approve</button>`;
            }
            actionHtml += `
                <button class="btn-primary btn-sm" style="background:#3b82f6; border-color:#3b82f6; margin-right:5px; padding: 4px 10px; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="adjustSpecialPoints('${v.id}', '${v.phone}', 1)" ${isViewOnly ? 'disabled' : ''}>+</button>
                <button class="btn-primary btn-sm" style="background:#ef4444; border-color:#ef4444; margin-right:5px; padding: 4px 10px; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="adjustSpecialPoints('${v.id}', '${v.phone}', -1)" ${isViewOnly ? 'disabled' : ''}>-</button>
                <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error); ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="deleteSpecialVote('${v.id}', '${v.phone}', ${v.points}, ${v.pointsCredited})" ${isViewOnly ? 'disabled' : ''}>Delete</button>
            `;

            let answerHtml = v.specialAnswer 
                ? `<div style="margin-top: 4px; font-size: 0.75rem; background: #fffbeb; padding: 4px 8px; border-radius: 4px; border-left: 2px solid #d97706; color: #92400e; font-style: italic;"><b>Ans:</b> ${v.specialAnswer}</div>`
                : '';

            body.innerHTML += `<tr>
                <td>${v.date}</td>
                <td><b>${userName}</b><br><span style="font-size:0.8rem; color:var(--text-muted);">${v.phone}</span></td>
                <td>${v.taskText}${answerHtml}</td>
                <td style="font-weight:700; color:var(--primary);">${v.points} pts</td>
                <td>${statusHtml}</td>
                <td>
                    <div style="display:flex; gap:5px; justify-content:center; align-items:center;">
                        ${actionHtml}
                    </div>
                </td>
            </tr>`;
        });

    } catch (e) {
        console.error("Failed to load special tasks report:", e);
    }
};

window.adjustSpecialPoints = async (voteId, phoneVal, delta) => {
    if (checkViewOnlyBlocked()) return;
    
    try {
        const voteRef = doc(db, "votes", voteId);
        const voteSnap = await getDoc(voteRef);
        if (!voteSnap.exists()) return alert("Vote record not found");
        
        const currentPoints = Number(voteSnap.data().points || 0);
        const newPoints = currentPoints + delta;
        if (newPoints < 0) return alert("Points cannot be negative!");
        
        // 1. Update points in the vote record
        await updateDoc(voteRef, { points: newPoints });
        
        // 2. If already credited, sync/update the user's total points as well!
        if (voteSnap.data().pointsCredited === true) {
            const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", phoneVal)));
            if (userSnap.empty && !isNaN(phoneVal)) {
                const userSnapNum = await getDocs(query(collection(db, "users"), where("phone", "==", Number(phoneVal))));
                if (!userSnapNum.empty) {
                    const uDoc = userSnapNum.docs[0];
                    const userPoints = Number(uDoc.data().points || 0);
                    await updateDoc(uDoc.ref, {
                        points: Math.max(0, userPoints + delta)
                    });
                }
            } else if (!userSnap.empty) {
                const uDoc = userSnap.docs[0];
                const userPoints = Number(uDoc.data().points || 0);
                await updateDoc(uDoc.ref, {
                    points: Math.max(0, userPoints + delta)
                });
            }
        }
        
        // Log action
        await logAdminAction("Adjust Special Points", `Adjusted special task points for user ${phoneVal} (Vote ID: ${voteId}) by ${delta} points`);
        
        // Refresh views
        specialTaskLoad();
        dashLoad();
    } catch (e) {
        console.error("Adjustment failed:", e);
        alert("Error: " + e.message);
    }
};

window.deleteSpecialVote = async (voteId, phoneVal, points, pointsCredited) => {
    if (checkViewOnlyBlocked()) return;
    
    if (!confirm("Are you sure you want to delete this special task vote record? This will also automatically deduct the points from the user's total score if already credited!")) return;
    
    try {
        // 1. Deduct points from user profile if already credited
        if (pointsCredited && points > 0) {
            const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", phoneVal)));
            if (userSnap.empty && !isNaN(phoneVal)) {
                const userSnapNum = await getDocs(query(collection(db, "users"), where("phone", "==", Number(phoneVal))));
                if (!userSnapNum.empty) {
                    const uDoc = userSnapNum.docs[0];
                    const userPoints = Number(uDoc.data().points || 0);
                    await updateDoc(uDoc.ref, {
                        points: Math.max(0, userPoints - points)
                    });
                }
            } else if (!userSnap.empty) {
                const uDoc = userSnap.docs[0];
                const userPoints = Number(uDoc.data().points || 0);
                await updateDoc(uDoc.ref, {
                    points: Math.max(0, userPoints - points)
                });
            }
        }
        
        // 2. Delete the vote record
        await deleteDoc(doc(db, "votes", voteId));
        
        // Log action
        await logAdminAction("Delete Special Vote", `Deleted Special Task vote record (Vote ID: ${voteId}) for user ${phoneVal} (deducted ${points} points)`);
        
        alert("Special task vote deleted successfully! ✅");
        specialTaskLoad();
        dashLoad();
    } catch (e) {
        console.error("Failed to delete special vote:", e);
        alert("Error: " + e.message);
    }
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

window.viewUserHistory = async (phone) => {
    closeAdminUserModal();
    // Navigate to user page styling
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById('page-user').classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navUser = document.getElementById('nav-user');
    if (navUser) navUser.classList.add('active');
    
    // Initialize user report select menu
    await userInit();
    
    // Select the phone number and load history
    const sel = document.getElementById("u_user");
    if (sel) {
        sel.value = phone;
    }
    userLoad();
};

window.userLoad = async () => {
    const phone = document.getElementById("u_user").value;
    const from = document.getElementById("u_from").value;
    const to = document.getElementById("u_to").value;
    const votesSnap = await getDocs(collection(db, "votes"));
    const isViewOnly = currentAdminPerms.admin_view_only;
    
    // Fetch all tasks to identify special task IDs as a backup safeguard
    const tasksSnap = await getDocs(collection(db, "tasks"));
    const specialTaskIds = new Set();
    tasksSnap.forEach(doc => {
        const taskData = doc.data();
        if (taskData.startDate) {
            specialTaskIds.add(doc.id);
        }
    });

    // Group votes by date to show daily total points
    const dateGroups = {};

    votesSnap.forEach(v => {
        const x = v.data();
        if (x.phone !== phone) return;
        const isSpecialTask = x.isSpecial || specialTaskIds.has(x.taskId);
        if (isSpecialTask && !x.pointsCredited) return; // Skip uncredited special votes
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
                    <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error); ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="delVotes('${r.ids.join(",")}')" ${isViewOnly ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>`;
    });
};

window.delVotes = async (idsStr) => {
    if (checkViewOnlyBlocked()) return;
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

        // Log action
        await logAdminAction("Delete Vote Records", `Deleted voting records for phone ${userPhone} (deducted total of ${totalDeductedPoints} points)`);

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

    // Fetch all tasks to identify special task IDs as a backup safeguard
    const tasksSnap = await getDocs(collection(db, "tasks"));
    const specialTaskIds = new Set();
    tasksSnap.forEach(doc => {
        const taskData = doc.data();
        if (taskData.startDate) {
            specialTaskIds.add(doc.id);
        }
    });

    const nameMap = {};
    usersSnap.forEach(u => nameMap[u.data().phone] = u.data().name);

    const pointMap = {};
    votesSnap.forEach(v => {
        const x = v.data();
        if (x.source === "admin") return;
        const isSpecialTask = x.isSpecial || specialTaskIds.has(x.taskId);
        if (isSpecialTask && !x.pointsCredited) return; // Skip uncredited special votes
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
        
        const isViewOnly = currentAdminPerms.admin_view_only;
        
        snap.forEach(d => {
            const r = d.data();
            const isEdit = r.requestType === "edit";
            const typeLabel = isEdit 
                ? `<span style="background:#fef3c7; color:#d97706; padding: 2px 6px; border-radius: 4px; font-size:0.65rem; font-weight:800; border: 1px solid #fde68a; margin-left: 8px; text-transform: uppercase;">✏️ Correction</span>`
                : `<span style="background:#e0f2fe; color:#0369a1; padding: 2px 6px; border-radius: 4px; font-size:0.65rem; font-weight:800; border: 1px solid #bae6fd; margin-left: 8px; text-transform: uppercase;">⏳ Backdate</span>`;
            
            const reasonText = r.reason 
                ? `<div style="font-size: 0.75rem; color: #475569; background: #f8fafc; padding: 8px; border-radius: 8px; margin-top: 8px; border-left: 3px solid #94a3b8; font-style: italic; line-height: 1.4;">
                    <b>Reason / Detail:</b> ${r.reason}
                   </div>`
                : ``;

            list.innerHTML += `
                <div class="panel" style="padding: 15px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 8px; background: #fffdf5; border-radius: 12px; margin-bottom: 10px; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1; min-width: 250px;">
                            <div style="font-weight: 700; font-size: 0.95rem; color: var(--primary); display: flex; align-items: center; gap: 4px;">
                                ${r.name} (${r.phone}) ${typeLabel}
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                                Requested Date: <b>${r.date}</b> • Proposed Points: <b style="color: var(--success);">+${r.totalPoints} pts</b>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                                <b>Proposed Tasks:</b> ${r.tasks && r.tasks.length ? r.tasks.map(t => t.text).join(", ") : "No tasks selected (Delete All)"}
                            </div>
                            ${reasonText}
                        </div>
                        <div style="display: flex; gap: 8px; align-self: center;">
                            <button class="btn-primary btn-sm" onclick="approveRequest('${d.id}')" style="background: var(--success); border-color: var(--success); padding: 6px 12px; font-size: 0.8rem; cursor: pointer; color: white; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${isViewOnly ? 'disabled' : ''}>Approve</button>
                            <button class="btn-secondary btn-sm" onclick="rejectRequest('${d.id}')" style="color: var(--error); border-color: var(--error); padding: 6px 12px; font-size: 0.8rem; cursor: pointer; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${isViewOnly ? 'disabled' : ''}>Reject</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Load requests failed:", e);
    }
};

window.approveRequest = async (id) => {
    if (checkViewOnlyBlocked()) return;
    if (!confirm("Are you sure you want to approve this request?")) return;
    
    try {
        const docRef = doc(db, "backdate_requests", id);
        const reqSnap = await getDoc(docRef);
        if (!reqSnap.exists()) return alert("Request not found");
        
        const r = reqSnap.data();
        const isEdit = r.requestType === "edit";
        
        let pointsToDeduct = 0;
        
        // 1. If it's a correction request, find and delete all existing votes for this user on this date
        if (isEdit) {
            const votesQuery = query(
                collection(db, "votes"), 
                where("phone", "==", r.phone), 
                where("date", "==", r.date)
            );
            const votesSnap = await getDocs(votesQuery);
            for (const voteDoc of votesSnap.docs) {
                const vData = voteDoc.data();
                // Deduct points only if it's not a special task, or if it is a special task and points are already credited
                if (!vData.isSpecial || vData.pointsCredited) {
                    pointsToDeduct += Number(vData.points || 0);
                }
                await deleteDoc(voteDoc.ref);
            }
        }
        
        // 2. Add a single consolidated vote entry for the total points of all selected tasks
        await addDoc(collection(db, "votes"), {
            phone: r.phone,
            points: Number(r.totalPoints),
            taskId: "backdate_consolidated",
            date: r.date,
            timestamp: new Date().toISOString(),
            source: isEdit ? "correction_approval" : "backdate_approval",
            tasks: r.tasks && r.tasks.length ? r.tasks.map(t => t.text).join(", ") : "No tasks selected (Delete All)"
        });
        
        // 3. Update user's points (deducting previous and adding new)
        const userSnap = await getDocs(query(collection(db, "users"), where("phone", "==", r.phone)));
        if (!userSnap.empty) {
            const uDoc = userSnap.docs[0];
            const currentPoints = uDoc.data().points || 0;
            const newPoints = Math.max(0, currentPoints - pointsToDeduct + Number(r.totalPoints));
            await updateDoc(uDoc.ref, {
                points: newPoints
            });
        }
        
        // 4. Mark request as approved
        await updateDoc(docRef, { status: "approved" });
        
        // Log action
        await logAdminAction("Approve Backdate Request", `Approved ${r.requestType || 'backdate'} request for user ${r.name} (${r.phone}) for date ${r.date} (+${r.totalPoints} pts)`);
        
        alert("Request approved successfully! Changes applied. ✅");
        dashLoad(); // Reload dashboard to update scores and requests list
    } catch (e) {
        console.error("Approve failed:", e);
        alert("Error: " + e.message);
    }
};

window.rejectRequest = async (id) => {
    if (checkViewOnlyBlocked()) return;
    if (!confirm("Are you sure you want to reject this request?")) return;
    
    try {
        const docRef = doc(db, "backdate_requests", id);
        const reqSnap = await getDoc(docRef);
        const r = reqSnap.exists() ? reqSnap.data() : null;
        
        await updateDoc(docRef, { status: "rejected" });
        
        // Log action
        if (r) {
            await logAdminAction("Reject Backdate Request", `Rejected ${r.requestType || 'backdate'} request for user ${r.name} (${r.phone}) for date ${r.date}`);
        } else {
            await logAdminAction("Reject Backdate Request", `Rejected request ID ${id}`);
        }
        
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

// --- FCM PUSH NOTIFICATION SENDER ---

// Signs a JWT with the service account private key using SubtleCrypto
async function getOAuthToken() {
    const SA = {
        client_email: "firebase-adminsdk-fbsvc@daily-voting-793ee.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCEcm9RTwl5hrq\nhe+Je4JpYmYhdl7j5gjZI1omGjPWNzs5AGi0dlIibqidSa8qMqzeWA+nOATwW001\nDln3TpmDAsK82cRDzmLflzt7n6ov/YJHCZI+DyYka7+g4PHLeVoAqr4Q4GC49WGB\np9XLnvZcEL/mvy0NemTOLzV9V5TjmxzLsg7+WEMmtX+gq8QYWtuFPtYzi2RKnCsB\nUI0SNxtZe21haJF30F5NIHcfNRStXqMqvDneM8L0Z4I//yY63+cxri7KLKmAbUD4\nPO5zvvJQkG2FWYJXvKA1mrqYc62umZhLuTtTl4clvuJVK2KQmziq3n25PVtP4EWS\n6uT/auTnAgMBAAECggEADWdJxf8MesLxZEs10mABD3g9UjL+YMJteq8SCy76Gjcc\nVFaD5MWF7LI0hmXQFEZbDCGMNeIM7UYmXJ4OIUzWFhH7EyyofSpkR8mxJlujrHGC\nLZfVTYtMThhRrDHSYVmTRBfcIrGXMeRjWfTBM7FZ6zKOSR3hEFzorhjdRTfm+kUz\nIzsnCnpz/3t+Py1cc6tl1OIuhTMSlZ0MSLmV8mNv07U2MsuSGDWg52ZmcvMq3dXo\nHHEPWL/RSffNJ9MsrCa04r+CJX3UaXLDYHr8QmaYsZCxXOk7G2IRi9rdZVVGm9q/\n71GiWLl/vVswliW064EtL9MyRRl/WvwxZpIWW1M+qQKBgQDlMZ2pLXpta9WbJPp5\ny/ESGs7BnKp9Pxb45QrmQjm5CEsoVxJ1SnoduzB4iW8HaGNKo/RlXdGOlyMdFVv7\nnRY7bo63E0hnhU0ne8zPTPDtPCn7eheHlGthNHRFtyi0PhTJxrIWs9sLFE6uKSyb\noZrpqhflRQJ0FD97hAbR+nGChQKBgQDYxIAk3t1uTtvflM69fIPLP1cFcq+FVKbQ\n1/nwaiUc/OCajjlAvqsyIJjY5c5R1hp5euTMueTLbH634BgedPNLpQMGZCYT6IIH\nsbuVrNYaL30I9oFN9m+Qra9oJLDWpicySK+l5SQ9/pvGhlILnuQQ4izT+VLzzJe8\nr6hQxrUjewKBgQDGlGGlJmlQC0GNZdG7288ov59qs2IomJQ/3Lu/25uFzUDJV///\nLiN2RSzvEyzm/zQghMQJW+ton1zmIw6KiIWtwtHWn9d5Ek9SKXrAFksdUaaSZCuk\n5hzPoRIpIVQcLzn1xbmh3/2msNanIbertK6zTBPeKxfAGZcTXsZGArd8vQKBgQDP\nnZVmuxa2uk0ZnftNvd61YptEmo3GVEfaK6I2RFP7qbCuF556hqSNxG7g/2pXM4vz\n4mMWOs4KkIXmM3qmYTlNsGRvUKiv1LgGCpMyTnJabjWByigatfgxSEmCo/HEBSvx\nm3CwogHOZvhocupOOwcRrK9m75wl6kVC8bNyen+v1QKBgFtPQG8nGgbbcfuIoXAg\nTB+dAaRPHEC+KAspKnMRPe447nzxdvmbMDbHtOs6hUC3bY4mw7OmTUrc5vIlIz3T\nFf7G/xjY8/B00N9ewz6Dp8g+ua9Es8qz2wFb2VnK4w8WmaFcNhYwTQZ20W+Yfdjx\nhsHFq5QHS0LQkklhKsmUGgjf\n-----END PRIVATE KEY-----\n"
    };

    const b64url = (str) => btoa(str).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const now = Math.floor(Date.now() / 1000);
    const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = b64url(JSON.stringify({
        iss: SA.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now, exp: now + 3600
    }));
    const unsigned = `${header}.${payload}`;

    const pemBody = SA.private_key.replace(/-----[^-]+-----\n?/g,'').replace(/\n/g,'');
    const keyBuf  = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0)).buffer;
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', keyBuf,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const jwt = `${unsigned}.${sig}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    const data = await res.json();
    return data.access_token;
}

async function sendFCMPushToAll(title, body) {
    try {
        console.log('[FCM] Starting push send...');
        const accessToken = await getOAuthToken();
        if (!accessToken) {
            console.error('[FCM] Failed to get OAuth token!');
            alert('❌ FCM Error: Could not get auth token. Check console.');
            return;
        }
        console.log('[FCM] OAuth token obtained ✅');

        const usersSnap = await getDocs(collection(db, 'users'));
        const tokens = [];
        usersSnap.forEach(u => { (u.data().fcmTokens || []).forEach(t => tokens.push(t)); });

        if (tokens.length === 0) {
            console.warn('[FCM] No FCM tokens found in Firestore! Users may not have granted notification permission.');
            alert('⚠️ No FCM tokens found! Users need to open the site and allow notifications first.');
            return;
        }
        console.log(`[FCM] Found ${tokens.length} token(s) to send to.`);

        const basePath = location.pathname.substring(0, location.pathname.indexOf('/admin/')) || '';
        const appRootUrl = location.origin + basePath;
        const iconUrl = `${appRootUrl}/photo/logo.png`;
        const clickUrl = `${appRootUrl}/user/voting.html`;

        let sent = 0, failed = 0;
        for (const token of tokens) {
            try {
                const r = await fetch('https://fcm.googleapis.com/v1/projects/daily-voting-793ee/messages:send', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: {
                        token,
                        notification: { title, body },
                        webpush: {
                            notification: { title, body, icon: iconUrl, requireInteraction: true },
                            fcm_options: { link: clickUrl }
                        }
                    }})
                });
                if (r.ok) {
                    sent++;
                    console.log(`[FCM] ✅ Sent to token: ${token.substring(0,20)}...`);
                } else {
                    failed++;
                    const errText = await r.text();
                    console.error(`[FCM] ❌ Failed for token ${token.substring(0,20)}... Status: ${r.status}`, errText);
                }
            } catch(e) {
                failed++;
                console.error('[FCM] Token send exception:', e);
            }
        }
        console.log(`[FCM] Done: ${sent} sent, ${failed} failed out of ${tokens.length} total.`);
        if (failed > 0 && sent === 0) {
            alert(`❌ FCM push failed for all ${failed} device(s). Check browser console (F12) for details.`);
        }
    } catch(e) {
        console.error('[FCM] sendFCMPushToAll error:', e);
        alert('❌ FCM push error: ' + e.message);
    }
}

window.saveMessage = async () => {
    if (checkViewOnlyBlocked()) return;
    const text      = document.getElementById("msg_text").value.trim();
    const type      = document.getElementById("msg_type").value;
    const schedType = document.getElementById("msg_sched_type").value;
    const schedTime = document.getElementById("msg_sched_time").value;
    const editId    = document.getElementById("edit_msg_id").value;

    if (!text) return alert("Write a message first");

    try {
        if (editId) {
            // Update existing broadcast
            await updateDoc(doc(db, "messages", editId), {
                text, type, schedType,
                schedTime: schedType === "scheduled" ? schedTime : "",
                timestamp: new Date().toISOString()
            });
            await logAdminAction("Update Broadcast", `Updated announcement message: "${text.substring(0, 50)}..."`);
            alert("Broadcast message updated successfully! ✅");
        } else {
            // Add new broadcast
            await addDoc(collection(db, "messages"), {
                text, type, schedType,
                schedTime: schedType === "scheduled" ? schedTime : "",
                timestamp: new Date().toISOString()
            });

            // Log action
            await logAdminAction("Send Broadcast", `Broadcasted message: "${text.substring(0, 50)}..."`);

            // Send FCM push immediately (even if scheduled — still notifies)
            await sendFCMPushToAll('\uD83D\uDD4A\uFE0F Faith & Fitness', text);
            alert("Message broadcasted + Push notifications sent! \uD83C\uDF89");
        }

        // Reset form
        document.getElementById("msg_text").value = "";
        document.getElementById("edit_msg_id").value = "";
        document.getElementById("save_msg_btn").textContent = "Broadcast Message";
        const cancelBtn = document.getElementById("cancel_msg_edit_btn");
        if (cancelBtn) cancelBtn.style.display = "none";

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
        const isViewOnly = currentAdminPerms.admin_view_only;
        
        snap.forEach(d => {
            const m = d.data();
            const timeInfo = m.schedType === "scheduled" ? `⏰ Daily at ${m.schedTime}` : "⚡ Immediate";
            const typeInfo = m.type === "announcement" ? "📢 Announcement" : "⏳ Reminder";
            
            const escapedText = m.text.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            list.innerHTML += `
                <div style="padding:12px; border:1px solid var(--border-light); border-radius:8px; display:flex; justify-content:space-between; align-items:center; background:#fafafa; margin-bottom: 5px;">
                    <div style="max-width:70%;">
                        <div style="font-size:0.85rem; font-weight:600;">${m.text}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
                            <span style="background:var(--primary); color:white; padding:2px 6px; border-radius:4px; font-size:0.65rem; font-weight:bold; margin-right:4px;">${typeInfo}</span> 
                            <span>${timeInfo}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-secondary btn-sm" style="padding:4px 8px; font-size:0.75rem; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="editMessage('${d.id}', '${escapedText}', '${m.type}', '${m.schedType}', '${m.schedTime || '20:00'}')" ${isViewOnly ? 'disabled' : ''}>Edit</button>
                        <button class="btn-secondary btn-sm" style="color:var(--error); border-color:var(--error); padding:4px 8px; font-size:0.75rem; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="deleteMessage('${d.id}')" ${isViewOnly ? 'disabled' : ''}>Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Load broadcasts failed:", e);
    }
};

window.editMessage = (id, text, type, schedType, schedTime) => {
    document.getElementById("edit_msg_id").value = id;
    document.getElementById("msg_text").value = text;
    document.getElementById("msg_type").value = type;
    document.getElementById("msg_sched_type").value = schedType;
    document.getElementById("msg_sched_time").value = schedTime || "20:00";
    
    document.getElementById("sched_time_wrapper").style.display = schedType === "scheduled" ? "block" : "none";
    document.getElementById("save_msg_btn").textContent = "Update Broadcast";
    
    const cancelBtn = document.getElementById("cancel_msg_edit_btn");
    if (cancelBtn) cancelBtn.style.display = "block";
    
    document.getElementById("msg_text").scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelMessageEdit = () => {
    document.getElementById("edit_msg_id").value = "";
    document.getElementById("msg_text").value = "";
    document.getElementById("msg_type").value = "announcement";
    document.getElementById("msg_sched_type").value = "immediate";
    document.getElementById("msg_sched_time").value = "20:00";
    document.getElementById("sched_time_wrapper").style.display = "none";
    
    document.getElementById("save_msg_btn").textContent = "Broadcast Message";
    const cancelBtn = document.getElementById("cancel_msg_edit_btn");
    if (cancelBtn) cancelBtn.style.display = "none";
};

window.deleteMessage = async (id) => {
    if (checkViewOnlyBlocked()) return;
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    try {
        const docSnap = await getDoc(doc(db, "messages", id));
        const text = docSnap.exists() ? docSnap.data().text : "";
        
        await deleteDoc(doc(db, "messages", id));
        await logAdminAction("Delete Broadcast", `Removed announcement: "${text.substring(0, 50)}..."`);
        
        alert("Broadcast deleted successfully. ✅");
        loadRecentMessages();
    } catch (e) {
        console.error("Delete failed:", e);
        alert("Error: " + e.message);
    }
};

// --- WEEKLY POINTS RESET ---

// Load last reset info and show it in the Settings panel
window.loadLastResetInfo = async () => {
    const el = document.getElementById("lastResetInfo");
    if (!el) return;
    
    try {
        const snap = await getDocs(query(
            collection(db, "weekly_resets"),
            orderBy("resetAt", "desc"),
            limit(1)
        ));
        
        if (snap.empty) {
            el.innerHTML = "⏱️ <b>No reset performed yet.</b> Points have never been wiped.";
        } else {
            const r = snap.docs[0].data();
            const resetDate = r.resetAt ? new Date(r.resetAt).toLocaleString() : "Unknown";
            const week = r.weekLabel || "N/A";
            el.innerHTML = `✅ Last reset: <b>${resetDate}</b> &nbsp;|&nbsp; Week archived: <b>${week}</b> &nbsp;|&nbsp; Users reset: <b>${r.usersReset || 0}</b>`;
        }
    } catch (e) {
        el.innerHTML = "Could not load reset info.";
        console.error(e);
    }
};

// Load reset history list
window.loadResetHistory = async () => {
    const histList = document.getElementById("resetHistoryList");
    if (!histList) return;
    
    const isVisible = histList.style.display !== "none";
    if (isVisible) {
        histList.style.display = "none";
        return;
    }
    
    histList.style.display = "block";
    histList.innerHTML = `<div style="text-align:center; font-size:0.8rem; color:var(--text-muted); padding:10px;">Loading history...</div>`;
    
    try {
        const snap = await getDocs(query(
            collection(db, "weekly_resets"),
            orderBy("resetAt", "desc"),
            limit(10)
        ));
        
        if (snap.empty) {
            histList.innerHTML = `<div style="text-align:center; font-size:0.8rem; color:var(--text-muted); padding:10px;">No reset history found.</div>`;
            return;
        }
        
        histList.innerHTML = `<h4 style="font-family:'Playfair Display',serif; color:#9f1239; margin-bottom:12px; font-size:0.95rem;">Past Weekly Resets</h4>`;
        snap.forEach(d => {
            const r = d.data();
            const resetDate = r.resetAt ? new Date(r.resetAt).toLocaleString() : "Unknown";
            histList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:white; border-radius:10px; margin-bottom:8px; border:1px solid #fecaca; font-size:0.82rem;">
                    <div>
                        <div style="font-weight:700; color:#7f1d1d;">Week: ${r.weekLabel || "N/A"}</div>
                        <div style="color:#6b7280; margin-top:2px;">Reset on ${resetDate} &bull; ${r.usersReset || 0} users reset</div>
                    </div>
                    <div style="font-weight:800; color:#dc2626;">−${r.totalPointsWiped || 0} pts</div>
                </div>
            `;
        });
    } catch (e) {
        histList.innerHTML = `<div style="color:var(--error); font-size:0.8rem; padding:10px;">Error loading history: ${e.message}</div>`;
    }
};

// Trigger the weekly reset
window.triggerWeeklyReset = async () => {
    if (checkViewOnlyBlocked()) return;
    const confirmed = confirm(
        "⚠️ WEEKLY RESET CONFIRMATION\n\n" +
        "This will:\n" +
        "• Archive all current user points\n" +
        "• Reset EVERY user's points to 0\n" +
        "• Clear all votes from the database\n\n" +
        "Are you absolutely sure? This CANNOT be undone."
    );
    if (!confirmed) return;
    
    // Double confirm
    const doubleConfirm = confirm("FINAL WARNING: Are you sure you want to reset ALL user points to zero?");
    if (!doubleConfirm) return;
    
    const btn = document.getElementById("weeklyResetBtn");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Resetting..."; }
    
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const votesSnap = await getDocs(collection(db, "votes"));
        
        // Calculate total points being wiped
        let totalPointsWiped = 0;
        const userPointsArchive = [];
        usersSnap.forEach(u => {
            const pts = u.data().points || 0;
            totalPointsWiped += pts;
            userPointsArchive.push({ name: u.data().name, phone: u.data().phone, points: pts });
        });
        
        // Calculate week label (Mon-Sun)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const weekLabel = `${monday.toLocaleDateString('en-GB')} – ${sunday.toLocaleDateString('en-GB')}`;
        
        // Archive the weekly reset metadata
        await addDoc(collection(db, "weekly_resets"), {
            resetAt: new Date().toISOString(),
            resetBy: phone,
            weekLabel: weekLabel,
            usersReset: usersSnap.size,
            totalPointsWiped: totalPointsWiped,
            archive: userPointsArchive
        });
        
        // Reset all users' points to 0 and clear streaks
        const userBatch = usersSnap.docs.map(u =>
            updateDoc(u.ref, { points: 0 })
        );
        await Promise.all(userBatch);
        
        // Delete all votes
        const voteBatch = votesSnap.docs.map(v => deleteDoc(v.ref));
        await Promise.all(voteBatch);
        
        // Log action
        await logAdminAction("Weekly Leaderboard Reset", `Archived & reset points for ${usersSnap.size} users for week ${weekLabel}. Wiped total ${totalPointsWiped} pts.`);
        
        alert(`✅ Weekly reset complete!\n\n${usersSnap.size} users reset.\n${votesSnap.size} vote records cleared.\n\nWeek archived: ${weekLabel}`);
        
        await loadLastResetInfo();
        dashLoad();
    } catch (e) {
        console.error("Weekly reset failed:", e);
        alert("Error during reset: " + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "🔄 Reset Weekly Points"; }
    }
};
// Init function to orchestrate loading sequence
async function initAdmin() {
    const authorized = await enforceAuth();
    if (!authorized) return;

    applyAdminPermissionsUI();

    try {
        await loadBanner();
        await loadWhatsAppConfig();
        await loadLastResetInfo();
        await dashLoad();
    } catch (e) {
        console.error("Dashboard initialization failed:", e);
    }
}

// Start initialization once DOM is ready or immediately
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
} else {
    initAdmin();
}

// --- PINNED BANNER ---
window.loadBanner = async () => {
    try {
        const snap = await getDoc(doc(db, "settings", "app"));
        if (snap.exists()) {
            const elText = document.getElementById("banner_text");
            const elActive = document.getElementById("banner_active");
            if (elText) elText.value = snap.data().announcement || "";
            if (elActive) elActive.checked = snap.data().announcementActive || false;
        }
    } catch (e) {
        console.error("Load banner failed:", e);
    }
};

window.saveBanner = async () => {
    if (checkViewOnlyBlocked()) return;
    const msg = document.getElementById("banner_msg");
    const text = document.getElementById("banner_text").value.trim();
    const active = document.getElementById("banner_active").checked;
    
    try {
        await updateDoc(doc(db, "settings", "app"), {
            announcement: text,
            announcementActive: active
        });
        
        // Log action
        await logAdminAction("Update Banner", `Changed Daily Reflection banner status to active=${active}, Text: "${text.substring(0, 50)}..."`);
        
        msg.textContent = "Banner saved ✅";
        msg.style.color = "var(--success)";
        setTimeout(() => msg.textContent = "", 2500);
    } catch (e) {
        console.error("Save banner failed:", e);
        msg.textContent = "Error saving banner";
        msg.style.color = "var(--error)";
    }
};
// loadBanner is now called directly inside initAdmin()

// --- WHATSAPP BUSINESS API REMINDERS ---

// Helper to check days since last vote
function getDaysIdle(lastVoteDateStr) {
    if (!lastVoteDateStr) return 999; // Never voted, default to high number
    const lastVote = new Date(lastVoteDateStr);
    const now = new Date();
    lastVote.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = Math.abs(now - lastVote);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Load WhatsApp config from Firestore
window.loadWhatsAppConfig = async () => {
    try {
        const snap = await getDoc(doc(db, "settings", "whatsapp"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("wa_phone_id")) document.getElementById("wa_phone_id").value = data.phoneId || "";
            if (document.getElementById("wa_waba_id")) document.getElementById("wa_waba_id").value = data.wabaId || "";
            if (document.getElementById("wa_template_name")) document.getElementById("wa_template_name").value = data.templateName || "";
            if (document.getElementById("wa_template_lang")) document.getElementById("wa_template_lang").value = data.templateLang || "en_US";
            if (document.getElementById("wa_access_token")) document.getElementById("wa_access_token").value = data.accessToken || "";
            if (document.getElementById("wa_manual_template")) document.getElementById("wa_manual_template").value = data.manualTemplate || "";
        }
    } catch (e) {
        console.error("Failed to load WhatsApp API configs:", e);
    }
};

// Save WhatsApp config to Firestore
window.saveWhatsAppConfig = async () => {
    if (checkViewOnlyBlocked()) return;
    const msg = document.getElementById("wa_config_msg");
    const phoneId = document.getElementById("wa_phone_id").value.trim();
    const wabaId = document.getElementById("wa_waba_id").value.trim();
    const templateName = document.getElementById("wa_template_name").value.trim();
    const templateLang = document.getElementById("wa_template_lang").value.trim() || "en_US";
    const accessToken = document.getElementById("wa_access_token").value.trim();
    const manualTemplate = document.getElementById("wa_manual_template").value.trim();

    if (!phoneId || !templateName || !accessToken) {
        alert("Please fill Phone Number ID, Template Name, and Access Token!");
        return;
    }

    try {
        await setDoc(doc(db, "settings", "whatsapp"), {
            phoneId,
            wabaId,
            templateName,
            templateLang,
            accessToken,
            manualTemplate,
            updatedAt: new Date().toISOString()
        });
        
        // Log action
        await logAdminAction("Update WhatsApp Config", `Updated WhatsApp API Settings: Phone ID=${phoneId}, Template Name=${templateName}`);
        
        msg.textContent = "Configuration saved successfully! ✅";
        setTimeout(() => msg.textContent = "", 3000);
    } catch (e) {
        console.error("Failed to save WhatsApp config:", e);
        alert("Error saving config: " + e.message);
    }
};

// Load WhatsApp page (idle users and sent logs)
window.whatsappLoad = async () => {
    await loadWhatsAppConfig();
    await loadIdleUsersTable();
    await loadWhatsAppLogsTable();
};

// Load list of idle users (7+ days since last vote)
async function loadIdleUsersTable() {
    const tbody = document.getElementById("wa_idle_body");
    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; color:var(--text-muted);">Scanning database for idle users...</td></tr>`;

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const logsSnap = await getDocs(collection(db, "whatsapp_logs"));
        
        // Map to quickly find last reminder time for duplicate prevention (24 hours)
        const lastReminderMap = {};
        logsSnap.forEach(d => {
            const log = d.data();
            if (log.phone && log.sentAt && log.status !== "failed") {
                const sentTime = new Date(log.sentAt).getTime();
                if (!lastReminderMap[log.phone] || sentTime > lastReminderMap[log.phone]) {
                    lastReminderMap[log.phone] = sentTime;
                }
            }
        });

        const idleUsers = [];
        const nowMs = Date.now();

        usersSnap.forEach(u => {
            const userData = u.data();
            const lastVoteDate = userData.lastVoteDate || "";
            const daysIdle = getDaysIdle(lastVoteDate);
            const userPhone = String(userData.phone || "").trim();

            if (daysIdle >= 7 && userData.role !== "admin" && userPhone) {
                let canSend = true;
                const lastSentTime = lastReminderMap[userPhone];
                if (lastSentTime) {
                    const hoursSinceLast = (nowMs - lastSentTime) / (1000 * 60 * 60);
                    if (hoursSinceLast < 24) {
                        return; // Hide user from the list entirely if sent in the last 24h
                    }
                }

                idleUsers.push({
                    id: u.id,
                    name: userData.name || "Unknown",
                    phone: userPhone,
                    lastVoteDate: lastVoteDate || "Never",
                    daysIdle,
                    reminderStatus: "Ready to send",
                    canSend: true
                });
            }
        });

        // Sort by longest idle time
        idleUsers.sort((a, b) => b.daysIdle - a.daysIdle);

        tbody.innerHTML = "";
        if (idleUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; color:var(--success); font-weight:700;">🎉 Excellent! No users are currently idle for 7+ days.</td></tr>`;
            return;
        }

        const isViewOnly = currentAdminPerms.admin_view_only;

        idleUsers.forEach(u => {
            const btnDisable = (!u.canSend || isViewOnly) ? "disabled style='opacity:0.5; cursor:not-allowed;'" : "";
            tbody.innerHTML += `
                <tr>
                    <td><b>${u.name}</b></td>
                    <td>${u.phone}</td>
                    <td>${u.lastVoteDate}</td>
                    <td><span style="color:${u.daysIdle > 30 ? 'var(--error)' : '#d97706'}; font-weight:bold;">${u.daysIdle === 999 ? 'Never Voted' : u.daysIdle + ' days'}</span></td>
                    <td style="font-size:0.8rem; color:${u.canSend ? 'var(--success)' : 'var(--text-muted)'}; font-weight:600;">${u.reminderStatus}</td>
                    <td>
                        <div style="display:flex; gap:5px; justify-content:center; align-items:center;">
                            <button class="btn-primary btn-sm" onclick="sendWhatsAppReminderNow('${u.id}', '${u.name}', '${u.phone}', ${u.daysIdle})" ${btnDisable}>💬 Send (API)</button>
                            <button class="btn-primary btn-sm" style="background:#0284c7; border-color:#0284c7; ${isViewOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" onclick="sendWhatsAppManualLink('${u.name}', '${u.phone}', ${u.daysIdle})" ${isViewOnly ? 'disabled' : ''}>💬 Send (WA Web)</button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (e) {
        console.error("Failed to load idle users:", e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; color:var(--error);">Error: ${e.message}</td></tr>`;
    }
}

// Load logs of sent WhatsApp messages
async function loadWhatsAppLogsTable() {
    const tbody = document.getElementById("wa_logs_body");
    try {
        const snap = await getDocs(query(collection(db, "whatsapp_logs"), orderBy("sentAt", "desc"), limit(30)));
        tbody.innerHTML = "";
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; color:var(--text-muted);">No broadcast logs yet.</td></tr>`;
            return;
        }

        snap.forEach(d => {
            const log = d.data();
            const statusColor = log.status === "delivered" ? "var(--success)" : (log.status === "failed" ? "var(--error)" : "#3b82f6");
            const sentDate = log.sentAt ? new Date(log.sentAt).toLocaleString() : "N/A";
            tbody.innerHTML += `
                <tr>
                    <td><b>${log.name || 'N/A'}</b></td>
                    <td>${log.phone || 'N/A'}</td>
                    <td style="font-size:0.75rem;">${sentDate}</td>
                    <td><code>${log.templateName || 'N/A'}</code></td>
                    <td><span style="color:${statusColor}; font-weight:700; text-transform:uppercase; font-size:0.75rem;">${log.status || 'sent'}</span></td>
                    <td style="font-size:0.75rem; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${log.error || 'Successful'}">${log.error || 'OK'}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Failed to load WhatsApp logs:", e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; color:var(--error);">Error loading logs: ${e.message}</td></tr>`;
    }
}

// Helper to trigger API request to Meta Business Cloud API
async function triggerWhatsAppCloudAPI(phoneId, accessToken, recipientPhone, templateName, templateLang, userName, daysIdle) {
    // Format recipient phone number: ensure country code (remove +, spaces, leading zero)
    let formattedPhone = recipientPhone.replace(/[^0-9]/g, "");
    // Default country code to 91 (India) if it looks like a 10 digit number
    if (formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone;
    }

    const cleanDaysIdle = daysIdle === 999 ? "many" : String(daysIdle);

    const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
            name: templateName,
            language: { code: templateLang || "en_US" }
        }
    };

    if (templateName !== "hello_world") {
        payload.template.components = [
            {
                type: "body",
                parameters: [
                    { type: "text", text: userName },
                    { type: "text", text: cleanDaysIdle }
                ]
            }
        ];
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "WhatsApp API Error");
    }
    return data;
}

// Trigger manual semi-automatic reminder via WhatsApp Web/App Click-to-chat link
window.sendWhatsAppManualLink = async (name, phone, daysIdle) => {
    if (checkViewOnlyBlocked()) return;

    let formattedPhone = phone.replace(/[^0-9]/g, "");
    if (formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone;
    }
    
    // Default fallback message
    let message = `Hi ${name}, you haven't voted in the last ${daysIdle === 999 ? 'several' : daysIdle} days on Faith & Fitness. Please submit your daily votes to maintain your streak!`;
    
    try {
        const snap = await getDoc(doc(db, "settings", "whatsapp"));
        if (snap.exists() && snap.data().manualTemplate) {
            const template = snap.data().manualTemplate;
            message = template
                .replace(/{name}/g, name)
                .replace(/{days}/g, daysIdle === 999 ? "many" : daysIdle);
        }
    } catch (e) {
        console.error("Failed to load custom manual template, using default:", e);
    }
    
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    // Open WhatsApp link in new tab
    window.open(url, "_blank");
    
    // Log in database
    try {
        await addDoc(collection(db, "whatsapp_logs"), {
            phone,
            name,
            templateName: "manual_link",
            sentAt: new Date().toISOString(),
            status: "delivered",
            error: "Sent via WhatsApp Web/App Link"
        });
        
        // Log admin action
        await logAdminAction("WhatsApp Manual Link", `Opened WhatsApp Web reminder link for ${name} (${phone})`);
        
        // Refresh tables and stats
        whatsappLoad();
        loadWhatsAppDashboardStats();
    } catch (e) {
        console.error("Failed to log manual send link:", e);
    }
};

// Trigger single reminder manually
window.sendWhatsAppReminderNow = async (userId, name, phone, daysIdle) => {
    if (checkViewOnlyBlocked()) return;

    try {
        const snap = await getDoc(doc(db, "settings", "whatsapp"));
        if (!snap.exists()) {
            return alert("WhatsApp Business API settings are not configured yet!");
        }

        const config = snap.data();
        if (!config.phoneId || !config.accessToken || !config.templateName) {
            return alert("API Configuration is incomplete. Save configuration details first.");
        }

        console.log(`Sending WhatsApp reminder to ${name} (${phone})`);
        
        // Log "sending" state
        const logRef = await addDoc(collection(db, "whatsapp_logs"), {
            userId,
            phone,
            name,
            templateName: config.templateName,
            sentAt: new Date().toISOString(),
            status: "sending",
            error: ""
        });

        try {
            await triggerWhatsAppCloudAPI(
                config.phoneId,
                config.accessToken,
                phone,
                config.templateName,
                config.templateLang,
                name,
                daysIdle
            );

            // Update log as delivered/sent
            await updateDoc(logRef, { status: "delivered", error: "Delivered successfully" });
            
            // Log admin action
            await logAdminAction("WhatsApp API Reminder", `Sent Cloud API reminder to ${name} (${phone})`);
            
            alert(`Reminder sent successfully to ${name}! ✅`);
        } catch (apiError) {
            // Update log as failed
            await updateDoc(logRef, { status: "failed", error: apiError.message });
            
            // Log admin action failure
            await logAdminAction("WhatsApp API Failure", `Failed Cloud API reminder to ${name} (${phone}): ${apiError.message}`);
            
            alert(`Failed to send: ${apiError.message}`);
        }

        whatsappLoad();
        loadWhatsAppDashboardStats();
    } catch (e) {
        console.error("Reminder trigger failed:", e);
        alert("Error: " + e.message);
    }
};

// Trigger reminders to all idle users
window.sendWhatsAppReminderToAll = async () => {
    if (checkViewOnlyBlocked()) return;

    const snap = await getDoc(doc(db, "settings", "whatsapp"));
    if (!snap.exists()) {
        return alert("WhatsApp API settings are not configured!");
    }

    const config = snap.data();
    if (!config.phoneId || !config.accessToken || !config.templateName) {
        return alert("API Configuration is incomplete.");
    }

    const confirmSend = confirm("Are you sure you want to send WhatsApp reminders to ALL idle users (7+ days since voting)?");
    if (!confirmSend) return;

    const btn = document.getElementById("wa_send_all_btn");
    btn.disabled = true;
    btn.textContent = "⏳ Broadcasting...";

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const logsSnap = await getDocs(collection(db, "whatsapp_logs"));
        
        // Check cooldown map
        const lastReminderMap = {};
        logsSnap.forEach(d => {
            const log = d.data();
            if (log.phone && log.sentAt) {
                const sentTime = new Date(log.sentAt).getTime();
                if (!lastReminderMap[log.phone] || sentTime > lastReminderMap[log.phone]) {
                    lastReminderMap[log.phone] = sentTime;
                }
            }
        });

        const nowMs = Date.now();
        let totalSent = 0;
        let totalFailed = 0;

        for (const u of usersSnap.docs) {
            const userData = u.data();
            const userPhone = String(userData.phone || "").trim();
            const lastVoteDate = userData.lastVoteDate || "";
            const daysIdle = getDaysIdle(lastVoteDate);

            if (daysIdle >= 7 && userData.role !== "admin" && userPhone) {
                const lastSentTime = lastReminderMap[userPhone];
                const hoursSinceLast = lastSentTime ? (nowMs - lastSentTime) / (1000 * 60 * 60) : Infinity;

                if (hoursSinceLast >= 24) {
                    const logRef = await addDoc(collection(db, "whatsapp_logs"), {
                        userId: u.id,
                        phone: userPhone,
                        name: userData.name || "Unknown",
                        templateName: config.templateName,
                        sentAt: new Date().toISOString(),
                        status: "sending",
                        error: ""
                    });

                    try {
                        await triggerWhatsAppCloudAPI(
                            config.phoneId,
                            config.accessToken,
                            userPhone,
                            config.templateName,
                            config.templateLang,
                            userData.name || "Unknown",
                            daysIdle
                        );
                        await updateDoc(logRef, { status: "delivered", error: "Delivered successfully" });
                        totalSent++;
                    } catch (apiError) {
                        await updateDoc(logRef, { status: "failed", error: apiError.message });
                        totalFailed++;
                    }
                }
            }
        }

        alert(`Broadcast complete! Sent: ${totalSent}, Failed: ${totalFailed}`);
        whatsappLoad();
        loadWhatsAppDashboardStats();
    } catch (e) {
        console.error("Bulk sending failed:", e);
        alert("Error during broadcast: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "💬 Send Reminders to All";
    }
};

// Load stats for Dashboard summary metrics
window.loadWhatsAppDashboardStats = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const logsSnap = await getDocs(collection(db, "whatsapp_logs"));

        // 1. Calculate Idle users count
        let totalIdle = 0;
        usersSnap.forEach(u => {
            const d = u.data();
            if (d.role !== "admin" && getDaysIdle(d.lastVoteDate) >= 7) {
                totalIdle++;
            }
        });
        const elIdle = document.getElementById("d_whatsapp_idle");
        if (elIdle) elIdle.textContent = totalIdle;

        // 2. Calculate today's sent logs status
        let sentToday = 0;
        let deliveredToday = 0;
        let failedToday = 0;

        const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD local prefix check

        logsSnap.forEach(l => {
            const log = l.data();
            if (log.sentAt && log.sentAt.startsWith(todayDateStr)) {
                sentToday++;
                if (log.status === "delivered") {
                    deliveredToday++;
                } else if (log.status === "failed") {
                    failedToday++;
                }
            }
        });

        const elStats = document.getElementById("d_whatsapp_stats");
        if (elStats) elStats.textContent = `${sentToday} / ${deliveredToday} / ${failedToday}`;

    } catch (e) {
        console.error("Failed to load WhatsApp dashboard stats:", e);
    }
};
// loadBanner is now called directly inside initAdmin()

// --- ADMIN AUDIT LOGS SYSTEM ---

// Helper to log admin actions to Firestore
async function logAdminAction(action, details) {
    const adminPhone = localStorage.getItem("userPhone") || "Bypassed Admin";
    let adminName = "Admin";
    
    if (window.allUsersRows) {
        const u = window.allUsersRows.find(row => String(row.phone) === String(adminPhone));
        if (u) adminName = u.name;
    }
    
    try {
        await addDoc(collection(db, "admin_logs"), {
            adminPhone: String(adminPhone),
            adminName,
            action,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Failed to write admin audit log:", e);
    }
}

// Load and render the admin audit log list
window.loadAdminLogs = async () => {
    const tbody = document.getElementById("admin_logs_body");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; color:var(--text-muted);">Fetching system audit history...</td></tr>`;
    
    try {
        const snap = await getDocs(query(
            collection(db, "admin_logs"),
            orderBy("timestamp", "desc"),
            limit(50)
        ));
        
        tbody.innerHTML = "";
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; color:var(--text-muted);">No administrative actions logged yet.</td></tr>`;
            return;
        }
        
        snap.forEach(d => {
            const log = d.data();
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A";
            tbody.innerHTML += `
                <tr>
                    <td><b>${log.adminName || "Admin"}</b></td>
                    <td>${log.adminPhone || "---"}</td>
                    <td><span style="background: rgba(2, 132, 199, 0.08); color: #0284c7; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${log.action || "Action"}</span></td>
                    <td style="text-align: left; font-size: 0.85rem; max-width: 400px; overflow-wrap: break-word;">${log.details || "---"}</td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Failed to load admin logs:", e);
        tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; color:var(--error);">Error loading logs: ${e.message}</td></tr>`;
    }
};


