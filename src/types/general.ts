import { Dayjs } from "dayjs";

export type UserIdType<T = object> = T & {
  userId: string;
};

export type SearchType<T> = T & {
  searchValue: string | null;
};

export type RangeDate<T = object> = T & {
  start: Dayjs;
  end: Dayjs;
};

export type RangeDateNullable<T = object> = T & {
  start: Dayjs | null;
  end: Dayjs | null;
};
