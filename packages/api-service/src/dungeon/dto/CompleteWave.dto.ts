import { walletAddressDto } from './WalletAddress.dto';
import { IsMongoId } from 'class-validator';

export class CompleteWaveDto extends walletAddressDto {
  @IsMongoId()
  progressId: string;
}
