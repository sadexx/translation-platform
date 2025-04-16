import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role } from "src/modules/roles/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  public async getRoleByName(name: EUserRoleName): Promise<Role | null> {
    return await this.roleRepository.findOneBy({ name });
  }
}
