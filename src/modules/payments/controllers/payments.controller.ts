import { Body, Controller, Get, HttpStatus, Post, Query, Redirect, UseGuards, UsePipes } from "@nestjs/common";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { DownloadReceiptDto } from "src/modules/payments/common/dto";
import { IDownloadReceipt, IGetIndividualPaymentResponse } from "src/modules/payments/common/interfaces";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MakeManualPayoutAttemptDto } from "src/modules/payments/common/dto/make-manual-payout-attempt.dto";
import { GetIndividualPaymentsDto } from "src/modules/payments/common/dto/get-individual-payments.dto";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly generalPaymentsService: GeneralPaymentsService) {}

  @Get("download-receipt")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async downloadReceipt(@Query() dto: DownloadReceiptDto): Promise<IDownloadReceipt> {
    const receiptLink = await this.generalPaymentsService.downloadReceipt(dto);

    return { url: receiptLink };
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Get("download-receipt-by-user")
  async downloadReceiptByUser(@Query() dto: DownloadReceiptDto): Promise<IDownloadReceipt> {
    const receiptLink = await this.generalPaymentsService.downloadReceipt(dto);

    return { url: receiptLink };
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("manual-payout-attempt")
  async makeManualPayInCaptureAndPayOut(@Body() dto: MakeManualPayoutAttemptDto): Promise<void> {
    return await this.generalPaymentsService.makeManualPayInCaptureAndPayOut(dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("get-individual-payments-list")
  async getIndividualPaymentsList(
    @Query() dto: GetIndividualPaymentsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IGetIndividualPaymentResponse> {
    return await this.generalPaymentsService.getIndividualPaymentsList(dto, user);
  }
}
