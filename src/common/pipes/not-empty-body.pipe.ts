import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class NotEmptyBodyPipe<T = Record<string, unknown>> implements PipeTransform<T, T> {
  transform(value: T): T {
    if (!value || typeof value !== "object" || Object.keys(value).length === 0) {
      throw new BadRequestException("The request body cannot be empty");
    }

    return value;
  }
}
