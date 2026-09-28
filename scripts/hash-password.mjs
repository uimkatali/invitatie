import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();

// Ascunde parola tastata: scriem promptul manual si suprimam ecoul caracterelor cat timp
// asteptam linia (nu are efect cand stdin nu e un TTY, ex. `printf ... | node ...`).
//
// Cititul se face prin iteratorul async al lui `rl`, nu prin doua apeluri `rl.question()`:
// cand tot input-ul e deja disponibil dintr-un pipe, Node proceseaza sincron tot bufferul,
// iar un al doilea `.question()` apelat dupa ce primul s-a rezolvat poate rata linia deja
// citita (nu mai exista niciun listener activ in momentul in care ajunge randul al doilea).
async function askHidden(prompt) {
  process.stdout.write(prompt);
  const originalWriteToOutput = rl._writeToOutput.bind(rl);
  rl._writeToOutput = () => {};
  try {
    const { value, done } = await lines.next();
    return done ? '' : value;
  } finally {
    rl._writeToOutput = originalWriteToOutput;
    process.stdout.write('\n');
  }
}

const password = await askHidden('Parola noua: ');
const again = await askHidden('Repeta parola: ');
rl.close();

if (password !== again) {
  console.error('\nParolele nu coincid. Ruleaza din nou.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('\nParola trebuie sa aiba minim 12 caractere (ideal 3-4 cuvinte).');
  process.exit(1);
}
if (Buffer.byteLength(password, 'utf8') > 72) {
  console.error('\nParola e prea lunga (maxim 72 de bytes).');
  process.exit(1);
}

// Costul 12 trebuie sa coincida cu BCRYPT_COST din lib/auth/password.ts.
const hash = await bcrypt.hash(password, 12);
console.log('\nCopiaza valoarea de mai jos (tot randul) in variabila USER_EL_PASSWORD_HASH sau USER_EA_PASSWORD_HASH:\n');
console.log(Buffer.from(hash).toString('base64'));
console.log('');
