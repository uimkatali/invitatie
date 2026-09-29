import { z } from 'zod';

// Cost minim 12 (trebuie sa coincida cu BCRYPT_COST din lib/auth/password.ts).
const BCRYPT_RE = /^\$2[aby]\$(1[2-9]|[23]\d)\$[./A-Za-z0-9]{53}$/;

const bcryptHashBase64 = z.string().min(1).transform((value, ctx) => {
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  if (!BCRYPT_RE.test(decoded)) {
    ctx.addIssue({ code: 'custom', message: 'trebuie generat cu npm run hash-password' });
    return z.NEVER;
  }
  return decoded;
});

const schema = z
  .object({
    DATABASE_URL: z.string().startsWith('mysql://'),
    SESSION_SECRET: z.string().min(32),
    USER_EL_NAME: z.string().trim().min(1).max(100),
    USER_EL_PASSWORD_HASH: bcryptHashBase64,
    USER_EA_NAME: z.string().trim().min(1).max(100),
    USER_EA_PASSWORD_HASH: bcryptHashBase64,
    EMAIL_EL: z.email(),
    EMAIL_EA: z
      .union([z.literal(''), z.email()])
      .optional()
      .transform((v) => (v ? v : null)),
    RESEND_API_KEY: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    const norm = (v: string) => v.trim().toLowerCase().normalize('NFC');
    if (norm(env.USER_EL_NAME) === norm(env.USER_EA_NAME)) {
      ctx.addIssue({ code: 'custom', path: ['USER_EA_NAME'], message: 'trebuie sa difere de USER_EL_NAME' });
    }
  });

export type Env = z.infer<typeof schema>;

/** Eroare de configurare: mesajul contine doar numele variabilelor si mesajele zod, niciodata valorile. */
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ');
    throw new EnvError(`Variabile de mediu lipsa sau invalide: ${problems}`);
  }
  return result.data;
}

let cached: Env | null = null;

/** Env validat, citit o singura data. Arunca eroare clara daca lipseste ceva (fail closed). */
export function env(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
