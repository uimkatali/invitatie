import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Parola noua: ');
const again = await rl.question('Repeta parola: ');
rl.close();

if (password !== again) {
  console.error('\nParolele nu coincid. Ruleaza din nou.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('\nParola trebuie sa aiba minim 8 caractere.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log('\nCopiaza valoarea de mai jos (tot randul) in variabila USER_EL_PASSWORD_HASH sau USER_EA_PASSWORD_HASH:\n');
console.log(Buffer.from(hash).toString('base64'));
console.log('');
