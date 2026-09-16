const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateLogos() {
  try {
    await pool.query(\`
      UPDATE parties 
      SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/2/29/All_Progressives_Congress_logo.png'
      WHERE abbreviation = 'APC';
    \`);
    
    await pool.query(\`
      UPDATE parties 
      SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/6/61/People%27s_Democratic_Party_%28Nigeria%29_logo.svg/1200px-People%27s_Democratic_Party_%28Nigeria%29_logo.svg.png'
      WHERE abbreviation = 'PDP';
    \`);
    
    await pool.query(\`
      UPDATE parties 
      SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/Labour_Party_%28Nigeria%29_logo.svg/1200px-Labour_Party_%28Nigeria%29_logo.svg.png'
      WHERE abbreviation = 'LP';
    \`);
    
    await pool.query(\`
      UPDATE parties 
      SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/91/New_Nigeria_Peoples_Party_logo.svg/1200px-New_Nigeria_Peoples_Party_logo.svg.png'
      WHERE abbreviation = 'NNPP';
    \`);

    await pool.query(\`
      UPDATE parties 
      SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/APGA_Logo.svg/1200px-APGA_Logo.svg.png'
      WHERE abbreviation = 'APGA';
    \`);
    
    await pool.query(\`
      UPDATE parties 
      SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/4/4b/Social_Democratic_Party_%28Nigeria%29_Logo.png'
      WHERE abbreviation = 'SDP';
    \`);

    console.log("Logos updated successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

updateLogos();
