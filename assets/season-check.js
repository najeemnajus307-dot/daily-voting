import { db } from "../firebase.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function checkSeasonStatus() {
    // Avoid running on the season-closed page itself to prevent redirect loops
    if (window.location.pathname.includes('season-closed.html')) {
        return;
    }

    try {
        const settingsRef = doc(db, "settings", "system");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists() && settingsSnap.data().seasonClosed === true) {
            // Season is closed. Check if user is admin.
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
                // Not an admin, redirect to season-closed.html
                const currentPath = window.location.pathname;
                const isSubFolder = currentPath.includes('/user/') || currentPath.includes('/auth/') || currentPath.includes('/admin/');
                const redirectUrl = isSubFolder ? '../season-closed.html' : 'season-closed.html';
                
                window.location.replace(redirectUrl);
            }
        }
    } catch (error) {
        console.error("Error checking season status:", error);
    }
}

// Execute the check immediately
checkSeasonStatus();
