export class IdGeneratorUtil {
  /**
   * Generates a stable, human-readable Task ID such as CR-101 or HM-042
   */
  static generateHumanTaskId(projectKey: string, taskNumber: number): string {
    const cleanKey = projectKey.toUpperCase().trim();
    return `${cleanKey}-${taskNumber}`;
  }
}
