import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiProvider } from './providers.config';

export class GenerateDto {
  @ApiProperty({ description: '모델에 전달할 프롬프트', example: '안녕을 영어로 번역해줘' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  prompt!: string;

  @ApiPropertyOptional({ enum: AiProvider, description: '사용할 서비스. 미지정 시 GOOGLE(Gemini)', example: AiProvider.GOOGLE })
  @IsOptional()
  @IsEnum(AiProvider)
  provider?: AiProvider;

  @ApiPropertyOptional({ description: '프로바이더 기본 모델 대신 쓸 모델 ID', example: 'gemini-3.5-flash' })
  @IsOptional()
  @IsString()
  model?: string;
}
