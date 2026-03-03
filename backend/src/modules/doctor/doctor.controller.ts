import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DoctorService } from './doctor.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import {
  AddSpecialtyDto,
  AddSkillDto,
  AddExperienceDto,
} from './dto/add-specialty.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BlockType } from '@prisma/client';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // ─── Profile ────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  async getMyProfile(@CurrentUser('doctorId') doctorId: string) {
    return this.doctorService.getProfile(doctorId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get doctor profile by ID' })
  async getProfile(@Param('id') id: string) {
    return this.doctorService.getProfile(id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  async updateMyProfile(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: UpdateDoctorDto,
  ) {
    return this.doctorService.updateProfile(doctorId, dto);
  }

  // ─── Specialties ────────────────────────────────────────────

  @Post('me/specialties')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add specialty to my profile' })
  async addSpecialty(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: AddSpecialtyDto,
  ) {
    return this.doctorService.addSpecialty(doctorId, dto);
  }

  @Delete('me/specialties/:specialtyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove specialty from my profile' })
  async removeSpecialty(
    @CurrentUser('doctorId') doctorId: string,
    @Param('specialtyId') specialtyId: string,
  ) {
    await this.doctorService.removeSpecialty(doctorId, specialtyId);
    return { message: 'Specialty removed' };
  }

  // ─── Skills ─────────────────────────────────────────────────

  @Post('me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add skill to my profile' })
  async addSkill(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: AddSkillDto,
  ) {
    return this.doctorService.addSkill(doctorId, dto);
  }

  @Delete('me/skills/:skillId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove skill from my profile' })
  async removeSkill(
    @CurrentUser('doctorId') doctorId: string,
    @Param('skillId') skillId: string,
  ) {
    await this.doctorService.removeSkill(doctorId, skillId);
    return { message: 'Skill removed' };
  }

  // ─── Experience ─────────────────────────────────────────────

  @Post('me/experiences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add experience to my profile' })
  async addExperience(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: AddExperienceDto,
  ) {
    return this.doctorService.addExperience(doctorId, dto);
  }

  @Delete('me/experiences/:experienceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove experience from my profile' })
  async removeExperience(@Param('experienceId') experienceId: string) {
    await this.doctorService.removeExperience(experienceId);
    return { message: 'Experience removed' };
  }

  // ─── Agenda ─────────────────────────────────────────────────

  @Get('me/agenda')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get consolidated doctor agenda (appointments + shifts + blocks)' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date string' })
  async getAgenda(
    @CurrentUser('doctorId') doctorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.doctorService.getAgenda(doctorId, fromDate, toDate);
  }

  @Get('me/shifts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my shift assignments' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getShifts(
    @CurrentUser('doctorId') doctorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.doctorService.getShifts(doctorId, fromDate, toDate);
  }

  @Post('me/schedule-blocks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a schedule block (vacation, conference, etc.)' })
  async createScheduleBlock(
    @CurrentUser('doctorId') doctorId: string,
    @Body() dto: { startDate: string; endDate: string; blockType: BlockType; reason?: string },
  ) {
    return this.doctorService.createScheduleBlock(doctorId, {
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      blockType: dto.blockType,
      reason: dto.reason,
    });
  }

  @Delete('me/schedule-blocks/:blockId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a schedule block' })
  async deleteScheduleBlock(
    @CurrentUser('doctorId') doctorId: string,
    @Param('blockId') blockId: string,
  ) {
    await this.doctorService.deleteScheduleBlock(doctorId, blockId);
    return { message: 'Schedule block deleted' };
  }

  // ─── Search & Reference Data ────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search doctors' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'specialtyId', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchDoctors(
    @Query('name') name?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.doctorService.searchDoctors({
      name,
      specialtyId,
      city,
      state,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('ref/specialties')
  @ApiOperation({ summary: 'List all specialties' })
  async getSpecialties() {
    return this.doctorService.getAllSpecialties();
  }

  @Get('ref/skills')
  @ApiOperation({ summary: 'List all skills' })
  async getSkills() {
    return this.doctorService.getAllSkills();
  }
}
