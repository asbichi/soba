async function run() {
  const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/All_Progressives_Congress_logo.svg/300px-All_Progressives_Congress_logo.svg.png');
  console.log(url);
  try {
     const r = await fetch(url);
     console.log(r.status);
  } catch(e) {
     console.log(e);
  }
}
run();
