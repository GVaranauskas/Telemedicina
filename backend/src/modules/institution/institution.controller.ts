import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InstitutionService } from './institution.service';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto/create-institution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Institutions')
@Controller('institutions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  @ApiOperation({ summary: 'Create an institution' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInstitutionDto,
  ) {
    return this.institutionService.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update institution' })
  async update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutionService.update(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get institution by ID' })
  async findById(@Param('id') id: string) {
    return this.institutionService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Search institutions' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('name') name?: string,
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.institutionService.search({
      name,
      type,
      city,
      state,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
