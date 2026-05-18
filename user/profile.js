import { db } from "../firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const myPhone = localStorage.getItem("ff_phone");
    if (!myPhone) {
        window.location.replace("../auth/login.html");
        return;
    }

    const form = document.getElementById("profileForm");
    const saveBtn = document.getElementById("saveBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    // Elements
    const nameInput = document.getElementById("name");
    const phoneInput = document.getElementById("phone");
    const ageInput = document.getElementById("age");
    const weightInput = document.getElementById("weight");
    const photoUrlInput = document.getElementById("profilePhotoUrl");

    const displayHeaderName = document.getElementById("displayHeaderName");
    const displayHeaderPhone = document.getElementById("displayHeaderPhone");
    const profileInitial = document.getElementById("profileInitial");

    // Fetch user data
    try {
        const userRef = doc(db, "users", myPhone);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Populate form
            nameInput.value = data.name || "";
            phoneInput.value = data.phone || myPhone;
            ageInput.value = data.age || "";
            weightInput.value = data.weight || "";
            photoUrlInput.value = data.profilePhoto || "";

            // Populate header
            const displayName = data.name || "User";
            displayHeaderName.textContent = displayName;
            displayHeaderPhone.textContent = data.phone || myPhone;
            profileInitial.textContent = displayName.charAt(0).toUpperCase();

            // If photo exists, we could display it here
            if (data.profilePhoto) {
                profileInitial.style.backgroundImage = `url('${data.profilePhoto}')`;
                profileInitial.style.backgroundSize = "cover";
                profileInitial.style.backgroundPosition = "center";
                profileInitial.textContent = ""; // clear initial
            }
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
    }

    // Save changes
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        saveBtn.innerHTML = "Saving...";
        saveBtn.disabled = true;

        try {
            const userRef = doc(db, "users", myPhone);
            await updateDoc(userRef, {
                name: nameInput.value.trim(),
                age: ageInput.value.trim(),
                weight: weightInput.value.trim(),
                profilePhoto: photoUrlInput.value.trim()
            });

            // Update header UI
            const newName = nameInput.value.trim();
            displayHeaderName.textContent = newName;
            
            const newPhoto = photoUrlInput.value.trim();
            if (newPhoto) {
                profileInitial.style.backgroundImage = `url('${newPhoto}')`;
                profileInitial.style.backgroundSize = "cover";
                profileInitial.style.backgroundPosition = "center";
                profileInitial.textContent = "";
            } else {
                profileInitial.style.backgroundImage = "none";
                profileInitial.textContent = newName.charAt(0).toUpperCase();
            }

            saveBtn.innerHTML = "Saved Successfully!";
            setTimeout(() => {
                saveBtn.innerHTML = "Save Changes";
                saveBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to save. Check your connection.");
            saveBtn.innerHTML = "Save Changes";
            saveBtn.disabled = false;
        }
    });

    // Logout
    logoutBtn.addEventListener("click", () => {
        if(confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("ff_phone");
            localStorage.removeItem("ff_logged_in");
            window.location.replace("../auth/login.html");
        }
    });
});
