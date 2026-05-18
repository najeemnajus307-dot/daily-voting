import { db } from "../firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // Basic redirect if already logged in
    if (localStorage.getItem("ff_phone")) {
        window.location.replace("../user/voting.html");
    }

    const form = document.getElementById("loginForm");
    const btn = document.getElementById("loginBtn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value.trim();
        
        if (!phone || !password) {
            alert("Please enter both phone and password.");
            return;
        }
        
        btn.innerHTML = "Logging in...";
        btn.disabled = true;
        
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("phone", "==", phone), where("password", "==", password));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                alert("Invalid phone number or password!");
                btn.innerHTML = `Login <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
                btn.disabled = false;
            } else {
                localStorage.setItem("ff_phone", phone);
                localStorage.setItem("ff_logged_in", "true");
                window.location.replace("../user/voting.html");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred during login. Check connection.");
            btn.innerHTML = `Login <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
            btn.disabled = false;
        }
    });
});
