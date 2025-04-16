/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/common/enums";
import { ERateDetailsSequence, ERateDetailsTime, ERateQualifier, ERateTiming } from "src/modules/rates/common/enums";
import { IConvertedRate } from "src/modules/rates/common/interfaces";
import {
  ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
  ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
  ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
  ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
  ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
  PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
  PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
  PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
  PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
  PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
  RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
  RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
  RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
  RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
} from "src/modules/rates/common/constants/constants";
import { round2 } from "src/common/utils";

@Injectable()
export class RatesPriceService {
  public constructor() {}

  public async generateRateTable(
    interpreterType: EAppointmentInterpreterType,
    onDemandAudioStandardFirst = 28,
  ): Promise<Partial<IConvertedRate>[]> {
    const PAID_TO_INTERPRETER_GENERAL_WITH_GST_FACE_TO_FACE_COEFFICIENT = 0.65;
    const LFH_COMMISSION_GENERAL_FACE_TO_FACE_COEFFICIENT = 0.35;
    const PAID_TO_INTERPRETER_GENERAL_WITH_GST_COEFFICIENT = 0.55;
    const LFH_COMMISSION_GENERAL_COEFFICIENT = 0.45;

    const PAID_TO_INTERPRETER_SPECIAL_WITH_GST_FACE_TO_FACE_COEFFICIENT = 0.65;
    const LFH_COMMISSION_SPECIAL_FACE_TO_FACE_COEFFICIENT = 0.35;
    const PAID_TO_INTERPRETER_SPECIAL_WITH_GST_COEFFICIENT = 0.55;
    const LFH_COMMISSION_SPECIAL_COEFFICIENT = 0.45;

    const TEN_PERCENT = 0.1;

    const ON_DEMAND_AUDIO_STANDARD_ADDITIONAL = round2(
      (onDemandAudioStandardFirst - onDemandAudioStandardFirst * 0.05) / 3,
    );
    const ON_DEMAND_AUDIO_AFTER_FIRST = round2(onDemandAudioStandardFirst + onDemandAudioStandardFirst * 0.4);
    const ON_DEMAND_AUDIO_AFTER_ADDITIONAL = round2(
      (ON_DEMAND_AUDIO_AFTER_FIRST - ON_DEMAND_AUDIO_AFTER_FIRST * 0.05) / 3,
    );

    const PRE_BOOKED_VIDEO_STANDARD_FIRST = round2(
      onDemandAudioStandardFirst * 2 + onDemandAudioStandardFirst * 2 * 0.2,
    );
    const PRE_BOOKED_VIDEO_STANDARD_ADDITIONAL = round2(
      (PRE_BOOKED_VIDEO_STANDARD_FIRST - PRE_BOOKED_VIDEO_STANDARD_FIRST * 0.05) / 6,
    );
    const PRE_BOOKED_VIDEO_AFTER_FIRST = round2(
      PRE_BOOKED_VIDEO_STANDARD_FIRST + PRE_BOOKED_VIDEO_STANDARD_FIRST * 0.4,
    );
    const PRE_BOOKED_VIDEO_AFTER_ADDITIONAL = round2(
      (PRE_BOOKED_VIDEO_AFTER_FIRST - PRE_BOOKED_VIDEO_AFTER_FIRST * 0.05) / 6,
    );

    const ON_DEMAND_VIDEO_STANDARD_FIRST = round2(
      PRE_BOOKED_VIDEO_STANDARD_FIRST / 2 + (PRE_BOOKED_VIDEO_STANDARD_FIRST / 2) * 0.1,
    );
    const ON_DEMAND_VIDEO_STANDARD_ADDITIONAL = round2(
      (ON_DEMAND_VIDEO_STANDARD_FIRST - ON_DEMAND_VIDEO_STANDARD_FIRST * 0.05) / 3,
    );
    const ON_DEMAND_VIDEO_AFTER_FIRST = round2(ON_DEMAND_VIDEO_STANDARD_FIRST + ON_DEMAND_VIDEO_STANDARD_FIRST * 0.4);
    const ON_DEMAND_VIDEO_AFTER_ADDITIONAL = round2(
      (ON_DEMAND_VIDEO_AFTER_FIRST - ON_DEMAND_VIDEO_AFTER_FIRST * 0.05) / 3,
    );

    const PRE_BOOKED_AUDIO_STANDARD_FIRST = round2(onDemandAudioStandardFirst * 2);
    const PRE_BOOKED_AUDIO_STANDARD_ADDITIONAL = round2(ON_DEMAND_AUDIO_STANDARD_ADDITIONAL);
    const PRE_BOOKED_AUDIO_AFTER_FIRST = round2(ON_DEMAND_AUDIO_AFTER_FIRST * 2);
    const PRE_BOOKED_AUDIO_AFTER_ADDITIONAL = round2(ON_DEMAND_AUDIO_AFTER_ADDITIONAL);

    const PRE_BOOKED_F2F_STANDARD_FIRST = round2(onDemandAudioStandardFirst * 6 - onDemandAudioStandardFirst * 6 * 0.1);
    const PRE_BOOKED_F2F_STANDARD_ADDITIONAL = round2(
      ((PRE_BOOKED_F2F_STANDARD_FIRST / 6 - (PRE_BOOKED_F2F_STANDARD_FIRST / 6) * 0.05) / 3) * 2,
    );
    const PRE_BOOKED_F2F_AFTER_FIRST = round2(PRE_BOOKED_F2F_STANDARD_FIRST + PRE_BOOKED_F2F_STANDARD_FIRST * 0.5);
    const PRE_BOOKED_F2F_AFTER_ADDITIONAL = round2(
      PRE_BOOKED_F2F_STANDARD_ADDITIONAL + PRE_BOOKED_F2F_STANDARD_ADDITIONAL * 0.5,
    );

    const ON_DEMAND_F2F_STANDARD_FIRST = round2(PRE_BOOKED_F2F_STANDARD_FIRST + PRE_BOOKED_F2F_STANDARD_FIRST * 0.1);
    const ON_DEMAND_F2F_STANDARD_ADDITIONAL = round2(
      PRE_BOOKED_F2F_STANDARD_ADDITIONAL + PRE_BOOKED_F2F_STANDARD_ADDITIONAL * 0.1,
    );
    const ON_DEMAND_F2F_AFTER_FIRST = round2(PRE_BOOKED_F2F_AFTER_FIRST + PRE_BOOKED_F2F_AFTER_FIRST * 0.1);
    const ON_DEMAND_F2F_AFTER_ADDITIONAL = round2(
      PRE_BOOKED_F2F_AFTER_ADDITIONAL + PRE_BOOKED_F2F_AFTER_ADDITIONAL * 0.1,
    );

    const PRE_BOOKED_F2F_SIGN_STANDARD_FIRST = round2(
      onDemandAudioStandardFirst * 8 + onDemandAudioStandardFirst * 8 * 0.1,
    );
    const PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL = round2(PRE_BOOKED_F2F_SIGN_STANDARD_FIRST / 2);
    const PRE_BOOKED_F2F_SIGN_AFTER_FIRST = round2(
      PRE_BOOKED_F2F_SIGN_STANDARD_FIRST + PRE_BOOKED_F2F_SIGN_STANDARD_FIRST * 0.2,
    );
    const PRE_BOOKED_F2F_SIGN_AFTER_ADDITIONAL = round2(
      PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL + PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL * 0.2,
    );

    const ON_DEMAND_F2F_SIGN_STANDARD_FIRST = round2(
      PRE_BOOKED_F2F_SIGN_STANDARD_FIRST + PRE_BOOKED_F2F_SIGN_STANDARD_FIRST * 0.1,
    );
    const ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL = round2(ON_DEMAND_F2F_SIGN_STANDARD_FIRST / 2);
    const ON_DEMAND_F2F_SIGN_AFTER_FIRST = round2(
      ON_DEMAND_F2F_SIGN_STANDARD_FIRST + ON_DEMAND_F2F_SIGN_STANDARD_FIRST * 0.2,
    );
    const ON_DEMAND_F2F_SIGN_AFTER_ADDITIONAL = round2(
      ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL + ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL * 0.2,
    );

    const PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST = round2(
      onDemandAudioStandardFirst * 4 + onDemandAudioStandardFirst * 4 * 0.4,
    );
    const PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL = round2(
      PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST - PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST * 0.25,
    );
    const PRE_BOOKED_VIDEO_SIGN_AFTER_FIRST = round2(
      PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST + PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST * 0.1,
    );
    const PRE_BOOKED_VIDEO_SIGN_AFTER_ADDITIONAL = round2(
      PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL + PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL * 0.1,
    );

    const ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST = round2(
      PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST + PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST * 0.1,
    );
    const ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL = round2(
      ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST - ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST * 0.25,
    );
    const ON_DEMAND_VIDEO_SIGN_AFTER_FIRST = round2(
      ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST + ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST * 0.1,
    );
    const ON_DEMAND_VIDEO_SIGN_AFTER_ADDITIONAL = round2(
      ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL + ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL * 0.1,
    );

    const appointmentTypes: Partial<IConvertedRate>[] = [
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: onDemandAudioStandardFirst,
      },
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_AUDIO_STANDARD_ADDITIONAL,
      },
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_AUDIO_AFTER_FIRST,
      },
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_AUDIO_AFTER_ADDITIONAL,
      },

      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_STANDARD_FIRST,
      },
      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_STANDARD_ADDITIONAL,
      },
      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_AFTER_FIRST,
      },
      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_AFTER_ADDITIONAL,
      },

      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_STANDARD_FIRST,
      },
      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_STANDARD_ADDITIONAL,
      },
      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_AFTER_FIRST,
      },
      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_AFTER_ADDITIONAL,
      },

      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_STANDARD_FIRST,
      },
      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_STANDARD_ADDITIONAL,
      },
      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_AFTER_FIRST,
      },
      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_AFTER_ADDITIONAL,
      },

      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_F2F_STANDARD_FIRST,
      },
      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_F2F_STANDARD_ADDITIONAL,
      },
      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_F2F_AFTER_FIRST,
      },
      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_F2F_AFTER_ADDITIONAL,
      },

      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_F2F_STANDARD_FIRST,
      },
      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_F2F_STANDARD_ADDITIONAL,
      },
      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_F2F_AFTER_FIRST,
      },
      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_F2F_AFTER_ADDITIONAL,
      },
    ];

    if (interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER) {
      appointmentTypes.push(
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_STANDARD_FIRST,
        },
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL,
        },
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_AFTER_FIRST,
        },
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_AFTER_ADDITIONAL,
        },

        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_STANDARD_FIRST,
        },
        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL,
        },
        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_AFTER_FIRST,
        },
        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_AFTER_ADDITIONAL,
        },

        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST,
        },
        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL,
        },
        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_AFTER_FIRST,
        },
        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_AFTER_ADDITIONAL,
        },

        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST,
        },
        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL,
        },
        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_AFTER_FIRST,
        },
        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_AFTER_ADDITIONAL,
        },
      );
    }

    let currentQuantity = 1;

    if (interpreterType === EAppointmentInterpreterType.IND_LANGUAGE_BUDDY_INTERPRETER) {
      currentQuantity = 43;
    }

    for (const appointmentType of appointmentTypes) {
      if (appointmentType.paidByTakerGeneralWithGst) {
        appointmentType.quantity = currentQuantity;
        appointmentType.interpreterType = interpreterType;
        appointmentType.paidByTakerGeneralWithoutGst = round2((appointmentType.paidByTakerGeneralWithGst / 11) * 10);

        if (
          appointmentType.interpretingType === EAppointmentInterpretingType.CONSECUTIVE &&
          appointmentType.communicationType === EAppointmentCommunicationType.FACE_TO_FACE
        ) {
          appointmentType.paidToInterpreterGeneralWithGst = round2(
            appointmentType.paidByTakerGeneralWithGst * PAID_TO_INTERPRETER_GENERAL_WITH_GST_FACE_TO_FACE_COEFFICIENT,
          );
          appointmentType.lfhCommissionGeneral = round2(
            appointmentType.paidByTakerGeneralWithGst * LFH_COMMISSION_GENERAL_FACE_TO_FACE_COEFFICIENT,
          );
        } else {
          appointmentType.paidToInterpreterGeneralWithGst = round2(
            appointmentType.paidByTakerGeneralWithGst * PAID_TO_INTERPRETER_GENERAL_WITH_GST_COEFFICIENT,
          );
          appointmentType.lfhCommissionGeneral = round2(
            appointmentType.paidByTakerGeneralWithGst * LFH_COMMISSION_GENERAL_COEFFICIENT,
          );
        }

        appointmentType.paidToInterpreterGeneralWithoutGst = round2(
          (appointmentType.paidToInterpreterGeneralWithGst / 11) * 10,
        );

        if (
          appointmentType.interpretingType === EAppointmentInterpretingType.CONSECUTIVE &&
          appointmentType.interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER
        ) {
          appointmentType.paidByTakerSpecialWithGst = round2(
            appointmentType.paidByTakerGeneralWithGst + appointmentType.paidByTakerGeneralWithGst * TEN_PERCENT,
          );
          appointmentType.paidByTakerSpecialWithoutGst = round2((appointmentType.paidByTakerSpecialWithGst / 11) * 10);

          if (appointmentType.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
            appointmentType.lfhCommissionSpecial = round2(
              appointmentType.paidByTakerSpecialWithGst * PAID_TO_INTERPRETER_SPECIAL_WITH_GST_FACE_TO_FACE_COEFFICIENT,
            );
            appointmentType.paidToInterpreterSpecialWithGst = round2(
              appointmentType.paidByTakerSpecialWithGst * LFH_COMMISSION_SPECIAL_FACE_TO_FACE_COEFFICIENT,
            );
          } else {
            appointmentType.lfhCommissionSpecial = round2(
              appointmentType.paidByTakerSpecialWithGst * PAID_TO_INTERPRETER_SPECIAL_WITH_GST_COEFFICIENT,
            );
            appointmentType.paidToInterpreterSpecialWithGst = round2(
              appointmentType.paidByTakerSpecialWithGst * LFH_COMMISSION_SPECIAL_COEFFICIENT,
            );
          }

          appointmentType.paidToInterpreterSpecialWithoutGst = round2(
            (appointmentType.paidToInterpreterSpecialWithGst / 11) * 10,
          );
        } else if (
          appointmentType.interpretingType === EAppointmentInterpretingType.SIGN_LANGUAGE &&
          appointmentType.interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER
        ) {
          appointmentType.paidByTakerSpecialWithGst = appointmentType.paidByTakerGeneralWithGst;
          appointmentType.paidByTakerSpecialWithoutGst = appointmentType.paidByTakerGeneralWithoutGst;

          appointmentType.lfhCommissionSpecial = appointmentType.lfhCommissionGeneral;
          appointmentType.paidToInterpreterSpecialWithGst = appointmentType.paidToInterpreterGeneralWithGst;

          appointmentType.paidToInterpreterSpecialWithoutGst = appointmentType.paidToInterpreterGeneralWithoutGst;
        }

        currentQuantity++;
      }
    }

    if (interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER) {
      appointmentTypes.push(
        {
          interpreterType: EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
          quantity: currentQuantity++,
          schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
          interpretingType: EAppointmentInterpretingType.SIMULTANEOUS,
          qualifier: ERateQualifier.WORKING_DAY,
          details: ERateTiming.CALCULATED_PER_DAY_8_HOURS,
          detailsSequence: ERateDetailsSequence.ALL_DAY,
          detailsTime: ERateDetailsTime.EIGHT_HOURS,
          paidByTakerGeneralWithGst: 1000,
          paidByTakerGeneralWithoutGst: round2((1000 / 11) * 10),
          paidByTakerSpecialWithGst: round2(1000 + 1000 * 0.1),
          paidByTakerSpecialWithoutGst: round2(1000),
          lfhCommissionGeneral: round2(1000 * 0.47),
          lfhCommissionSpecial: round2((1000 + 1000 * 0.1) * 0.47),
          paidToInterpreterGeneralWithGst: round2(1000 * 0.53),
          paidToInterpreterGeneralWithoutGst: round2(((1000 * 0.53) / 11) * 10),
          paidToInterpreterSpecialWithGst: round2((1000 + 1000 * 0.1) * 0.53),
          paidToInterpreterSpecialWithoutGst: round2((((1000 + 1000 * 0.1) * 0.53) / 11) * 10),
        },
        {
          interpreterType: EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
          quantity: currentQuantity++,
          schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
          interpretingType: EAppointmentInterpretingType.ESCORT,
          qualifier: ERateQualifier.WORKING_DAY,
          details: ERateTiming.CALCULATED_PER_DAY_8_HOURS,
          detailsSequence: ERateDetailsSequence.ALL_DAY,
          detailsTime: ERateDetailsTime.EIGHT_HOURS,
          paidByTakerGeneralWithGst: 1000,
          paidByTakerGeneralWithoutGst: round2((1000 / 11) * 10),
          paidByTakerSpecialWithGst: round2(1000 + 1000 * 0.1),
          paidByTakerSpecialWithoutGst: round2(1000),
          lfhCommissionGeneral: round2(1000 * 0.47),
          lfhCommissionSpecial: round2((1000 + 1000 * 0.1) * 0.47),
          paidToInterpreterGeneralWithGst: round2(1000 * 0.53),
          paidToInterpreterGeneralWithoutGst: round2(((1000 * 0.53) / 11) * 10),
          paidToInterpreterSpecialWithGst: round2((1000 + 1000 * 0.1) * 0.53),
          paidToInterpreterSpecialWithoutGst: round2((((1000 + 1000 * 0.1) * 0.53) / 11) * 10),
        },
      );
    }

    return appointmentTypes;
  }
}
