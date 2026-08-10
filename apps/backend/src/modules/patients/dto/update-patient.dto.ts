import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(['M', 'F'])
  sex?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
