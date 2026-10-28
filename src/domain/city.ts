import { InvalidRequestError } from '../errors/app-error.js';

const MIN_CITY_LENGTH = 2;
const MAX_CITY_LENGTH = 100;

export const validateCity = (input: string | undefined): string => {
  const city = input?.trim() ?? '';
  if (city.length < MIN_CITY_LENGTH || city.length > MAX_CITY_LENGTH) {
    throw new InvalidRequestError(
      `El parámetro city debe ser obligatorio, debe tener entre ${String(MIN_CITY_LENGTH)} y ${String(MAX_CITY_LENGTH)} caracteres`,
    );
  }
  return city;
};
