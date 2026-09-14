import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import config from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(config);
const auth = getAuth(app);

async function create() {
  try {
    await createUserWithEmailAndPassword(auth, 'asbichi@soba.local', 'Asbichi12#');
    console.log('Firebase user created via client SDK');
  } catch (e: any) {
    console.error('Error creating user:', e.message);
  }
}
create().then(() => process.exit(0));
