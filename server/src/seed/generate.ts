import { addDays, birthDateWindow, daysBetween, isIsoDate, isoDate } from '../dates.js';
import {
  FIRST_NAMES,
  HOBBIES,
  HOBBY_COUNT_WEIGHTS,
  HOBBY_WEIGHTS,
  LAST_NAMES,
  MAX_AGE,
  MIN_AGE,
  NATIONALITIES,
  NATIONALITY_WEIGHTS,
} from './data.js';
import {
  cumulative,
  hashString,
  mulberry32,
  pick,
  pickDistinctWeighted,
  pickWeightedIndex,
  type Rng,
} from './random.js';

export interface SeedUser {
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  hobbies: string[];
}

export const AVATAR_SIZE = 150;
export const AVATAR_PHOTO_COUNT = 70;
const AGE_SPAN = MAX_AGE - MIN_AGE + 1;

// Only 70 distinct pravatar URLs, so avatars come from cache while scrolling.
// `?u=<id>` would make every URL unique and uncached ones take pravatar seconds.
export function avatarUrl(firstName: string, lastName: string, ordinal: number): string {
  const photo = (hashString(`${firstName}-${lastName}-${ordinal}`) % AVATAR_PHOTO_COUNT) + 1;
  return `https://i.pravatar.cc/${AVATAR_SIZE}?img=${photo}`;
}

// One PRNG draw: the integer part is the age, the fraction places the birthday within
// that age's one-year window.
export function drawDateOfBirth(rng: Rng, today: string): string {
  const x = rng() * AGE_SPAN;
  const age = MIN_AGE + Math.floor(x);
  const fraction = x - Math.floor(x);
  const { earliest, latest } = birthDateWindow(today, age);
  const days = daysBetween(earliest, latest) + 1;
  return addDays(latest, -Math.floor(fraction * days));
}

export function generateUsers(
  count: number,
  seed: number,
  today: string = isoDate(new Date()),
): SeedUser[] {
  if (!isIsoDate(today)) throw new Error(`today must be a YYYY-MM-DD date, received "${today}"`);
  const rng = mulberry32(seed);
  const nationalityCdf = cumulative(NATIONALITY_WEIGHTS);
  const hobbyCountCdf = cumulative(HOBBY_COUNT_WEIGHTS);
  const users: SeedUser[] = [];

  for (let ordinal = 1; ordinal <= count; ordinal++) {
    const first_name = pick(rng, FIRST_NAMES);
    const last_name = pick(rng, LAST_NAMES);
    const nationality = NATIONALITIES[pickWeightedIndex(rng, nationalityCdf)] ?? NATIONALITIES[0]!;
    const hobbyCount = pickWeightedIndex(rng, hobbyCountCdf);
    users.push({
      avatar: avatarUrl(first_name, last_name, ordinal),
      first_name,
      last_name,
      // Evaluated before `hobbies`: literal properties run in order and both draw from the PRNG.
      date_of_birth: drawDateOfBirth(rng, today),
      nationality,
      hobbies: pickDistinctWeighted(rng, HOBBIES, HOBBY_WEIGHTS, hobbyCount),
    });
  }

  return users;
}
