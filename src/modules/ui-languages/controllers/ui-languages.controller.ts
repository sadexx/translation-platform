import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { Response } from "express";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { IFile } from "src/modules/file-management/common/interfaces";
import { LanguageParamDto } from "src/modules/ui-languages/common/dto";
import { EPossibleUiLanguage } from "src/modules/ui-languages/common/enums";
import { UiLanguagesService } from "src/modules/ui-languages/services";

@Controller("ui-languages")
export class UiLanguagesController {
  constructor(private readonly uiLanguagesService: UiLanguagesService) {}

  @Get()
  async find(): Promise<{
    supportedLanguages: Record<
      EPossibleUiLanguage,
      {
        version: number;
      }
    >;
  }> {
    return await this.uiLanguagesService.find();
  }

  @Get("json/:language")
  async findLanguageFile(@Param() languageParamDto: LanguageParamDto, @Res() res: Response): Promise<void> {
    const fileUrl = await this.uiLanguagesService.findOne(languageParamDto.language);
    res.redirect(fileUrl);
  }

  @Post("json/:language")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  async updateLanguageFile(
    @Param() languageParamDto: LanguageParamDto,
    @UploadedFile() file: IFile,
  ): Promise<{
    message: string;
    language: EPossibleUiLanguage;
  }> {
    return await this.uiLanguagesService.update(languageParamDto.language, file);
  }
}
