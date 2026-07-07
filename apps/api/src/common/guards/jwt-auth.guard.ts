import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Applied per-controller/route; Passport's 'jwt' strategy does the verification. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
