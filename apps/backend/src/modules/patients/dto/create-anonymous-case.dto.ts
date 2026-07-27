import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAnonymousCaseDto {
  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsIn(['M', 'F'])
  sex?: string;
}
