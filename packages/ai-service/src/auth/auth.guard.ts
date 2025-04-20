import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    // For now, we'll just check if the wallet address is provided
    // In a real application, you would verify the wallet signature or JWT token
    return !!request.query.walletAddress;
  }
} 