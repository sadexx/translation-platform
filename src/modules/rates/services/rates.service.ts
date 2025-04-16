import { BadRequestException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, FindOneOptions, FindOptionsSelect, FindOptionsWhere, Repository } from "typeorm";
import { Rate } from "src/modules/rates/entities";
import {
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";
import { CalculatePriceDto, GetRateTableDto, RateDto, UpdateRateTableDto } from "src/modules/rates/common/dto";
import { ICalculatePrice } from "src/modules/rates/common/interfaces/calculate-price.interface";
import { addMinutes, differenceInMinutes, parseISO } from "date-fns";
import { RatesPriceService } from "src/modules/rates/services/rates-price.service";
import {
  IAdditionalBlockPricesForCalculation,
  IAdditionalBlockRatesForCalculation,
  ICalculatePriceGetPrice,
  IConvertedRate,
  IPricesForCalculation,
  IRatesForCalculation,
} from "src/modules/rates/common/interfaces";
import { findOneOrFail, round2 } from "src/common/utils";
import { ESortOrder } from "src/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  PEAK_HOUR,
  RATE_SELECT_ROLES_FOR_ALL_FIELDS,
  RATE_SELECT_ROLES_FOR_INTERPRETER_FIELDS,
  RATE_SELECT_ROLES_FOR_TAKER_FIELDS,
} from "src/modules/rates/common/constants/constants";
import { DEFAULT_EMPTY_VALUE } from "src/common/constants";
import { ERoleType } from "src/modules/payments/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class RatesService {
  private readonly lokiLogger = new LokiLogger(RatesService.name);

  public constructor(
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
    private readonly ratesPriceService: RatesPriceService,
  ) {}

  public async seedRatesToDatabase(): Promise<void> {
    const ratesCount = await this.ratesRepository.count();

    if (ratesCount === 0) {
      const ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_PROFESSIONAL_INTERPRETER = 28;
      const ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_LANGUAGE_BUDDY = 14;

      const defaultRatesForProfessionalInterpreter = await this.generateRateTable(
        EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
        ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_PROFESSIONAL_INTERPRETER,
      );

      const defaultRatesForLanguageBuddy = await this.generateRateTable(
        EAppointmentInterpreterType.IND_LANGUAGE_BUDDY_INTERPRETER,
        ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_LANGUAGE_BUDDY,
      );

      const defaultRates = [...defaultRatesForProfessionalInterpreter, ...defaultRatesForLanguageBuddy];

      const rates: Rate[] = [];

      for (const rate of defaultRates) {
        const transformedRate = this.transformRateToStrings(rate);
        rates.push(this.ratesRepository.create(transformedRate));
      }

      await this.ratesRepository.save(rates);

      this.lokiLogger.log(`Seeded Rates table, added ${rates.length} records`);
    }
  }

  public async generateRateTable(
    interpreterType: EAppointmentInterpreterType,
    onDemandAudioStandardFirst = 28,
  ): Promise<Partial<IConvertedRate>[]> {
    const appointmentTypes = await this.ratesPriceService.generateRateTable(
      interpreterType,
      onDemandAudioStandardFirst,
    );

    return appointmentTypes;
  }

  public async getRateTable(dto: GetRateTableDto, user: ITokenUserData): Promise<IConvertedRate[]> {
    const fields: (keyof Rate)[] = [
      "id",
      "quantity",
      "interpreterType",
      "schedulingType",
      "communicationType",
      "interpretingType",
      "qualifier",
      "details",
      "detailsSequence",
      "detailsTime",
    ];

    if (RATE_SELECT_ROLES_FOR_ALL_FIELDS.includes(user.role)) {
      fields.push(
        "paidByTakerGeneralWithGst",
        "paidByTakerGeneralWithoutGst",
        "lfhCommissionGeneral",
        "paidToInterpreterGeneralWithGst",
        "paidToInterpreterGeneralWithoutGst",
        "paidByTakerSpecialWithGst",
        "paidByTakerSpecialWithoutGst",
        "lfhCommissionSpecial",
        "paidToInterpreterSpecialWithGst",
        "paidToInterpreterSpecialWithoutGst",
      );
    } else if (RATE_SELECT_ROLES_FOR_TAKER_FIELDS.includes(user.role)) {
      fields.push(
        "paidByTakerGeneralWithGst",
        "paidByTakerGeneralWithoutGst",
        "paidByTakerSpecialWithGst",
        "paidByTakerSpecialWithoutGst",
      );
    } else if (RATE_SELECT_ROLES_FOR_INTERPRETER_FIELDS.includes(user.role)) {
      fields.push(
        "paidToInterpreterGeneralWithGst",
        "paidToInterpreterGeneralWithoutGst",
        "paidToInterpreterSpecialWithGst",
        "paidToInterpreterSpecialWithoutGst",
      );
    }

    const select = fields.reduce((acc, key) => {
      acc[key] = true;

      return acc;
    }, {} as FindOptionsSelect<Rate>);

    return await this.getRates({
      where: { interpreterType: dto.interpreterType },
      select: select,
      order: { quantity: ESortOrder.ASC },
    });
  }

  public async updateRateTable(dto: UpdateRateTableDto): Promise<void> {
    const transformedRates: Partial<Rate>[] = [];

    for (const rate of dto.data) {
      const transformedRate = this.transformRateToStrings(rate);
      transformedRates.push(transformedRate);
    }

    await this.ratesRepository.save(transformedRates);
  }

  public async calculatePrice(dto: CalculatePriceDto): Promise<ICalculatePriceGetPrice> {
    const extraDays = dto.extraDays;
    extraDays.push({
      duration: dto.duration,
      scheduleDateTime: dto.scheduleDateTime,
    });

    let price: number = 0;

    for (const day of extraDays) {
      const priceByCurrentDay = await this.calculatePriceByOneDay(dto, day.duration, day.scheduleDateTime);

      price += priceByCurrentDay.price;
    }

    return { price };
  }

  public async calculatePriceByOneDay(
    dto: CalculatePriceDto,
    currentDayDuration: number,
    currentDayScheduleDateTime: string,
    clientIsGstPayer: boolean = true,
    priceFor: ERoleType = ERoleType.CLIENT,
  ): Promise<ICalculatePrice> {
    if (dto.interpretingType === EAppointmentInterpretingType.SIMULTANEOUS) {
      return await this.calculateEscortAndSimultaneousPrice(
        dto.interpretingType,
        dto.interpreterType,
        dto.topic,
        clientIsGstPayer,
        priceFor,
        currentDayDuration,
      );
    }

    if (dto.interpretingType === EAppointmentInterpretingType.ESCORT) {
      return await this.calculateEscortAndSimultaneousPrice(
        dto.interpretingType,
        dto.interpreterType,
        dto.topic,
        clientIsGstPayer,
        priceFor,
        currentDayDuration,
      );
    }

    const scheduledDateStart = parseISO(currentDayScheduleDateTime);
    const scheduledDateEnd = addMinutes(scheduledDateStart, currentDayDuration);

    const peakTime = new Date(scheduledDateStart);
    peakTime.setHours(PEAK_HOUR, 0, 0, 0);

    const isStartAfterPeakTime = scheduledDateStart >= peakTime;
    const isEndAfterPeakTime = scheduledDateEnd >= peakTime;

    const rates = await this.getRatesForCalculator(
      dto,
      isEndAfterPeakTime,
      currentDayDuration,
      clientIsGstPayer,
      priceFor,
    );

    const { basePriceStandardHours, additionalPriceStandardHours, basePriceAfterHours, additionalPriceAfterHours } =
      this.getPricesPerTime(dto.topic, rates, clientIsGstPayer, priceFor);

    if (!isStartAfterPeakTime) {
      const minutesBeforePeak = differenceInMinutes(peakTime, scheduledDateStart);

      if (currentDayDuration <= minutesBeforePeak) {
        return this.calculateIfEndBeforePeakTime(
          currentDayDuration,
          basePriceStandardHours,
          additionalPriceStandardHours,
          rates.rateStandardHoursFirstMinutes.detailsTime,
          rates.rateStandardHoursAdditionalBlock?.detailsTime,
        );
      } else {
        return this.calculateIfStartBeforePeakTimeAndEndAfterPeakTime(
          minutesBeforePeak,
          currentDayDuration,
          basePriceStandardHours,
          additionalPriceStandardHours,
          rates.rateStandardHoursFirstMinutes.detailsTime,
          rates.rateStandardHoursAdditionalBlock?.detailsTime,
          basePriceAfterHours,
          additionalPriceAfterHours,
          rates.rateAfterHoursFirstMinutes?.detailsTime,
          rates.rateAfterHoursAdditionalBlock?.detailsTime,
        );
      }
    } else {
      return this.calculateIfStartAfterPeakTime(
        currentDayDuration,
        basePriceAfterHours,
        additionalPriceAfterHours,
        rates.rateAfterHoursFirstMinutes?.detailsTime,
        rates.rateAfterHoursAdditionalBlock?.detailsTime,
      );
    }
  }

  private async calculateEscortAndSimultaneousPrice(
    interpretingType: EAppointmentInterpretingType,
    interpreterType: EAppointmentInterpreterType,
    topic: EAppointmentTopic,
    clientIsGstPayer: boolean,
    priceFor: ERoleType,
    duration: number,
  ): Promise<ICalculatePrice> {
    const rate = await this.getRate({
      where: { interpretingType, interpreterType },
      select: {
        paidByTakerSpecialWithGst: true,
        paidByTakerGeneralWithGst: true,
        paidByTakerSpecialWithoutGst: true,
        paidByTakerGeneralWithoutGst: true,
        paidToInterpreterSpecialWithGst: true,
        paidToInterpreterGeneralWithGst: true,
        paidToInterpreterSpecialWithoutGst: true,
        paidToInterpreterGeneralWithoutGst: true,
      },
    });

    let price: number | null | undefined = null;

    if (topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL) {
      if (clientIsGstPayer) {
        if (priceFor === ERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithGst;
        } else {
          price = rate.paidToInterpreterSpecialWithGst;
        }
      } else {
        if (priceFor === ERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithoutGst;
        } else {
          price = rate.paidToInterpreterSpecialWithoutGst;
        }
      }
    } else {
      if (clientIsGstPayer) {
        if (priceFor === ERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithGst;
        } else {
          price = rate.paidByTakerSpecialWithGst;
        }
      } else {
        if (priceFor === ERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithGst;
        } else {
          price = rate.paidByTakerSpecialWithGst;
        }
      }
    }

    if (!price) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    return {
      price: round2(price),
      priceByBlocks: [{ duration, price: round2(price) }],
      addedDurationToLastBlockWhenRounding: 0,
    };
  }

  private async getRatesForCalculator(
    dto: CalculatePriceDto,
    isEndAfterPeakTime: boolean,
    currentDayDuration: number,
    clientIsGstPayer: boolean,
    priceFor: ERoleType,
  ): Promise<IRatesForCalculation> {
    const where: FindOptionsWhere<Rate> = {
      interpreterType: dto.interpreterType,
      schedulingType: dto.schedulingType,
      communicationType: dto.communicationType,
      interpretingType: dto.interpretingType,
    };

    const select: FindOptionsSelect<Rate> = {
      detailsTime: true,
    };

    if (clientIsGstPayer && priceFor === ERoleType.CLIENT) {
      select.paidByTakerSpecialWithGst = true;
      select.paidByTakerGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === ERoleType.CLIENT) {
      select.paidByTakerSpecialWithoutGst = true;
      select.paidByTakerGeneralWithoutGst = true;
    } else if (clientIsGstPayer && priceFor === ERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithGst = true;
      select.paidToInterpreterGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === ERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithoutGst = true;
      select.paidToInterpreterGeneralWithoutGst = true;
    }

    const rateStandardHoursFirstMinutes = await this.getRate({
      where: {
        ...where,
        qualifier: ERateQualifier.STANDARD_HOURS,
        detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
      },
      select,
    });

    let rateStandardHoursAdditionalBlock: IConvertedRate | null = null;

    if (currentDayDuration > Number(rateStandardHoursFirstMinutes.detailsTime)) {
      rateStandardHoursAdditionalBlock = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.STANDARD_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
        select,
      });
    }

    let rateAfterHoursFirstMinutes: IConvertedRate | null = null;
    let rateAfterHoursAdditionalBlock: IConvertedRate | null = null;

    if (isEndAfterPeakTime) {
      rateAfterHoursFirstMinutes = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.AFTER_HOURS,
          detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
        },
        select,
      });

      if (currentDayDuration > Number(rateAfterHoursFirstMinutes.detailsTime)) {
        rateAfterHoursAdditionalBlock = await this.getRate({
          where: {
            ...where,
            qualifier: ERateQualifier.AFTER_HOURS,
            detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
          },
          select,
        });
      }
    }

    return {
      rateStandardHoursFirstMinutes,
      rateStandardHoursAdditionalBlock,
      rateAfterHoursFirstMinutes,
      rateAfterHoursAdditionalBlock,
    };
  }

  private getPricesPerTime(
    topic: EAppointmentTopic,
    rates: IRatesForCalculation,
    clientIsGstPayer: boolean = true,
    priceFor: ERoleType = ERoleType.CLIENT,
  ): IPricesForCalculation {
    let basePriceStandardHours: number | null = null;
    let additionalPriceStandardHours: number | null | undefined = null;
    let basePriceAfterHours: number | null | undefined = null;
    let additionalPriceAfterHours: number | null | undefined = null;

    if (topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL) {
      if (clientIsGstPayer) {
        if (priceFor === ERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerSpecialWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterSpecialWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
        }
      } else {
        if (priceFor === ERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerSpecialWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterSpecialWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
        }
      }
    } else {
      if (clientIsGstPayer) {
        if (priceFor === ERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerGeneralWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterGeneralWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
        }
      } else {
        if (priceFor === ERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerGeneralWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterGeneralWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
        }
      }
    }

    return {
      basePriceStandardHours,
      additionalPriceStandardHours,
      basePriceAfterHours,
      additionalPriceAfterHours,
    };
  }

  private calculateIfEndBeforePeakTime(
    duration: number,
    basePrice: number | null | undefined,
    additionalPrice: number | null | undefined,
    baseDuration: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): ICalculatePrice {
    const appointmentPrice = this.calculateBaseRate(
      duration,
      basePrice,
      additionalPrice,
      baseDuration,
      additionalDuration,
    );

    return appointmentPrice;
  }

  private calculateIfStartBeforePeakTimeAndEndAfterPeakTime(
    minutesBeforePeak: number,
    duration: number,
    basePriceStandardHours: number | null | undefined,
    additionalPriceStandardHours: number | null | undefined,
    baseTimeStandardHours: number | null | undefined,
    additionalTimeStandardHours: number | null | undefined,
    basePriceAfterHours: number | null | undefined,
    additionalPriceAfterHours: number | null | undefined,
    baseTimeAfterHours: number | null | undefined,
    additionalTimeAfterHours: number | null | undefined,
  ): ICalculatePrice {
    if (!basePriceStandardHours || !basePriceAfterHours || !baseTimeStandardHours || !baseTimeAfterHours) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const prePeakDuration = minutesBeforePeak;
    let lessDuration = duration;
    let peakIsCalculated = false;
    let calculatedDuration = 0;

    const result: ICalculatePrice = {
      price: 0,
      priceByBlocks: [],
      addedDurationToLastBlockWhenRounding: 0,
    };

    if (baseTimeStandardHours <= prePeakDuration) {
      result.price += round2(basePriceStandardHours);
      result.priceByBlocks.push({ price: round2(basePriceStandardHours), duration: baseTimeStandardHours });
      result.addedDurationToLastBlockWhenRounding = baseTimeStandardHours - duration;

      calculatedDuration += baseTimeStandardHours;
    } else {
      const baseTimePrePeakDuration = prePeakDuration;
      const baseTimePostPeakDuration = baseTimeStandardHours - baseTimePrePeakDuration;

      const pricePrePeak = round2((basePriceStandardHours / baseTimeStandardHours) * baseTimePrePeakDuration);
      result.price += pricePrePeak;
      result.priceByBlocks.push({ price: pricePrePeak, duration: baseTimePrePeakDuration });

      const pricePostPeak = round2((basePriceAfterHours / baseTimeAfterHours) * baseTimePostPeakDuration);
      result.price += pricePostPeak;
      result.priceByBlocks.push({ price: pricePostPeak, duration: baseTimePostPeakDuration });

      result.addedDurationToLastBlockWhenRounding = baseTimeStandardHours - duration;

      calculatedDuration += baseTimeStandardHours;

      peakIsCalculated = true;
    }

    lessDuration -= baseTimeStandardHours;

    if (lessDuration <= 0) {
      return result;
    }

    let currentTimeMark = baseTimeStandardHours;

    if (
      !additionalPriceStandardHours ||
      !additionalPriceAfterHours ||
      !additionalTimeStandardHours ||
      !additionalTimeAfterHours
    ) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    while (lessDuration > 0) {
      if (currentTimeMark + additionalTimeStandardHours <= prePeakDuration) {
        result.price += round2(additionalPriceStandardHours);
        result.priceByBlocks.push({
          price: round2(additionalPriceStandardHours),
          duration: additionalTimeStandardHours,
        });
        calculatedDuration += additionalTimeStandardHours;
        result.addedDurationToLastBlockWhenRounding = calculatedDuration - duration;
      } else if (peakIsCalculated) {
        result.price += round2(additionalPriceAfterHours);
        result.priceByBlocks.push({ price: round2(additionalPriceAfterHours), duration: additionalTimeAfterHours });
        calculatedDuration += additionalTimeAfterHours;
        result.addedDurationToLastBlockWhenRounding = calculatedDuration - duration;
      } else {
        const additionalTimePrePeakDuration = prePeakDuration - currentTimeMark;

        const additionalTimePostPeakDuration = additionalTimeStandardHours - additionalTimePrePeakDuration;

        const pricePrePeak = round2(
          (additionalPriceStandardHours / additionalTimeStandardHours) * additionalTimePrePeakDuration,
        );
        result.price += pricePrePeak;
        result.priceByBlocks.push({ price: pricePrePeak, duration: additionalTimePrePeakDuration });

        const pricePostPeak = round2(
          (additionalPriceAfterHours / additionalTimeAfterHours) * additionalTimePostPeakDuration,
        );
        result.price += pricePostPeak;
        result.priceByBlocks.push({ price: pricePostPeak, duration: additionalTimePostPeakDuration });

        calculatedDuration += additionalTimeStandardHours;
        result.addedDurationToLastBlockWhenRounding = calculatedDuration - duration;

        peakIsCalculated = true;
      }

      currentTimeMark += additionalTimeStandardHours;
      lessDuration -= additionalTimeStandardHours;
    }

    return result;
  }

  private calculateIfStartAfterPeakTime(
    duration: number,
    basePrice: number | null | undefined,
    additionalPrice: number | null | undefined,
    baseDuration: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): ICalculatePrice {
    const appointmentPrice = this.calculateBaseRate(
      duration,
      basePrice,
      additionalPrice,
      baseDuration,
      additionalDuration,
    );

    return appointmentPrice;
  }

  private calculateBaseRate(
    duration: number,
    basePrice: number | null | undefined,
    additionalPrice: number | null | undefined,
    baseDuration: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): ICalculatePrice {
    if (!basePrice || !baseDuration) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const result: ICalculatePrice = {
      price: round2(basePrice),
      priceByBlocks: [{ price: round2(basePrice), duration: baseDuration }],
      addedDurationToLastBlockWhenRounding: baseDuration - duration,
    };

    if (duration <= baseDuration) {
      return result;
    }

    if (!additionalPrice || !additionalDuration) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const extraMinutes = duration - baseDuration;
    const extraBlocks = Math.ceil(extraMinutes / additionalDuration);
    const extraBlocksDuration = extraBlocks * additionalDuration;

    result.price += extraBlocks * additionalPrice;

    for (let i = 0; i < extraBlocks; i++) {
      result.priceByBlocks.push({ price: additionalPrice, duration: additionalDuration });
    }

    result.addedDurationToLastBlockWhenRounding = extraBlocksDuration - extraMinutes;

    return result;
  }

  public async calculateAdditionalBlockPrice(
    dto: CalculatePriceDto,
    currentBlockDuration: number,
    currentBlockScheduleDateTime: string,
    clientIsGstPayer: boolean = true,
    priceFor: ERoleType = ERoleType.CLIENT,
  ): Promise<ICalculatePriceGetPrice> {
    const scheduledDateStart = parseISO(currentBlockScheduleDateTime);
    const scheduledDateEnd = addMinutes(scheduledDateStart, currentBlockDuration);

    const peakTime = new Date(scheduledDateStart);
    peakTime.setHours(PEAK_HOUR, 0, 0, 0);

    const isStartAfterPeakTime = scheduledDateStart >= peakTime;
    const isEndAfterPeakTime = scheduledDateEnd >= peakTime;

    const rates = await this.getAdditionalBlockRatesForCalculator(
      dto,
      isStartAfterPeakTime,
      isEndAfterPeakTime,
      clientIsGstPayer,
      priceFor,
    );

    const { additionalPriceStandardHours, additionalPriceAfterHours } = this.getAdditionalBlockPricesPerTime(
      dto.topic,
      rates,
      clientIsGstPayer,
      priceFor,
    );

    if (!isStartAfterPeakTime) {
      const minutesBeforePeak = differenceInMinutes(peakTime, scheduledDateStart);

      if (currentBlockDuration <= minutesBeforePeak) {
        return this.calculateAdditionalBlockIfEndBeforeOrStartAfterPeakTime(additionalPriceStandardHours);
      } else {
        return this.calculateAdditionalBlockIfStartBeforePeakTimeAndEndAfterPeakTime(
          minutesBeforePeak,
          additionalPriceStandardHours,
          rates.rateStandardHoursAdditionalBlock?.detailsTime,
          additionalPriceAfterHours,
          rates.rateAfterHoursAdditionalBlock?.detailsTime,
        );
      }
    } else {
      return this.calculateAdditionalBlockIfEndBeforeOrStartAfterPeakTime(additionalPriceAfterHours);
    }
  }

  private async getAdditionalBlockRatesForCalculator(
    dto: CalculatePriceDto,
    isStartAfterPeakTime: boolean,
    isEndAfterPeakTime: boolean,
    clientIsGstPayer: boolean,
    priceFor: ERoleType,
  ): Promise<IAdditionalBlockRatesForCalculation> {
    const where: FindOptionsWhere<Rate> = {
      interpreterType: dto.interpreterType,
      schedulingType: dto.schedulingType,
      communicationType: dto.communicationType,
      interpretingType: dto.interpretingType,
    };

    const select: FindOptionsSelect<Rate> = {
      detailsTime: true,
    };

    if (clientIsGstPayer && priceFor === ERoleType.CLIENT) {
      select.paidByTakerSpecialWithGst = true;
      select.paidByTakerGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === ERoleType.CLIENT) {
      select.paidByTakerSpecialWithoutGst = true;
      select.paidByTakerGeneralWithoutGst = true;
    } else if (clientIsGstPayer && priceFor === ERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithGst = true;
      select.paidToInterpreterGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === ERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithoutGst = true;
      select.paidToInterpreterGeneralWithoutGst = true;
    }

    let rateStandardHoursAdditionalBlock: IConvertedRate | null = null;

    if (!isStartAfterPeakTime) {
      rateStandardHoursAdditionalBlock = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.STANDARD_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
        select,
      });
    }

    let rateAfterHoursAdditionalBlock: IConvertedRate | null = null;

    if (isEndAfterPeakTime) {
      rateAfterHoursAdditionalBlock = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.AFTER_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
        select,
      });
    }

    return {
      rateStandardHoursAdditionalBlock,
      rateAfterHoursAdditionalBlock,
    };
  }

  private getAdditionalBlockPricesPerTime(
    topic: EAppointmentTopic,
    rates: IAdditionalBlockRatesForCalculation,
    clientIsGstPayer: boolean = true,
    priceFor: ERoleType = ERoleType.CLIENT,
  ): IAdditionalBlockPricesForCalculation {
    let additionalPriceStandardHours: number | null | undefined = null;
    let additionalPriceAfterHours: number | null | undefined = null;

    if (topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL) {
      if (clientIsGstPayer) {
        if (priceFor === ERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
        }
      } else {
        if (priceFor === ERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
        }
      }
    } else {
      if (clientIsGstPayer) {
        if (priceFor === ERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
        }
      } else {
        if (priceFor === ERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
        }
      }
    }

    return {
      additionalPriceStandardHours,
      additionalPriceAfterHours,
    };
  }

  private calculateAdditionalBlockIfEndBeforeOrStartAfterPeakTime(
    additionalPrice: number | null | undefined,
  ): ICalculatePriceGetPrice {
    if (!additionalPrice) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const appointmentPrice = additionalPrice;

    return { price: round2(appointmentPrice) };
  }

  private calculateAdditionalBlockIfStartBeforePeakTimeAndEndAfterPeakTime(
    minutesBeforePeak: number,
    additionalPriceStandardHours: number | null | undefined,
    additionalTimeStandardHours: number | null | undefined,
    additionalPriceAfterHours: number | null | undefined,
    additionalTimeAfterHours: number | null | undefined,
  ): ICalculatePriceGetPrice {
    if (
      !additionalPriceStandardHours ||
      !additionalPriceAfterHours ||
      !additionalTimeStandardHours ||
      !additionalTimeAfterHours
    ) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    let totalPrice = 0;

    const additionalTimePrePeakDuration = minutesBeforePeak;
    const additionalTimePostPeakDuration = additionalTimeStandardHours - additionalTimePrePeakDuration;

    totalPrice += (additionalPriceStandardHours / additionalTimeStandardHours) * additionalTimePrePeakDuration;
    totalPrice += (additionalPriceAfterHours / additionalTimeAfterHours) * additionalTimePostPeakDuration;

    return { price: round2(totalPrice) };
  }

  public async getRate(options: FindOneOptions<Rate>): Promise<IConvertedRate> {
    const rate = await findOneOrFail(
      "",
      this.ratesRepository,
      options,
      DEFAULT_EMPTY_VALUE,
      HttpStatus.BAD_REQUEST,
      "Incorrect parameter combination!",
    );

    return this.transformRateToNumbers(rate);
  }

  private async getRates(options: FindManyOptions<Rate>): Promise<IConvertedRate[]> {
    const rates = await this.ratesRepository.find(options);

    const transformedRates: IConvertedRate[] = [];

    for (const rate of rates) {
      const transformedRate = this.transformRateToNumbers(rate);
      transformedRates.push(transformedRate);
    }

    return transformedRates;
  }

  private transformRateToNumbers(rate: Rate): IConvertedRate {
    const transformedRate: IConvertedRate = {
      ...rate,
      paidByTakerGeneralWithGst: Number(rate.paidByTakerGeneralWithGst),
      paidByTakerGeneralWithoutGst: Number(rate.paidByTakerGeneralWithoutGst),
      paidByTakerSpecialWithGst:
        rate.paidByTakerSpecialWithGst !== null && rate.paidByTakerSpecialWithGst !== undefined
          ? Number(rate.paidByTakerSpecialWithGst)
          : null,
      paidByTakerSpecialWithoutGst:
        rate.paidByTakerSpecialWithoutGst !== null && rate.paidByTakerSpecialWithoutGst !== undefined
          ? Number(rate.paidByTakerSpecialWithoutGst)
          : null,
      lfhCommissionGeneral: Number(rate.lfhCommissionGeneral),
      lfhCommissionSpecial:
        rate.lfhCommissionSpecial !== null && rate.lfhCommissionSpecial !== undefined
          ? Number(rate.lfhCommissionSpecial)
          : null,
      paidToInterpreterGeneralWithGst: Number(rate.paidToInterpreterGeneralWithGst),
      paidToInterpreterGeneralWithoutGst: Number(rate.paidToInterpreterGeneralWithoutGst),
      paidToInterpreterSpecialWithGst:
        rate.paidToInterpreterSpecialWithGst !== null && rate.paidToInterpreterSpecialWithGst !== undefined
          ? Number(rate.paidToInterpreterSpecialWithGst)
          : null,
      paidToInterpreterSpecialWithoutGst:
        rate.paidToInterpreterSpecialWithoutGst !== null && rate.paidToInterpreterSpecialWithoutGst !== undefined
          ? Number(rate.paidToInterpreterSpecialWithoutGst)
          : null,
    };

    return transformedRate;
  }

  private transformRateToStrings(rate: RateDto | Partial<IConvertedRate>): Partial<Rate> {
    const transformedRate: Partial<Rate> = {
      ...rate,
      paidByTakerGeneralWithGst: String(rate.paidByTakerGeneralWithGst),
      paidByTakerGeneralWithoutGst: String(rate.paidByTakerGeneralWithoutGst),
      paidByTakerSpecialWithGst:
        rate.paidByTakerSpecialWithGst !== null && rate.paidByTakerSpecialWithGst !== undefined
          ? String(rate.paidByTakerSpecialWithGst)
          : null,
      paidByTakerSpecialWithoutGst:
        rate.paidByTakerSpecialWithoutGst !== null && rate.paidByTakerSpecialWithoutGst !== undefined
          ? String(rate.paidByTakerSpecialWithoutGst)
          : null,
      lfhCommissionGeneral: String(rate.lfhCommissionGeneral),
      lfhCommissionSpecial:
        rate.lfhCommissionSpecial !== null && rate.lfhCommissionSpecial !== undefined
          ? String(rate.lfhCommissionSpecial)
          : null,
      paidToInterpreterGeneralWithGst: String(rate.paidToInterpreterGeneralWithGst),
      paidToInterpreterGeneralWithoutGst: String(rate.paidToInterpreterGeneralWithoutGst),
      paidToInterpreterSpecialWithGst:
        rate.paidToInterpreterSpecialWithGst !== null && rate.paidToInterpreterSpecialWithGst !== undefined
          ? String(rate.paidToInterpreterSpecialWithGst)
          : null,
      paidToInterpreterSpecialWithoutGst:
        rate.paidToInterpreterSpecialWithoutGst !== null && rate.paidToInterpreterSpecialWithoutGst !== undefined
          ? String(rate.paidToInterpreterSpecialWithoutGst)
          : null,
    };

    return transformedRate;
  }
}
