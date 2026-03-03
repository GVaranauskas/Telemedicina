import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InstitutionWorkforceService } from './institution-workforce.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ContractType,
  ContractStatus,
  ContactType,
  ContactOutcome,
  ShiftType,
  ShiftStatus,
  DepartmentType,
} from '@prisma/client';

@ApiTags('Institution Workforce')
@Controller('institutions/:institutionId/workforce')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InstitutionWorkforceController {
  constructor(private readonly service: InstitutionWorkforceService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get institution dashboard KPIs' })
  async getDashboard(@Param('institutionId') institutionId: string) {
    return this.service.getDashboardKpis(institutionId);
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  @Get('departments')
  @ApiOperation({ summary: 'List institution departments' })
  async getDepartments(@Param('institutionId') institutionId: string) {
    return this.service.getDepartments(institutionId);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create a department' })
  async createDepartment(
    @Param('institutionId') institutionId: string,
    @Body() dto: { name: string; type: DepartmentType; description?: string },
  ) {
    return this.service.createDepartment(institutionId, dto);
  }

  @Patch('departments/:deptId')
  @ApiOperation({ summary: 'Update a department' })
  async updateDepartment(
    @Param('deptId') deptId: string,
    @Body() dto: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.service.updateDepartment(deptId, dto);
  }

  // ─── Roster ───────────────────────────────────────────────────────────────

  @Get('roster')
  @ApiOperation({ summary: 'Get institution roster for a date range' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async getRoster(
    @Param('institutionId') institutionId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.service.getRoster(institutionId, fromDate, toDate, departmentId);
  }

  @Get('roster/coverage')
  @ApiOperation({ summary: 'Get coverage statistics for a date range' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getCoverage(
    @Param('institutionId') institutionId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.service.getCoverageStats(institutionId, fromDate, toDate);
  }

  // ─── Shifts ───────────────────────────────────────────────────────────────

  @Post('shifts')
  @ApiOperation({ summary: 'Create a shift assignment' })
  async createShift(
    @Param('institutionId') institutionId: string,
    @Body() dto: {
      doctorId: string;
      departmentId?: string;
      date: string;
      startTime: string;
      endTime: string;
      shiftType: ShiftType;
      notes?: string;
      jobId?: string;
    },
  ) {
    return this.service.createShift(institutionId, { ...dto, date: new Date(dto.date) });
  }

  @Patch('shifts/:shiftId/status')
  @ApiOperation({ summary: 'Update shift assignment status' })
  async updateShiftStatus(
    @Param('shiftId') shiftId: string,
    @Body() dto: { status: ShiftStatus; notes?: string },
  ) {
    return this.service.updateShiftStatus(shiftId, dto.status, dto.notes);
  }

  @Post('shifts/bulk-dispatch')
  @ApiOperation({ summary: 'Dispatch job posting to fill shift with available doctors' })
  async bulkDispatch(
    @Param('institutionId') institutionId: string,
    @Body() dto: {
      date: string;
      startTime: string;
      endTime: string;
      shiftType: ShiftType;
      departmentId?: string;
      specialtyId?: string;
      requiredDoctors: number;
      notes?: string;
    },
  ) {
    return this.service.bulkDispatchShifts(institutionId, { ...dto, date: new Date(dto.date) });
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  @Get('contracts')
  @ApiOperation({ summary: 'List institution contracts' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'EXPIRED', 'PENDING_SIGNATURE', 'SUSPENDED', 'CANCELLED'] })
  @ApiQuery({ name: 'doctorId', required: false })
  async getContracts(
    @Param('institutionId') institutionId: string,
    @Query('status') status?: ContractStatus,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.service.getContracts(institutionId, { status, doctorId });
  }

  @Post('contracts')
  @ApiOperation({ summary: 'Create a contract with a doctor' })
  async createContract(
    @Param('institutionId') institutionId: string,
    @Body() dto: {
      doctorId: string;
      type: ContractType;
      startDate: string;
      endDate?: string;
      hourlyRate?: number;
      monthlyRate?: number;
      specialtyId?: string;
      terms?: string;
      notes?: string;
    },
  ) {
    return this.service.createContract(institutionId, {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Patch('contracts/:contractId/status')
  @ApiOperation({ summary: 'Update contract status' })
  async updateContractStatus(
    @Param('contractId') contractId: string,
    @Body() dto: { status: ContractStatus },
  ) {
    return this.service.updateContractStatus(contractId, dto.status);
  }

  // ─── Contact Logs (CRM) ───────────────────────────────────────────────────

  @Get('contacts')
  @ApiOperation({ summary: 'List CRM contact logs' })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'outcome', required: false })
  async getContactLogs(
    @Param('institutionId') institutionId: string,
    @Query('doctorId') doctorId?: string,
    @Query('outcome') outcome?: ContactOutcome,
  ) {
    return this.service.getContactLogs(institutionId, { doctorId, outcome });
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Log a contact with a doctor' })
  async createContactLog(
    @Param('institutionId') institutionId: string,
    @Body() dto: {
      doctorId: string;
      type: ContactType;
      outcome: ContactOutcome;
      notes?: string;
      followUpDate?: string;
    },
  ) {
    return this.service.createContactLog(institutionId, {
      ...dto,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
    });
  }

  @Get('contacts/follow-ups')
  @ApiOperation({ summary: 'Get pending follow-ups (next 7 days)' })
  async getFollowUps(@Param('institutionId') institutionId: string) {
    return this.service.getPendingFollowUps(institutionId);
  }

  // ─── Workforce Search ─────────────────────────────────────────────────────

  @Get('search')
  @ApiOperation({ summary: 'Search available doctors for workforce needs' })
  @ApiQuery({ name: 'specialtyId', required: false })
  @ApiQuery({ name: 'specialtyName', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date to check availability' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchWorkforce(
    @Param('institutionId') institutionId: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('specialtyName') specialtyName?: string,
    @Query('date') date?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.searchWorkforce(institutionId, {
      specialtyId,
      specialtyName,
      date: date ? new Date(date) : undefined,
      city,
      state,
      limit: limit ? Number(limit) : 20,
    });
  }
}
