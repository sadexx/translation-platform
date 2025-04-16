/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as process from "process";
import { IRedisConnectionData } from "src/modules/redis/common/interfaces";
import { envStringToBoolean } from "src/common/utils";
import { SMTP_SECURE_PORT } from "src/common/constants";

export const loadEnv = () => {
  const googleGeneralStrategy = {
    clientID: process.env.GOOGLE_OAUTH2_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
    scope: ["profile", "email"],
    passReqToCallback: true,
  };

  const appleGeneralStrategy = {
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    key: process.env.APPLE_PRIVATE_KEY,
    scope: ["email", "name"],
    passReqToCallback: true,
  };

  const facebookGeneralStrategy = {
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    scope: "email",
    profileFields: ["emails", "name"],
    passReqToCallback: true,
  };

  return {
    environment: process.env.NODE_ENV,
    backEndUrl: process.env.BACKEND_URL,
    mockEnabled: envStringToBoolean(process.env.MOCK_ENABLED!),
    sendLogToLoki: envStringToBoolean(process.env.SEND_LOG_TO_LOKI!),
    lokiUrl: process.env.LOKI_URL,
    firstLaunch: envStringToBoolean(process.env.FIRST_LAUNCH!),
    mock: {
      emails: process.env.MOCK_EMAILS!.split(", "),
      phones: process.env.MOCK_PHONES!.split(", "),
      abnNumber: process.env.MOCK_ABN_NUMBER,
      ieltsNumber: process.env.MOCK_IELTS_NUMBER,
      wwccNumber: process.env.MOCK_WWCC_NUMBER,
      naatiNumber: process.env.MOCK_NAATI_NUMBER,
      sumSubFullName: process.env.MOCK_SUMSUB_FULLNAME,
    },
    aws: {
      awsAccountId: process.env.AWS_ACCOUNT_ID,
      region: process.env.AWS_REGION,
      chimeControlRegion: process.env.AWS_CHIME_CONTROL_REGION,
      chimeMessagingControlRegion: process.env.AWS_CHIME_MESSAGING_CONTROL_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      pinpointApplicationId: process.env.AWS_PINPOINT_APPLICATION_ID,
      sipMediaApplicationId: process.env.AWS_CHIME_SIP_MEDIA_APPLICATION_ID,
      sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL,
      intervalTimeMinutes: parseInt(process.env.AWS_SQS_INTERVAL_TIME_MIN!),
      s3BucketName: process.env.AWS_S3_BUCKET_NAME,
      s3MediaBucketName: process.env.AWS_S3_MEDIA_BUCKET_NAME,
      uiJsonLanguagesFolder: process.env.AWS_S3_UI_LANGUAGES_FOLDER,
      uiJsonFileSizeLimitMB: process.env.AWS_S3_UI_LANGUAGES_FILE_SIZE_LIMIT,
      contractFileSizeLimitMB: parseInt(process.env.AWS_S3_CONTRACT_FILE_SIZE_LIMIT!),
      backycheckDocsFileSizeLimitMB: parseInt(process.env.AWS_S3_BACKYCHECK_DOCS_FILE_SIZE_LIMIT!),
      concessionCardFileSizeLimitMB: parseInt(process.env.AWS_S3_CONCESSION_CARD_FILE_SIZE_LIMIT!),
      languageDocsFileSizeLimitMB: parseInt(process.env.AWS_S3_LANGUAGE_DOCS_FILE_SIZE_LIMIT!),
      termsFileSizeLimitMB: parseInt(process.env.AWS_S3_TERMS_FILE_SIZE_LIMIT!),
      contentManagementFileSizeLimitMB: parseInt(process.env.AWS_S3_CONTENT_MANAGEMENT_SIZE_LIMIT!),
      companyDocumentFileSizeLimitMB: parseInt(process.env.AWS_S3_COMPANY_DOCUMENT_SIZE_LIMIT!),
      rightToWorkCheckDocsFileSizeLimitMB: parseInt(process.env.AWS_S3_RIGHT_TO_WORK_CHECK_DOCS_FILE_SIZE_LIMIT!),
      userAvatarsFileSizeLimitMB: parseInt(process.env.AWS_S3_USER_AVATARS_SIZE_LIMIT!),
      channelsFileSizeLimitMB: parseInt(process.env.AWS_S3_CHANNELS_SIZE_LIMIT!),
    },
    db: {
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT!),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT!),
      ttlMinutes: Number(process.env.REDIS_TTL_MINUTES),
    } as IRedisConnectionData,
    log: {
      level: process.env.LOG_LEVEL,
    },
    jwt: {
      access: {
        expirationTimeSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME!),
      },
      refresh: {
        expirationTimeSeconds: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME!),
      },
      registration: {
        expirationTimeSeconds: parseInt(process.env.JWT_REGISTRATION_TOKEN_EXPIRATION_TIME!),
      },
      roleSelection: {
        expirationTimeSeconds: parseInt(process.env.JWT_ROLE_SELECTION_TOKEN_EXPIRATION_TIME!),
      },
      resetPassword: {
        expirationTimeSeconds: parseInt(process.env.JWT_RESET_PASSWORD_TOKEN_EXPIRATION_TIME!),
      },
      invitation: {
        expirationTimeSeconds: parseInt(process.env.JWT_INVITATION_EXPIRATION_TIME!),
      },
      restore: {
        expirationTimeSeconds: parseInt(process.env.JWT_RESTORE_TOKEN_EXPIRATION_TIME!),
      },
    },
    hashing: {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS!),
      argon2TimeCost: parseInt(process.env.ARGON2_TIME_COST!),
    },
    mailerSettings: {
      transport: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: Number(process.env.EMAIL_PORT) === SMTP_SECURE_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: `"${process.env.EMAIL_AUTHOR_NAME}" <${process.env.EMAIL_AUTHOR}>`,
      },
    },
    googleAuth: {
      ...googleGeneralStrategy,
      callbackURL: `${process.env.AUTH_REDIRECT_ORIGIN}/auth/google-redirect`,
    },
    appleAuth: {
      ...appleGeneralStrategy,
      callbackURL: `${process.env.AUTH_REDIRECT_ORIGIN}/auth/apple-redirect`,
    },
    facebook: {
      ...facebookGeneralStrategy,
      callbackURL: `${process.env.AUTH_REDIRECT_ORIGIN}/auth/facebook-redirect`,
    },
    frontend: {
      uri: process.env.FRONTEND_URI,
      frontendUrisCors: process.env.FRONTEND_URIS_CORS,
      resetPasswordRedirectionLink: `${process.env.FRONTEND_URI}/${process.env.RESET_PASSWORD_PATH}`,
      inviteCompanySuperAdminRedirectionLink: `${process.env.FRONTEND_URI}/${process.env.INVITE_COMPANY_SUPER_ADMIN_PATH}`,
      superAdminRedirectLink: `${process.env.FRONTEND_URI}/signup/step/password`,
      restorationRedirectionLink: `${process.env.FRONTEND_URI}/account-restoration`,
      inviteForAlreadyRegisteredUserLink: `${process.env.FRONTEND_URI}/${process.env.INVITE_FOR_ALREADY_REGISTERED_USER_PATH}`,
    },
    abn: {
      baseUrl: process.env.ABN_BASE_URL,
      guid: process.env.ABN_GUID,
    },
    sumsub: {
      baseUrl: process.env.SUMSUB_BASE_URL,
      requestPath: process.env.SUMSUB_REQUEST_PATH,
      apiToken: process.env.SUMSUB_API_TOKEN,
      apiKey: process.env.SUMSUB_API_KEY,
    },
    docusign: {
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
      redirectURI: process.env.DOCUSIGN_REDIRECT_URI,
      userId: process.env.DOCUSIGN_USER_ID,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      privateKey: JSON.parse(process.env.DOCUSIGN_PRIVATE_KEY || "{}").privateKey,
      baseUrl: process.env.DOCUSIGN_BASE_URL,
      appBaseUrl: process.env.DOCUSIGN_APP_BASE_URL,
      individualTemplateId: process.env.DOCUSIGN_INDIVIDUAL_TEMPLATE_ID,
      corporateTemplateId: process.env.DOCUSIGN_CORPORATE_TEMPLATE_ID,
      indProfessionalInterpreterAustraliaTemplateId:
        process.env.DOCUSIGN_IND_PROFESSIONAL_INTERPRETER_AUSTRALIA_TEMPLATE_ID,
      indProfessionalInterpreterDifferentCountryTemplateId:
        process.env.DOCUSIGN_IND_PROFESSIONAL_INTERPRETER_DIFFERENT_COUNTRY_TEMPLATE_ID,
      indLanguageBuddyAustraliaTemplateId: process.env.DOCUSIGN_IND_LANGUAGE_BUDDY_INTERPRETER_AUSTRALIA_TEMPLATE_ID,
      indLanguageBuddyDifferentCountryTemplateId:
        process.env.DOCUSIGN_IND_LANGUAGE_BUDDY_INTERPRETER_DIFFERENT_COUNTRY_TEMPLATE_ID,
      corporateClientsSuperAdminAustraliaTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_AUSTRALIA_TEMPLATE_ID,
      corporateClientsSuperAdminDifferentCountryTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_DIFFERENT_COUNTRY_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminAustraliaTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_AUSTRALIA_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminDifferentCountryTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_DIFFERENT_COUNTRY_TEMPLATE_ID,
      corporateClientsSuperAdminAustraliaSingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_AUSTRALIA_SINGLE_TEMPLATE_ID,
      corporateClientsSuperAdminDifferentCountrySingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_DIFFERENT_COUNTRY_SINGLE_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminAustraliaSingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_AUSTRALIA_SINGLE_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminDifferentCountrySingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_DIFFERENT_COUNTRY_SINGLE_TEMPLATE_ID,
    },
    naati: {
      baseUrl: process.env.NAATI_BASE_URL,
      publicKey: process.env.NAATI_PUBLIC_KEY,
      privateKey: process.env.NAATI_PRIVATE_KEY,
    },
    ielts: {
      baseUrl: process.env.IELTS_BASE_URL,
      clientId: process.env.IELTS_CLIENT_ID,
      clientSecret: process.env.IELTS_CLIENT_SECRET,
      minOverallScore: process.env.IELTS_MIN_OVERALL_SCORE,
    },
    backyCheck: {
      baseUrl: process.env.BACKYCHECK_BASE_URL,
      clientId: process.env.BACKYCHECK_CLIENT_ID,
      clientSecret: process.env.BACKYCHECK_CLIENT_SECRET,
    },
    paypal: {
      baseUrl: process.env.PAYPAL_BASE_URL,
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
  };
};
