export interface HeatmapCell {
  dayOfWeek: number; // 0 = Sunday, per Date.getDay()
  hour: number; // 0..23, local server time
  count: number;
}
