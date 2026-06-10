const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load credentials from local file
const serviceAccount = require("./service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runBackup() {
    console.log("Starting Firestore Backup...");
    
    // Create a backups directory in the workspace root if it doesn't exist
    const workspaceRoot = path.resolve(__dirname, "..");
    const backupsDir = path.join(workspaceRoot, "backups");
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    const backupData = {};
    const collections = await db.listCollections();
    
    for (const collection of collections) {
        const colId = collection.id;
        console.log(`Backing up collection: ${colId}...`);
        backupData[colId] = {};
        
        const snapshot = await collection.get();
        snapshot.forEach(doc => {
            backupData[colId][doc.id] = doc.data();
        });
        console.log(`Backed up ${snapshot.size} documents from ${colId}.`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `firestore_backup_${timestamp}.json`;
    const backupFilePath = path.join(backupsDir, backupFileName);
    
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");
    
    console.log(`\nBackup completed successfully!`);
    console.log(`Saved file: backups/${backupFileName}`);
}

runBackup().catch(err => {
    console.error("Backup failed:", err);
});
