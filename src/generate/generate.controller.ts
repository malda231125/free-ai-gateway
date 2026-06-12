import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenerateDto } from './dto';
import { GenerateService } from './generate.service';

@ApiTags('gateway')
@Controller()
export class GenerateController {
  constructor(private readonly service: GenerateService) {}

  @Get('health')
  @ApiOperation({ summary: '헬스체크' })
  health() {
    return { ok: true, app: 'free-ai-gateway' };
  }

  @Get('v1/providers')
  @ApiOperation({ summary: '프로바이더별 설정/한도/사용량 조회' })
  providers() {
    return this.service.providers();
  }

  @Post('v1/generate')
  @ApiOperation({ summary: '프롬프트 실행 (provider 미지정 시 GOOGLE)' })
  generate(@Body() dto: GenerateDto) {
    return this.service.generate(dto);
  }
}
