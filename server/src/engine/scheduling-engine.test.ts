import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SchedulingEngine,
  ConflictDetector,
  SlotAllocator,
  ReschedulingEngine,
  ScheduleCandidate,
  SchedulePanel,
  ScheduleRequest,
} from './scheduling-engine.js';

describe('Scheduling Engine', () => {
  it('ConflictDetector detects overlapping student interviews', () => {
    const detector = new ConflictDetector();
    const candidate: ScheduleCandidate = {
      studentId: 'stu-1',
      name: 'Rohan',
      existingInterviews: [
        {
          startTime: new Date('2026-08-25T10:00:00Z'),
          endTime: new Date('2026-08-25T11:00:00Z'),
          panelId: 'p-1',
        },
      ],
    };

    // Conflicting interval (10:30 to 11:30)
    const hasConflict1 = detector.hasStudentConflict(
      candidate,
      new Date('2026-08-25T10:30:00Z'),
      new Date('2026-08-25T11:30:00Z')
    );
    assert.strictEqual(hasConflict1, true);

    // Non-conflicting interval (13:00 to 14:00)
    const hasConflict2 = detector.hasStudentConflict(
      candidate,
      new Date('2026-08-25T13:00:00Z'),
      new Date('2026-08-25T14:00:00Z')
    );
    assert.strictEqual(hasConflict2, false);
  });

  it('SlotAllocator allocates available slot without candidate conflict', () => {
    const allocator = new SlotAllocator();
    const candidate: ScheduleCandidate = {
      studentId: 'stu-2',
      name: 'Priya',
      existingInterviews: [],
    };

    const panels: SchedulePanel[] = [
      {
        id: 'panel-A',
        name: 'Panel A',
        availableSlots: [
          {
            id: 'slot-1',
            startTime: new Date('2026-08-25T09:00:00Z'),
            endTime: new Date('2026-08-25T10:00:00Z'),
            isBooked: false,
          },
        ],
      },
    ];

    const slot = allocator.findBestSlot(candidate, panels, 45);
    assert.notStrictEqual(slot, null);
    assert.strictEqual(slot?.panelId, 'panel-A');
    assert.strictEqual(slot?.slotId, 'slot-1');
  });

  it('ReschedulingEngine dynamically reschedules interviews on panel delay', () => {
    const reschedulingEngine = new ReschedulingEngine();

    const affected = [
      {
        interviewId: 'iv-1',
        studentId: 'stu-1',
        student: {
          studentId: 'stu-1',
          name: 'Isha',
          existingInterviews: [],
        },
        originalTime: new Date('2026-08-25T10:00:00Z'),
        duration: 45,
      },
    ];

    const alternatePanels: SchedulePanel[] = [
      {
        id: 'panel-B',
        name: 'Panel B',
        availableSlots: [
          {
            id: 'slot-alt-1',
            startTime: new Date('2026-08-25T11:00:00Z'),
            endTime: new Date('2026-08-25T12:00:00Z'),
            isBooked: false,
          },
        ],
      },
    ];

    const result = reschedulingEngine.reschedule(affected, alternatePanels);
    assert.strictEqual(result.totalAffected, 1);
    assert.strictEqual(result.totalRescheduled, 1);
    assert.strictEqual(result.affectedInterviews[0].status, 'rescheduled');
    assert.strictEqual(result.affectedInterviews[0].newPanelId, 'panel-B');
    assert.strictEqual(result.affectedInterviews[0].newSlotId, 'slot-alt-1');
  });
});
