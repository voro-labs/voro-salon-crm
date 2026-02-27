import bcrypt from 'bcryptjs';
const hash = bcrypt.hashSync('123456', 10);
console.log('Hash for 123456:', hash);
