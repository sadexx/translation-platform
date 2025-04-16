import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RateAppointmentByClientDto, RateAppointmentByInterpreterDto } from "src/modules/appointments/common/dto";
import { Appointment, AppointmentRating } from "src/modules/appointments/entities";
import { Repository } from "typeorm";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { findOneOrFail } from "src/common/utils";
import { UserRole } from "src/modules/users-roles/entities";
import { AppointmentNotificationService } from "src/modules/appointments/services";

@Injectable()
export class AppointmentRatingService {
  constructor(
    @InjectRepository(AppointmentRating)
    private readonly appointmentRatingRepository: Repository<AppointmentRating>,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
  ) {}

  public async rateAppointmentByClient(id: string, dto: RateAppointmentByClientDto): Promise<void> {
    const appointmentRating = await this.getAndValidateAppointmentRating(id);
    await this.updateAppointmentRating(appointmentRating, dto);

    if (appointmentRating.appointment.interpreter) {
      await this.calculateAverageInterpreterRating(appointmentRating.appointment.interpreter);
    }
  }

  public async rateAppointmentByInterpreter(id: string, dto: RateAppointmentByInterpreterDto): Promise<void> {
    const appointmentRating = await this.getAndValidateAppointmentRating(id);
    await this.updateAppointmentRating(appointmentRating, dto);
  }

  private async getAndValidateAppointmentRating(id: string): Promise<AppointmentRating> {
    const queryOptions = this.appointmentQueryOptionsService.getAndValidateAppointmentRatingOptions(id);
    const appointmentRating = await findOneOrFail(id, this.appointmentRatingRepository, queryOptions);

    if (appointmentRating.appointment.status !== EAppointmentStatus.COMPLETED) {
      throw new BadRequestException("Appointment cannot be rated in its current state.");
    }

    return appointmentRating;
  }

  public async createAppointmentRating(appointment: Appointment): Promise<void> {
    const appointmentRatingDto = this.appointmentRatingRepository.create({
      interpreterId: appointment.interpreterId,
      appointment,
    });
    await this.appointmentRatingRepository.save(appointmentRatingDto);

    if (appointment.interpreter) {
      await this.calculateAverageInterpreterRating(appointment.interpreter);
      await this.sendRatingNotifications(appointment);
    }
  }

  private async sendRatingNotifications(appointment: Appointment): Promise<void> {
    if (appointment.clientId && appointment.interpreterId) {
      await this.appointmentNotificationService.sendClientRatingNotification(
        appointment.clientId,
        appointment.platformId,
        { appointmentId: appointment.id },
      );
      await this.appointmentNotificationService.sendInterpreterRatingNotification(
        appointment.interpreterId,
        appointment.platformId,
        { appointmentId: appointment.id },
      );
    }
  }

  private async updateAppointmentRating(
    appointmentRating: AppointmentRating,
    dto: RateAppointmentByClientDto | RateAppointmentByInterpreterDto,
  ): Promise<AppointmentRating> {
    const isClientDto = dto instanceof RateAppointmentByClientDto;
    const determinedClientRatedInterpreter = isClientDto ? true : appointmentRating.clientRatedInterpreter;
    const determinedInterpreterRatedCallQuality = !isClientDto ? true : appointmentRating.interpreterRatedCallQuality;

    await this.appointmentRatingRepository.update(appointmentRating.id, {
      ...dto,
      clientRatedInterpreter: determinedClientRatedInterpreter,
      interpreterRatedCallQuality: determinedInterpreterRatedCallQuality,
    });

    return { ...appointmentRating, ...dto } as AppointmentRating;
  }

  public async toggleInterpreterRatingExclusion(id: string): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getToggleInterpreterRatingExclusionOptions(id);
    const appointmentRating = await findOneOrFail(id, this.appointmentRatingRepository, queryOptions);

    const newExclusionState = !appointmentRating.excludeInterpreterRating;
    await this.appointmentRatingRepository.update(appointmentRating.id, {
      excludeInterpreterRating: newExclusionState,
    });

    if (appointmentRating.appointment.interpreter) {
      await this.calculateAverageInterpreterRating(appointmentRating.appointment.interpreter);
    }
  }

  private async calculateAverageInterpreterRating(userRole: UserRole): Promise<void> {
    const RATING_PRECISION = 2;
    const queryOptions = this.appointmentQueryOptionsService.getInterpreterRatingsOptions(userRole.id);
    const interpreterRatings = await this.appointmentRatingRepository.find(queryOptions);

    const totalRating = interpreterRatings.reduce((sum, rating) => sum + rating.interpreterRating, 0);
    const averageRating = parseFloat((totalRating / interpreterRatings.length).toFixed(RATING_PRECISION));

    await this.interpreterProfileService.updateAverageInterpreterRating(userRole, averageRating);

    return;
  }
}
