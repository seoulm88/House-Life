/**
 * Mamma Firebase configuration and initialization
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const DEFAULT_PROJECT_ID = "minirani-32cf4";
const SYNC_DOC_PATH = "family_data/shared_doc";

export class CloudSync {
    constructor(storeInstance) {
        this.store = storeInstance;
        this.db = null;
        this.isConnected = false;
        this.unsubscribe = null;
        this.statusEl = document.getElementById('sync-status');
    }

    getFirebaseConfig() {
        const storedConfig = localStorage.getItem('mamma_firebase_config');
        return storedConfig ? JSON.parse(storedConfig) : null;
    }

    saveFirebaseConfig(apiKey) {
        const config = {
            apiKey: apiKey,
            authDomain: `${DEFAULT_PROJECT_ID}.firebaseapp.com`,
            projectId: DEFAULT_PROJECT_ID,
            storageBucket: `${DEFAULT_PROJECT_ID}.appspot.com`,
            messagingSenderId: "62400303877",
            appId: "" // App ID is usually needed for some features but Firestore can sometimes work without it if security rules allow
        };
        localStorage.setItem('mamma_firebase_config', JSON.stringify(config));
        return config;
    }

    async initSync(apiKey = null) {
        let config = this.getFirebaseConfig();
        if (apiKey) {
            config = this.saveFirebaseConfig(apiKey);
        }

        if (!config || !config.apiKey) {
            this.updateStatus(false, 'cloud_off');
            return false;
        }

        try {
            const app = initializeApp(config);
            this.db = getFirestore(app);
            this.startListening();
            this.updateStatus(true, 'cloud_done');
            return true;
        } catch (error) {
            console.error("Firebase init error:", error);
            this.updateStatus(false, 'cloud_off');
            return false;
        }
    }

    startListening() {
        if (!this.db) return;
        if (this.unsubscribe) this.unsubscribe();

        const docRef = doc(this.db, SYNC_DOC_PATH);
        this.unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const cloudData = docSnap.data().storeData;
                // Avoid self-echo loops by checking timestamp (if implemented)
                // For now, just blindly accept server truth as master
                this.store.data = JSON.parse(cloudData);
                this.store.saveDataLocally(); // save without triggering another cloudsync
                if (window.UI) window.UI.renderView(window.UI.currentView);
            }
        }, (error) => {
            console.error("Firestore Listen Error:", error);
            this.updateStatus(false, 'cloud_off');
        });
    }

    async syncToCloud() {
        if (!this.db || !this.isConnected) return;
        
        try {
            this.updateStatus(true, 'cloud_upload');
            const docRef = doc(this.db, SYNC_DOC_PATH);
            await setDoc(docRef, { 
                storeData: JSON.stringify(this.store.data),
                updatedAt: Date.now()
            });
            this.updateStatus(true, 'cloud_done');
        } catch (e) {
            console.error("Sync to cloud failed:", e);
            this.updateStatus(false, 'cloud_off');
        }
    }

    updateStatus(connected, icon) {
        this.isConnected = connected;
        if(this.statusEl) {
            this.statusEl.style.display = 'inline-flex';
            this.statusEl.textContent = icon;
            this.statusEl.style.color = connected ? '#4caf50' : '#ff5252';
        }
    }
}
