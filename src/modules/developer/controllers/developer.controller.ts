import { Body, Controller, Post, UseInterceptors } from "@nestjs/common";
import { DeveloperService } from "src/modules/developer/services";
import { TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { RegisterCompanyDto, RegisterLfhSuperAdminDto } from "src/modules/developer/common/dto";

@Controller("developer")
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post("register-lfh-super-admin")
  @UseInterceptors(TokensInterceptor)
  async registerLfhSuperAdmin(@Body() dto: RegisterLfhSuperAdminDto): Promise<object> {
    return this.developerService.registerLfhSuperAdmin(dto);
  }

  @Post("create-company")
  @UseInterceptors(TokensInterceptor)
  async createCompany(@Body() dto: RegisterCompanyDto): Promise<object> {
    return this.developerService.registerCompany(dto);
  }
}
