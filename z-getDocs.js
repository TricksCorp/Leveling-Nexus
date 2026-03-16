import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getFirestore, setDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBO6a6nJKh_edhLswQEIk07gnQI46UBrCQ",
  authDomain: "leveling-nexus-bdee1.firebaseapp.com",
  projectId: "leveling-nexus-bdee1",
  storageBucket: "leveling-nexus-bdee1.appspot.com",
  messagingSenderId: "360029039248",
  appId: "1:360029039248:web:99b73cb4e8a5e6fc08c615",
  measurementId: "G-4TFCZV1RWX",
  databaseURL: "https://leveling-nexus-bdee1-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("AUTH UID:", user.uid);

    const ref = doc(firestore, "users", user.uid);
    const snap = await getDoc(ref);

    console.log("DOC EXISTS:", snap.exists());
  }
});


onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Reference to: user/{uid}
      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        console.log("Username:", userData.username);
        console.log("Email:", userData.email);

        // Example: update UI
        // document.getElementById("username").textContent = userData.username;
        // document.getElementById("email").textContent = userData.email;

      } else {
        console.log("User document does not exist");
      }


      //try {
        //await updateDoc(userDocRef, {
          //username: "NewUsernameHere" // <-- change this dynamically if you want
        //});
        //console.log("Username updated successfully!");
      //} catch (updateError) {
        //console.error("Error updating document:", updateError);
      //}


    } catch (error) {
      console.error("Error getting user document:", error);
    }
  } else {
    console.log("No user logged in");
    // window.location.href = "/login.html";
  }
});


