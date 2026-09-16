import { db } from './src/db';
import { parties } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function fix() {
  const updates = [
    { abbr: 'APC', url: 'https://cdn.iconscout.com/icon/free/png-256/free-apc-logo-icon-download-in-svg-png-gif-file-formats--all-progressives-congress-political-party-nigeria-logos-icons-226105.png' },
    { abbr: 'PDP', url: 'https://cdn.iconscout.com/icon/free/png-256/free-pdp-logo-icon-download-in-svg-png-gif-file-formats--people-s-democratic-party-nigeria-political-logos-icons-226123.png' },
    { abbr: 'LP', url: 'https://seeklogo.com/images/L/labour-party-lp-logo-F98AA5F5D4-seeklogo.com.png' },
    { abbr: 'NNPP', url: 'https://seeklogo.com/images/N/new-nigeria-peoples-party-nnpp-logo-1DD2AE7DFB-seeklogo.com.png' },
    { abbr: 'APGA', url: 'https://seeklogo.com/images/A/all-progressives-grand-alliance-apga-logo-6BA67E0A10-seeklogo.com.png' },
    { abbr: 'SDP', url: 'https://seeklogo.com/images/S/social-democratic-party-sdp-logo-5E0630D744-seeklogo.com.png' },
    { abbr: 'ADC', url: 'https://seeklogo.com/images/A/african-democratic-congress-adc-logo-4D05ACCD65-seeklogo.com.png' }
  ];

  for (const { abbr, url } of updates) {
    try {
      await db.update(parties).set({ logoUrl: url }).where(eq(parties.abbreviation, abbr));
      console.log('Updated ' + abbr);
    } catch(err) {
      console.log('Error updating', abbr);
    }
  }
  
  console.log('Fixed URLs');
  process.exit(0);
}
fix();
