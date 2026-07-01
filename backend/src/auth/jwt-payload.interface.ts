import { Role } from './roles.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
