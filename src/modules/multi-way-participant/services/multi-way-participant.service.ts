import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { ICreateMultiWayParticipant } from "src/modules/multi-way-participant/common/interfaces";
import { Appointment } from "src/modules/appointments/entities";
import { UpdateMultiWayParticipantDto } from "src/modules/multi-way-participant/common/dto";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { EAppointmentParticipantType } from "src/modules/appointments/common/enums";
import { AttendeeManagementService } from "src/modules/chime-meeting-configuration/services";
import { MessageOutput } from "src/common/outputs";
import { EUserRoleName } from "src/modules/roles/common/enums";

@Injectable()
export class MultiWayParticipantService {
  private readonly DEFAULT_PARTICIPANTS: number = 10;

  constructor(
    @InjectRepository(MultiWayParticipant)
    private readonly multiWayParticipantRepository: Repository<MultiWayParticipant>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    private readonly attendeeManagementService: AttendeeManagementService,
  ) {}

  public async addParticipantToAppointment(
    appointmentId: string,
    participant: ICreateMultiWayParticipant,
  ): Promise<MessageOutput> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: {
        participants: true,
        chimeMeetingConfiguration: {
          attendees: true,
          appointment: true,
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException("Appointment not found.");
    }

    const newParticipant = this.multiWayParticipantRepository.create({
      appointment: appointment,
      name: participant.name,
      age: participant.age,
      phoneCode: participant.phoneCode,
      phoneNumber: participant.phoneNumber,
      email: participant.email,
    });
    await this.multiWayParticipantRepository.save(newParticipant);

    if (appointment.participantType !== EAppointmentParticipantType.MULTI_WAY) {
      await this.appointmentRepository.update(appointmentId, {
        participantType: EAppointmentParticipantType.MULTI_WAY,
      });
    }

    if (appointment.chimeMeetingConfiguration) {
      await this.attendeeManagementService.addNewAttendeeToPreBookedMeeting(
        appointment.chimeMeetingConfiguration,
        newParticipant,
      );
    }

    return { message: "Participant added successfully." };
  }

  public async updateParticipant(id: string, dto: UpdateMultiWayParticipantDto): Promise<MessageOutput> {
    const participant = await this.multiWayParticipantRepository.findOne({
      where: { id },
    });

    if (!participant) {
      throw new NotFoundException(`Participant not found.`);
    }

    await this.multiWayParticipantRepository.update(id, {
      ...dto,
    });

    if (dto.phoneCode || dto.phoneNumber) {
      await this.attendeeRepository.update(
        { externalUserId: id },
        {
          guestPhoneNumber: `${dto.phoneCode ?? participant.phoneCode}${dto.phoneNumber ?? participant.phoneNumber}`,
        },
      );
    }

    return { message: "Participant updated successfully." };
  }

  public async deleteParticipant(id: string): Promise<void> {
    const participant = await this.multiWayParticipantRepository.findOne({
      where: { id },
      relations: {
        appointment: {
          chimeMeetingConfiguration: true,
          participants: true,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException(`Participant not found.`);
    }

    await this.multiWayParticipantRepository.remove(participant);

    const remainingParticipants = (participant.appointment.participants?.length || 0) - 1;

    if (remainingParticipants < 1) {
      await this.appointmentRepository.update(participant.appointment.id, {
        participantType: EAppointmentParticipantType.TWO_WAY,
      });
    }

    if (participant.appointment.chimeMeetingConfiguration) {
      await this.attendeeManagementService.deleteAttendeeByExternalUserId(
        participant.appointment.chimeMeetingConfiguration,
        id,
      );
    }

    return;
  }

  public async createMultiWayParticipants(
    participants: ICreateMultiWayParticipant[],
    appointment: Appointment,
  ): Promise<MultiWayParticipant[]> {
    const newParticipants = participants.map((participant) => {
      const participantDto: ICreateMultiWayParticipant = {
        appointment: appointment,
        name: participant.name,
        age: participant.age,
        phoneCode: participant.phoneCode,
        phoneNumber: participant.phoneNumber,
        email: participant.email,
      };

      return this.multiWayParticipantRepository.create(participantDto);
    });

    return await this.multiWayParticipantRepository.save(newParticipants);
  }

  public async removeAllParticipantsFromAppointment(appointment: Appointment): Promise<void> {
    if (!appointment.chimeMeetingConfiguration) {
      return;
    }

    const participantsCount = await this.multiWayParticipantRepository.count({
      where: { appointmentId: appointment.id },
    });
    const { id, maxAttendees } = appointment.chimeMeetingConfiguration;

    await this.multiWayParticipantRepository.delete({ appointmentId: appointment.id });
    await this.attendeeRepository.delete({
      chimeMeetingConfigurationId: id,
      roleName: EUserRoleName.INVITED_GUEST,
    });

    const updatedMaxAttendees = Math.max(this.DEFAULT_PARTICIPANTS, maxAttendees - participantsCount);
    await this.chimeMeetingConfigurationRepository.update(appointment.chimeMeetingConfiguration.id, {
      maxAttendees: updatedMaxAttendees,
    });
  }
}
