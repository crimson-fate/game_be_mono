import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { JwtPayload } from './jwt.dto';
import { User, UserDocument } from '@app/shared/models/user.schema';
import configuration from '@app/shared/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    // private readonly jwtService: RequestContext,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configuration().JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const { userAddress } = payload;

    const user = await this.userModel
      .findOne({ userAddress: userAddress })
      .exec();
    if (!user) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
