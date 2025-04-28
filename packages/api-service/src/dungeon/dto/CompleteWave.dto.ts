import { walletAddressDto } from './WalletAddress.dto';
import { IsUUID } from 'class-validator';

export class CompleteWaveDto extends walletAddressDto {
  @IsUUID()
  gameId: string;
}
