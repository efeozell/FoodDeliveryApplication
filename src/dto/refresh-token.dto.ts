import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token zorunludur' })
  @IsString({ message: 'Refresh token string olmalidir' })
  refresh_token: string;
}
