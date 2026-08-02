import { db } from "../firebase.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function checkSystemSettings() {
    // Avoid running on season-closed page
    if (window.location.pathname.includes('season-closed.html')) {
        return;
    }

    try {
        const settingsRef = doc(db, "settings", "system");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            const data = settingsSnap.data();

            // 1. Check Hide Leaderboard Status
            if (data.hideLeaderboard === true) {
                const applyHideNav = () => {
                    document.querySelectorAll('a[href*="leaderboard.html"]').forEach(el => {
                        el.style.setProperty("display", "none", "important");
                    });
                };
                applyHideNav();
                document.addEventListener("DOMContentLoaded", applyHideNav);

                // If user is on leaderboard.html, immediately redirect to voting.html
                if (window.location.pathname.includes('leaderboard.html')) {
                    window.location.replace('voting.html');
                    return;
                }
            }

            // 2. Check Season Closed Status
            if (data.seasonClosed === true) {
                const phone = localStorage.getItem("userPhone");
                let isAdmin = false;

                if (phone) {
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("phone", "==", phone));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        if (userData.role === "admin") {
                            isAdmin = true;
                        }
                    }
                }

                if (!isAdmin) {
                    const currentPath = window.location.pathname;
                    const isSubFolder = currentPath.includes('/user/') || currentPath.includes('/auth/') || currentPath.includes('/admin/');
                    const redirectUrl = isSubFolder ? '../season-closed.html' : 'season-closed.html';
                    
                    window.location.replace(redirectUrl);
                }
            }
        }
    } catch (error) {
        console.error("Error checking system settings:", error);
    }
}

// Execute immediately
checkSystemSettings();
