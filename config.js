// Firebase Console → Project settings → Your apps → Web app.
// Ці ключі публічні за задумом Firebase; дані захищають правила у firestore.rules.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3sdw4lgVnVQ1srJjxQ__3TGTBnmLQOZQ",
  authDomain: "rozklad-zanyat-fe37b.firebaseapp.com",
  projectId: "rozklad-zanyat-fe37b",
  storageBucket: "rozklad-zanyat-fe37b.firebasestorage.app",
  messagingSenderId: "616512306581",
  appId: "1:616512306581:web:c3a30910770c693dc70a9c",
};

// Тільки з цієї пошти можна редагувати розклад і бачити відмітки (та сама — у firestore.rules).
window.TEACHER_EMAIL = "ikramoonfeyx@gmail.com";
