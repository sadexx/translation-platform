import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersRolesService } from "src/modules/users-roles/services";
import { InterpreterRecommendation } from "src/modules/interpreter-questionnaire/entities";
import { InterpreterQuestionnaireService } from "src/modules/interpreter-questionnaire/services";
import {
  CreateInterpreterRecommendationDto,
  UpdateInterpreterRecommendationDto,
} from "src/modules/interpreter-questionnaire/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES } from "src/common/constants";

@Injectable()
export class InterpreterRecommendationsService {
  constructor(
    @InjectRepository(InterpreterRecommendation)
    private readonly interpreterRecommendationRepository: Repository<InterpreterRecommendation>,
    private readonly interpreterQuestionnaireService: InterpreterQuestionnaireService,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async createRecommendation(
    dto: CreateInterpreterRecommendationDto,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    await this.usersRolesService.getValidatedUserRoleForQuestionnaire(dto, user, ROLES_CAN_EDIT_NOT_OWN_PROFILES);

    const questionnaire = await this.interpreterQuestionnaireService.findOneByUserIdAndRole(
      dto.userRoleId ? { userRoleId: dto.userRoleId } : { userRoleId: undefined },
      user,
    );

    const recommendation = this.interpreterRecommendationRepository.create({
      ...dto,
      questionnaire,
    });

    await this.interpreterRecommendationRepository.save(recommendation);

    return { message: "Recommendation created successfully." };
  }

  public async updateRecommendation(
    id: string,
    dto: UpdateInterpreterRecommendationDto,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    await this.usersRolesService.getValidatedUserRoleForQuestionnaire(dto, user, ROLES_CAN_EDIT_NOT_OWN_PROFILES);

    const recommendation = await this.interpreterRecommendationRepository.findOne({
      where: { id },
    });

    if (!recommendation) {
      throw new NotFoundException("Recommendation not found.");
    }

    await this.interpreterRecommendationRepository.update(id, {
      companyName: dto.companyName,
      recommenderFullName: dto.recommenderFullName,
      recommenderPhoneNumber: dto.recommenderPhoneNumber,
      recommenderEmail: dto.recommenderEmail,
    });

    return { message: "Recommendation updated successfully." };
  }

  public async deleteRecommendation(id: string): Promise<void> {
    const recommendation = await this.interpreterRecommendationRepository.findOne({
      where: { id },
    });

    if (!recommendation) {
      throw new NotFoundException("Recommendation not found.");
    }

    await this.interpreterRecommendationRepository.remove(recommendation);

    return;
  }
}
