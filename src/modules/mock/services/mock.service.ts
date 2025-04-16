import { BadRequestException, forwardRef, Inject, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { IAddPhoneData, IRegisterUserData } from "src/modules/auth/common/interfaces";
import {
  IMockAnswer,
  IMockData,
  IMockGetAbnVerificationStatus,
  IMockIeltsVerification,
  IMockPhoneNumberSend,
  IMockRegistration,
  IMockStartWWCC,
  IMockVerificationNaatiCpnNumber,
} from "src/modules/mock/common/interfaces";
import { JwtEmailConfirmationService } from "src/modules/tokens/common/libs/email-confirmation-token";
import { RedisService } from "src/modules/redis/services";
import { ConfigService } from "@nestjs/config";
import { IAbnMessageWithReview } from "src/modules/abn/common/interface";
import { EExtAbnStatus, EExtAbnTypeCode } from "src/modules/abn/common/enums";
import { randomUUID } from "node:crypto";
import { IResultVerification } from "src/modules/ielts/common/interfaces";
import { BackyCheck } from "src/modules/backy-check/entities";
import { EExtCheckResult, EExtCheckStatus } from "src/modules/backy-check/common/enums";
import { INaatiApiResponse } from "src/modules/naati/common/interface";
import { EExtInterpreterLevel, EExtNaatiLanguages } from "src/modules/naati/common/enum";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UsersRolesService } from "src/modules/users-roles/services";
import { EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { DocusignContract } from "src/modules/docusign/entities";
import { IPhoneVerification } from "src/modules/users/common/interfaces";

@Injectable()
export class MockService {
  public readonly mockEmails: string[];

  private readonly mockPhones: string[];

  public readonly mockAbnNumber: string;
  public readonly mockIeltsNumber: string;
  public readonly mockWWCCNumber: string;
  public readonly mockNaatiNumber: string;
  public readonly mockSumSubFullName: string;

  public constructor(
    @InjectRepository(BackyCheck)
    private readonly backyCheckRepository: Repository<BackyCheck>,
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    private readonly jwtEmailConfirmationService: JwtEmailConfirmationService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly usersRolesService: UsersRolesService,
  ) {
    const { emails, phones, abnNumber, ieltsNumber, wwccNumber, naatiNumber, sumSubFullName } =
      this.configService.getOrThrow<IMockData>("mock");

    this.mockEmails = emails;
    this.mockPhones = phones;
    this.mockAbnNumber = abnNumber;
    this.mockIeltsNumber = ieltsNumber;
    this.mockWWCCNumber = wwccNumber;
    this.mockNaatiNumber = naatiNumber;
    this.mockSumSubFullName = sumSubFullName;
  }

  public async mockRegistration(registerUserData: IRegisterUserData): Promise<IMockRegistration> {
    if (!this.mockEmails.includes(registerUserData.email)) {
      return {
        isMocked: false,
        result: null,
      };
    }

    const emailConfirmationToken = await this.jwtEmailConfirmationService.signAsync({
      email: registerUserData.email,
      userRole: registerUserData.role,
      clientIPAddress: registerUserData.IPAddress,
      clientUserAgent: registerUserData.userAgent,
    });

    return {
      isMocked: true,
      result: {
        emailConfirmationToken,
      },
    };
  }

  public mockVerifyCode(email: string): IMockAnswer {
    if (!this.mockEmails.includes(email)) {
      return {
        isMocked: false,
        result: null,
      };
    }

    return {
      isMocked: true,
      result: null,
    };
  }

  public async mockSendPhoneNumberVerificationCode(addPhoneData: IAddPhoneData): Promise<IMockPhoneNumberSend> {
    if (!this.mockPhones.includes(addPhoneData.phoneNumber)) {
      return {
        isMocked: false,
        result: null,
      };
    }

    await this.redisService.setJson<IPhoneVerification>(addPhoneData.email, {
      phoneNumber: addPhoneData.phoneNumber,
      confirmationCode: "000000",
    });

    return {
      isMocked: true,
      result: { message: "Phone verification code is send" },
    };
  }

  public mockGetAbnVerificationStatus(userName: string): IMockGetAbnVerificationStatus {
    const IAbnMessageWithReview: IAbnMessageWithReview = {
      abnNumber: randomUUID(),
      abnStatus: EExtAbnStatus.ACTIVE,
      abnStatusEffectiveFrom: "2015-09-08",
      acn: "",
      addressDate: "2015-09-08",
      addressPostcode: "2130",
      addressState: "NSW",
      businessName: [],
      fullName: userName,
      typeCode: EExtAbnTypeCode.IND,
      typeName: "Individual/Sole Trader",
      gst: null,
      message: "",
    };

    return {
      isMocked: false,
      result: IAbnMessageWithReview,
    };
  }

  public mockIeltsVerification(firstName: string, lastName: string): IMockIeltsVerification {
    const resultVerification: IResultVerification = {
      messageMetadata: {
        messageRequestUid: "uqapiap801-4777-492020-1",
        messageOriginator: "SBdSoCILzw7OP1cyPxPIXchkmGOCEpRM",
        messageRequestDateTime: "2020-11-09T14:10:08.609Z",
        previousResultSetUrl: "",
        currentResultSetUrl:
          "https://apis-sandbox.cambridgeassessment.org.uk/qa2/v1/ielts/result-verification?endDateTime=2019-09-16T23:28:00&trfNumber=null&photoFlag=Y&page=1&limit=2500&messageOriginator=SBdSoCILzw7OP1cyPxPIXchkmGOCEpRM&messageRequestUId=uqapiap801-4777-492020-1&apiUrl=https://null/v1/ielts/result-verification?startDateTime=2019-07-20T23%3A28%3A00&endDateTime=2019-09-16T23%3A28%3A00&trfNumber=null&photoFlag=Y&page=1&limit=2500&messageRequestDateTime=2020-11-09T14:10:07.663",
        nextResultSetUrl:
          "https://apis-sandbox.cambridgeassessment.org.uk/qa2/v1/ielts/result-verification?endDateTime=2019-09-16T23:28:00&trfNumber=null&photoFlag=Y&page=2&limit=2500&messageOriginator=SBdSoCILzw7OP1cyPxPIXchkmGOCEpRM&messageRequestUId=uqapiap801-4777-492020-1&apiUrl=https://null/v1/ielts/result-verification?startDateTime=2019-07-20T23%3A28%3A00&endDateTime=2019-09-16T23%3A28%3A00&trfNumber=null&photoFlag=Y&page=1&limit=2500&messageRequestDateTime=2020-11-09T14:10:07.663",
        QueryResultSet: [],
      },
      results: [
        {
          roName: "PT517",
          roId: "103428",
          candidateId: "ZID4787605390",
          idType: "I",
          centreNumber: "SIT02",
          candidateNumber: "020279",
          testDate: "20190702",
          module: "Academic",
          familyName: lastName.toUpperCase(),
          firstName: firstName.toUpperCase(),
          dateOfBirth: "20030414",
          gender: "M",
          listeningScore: "9.00",
          readingScore: "9.00",
          writingScore: "9.00",
          speakingScore: "9.00",
          overallBandScore: "9.00",
          trfNumber: randomUUID(),
          telephone: "24471823489",
          postalAddress: "Gate Farm Road Cottage View District X37 Building 50",
          addressLine1: "Gate Farm Road",
          addressLine2: "Cottage View",
          addressLine3: "District X37",
          addressLine4: "Building 50",
          region: "AF",
          town: "Shiraz",
          postCode: "KU8PK",
          country: "Marshall Islands",
          countryCode: "MHL",
          candidateEmail: "Edmundo.Robertello@example.com",
          photo: {
            data: "Test",
          },
          photoMediaType: "JPEG",
          status: "RELEASED",
          lastModifiedDate: "2019-08-10T09:08:57",
        },
      ],
      resultSummary: {
        recordCount: 1,
      },
    };

    return {
      isMocked: false,
      result: resultVerification,
    };
  }

  public async mockStartWWCC(requestId: string): Promise<IMockStartWWCC> {
    await this.backyCheckRepository.update(
      { id: requestId },
      {
        WWCCNumber: randomUUID(),
        orderId: randomUUID(),
        checkStatus: EExtCheckStatus.READY,
        checkResults: EExtCheckResult.CLEAR,
      },
    );

    return {
      isMocked: true,
      result: { id: requestId },
    };
  }

  public mockVerificationNaatiCpnNumber(firstName: string, lastName: string): IMockVerificationNaatiCpnNumber {
    const resultVerification: INaatiApiResponse = {
      errorCode: 0,
      practitioner: {
        practitionerId: randomUUID(),
        givenName: firstName,
        familyName: lastName,
        country: "Australia",
      },
      currentCertifications: [],
      previousCertifications: [
        {
          certificationType: EExtInterpreterLevel.CERTIFIED_INTERPRETER,
          skill: "Russian and English",
          language1: EExtNaatiLanguages.RUSSIAN,
          language2: EExtNaatiLanguages.ENGLISH,
          direction: "[Language 1] and [Language 2]",
          startDate: "04/04/2018",
          endDate: "01/05/2021",
        },
        {
          certificationType: EExtInterpreterLevel.CERTIFIED_CONFERENCE_INTERPRETER,
          skill: "English into Russian",
          language1: EExtNaatiLanguages.RUSSIAN,
          language2: EExtNaatiLanguages.ENGLISH,
          direction: "[Language 2] into [Language 1]",
          startDate: "04/04/2018",
          endDate: "01/05/2021",
        },
      ],
    };

    return {
      isMocked: true,
      result: resultVerification,
    };
  }

  public async mockCreateAndSendContract(user: ITokenUserData): Promise<IMockAnswer> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(userId, userRoleName, {
      profile: true,
      address: true,
    });

    const docusignContract = this.docusignContractRepository.create({
      userRole,
      docusignStatus: EExtDocusignStatus.COMPLETED,
      envelopeId: randomUUID(),
      sendDate: new Date(),
      signDate: new Date(),
      s3ContractKey: "users/contracts/mocked-contract.pdf",
    });

    await this.docusignContractRepository.save(docusignContract);

    return {
      isMocked: true,
      result: null,
    };
  }
}
