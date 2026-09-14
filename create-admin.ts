import { adminAuth } from './src/lib/firebase-admin.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

async function createAdmin() {
  const email = 'asbichi@soba.local';
  try {
    await adminAuth.createUser({
      uid: 'asbichi',
      email: email,
      password: 'Asbichi12#',
      displayName: 'Asbichi Admin'
    });
    console.log('Firebase user created');
  } catch (e: any) {
    console.log('Firebase user exists or error:', e.message);
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length === 0) {
      await db.insert(users).values({
        email,
        name: 'Asbichi Admin',
        role: 'SUPER_ADMIN'
      });
      console.log('DB user created');
    } else {
      console.log('DB user exists');
    }
  } catch (e: any) {
    console.error('DB Error:', e.message);
  }
}

createAdmin().then(() => process.exit(0)).catch(console.error);
