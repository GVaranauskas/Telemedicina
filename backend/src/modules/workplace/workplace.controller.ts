import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkplaceService } from './workplace.service';
import { CreateWorkplaceDto, UpdateWorkplaceDto } from './dto/create-workplace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Doctor Workplaces')
@Controller('workplaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkplaceController {
  constructor(private readonly workplaceService: WorkplaceService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new workplace / local de atendimento' })
  async create(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: CreateWorkplaceDto,
  ) {
    return this.workplaceService.create(doctorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all my workplaces' })
  async getMyWorkplaces(@CurrentUser('doctorId') doctorId: string) {
    return this.workplaceService.getMyWorkplaces(doctorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workplace by ID' })
  async getById(@Param('id') id: string) {
    return this.workplaceService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a workplace' })
  async update(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: UpdateWorkplaceDto,
  ) {
    return this.workplaceService.update(id, doctorId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workplace' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    await this.workplaceService.delete(id, doctorId);
    return { message: 'Workplace removed' };
  }
}
