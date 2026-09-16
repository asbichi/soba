const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// The menu is empty because dbUser is undefined/null initially or missing roles, let's make it more robust
// and ensure we don't hide items completely on mobile if dbUser isn't fully loaded yet.

const replace = `  const filteredNav = navigation.filter(item => 
    !item.roles || (dbUser && item.roles.includes(dbUser.role)) || !dbUser
  );`;

code = code.replace(
  /  const filteredNav = navigation\.filter\(item => [\s\S]*?  \);/,
  replace
);

fs.writeFileSync('src/components/Layout.tsx', code);
