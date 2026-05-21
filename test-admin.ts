import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'zany-cider-rcf5x'
});

async function run() {
  try {
    const db = admin.firestore();
    db.settings({ databaseId: 'ai-studio-b6aa74c2-74fe-4e2e-923b-365d7e66e46d' });
    await db.collection('test').doc('ping').set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
    const snap = await db.collection('test').doc('ping').get();
    console.log('Admin SDK success:', snap.data());
    process.exit(0);
  } catch (err) {
    console.error('Admin SDK error:', err);
    process.exit(1);
  }
}
run();
