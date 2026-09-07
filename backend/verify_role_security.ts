import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TasksService } from './src/modules/tasks/tasks.service';
import { PrismaService } from './src/modules/prisma/prisma.service';
import { UserRole, TaskStatus, ReviewStatus } from '@futurex/shared';
import { ForbiddenException } from '@nestjs/common';

async function runRoleSecurityVerification() {
  console.log('====================================================');
  console.log('  FUTUREX PROJECT MANAGEMENT ROLE SECURITY TEST');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const tasksService = app.get(TasksService);
  const prisma = app.get(PrismaService);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      if (detail) console.log(`         ↳ ${detail}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         ↳ ${detail}`);
    }
  }

  try {
    // 1. Fetch test subjects
    const admin = await prisma.user.findFirst({ where: { globalRole: UserRole.ADMIN } });
    const employee = await prisma.user.findFirst({ where: { globalRole: UserRole.TEAM_MEMBER } });
    const otherEmployee = await prisma.user.findFirst({
      where: {
        globalRole: UserRole.TEAM_MEMBER,
        id: { not: employee?.id },
      },
    });

    if (!admin || !employee) {
      throw new Error('Required test users (Admin, Employee) not found in database.');
    }

    console.log(`Admin User:    ${admin.firstName} ${admin.lastName} (${admin.email})`);
    console.log(`Employee User: ${employee.firstName} ${employee.lastName} (${employee.email})`);
    if (otherEmployee) {
      console.log(`Other User:    ${otherEmployee.firstName} ${otherEmployee.lastName} (${otherEmployee.email})`);
    }
    console.log('');

    // Active task assigned to employee
    let activeTask = await prisma.task.findFirst({
      where: { assigneeId: employee.id, status: TaskStatus.IN_PROGRESS, deletedAt: null },
    });

    if (!activeTask) {
      activeTask = await prisma.task.findFirst({
        where: { assigneeId: employee.id, deletedAt: null },
      });
      if (activeTask) {
        await prisma.task.update({
          where: { id: activeTask.id },
          data: { status: TaskStatus.IN_PROGRESS, progress: 40 },
        });
      }
    }

    if (!activeTask) {
      throw new Error(`No task found assigned to employee ${employee.email}`);
    }

    const initialProgress = activeTask.progress;
    console.log(`Target Test Task: ${activeTask.humanId} (Status: ${activeTask.status}, Progress: ${initialProgress}%)\n`);

    // TEST 1: Admin MUST NOT call submitDailyUpdate
    try {
      await tasksService.submitDailyUpdate(
        activeTask.id,
        admin.id,
        UserRole.ADMIN,
        { progress: 55, completedToday: 'Admin trying to update', nextStep: 'Testing' },
      );
      assert(false, 'TEST 1: Admin cannot call submitDailyUpdate', 'Expected ForbiddenException but call succeeded');
    } catch (err: any) {
      const isForbidden = err instanceof ForbiddenException;
      const code = err.getResponse?.()?.code;
      assert(
        isForbidden && code === 'TASK_PROGRESS_NOT_ALLOWED',
        'TEST 1: Admin cannot call submitDailyUpdate',
        `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
      );
    }

    // TEST 2: Admin MUST NOT update progress directly via update()
    try {
      await tasksService.update(
        activeTask.id,
        { progress: 75 },
        admin.id,
        UserRole.ADMIN,
      );
      assert(false, 'TEST 2: Admin cannot modify progress via task update', 'Expected ForbiddenException but call succeeded');
    } catch (err: any) {
      const isForbidden = err instanceof ForbiddenException;
      const code = err.getResponse?.()?.code;
      assert(
        isForbidden && code === 'TASK_PROGRESS_NOT_ALLOWED',
        'TEST 2: Admin cannot modify progress via task update',
        `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
      );
    }

    // TEST 3: Admin MUST NOT start an assigned task on behalf of employee
    let readyTask = await prisma.task.findFirst({
      where: { assigneeId: employee.id, status: TaskStatus.READY, deletedAt: null },
    });

    let createdTempReady = false;
    if (!readyTask) {
      readyTask = await prisma.task.create({
        data: {
          taskNumber: 9999,
          humanId: 'TEST-999',
          title: 'Test Ready Task',
          project: { connect: { id: activeTask.projectId } },
          creator: { connect: { id: admin.id } },
          assignee: { connect: { id: employee.id } },
          status: TaskStatus.READY,
          progress: 0,
        },
      });
      createdTempReady = true;
    }

    try {
      await tasksService.update(
        readyTask.id,
        { status: TaskStatus.IN_PROGRESS },
        admin.id,
        UserRole.ADMIN,
      );
      assert(false, 'TEST 3: Admin cannot start task on behalf of employee', 'Expected ForbiddenException but call succeeded');
    } catch (err: any) {
      const isForbidden = err instanceof ForbiddenException;
      const code = err.getResponse?.()?.code;
      assert(
        isForbidden && code === 'TASK_START_NOT_ALLOWED',
        'TEST 3: Admin cannot start task on behalf of employee',
        `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
      );
    } finally {
      if (createdTempReady && readyTask) {
        await prisma.task.delete({ where: { id: readyTask.id } });
      }
    }

    // TEST 4: Direct completion to DONE is forbidden for both Admin and Employee
    try {
      await tasksService.update(
        activeTask.id,
        { status: TaskStatus.DONE },
        admin.id,
        UserRole.ADMIN,
      );
      assert(false, 'TEST 4a: Admin cannot mark task DONE directly', 'Expected ForbiddenException but call succeeded');
    } catch (err: any) {
      const isForbidden = err instanceof ForbiddenException;
      const code = err.getResponse?.()?.code;
      assert(
        isForbidden && code === 'TASK_DIRECT_COMPLETION_NOT_ALLOWED',
        'TEST 4a: Admin cannot mark task DONE directly',
        `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
      );
    }

    try {
      await tasksService.update(
        activeTask.id,
        { status: TaskStatus.DONE },
        employee.id,
        UserRole.TEAM_MEMBER,
      );
      assert(false, 'TEST 4b: Employee cannot mark task DONE directly', 'Expected ForbiddenException but call succeeded');
    } catch (err: any) {
      const isForbidden = err instanceof ForbiddenException;
      const code = err.getResponse?.()?.code;
      assert(
        isForbidden && code === 'TASK_DIRECT_COMPLETION_NOT_ALLOWED',
        'TEST 4b: Employee cannot mark task DONE directly',
        `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
      );
    }

    // TEST 5: Unassigned team member cannot submit progress or modify task
    if (otherEmployee) {
      try {
        await tasksService.submitDailyUpdate(
          activeTask.id,
          otherEmployee.id,
          UserRole.TEAM_MEMBER,
          { progress: 50, completedToday: 'Intruder', nextStep: 'None' },
        );
        assert(false, 'TEST 5a: Unassigned member cannot submit daily update', 'Expected ForbiddenException but call succeeded');
      } catch (err: any) {
        const isForbidden = err instanceof ForbiddenException;
        const code = err.getResponse?.()?.code;
        assert(
          isForbidden && code === 'TASK_PROGRESS_NOT_ALLOWED',
          'TEST 5a: Unassigned member cannot submit daily update',
          `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
        );
      }

      try {
        await tasksService.update(
          activeTask.id,
          { status: TaskStatus.IN_REVIEW },
          otherEmployee.id,
          UserRole.TEAM_MEMBER,
        );
        assert(false, 'TEST 5b: Unassigned member cannot submit task for review', 'Expected ForbiddenException but call succeeded');
      } catch (err: any) {
        const isForbidden = err instanceof ForbiddenException;
        const code = err.getResponse?.()?.code;
        assert(
          isForbidden && code === 'TASK_ACCESS_DENIED',
          'TEST 5b: Unassigned member cannot submit task for review',
          `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
        );
      }
    }

    // TEST 6: Assigned Employee successfully submits daily progress update with Actor Audit
    const testNewProgress = Math.min(initialProgress + 10, 95);
    const updateResult = await tasksService.submitDailyUpdate(
      activeTask.id,
      employee.id,
      UserRole.TEAM_MEMBER,
      {
        progress: testNewProgress,
        completedToday: 'Implemented role boundary permission tests',
        nextStep: 'Finalizing review approval integration',
      },
    );

    assert(
      updateResult.progressAfter === testNewProgress,
      'TEST 6: Assigned employee submits daily progress update',
      `Progress updated from ${initialProgress}% to ${testNewProgress}%`,
    );

    // Check activity log entry for the progress update
    const latestProgressActivity = await prisma.taskActivity.findFirst({
      where: { taskId: activeTask.id },
      orderBy: { createdAt: 'desc' },
    });

    assert(
      latestProgressActivity !== null && latestProgressActivity.description.includes(employee.firstName),
      'TEST 7: Audit log records employee actor name on progress update',
      `Audit log: "${latestProgressActivity?.description}"`,
    );

    // TEST 8: Assigned Employee submits task for review
    const inReviewTask = await tasksService.update(
      activeTask.id,
      { status: TaskStatus.IN_REVIEW },
      employee.id,
      UserRole.TEAM_MEMBER,
    );

    assert(
      inReviewTask.status === TaskStatus.IN_REVIEW,
      'TEST 8: Assigned employee submits task for review',
      `Status transitioned to ${inReviewTask.status}`,
    );

    const latestReviewSubmitActivity = await prisma.taskActivity.findFirst({
      where: { taskId: activeTask.id },
      orderBy: { createdAt: 'desc' },
    });

    assert(
      latestReviewSubmitActivity !== null && latestReviewSubmitActivity.description.includes('submitted'),
      'TEST 9: Audit log records review submission with actor',
      `Audit log: "${latestReviewSubmitActivity?.description}"`,
    );

    // TEST 10: Admin returns task for changes (REJECTED) with feedback
    const returnedTask = await tasksService.review(
      activeTask.id,
      admin.id,
      UserRole.ADMIN,
      {
        status: ReviewStatus.REJECTED,
        feedback: 'Need verification of end-to-end edge cases before final sign-off.',
      },
    );

    assert(
      returnedTask.status === TaskStatus.IN_PROGRESS,
      'TEST 10: Admin returns task for changes (status resets to IN_PROGRESS)',
      `Status is ${returnedTask.status}`,
    );

    const returnActivity = await prisma.taskActivity.findFirst({
      where: { taskId: activeTask.id },
      orderBy: { createdAt: 'desc' },
    });

    assert(
      returnActivity !== null && returnActivity.description.includes('returned'),
      'TEST 11: Audit log records Admin actor returning task for changes',
      `Audit log: "${returnActivity?.description}"`,
    );

    // TEST 12: Employee re-submits and Admin approves (DONE, 100%)
    await tasksService.update(
      activeTask.id,
      { status: TaskStatus.IN_REVIEW },
      employee.id,
      UserRole.TEAM_MEMBER,
    );

    const approvedTask = await tasksService.review(
      activeTask.id,
      admin.id,
      UserRole.ADMIN,
      {
        status: ReviewStatus.APPROVED,
      },
    );

    assert(
      approvedTask.status === TaskStatus.DONE && approvedTask.progress === 100,
      'TEST 12: Admin approves review (status becomes DONE, progress becomes 100%)',
      `Status is ${approvedTask.status}, Progress is ${approvedTask.progress}%`,
    );

    const approveActivity = await prisma.taskActivity.findFirst({
      where: { taskId: activeTask.id },
      orderBy: { createdAt: 'desc' },
    });

    assert(
      approveActivity !== null && approveActivity.description.includes('approved'),
      'TEST 13: Audit log records Admin actor approving task',
      `Audit log: "${approveActivity?.description}"`,
    );

    // TEST 14: Subtask role boundary - Admin cannot update progress on employee subtask
    const subtask = await prisma.task.create({
      data: {
        taskNumber: 8888,
        humanId: `${activeTask.humanId}-S1`,
        title: 'Draft Unit Tests Subtask',
        project: { connect: { id: activeTask.projectId } },
        creator: { connect: { id: admin.id } },
        assignee: { connect: { id: employee.id } },
        parentTask: { connect: { id: activeTask.id } },
        status: TaskStatus.READY,
        progress: 0,
      },
    });

    try {
      await tasksService.update(
        subtask.id,
        { progress: 100 },
        admin.id,
        UserRole.ADMIN,
      );
      assert(false, 'TEST 14: Admin cannot update subtask progress', 'Expected ForbiddenException but call succeeded');
    } catch (err: any) {
      const isForbidden = err instanceof ForbiddenException;
      const code = err.getResponse?.()?.code;
      assert(
        isForbidden && code === 'TASK_PROGRESS_NOT_ALLOWED',
        'TEST 14: Admin cannot update subtask progress',
        `Correctly rejected with 403 Forbidden [${code}]: "${err.message}"`,
      );
    }

    // TEST 15: Assigned employee can toggle subtask completion
    const toggledSubtask = await tasksService.update(
      subtask.id,
      { status: TaskStatus.DONE, progress: 100 },
      employee.id,
      UserRole.TEAM_MEMBER,
    );

    assert(
      toggledSubtask.status === TaskStatus.DONE && toggledSubtask.progress === 100,
      'TEST 15: Assigned employee successfully marks subtask DONE',
      `Subtask status is ${toggledSubtask.status} (${toggledSubtask.progress}%)`,
    );

    await prisma.task.delete({ where: { id: subtask.id } });

    // Cleanup: Reset activeTask back to IN_PROGRESS at 40% so demo state is preserved
    await prisma.task.update({
      where: { id: activeTask.id },
      data: {
        status: TaskStatus.IN_PROGRESS,
        progress: 40,
        completedDate: null,
      },
    });
    console.log(`\nDemo state restored: ${activeTask.humanId} reset to IN_PROGRESS (40%).`);

  } finally {
    await app.close();
  }

  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRoleSecurityVerification().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
