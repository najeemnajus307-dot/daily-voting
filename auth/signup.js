import { db } from "../firebase.js";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signupForm");
    const btn = document.getElementById("signupBtn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value.trim();
        
        if (!name || !phone || !password) {
            alert("Please fill in all fields.");
            return;
        }
        
        btn.innerHTML = "Creating account...";
        btn.disabled = true;
        
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("phone", "==", phone));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                alert("An account with this phone number already exists.");
                btn.innerHTML = `Sign Up <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
                btn.disabled = false;
                return;
            }
            
            // Create user document using phone as ID
            await setDoc(doc(db, "users", phone), {
                name: name,
                phone: phone,
                password: password,
                points: 0,
                age: "",
                weight: "",
                profilePhoto: "",
                createdAt: serverTimestamp()
            });
            
            alert("Account created successfully! Please login.");
            window.location.replace("login.html");
            
        } catch (error) {
            console.error("Signup error:", error);
            alert("An error occurred during signup. Check connection.");
            btn.innerHTML = `Sign Up <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`;
            btn.disabled = false;
        }
    });
});
