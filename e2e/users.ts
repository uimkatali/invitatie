export const E2E_USERS = {
  el: { name: 'el-test', password: 'parola-el-e2e-123' },
  ea: { name: 'ea-test', password: 'parola-ea-e2e-123' },
} as const;

export type E2EUser = keyof typeof E2E_USERS;
