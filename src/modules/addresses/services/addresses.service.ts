import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateAddressDto } from "src/modules/addresses/common/dto";
import { Address } from "src/modules/addresses/entities";
import { Repository } from "typeorm";
import { AppointmentUpdateService } from "src/modules/appointments/services";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments-shared/common/constants";
import { findOneOrFail } from "src/common/utils";

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly appointmentUpdateService: AppointmentUpdateService,
  ) {}

  public async updateAppointmentAddressById(id: string, dto: UpdateAddressDto): Promise<void> {
    const address = await findOneOrFail(id, this.addressRepository, {
      where: { id },
      relations: {
        appointment: {
          participants: true,
          address: true,
          client: {
            profile: true,
            role: true,
            user: true,
          },
          interpreter: {
            interpreterProfile: true,
            role: true,
          },
          appointmentOrder: {
            appointmentOrderGroup: {
              appointmentOrders: true,
            },
          },
          appointmentAdminInfo: true,
          appointmentReminder: true,
        },
      },
    });

    if (!address.appointment) {
      throw new BadRequestException("Address is not associated with an appointment.");
    }

    if (address.appointment && COMPLETED_APPOINTMENT_STATUSES.includes(address.appointment.status)) {
      throw new BadRequestException("Address cannot be updated in current state of appointment.");
    }

    Object.assign(address, dto);
    await this.addressRepository.update(address.id, address);
    await this.appointmentUpdateService.handleAppointmentAddressUpdate(address);
  }
}
