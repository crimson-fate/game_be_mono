import { IsMongoId } from 'class-validator';

export class SeasonIdDto {
  @IsMongoId()
  seasonId: string;
}
