export function checkCredentials(
  username: string,
  password: string,
  expectedUsername: string,
  expectedPassword: string
): boolean {
  return (
    username.trim().toLowerCase() === expectedUsername.trim().toLowerCase() &&
    password === expectedPassword
  );
}
