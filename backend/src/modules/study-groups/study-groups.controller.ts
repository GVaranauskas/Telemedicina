import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StudyGroupsService } from './study-groups.service';
import { GroupsQueryDto } from './dto/groups-query.dto';
import { CreateGroupDto } from './dto/create-group.dto';

@ApiTags('Study Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudyGroupsController {
  constructor(private readonly groupsService: StudyGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List study groups with optional specialty filter' })
  findAll(@Query() query: GroupsQueryDto) {
    return this.groupsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get study group details with members' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.groupsService.findOne(id, doctorId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new study group' })
  create(
    @Body() dto: CreateGroupDto,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.groupsService.create(dto, doctorId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a study group' })
  join(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.groupsService.join(id, doctorId);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a study group' })
  leave(
    @Param('id') id: string,
    @CurrentUser('doctorId') doctorId: string,
  ) {
    return this.groupsService.leave(id, doctorId);
  }
}
