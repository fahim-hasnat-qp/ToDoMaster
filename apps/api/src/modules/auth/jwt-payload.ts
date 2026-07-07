/** Access token payload. `sub` is the user id, matching JWT convention. */
export interface JwtPayload {
  sub: string;
  email: string | null;
}
