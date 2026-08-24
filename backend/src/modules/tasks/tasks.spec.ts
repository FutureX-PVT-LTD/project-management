import { IdGeneratorUtil } from '../../common/utils/id-generator.util';

describe('Task Utilities & Calculation Rules', () => {
  it('should generate stable uppercase human IDs', () => {
    expect(IdGeneratorUtil.generateHumanTaskId('cr', 101)).toBe('CR-101');
    expect(IdGeneratorUtil.generateHumanTaskId('HM', 42)).toBe('HM-42');
    expect(IdGeneratorUtil.generateHumanTaskId('web ', 5)).toBe('WEB-5');
  });

  it('should calculate weighted project progress correctly', () => {
    // Formula: sum(estimatedHours * progress / 100) / sum(estimatedHours) * 100
    const tasks = [
      { estimatedHours: 10, progress: 100 }, // weight 10
      { estimatedHours: 30, progress: 50 },  // weight 15
      { estimatedHours: 60, progress: 0 },   // weight 0
    ];

    const totalEst = tasks.reduce((sum, t) => sum + t.estimatedHours, 0); // 100h
    const weightedSum = tasks.reduce((sum, t) => sum + t.estimatedHours * (t.progress / 100), 0); // 10 + 15 + 0 = 25
    const progress = Math.round((weightedSum / totalEst) * 100);

    expect(progress).toBe(25);
  });
});
