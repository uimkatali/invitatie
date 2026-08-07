// NOT real security: expectedUsername/expectedPassword ship in the client JS bundle and are
// trivially visible via browser devtools. This only deters casual visitors from stumbling onto
// the link — do not gate anything sensitive behind it.
export function checkCredentials(
  username: string,
  password: string,
  expectedUsername: string,
  expectedPassword: string
): boolean {
  // Username is compared loosely (trimmed + case-insensitive) since it's just a shared word,
  // not an identity. Password stays an exact match.
  return (
    username.trim().toLowerCase() === expectedUsername.trim().toLowerCase() &&
    password === expectedPassword
  );
}
