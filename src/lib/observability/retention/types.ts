export interface ActiveUserStats {
  dau: number;
  wau: number;
  mau: number;
  asOf: number;
}

export interface StreakStats {
  avgStreak: number;
  maxStreak: number;
  usersWithActiveStreak: number;
}
