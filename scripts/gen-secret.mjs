import { randomBytes } from 'node:crypto';

console.log('\nCopiaza valoarea de mai jos in SESSION_SECRET:\n');
console.log(randomBytes(32).toString('base64url'));
console.log('');
