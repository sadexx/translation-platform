import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ECompanyType } from "src/modules/companies/common/enums";

@Injectable()
export class DeveloperSdkService {
  private readonly API_URI = "http://localhost:3000/v1";

  public constructor() {}

  public async superAdminRegistration(email: string): Promise<void> {
    await this.sendMessage("registration/super-admin-registration", "POST", {
      email,
    });
  }

  public async createPassword(password: string, token: string): Promise<void> {
    await this.sendMessage(
      "registration/create-password",
      "POST",
      {
        password,
      },
      token,
    );
  }

  public async addPhone(phoneNumber: string, token: string): Promise<void> {
    await this.sendMessage(
      "registration/add-phone",
      "POST",
      {
        phoneNumber,
      },
      token,
    );
  }

  public async verifyPhone(token: string): Promise<void> {
    await this.sendMessage(
      "registration/verify-phone",
      "POST",
      {
        verificationCode: "000000",
      },
      token,
    );
  }

  public async conditionsAgreement(token: string): Promise<void> {
    await this.sendMessage("registration/conditions-agreement", "POST", {}, token);
  }

  public async finishRegistration(token: string): Promise<{ accessToken: string }> {
    return (await this.sendMessage(
      "registration/finish-registration",
      "POST",
      {
        platform: "web",
        deviceId: "04f30890-bfca-4684-b42f-f69fc4c8d831",
        deviceToken: null,
        iosVoipToken: null,
      },
      token,
    )) as { accessToken: string };
  }

  public async createProfile(token: string): Promise<void> {
    await this.sendMessage(
      "users/me/profile-information",
      "POST",
      {
        profileInformation: {
          title: "mr",
          firstName: "Some",
          middleName: "Silver",
          lastName: "Name",
          dateOfBirth: "2003-03-21",
          gender: "m-(male)",
          contactEmail: "test@redcat.dev",
          nativeLanguage: "ukrainian",
        },
        residentialAddress: {
          latitude: 21,
          longitude: 21,
          country: "Australia",
          state: "Chernivstsi",
          suburb: "Chernivstsi",
          streetName: "Nesalezhnosti avenue",
          streetNumber: "66",
          unit: "2",
          postcode: "5800",
        },
      },
      token,
    );
  }

  public async login(email: string, password: string): Promise<{ accessToken: string }> {
    return (await this.sendMessage("auth/login", "POST", {
      identification: email,
      password,
      platform: "web",
      deviceId: "f43efc8f-4f50-4a02-9ddd-5b8fe8dfad24",
      deviceToken: "2a96fc29b03bbfe059126b33b636dafbe5810d28458a0d5723980376a08dc76f",
    })) as { accessToken: string };
  }

  public async createCompany(companyType: ECompanyType, adminEmail: string, token: string): Promise<{ id: string }> {
    return (await this.sendMessage(
      "companies/create-company",
      "POST",
      {
        name: randomUUID(),
        contactPerson: "John B",
        phoneNumber: "+380971644605",
        contactEmail: "roman.f@redcat.dev",
        country: "Ukraine",
        activitySphere: "government",
        employeesNumber: "51-100",
        companyType,
        adminName: "Some Name",
        adminEmail,
      },
      token,
    )) as { id: string };
  }

  public async sendSuperAdminInvitationLink(id: string, token: string): Promise<void> {
    await this.sendMessage(
      "companies/send-super-admin-invitation-link",
      "POST",
      {
        id,
      },
      token,
    );
  }

  public async updateCompanyProfile(token: string): Promise<void> {
    await this.sendMessage(
      "companies/update-company-profile",
      "PATCH",
      {
        profileInformation: {
          name: randomUUID(),
          contactPerson: "John B",
          phoneNumber: "+380971644605",
          contactEmail: "roman.f@redcat.dev",
          activitySphere: "government",
          employeesNumber: "51-100",
          businessRegistrationNumber: "6436234",
        },
        residentialAddress: {
          latitude: 21,
          longitude: 21,
          country: "Australia",
          state: "Chernivstsi",
          suburb: "Chernivstsi",
          streetName: "Nesalezhnosti avenue",
          streetNumber: "66",
          unit: "2",
          level: "1",
          postcode: "580000",
        },
      },
      token,
    );
  }

  public async docusignFillCompanySigners(
    companyId: string,
    mainSignerContactEmail: string,
    token: string,
  ): Promise<void> {
    await this.sendMessage(
      "docusign/corporate/fill-corporate-signers",
      "POST",
      {
        companyId,
        mainSignerContactEmail,
        mainSignerTitle: "mr",
        mainSignerFirstName: "John",
        mainSignerLastName: "Smith",
      },
      token,
    );
  }

  public async createAndSendCorporateContract(
    companyId: string,
    token: string,
  ): Promise<{
    contractId: string;
  }> {
    return (await this.sendMessage(
      "docusign/corporate/create-and-send-corporate-contract",
      "POST",
      {
        companyId,
      },
      token,
    )) as {
      contractId: string;
    };
  }

  public async emulateWebhookCorporateContract(envelopeId: string): Promise<void> {
    await fetch(`https://jigumywlh5.execute-api.ap-southeast-2.amazonaws.com/v1/docusign-webhook`, {
      method: "POST",
      body: JSON.stringify({
        event: "envelope-completed",
        data: {
          envelopeId,
          envelopeSummary: {
            status: "completed",
            sentDateTime: "2024-09-10T13:58:18.567Z",
            completedDateTime: "2024-09-10T13:59:52.147Z",
          },
        },
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  public async manualCheckWebhook(): Promise<void> {
    await this.sendMessage("webhook/manual-status-checks", "GET");
  }

  private async sendMessage(path: string, method: string, body?: object, authToken?: string): Promise<object> {
    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.API_URI}/${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });

    if (!response.ok) {
      throw new BadRequestException(await response.json());
    }

    let responseBody: object = {};

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      responseBody = await response.json();
    } catch (e) {
      console.error(e);
    }

    return responseBody;
  }
}
