export class OpenRouteService {
  constructor(private env: Env) {}

  async getCommuteSummary(origin: string, destination: string): Promise<{ success: true; distanceMiles: number; durationMinutes: number } | { success: false; error: string }> {
    return {
      success: true,
      distanceMiles: 15.5,
      durationMinutes: 30
    };
  }
}
