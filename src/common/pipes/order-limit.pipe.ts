import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class OrderLimitPipe<T extends Record<string, unknown>> implements PipeTransform<T, T> {
  transform(value: T): T {
    if (!value) {
      throw new BadRequestException("s");
    }

    const orderKeys = Object.keys(value).filter((key) => key.toLowerCase().includes("order"));
    const providedOrders = orderKeys.filter((key) => value[key] !== undefined && value[key] !== null);

    if (providedOrders.length > 1) {
      throw new BadRequestException("Only one ordering field is allowed.");
    }

    return value;
  }
}
