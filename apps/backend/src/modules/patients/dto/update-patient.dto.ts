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

  /** ふりがな（紹介状・主治医意見書の申請者欄に印刷する） */
  @IsOptional()
  @IsString()
  nameKana?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  occupation?: string;
}
