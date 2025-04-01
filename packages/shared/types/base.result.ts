import { ApiProperty } from '@nestjs/swagger';

export class BaseResult<T> {
  @ApiProperty()
  error?: string;
  @ApiProperty()
  data?: T;
  @ApiProperty()
  success = true;

  constructor(data: T) {
    this.data = data;
    this.success = true;
  }

  setError(error: string): this {
    this.error = error;
    this.success = false;
    return this;
  }
}
