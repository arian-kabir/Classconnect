// generate-hash.js
const bcrypt = require('bcrypt');

const passwords = ['1234', '1234', '1234', '1234', '1234', '1234', '1234'];

passwords.forEach(async (pwd) => {
  const hash = await bcrypt.hash(pwd, 10);
  console.log(hash);
});