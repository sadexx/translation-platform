/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSource } from "typeorm";
import { InternalServerErrorException } from "@nestjs/common";
import { ESequenceName } from "src/common/enums";
import { SingleLokiLogger } from "src/common/logger";

let dataSourceInstance: DataSource;

export const setDataSource = (dataSource: DataSource): void => {
  dataSourceInstance = dataSource;
};

export const getDataSource = (): DataSource => {
  if (!dataSourceInstance) {
    throw new InternalServerErrorException("DataSource has not been initialized");
  }

  return dataSourceInstance;
};

export const setPlatformId = async (sequenceName: ESequenceName, attemptCount = 1): Promise<string> => {
  const startValue = 1000;
  const minLength = 6;
  const maxAttemptCount = 2;
  const incrementStep = 1;

  const dataSource = getDataSource();

  try {
    const result = await dataSource.query<{ nextval: string }[]>(`SELECT nextval('${sequenceName}')`);

    return String(parseInt(result[0].nextval, 10)).padStart(minLength, "0");
  } catch (error: any) {
    if (attemptCount > maxAttemptCount) {
      SingleLokiLogger.error(
        `Failed to create platform Id for sequenceName: ${sequenceName} message: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw new InternalServerErrorException("Platform ID creating error");
    }

    if (error?.name === "QueryFailedError") {
      await dataSource.query(
        `CREATE SEQUENCE ${sequenceName} START WITH ${startValue} INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;`,
      );

      return setPlatformId(sequenceName, attemptCount + incrementStep);
    }

    SingleLokiLogger.error(
      `Failed to create platform Id for sequenceName: ${sequenceName} message: ${(error as Error).message}, ${(error as Error).stack}`,
    );
    throw new InternalServerErrorException("Platform ID creating error");
  }
};
