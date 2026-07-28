import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @IsStrongPassword()
  newPassword!: string;
}
