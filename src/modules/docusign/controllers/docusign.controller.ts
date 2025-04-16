import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { DocusignService } from "src/modules/docusign/services";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import {
  DownloadContractDto,
  GetContractsDto,
  GetEnvelopeDocumentDto,
  SendContractDto,
} from "src/modules/docusign/common/dto";
import { IDownloadContractInterface, IGetLinkToDocumentInterface } from "src/modules/docusign/common/interfaces";
import { DocusignContract } from "src/modules/docusign/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("docusign")
export class DocusignController {
  constructor(private readonly docusignService: DocusignService) {}

  @Get("callback")
  async callback(): Promise<string> {
    return this.docusignService.callback();
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("download-contract")
  async downloadContract(
    @Query() { id }: DownloadContractDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IDownloadContractInterface> {
    return this.docusignService.downloadContract(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("envelope-document")
  async getContractDocument(@Query() { id }: GetEnvelopeDocumentDto): Promise<IGetLinkToDocumentInterface> {
    return this.docusignService.getLinkToDocument(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("resend-contract")
  async resendContract(@Body() { id }: SendContractDto, @CurrentUser() currentUser: ITokenUserData): Promise<void> {
    return this.docusignService.resendContract(id, currentUser);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("contracts")
  async getContractList(
    @Query() getContractsDto: GetContractsDto,
    @CurrentUser() currentUser: ITokenUserData,
  ): Promise<DocusignContract[]> {
    return this.docusignService.getContractList(getContractsDto, currentUser);
  }
}
