import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsRelations, Repository } from "typeorm";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { RolesService } from "src/modules/roles/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { COMPANY_ADMIN_ROLES, ROLES_CAN_EDIT_NOT_OWN_PROFILES } from "src/common/constants";

@Injectable()
export class UsersRolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly rolesService: RolesService,
  ) {}

  public async getByUserIdAndRoleName(
    userId: string,
    roleName: EUserRoleName,
    relations: FindOptionsRelations<UserRole> = {},
  ): Promise<UserRole> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, role: { name: roleName } },
      relations,
    });

    if (!userRole) {
      throw new ForbiddenException("User role not found. Please register with the specified role first");
    }

    return userRole;
  }

  public async createByUserIdAndRoleName(userId: string, roleName: EUserRoleName): Promise<UserRole> {
    const foundRole = await this.rolesService.getRoleByName(roleName);

    if (!foundRole) {
      throw new ForbiddenException("Role not found. Please register with the specified role first");
    }

    return await this.create(userId, foundRole.id);
  }

  public async createByRoleName(roleName: EUserRoleName): Promise<UserRole> {
    const foundRole = await this.rolesService.getRoleByName(roleName);

    if (!foundRole) {
      throw new ForbiddenException("Role not found. Please register with the specified role first");
    }

    return this.userRoleRepository.create({ role: foundRole });
  }

  public async create(userId: string, roleId: string): Promise<UserRole> {
    const userRole = this.userRoleRepository.create({ userId, roleId });

    return await this.userRoleRepository.save(userRole);
  }

  public async upsert(userRole: UserRole): Promise<UserRole> {
    return await this.userRoleRepository.save(userRole);
  }

  public async getCountryByUserIdAndRoleName(userId: string, roleName: EUserRoleName): Promise<string | undefined> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, role: { name: roleName } },
      relations: { address: true },
      select: { id: true, country: true, address: { id: true, country: true } },
    });

    return userRole?.country ?? userRole?.address?.country;
  }

  public async getValidatedUserRoleForQuestionnaire(
    dto: { userRoleId?: string },
    user: ITokenUserData,
    roles: string[],
  ): Promise<UserRole> {
    if (dto.userRoleId && dto.userRoleId !== user.userRoleId && !roles.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    let userRole: UserRole | null = null;

    if (roles.includes(user.role)) {
      if (!dto.userRoleId) {
        throw new BadRequestException("userRoleId should not be empty.");
      }

      userRole = await this.userRoleRepository.findOne({
        where: { id: dto.userRoleId },
        relations: { questionnaire: true, interpreterProfile: true, backyCheck: true },
      });
    }

    if (!roles.includes(user.role)) {
      userRole = await this.userRoleRepository.findOne({
        where: { id: user.userRoleId },
        relations: { questionnaire: true, interpreterProfile: true, backyCheck: true },
      });
    }

    if (!userRole) {
      throw new BadRequestException("User role not found.");
    }

    return userRole;
  }

  public async getValidatedUserRoleForRequest(
    dto: { userRoleId?: string },
    user: ITokenUserData,
    relations: FindOptionsRelations<UserRole> = {},
  ): Promise<UserRole> {
    if (dto.userRoleId && dto.userRoleId !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    let userRole: UserRole | null = null;

    if (ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      if (!dto.userRoleId) {
        throw new BadRequestException("userRoleId should not be not empty!");
      }

      userRole = await this.userRoleRepository.findOne({
        where: { id: dto.userRoleId },
        relations,
      });
    }

    if (!ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      userRole = await this.userRoleRepository.findOne({
        where: { id: user.userRoleId },
        relations,
      });
    }

    if (!userRole) {
      throw new BadRequestException("User role not found!");
    }

    await this.validateCompanyAdminForUserRole(user, userRole);

    return userRole;
  }

  public async validateCompanyAdminForUserRole(user: ITokenUserData, userRole: UserRole): Promise<void> {
    if (COMPANY_ADMIN_ROLES.includes(user.role)) {
      const admin = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!admin) {
        throw new BadRequestException("Company admin not find!");
      }

      if (admin.operatedByCompanyId !== userRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    return;
  }
}
