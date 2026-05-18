import { db } from "../firebase.js";
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("resetForm");
    const btn = document.getElementById("resetBtn");
    const newPassGroup = document.getElementById("newPassGroup");
    const newPasswordInput = document.getElementById("newPassword");
    
    let isVerifying = true;
    let verifiedPhone = "";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (isVerifying) {
            const phone = document.getElementById("phone").value.trim();
            if (!phone) {
                alert("Please enter phone number.");
                return;
            }
            
            btn.innerHTML = "Verifying...";
            btn.disabled = true;
            
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("phone", "==", phone));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    alert("Account not found with this phone number.");
                    btn.innerHTML = `Verify Account <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
                    btn.disabled = false;
                } else {
                    verifiedPhone = phone;
                    isVerifying = false;
                    document.getElementById("phone").disabled = true;
                    newPassGroup.style.display = "block";
                    newPasswordInput.required = true;
                    btn.innerHTML = `Update Password <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Verification error:", error);
                alert("An error occurred. Check connection.");
                btn.innerHTML = `Verify Account <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
                btn.disabled = false;
            }
        } else {
            // Update password phase
            const newPassword = newPasswordInput.value.trim();
            if (!newPassword) {
                alert("Please enter a new password.");
                return;
            }
            
            btn.innerHTML = "Updating...";
            btn.disabled = true;
            
            try {
                const userDocRef = doc(db, "users", verifiedPhone);
                await updateDoc(userDocRef, {
                    password: newPassword
                });
                
                alert("Password updated successfully! Please login.");
                window.location.replace("login.html");
                
            } catch (error) {
                console.error("Update error:", error);
                alert("An error occurred while updating password. Check connection.");
                btn.innerHTML = `Update Password <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;
                btn.disabled = false;
            }
        }
    });
});
