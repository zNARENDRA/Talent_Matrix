/**
 * TalentMatrix Scheduling Engine
 * 
 * Handles:
 * - Interview slot allocation with conflict detection
 * - Double-booking prevention
 * - Dynamic rescheduling when panels are delayed
 */

export interface ScheduleCandidate {
  studentId: string;
  name: string;
  existingInterviews: { startTime: Date; endTime: Date; panelId: string }[];
}

export interface SchedulePanel {
  id: string;
  name: string;
  availableSlots: { id: string; startTime: Date; endTime: Date; isBooked: boolean }[];
}

export interface ScheduleRequest {
  studentId: string;
  roundId: string;
  duration: number; // minutes
}

export interface ScheduleResult {
  studentId: string;
  panelId: string;
  slotId: string;
  scheduledAt: Date;
  duration: number;
  status: 'scheduled' | 'conflict';
  conflictReason?: string;
}

export interface RescheduleResult {
  affectedInterviews: {
    interviewId: string;
    studentId: string;
    originalTime: Date;
    newTime: Date;
    newPanelId: string;
    newSlotId: string;
    status: 'rescheduled' | 'no_slot_found';
  }[];
  totalAffected: number;
  totalRescheduled: number;
}

// ─── Conflict Detector ─────────────────────────────────────────
export class ConflictDetector {
  hasStudentConflict(candidate: ScheduleCandidate, startTime: Date, endTime: Date): boolean {
    return candidate.existingInterviews.some((interview) => {
      const iStart = new Date(interview.startTime).getTime();
      const iEnd = new Date(interview.endTime).getTime();
      const sStart = startTime.getTime();
      const sEnd = endTime.getTime();
      // Add 10 min buffer for transitions
      return sStart < iEnd + 600000 && sEnd > iStart - 600000;
    });
  }

  hasPanelConflict(slot: { startTime: Date; endTime: Date; isBooked: boolean }): boolean {
    return slot.isBooked;
  }
}

// ─── Slot Allocator ────────────────────────────────────────────
export class SlotAllocator {
  private conflictDetector = new ConflictDetector();

  findBestSlot(
    candidate: ScheduleCandidate,
    panels: SchedulePanel[],
    duration: number
  ): { panelId: string; slotId: string; startTime: Date } | null {
    for (const panel of panels) {
      for (const slot of panel.availableSlots) {
        if (slot.isBooked) continue;

        const startTime = new Date(slot.startTime);
        const endTime = new Date(startTime.getTime() + duration * 60000);
        const slotEnd = new Date(slot.endTime);

        // Check slot is long enough
        if (endTime > slotEnd) continue;

        // Check no candidate conflict
        if (this.conflictDetector.hasStudentConflict(candidate, startTime, endTime)) continue;

        return { panelId: panel.id, slotId: slot.id, startTime };
      }
    }
    return null;
  }
}

// ─── Rescheduling Engine ───────────────────────────────────────
export class ReschedulingEngine {
  private slotAllocator = new SlotAllocator();

  /**
   * When a panel is delayed, find new slots for affected interviews
   */
  reschedule(
    affectedInterviews: {
      interviewId: string;
      studentId: string;
      student: ScheduleCandidate;
      originalTime: Date;
      duration: number;
    }[],
    availablePanels: SchedulePanel[]
  ): RescheduleResult {
    const results: RescheduleResult['affectedInterviews'] = [];

    for (const interview of affectedInterviews) {
      const newSlot = this.slotAllocator.findBestSlot(
        interview.student,
        availablePanels,
        interview.duration
      );

      if (newSlot) {
        results.push({
          interviewId: interview.interviewId,
          studentId: interview.studentId,
          originalTime: interview.originalTime,
          newTime: newSlot.startTime,
          newPanelId: newSlot.panelId,
          newSlotId: newSlot.slotId,
          status: 'rescheduled',
        });

        // Mark the slot as booked so subsequent interviews don't use it
        const panel = availablePanels.find((p) => p.id === newSlot.panelId);
        if (panel) {
          const slot = panel.availableSlots.find((s) => s.id === newSlot.slotId);
          if (slot) slot.isBooked = true;
        }
      } else {
        results.push({
          interviewId: interview.interviewId,
          studentId: interview.studentId,
          originalTime: interview.originalTime,
          newTime: interview.originalTime,
          newPanelId: '',
          newSlotId: '',
          status: 'no_slot_found',
        });
      }
    }

    return {
      affectedInterviews: results,
      totalAffected: affectedInterviews.length,
      totalRescheduled: results.filter((r) => r.status === 'rescheduled').length,
    };
  }
}

// ─── Main Scheduler ────────────────────────────────────────────
export class SchedulingEngine {
  private slotAllocator = new SlotAllocator();
  private reschedulingEngine = new ReschedulingEngine();

  scheduleInterviews(
    requests: ScheduleRequest[],
    candidates: Map<string, ScheduleCandidate>,
    panels: SchedulePanel[]
  ): ScheduleResult[] {
    const results: ScheduleResult[] = [];

    for (const request of requests) {
      const candidate = candidates.get(request.studentId);
      if (!candidate) {
        results.push({
          studentId: request.studentId,
          panelId: '',
          slotId: '',
          scheduledAt: new Date(),
          duration: request.duration,
          status: 'conflict',
          conflictReason: 'Candidate not found',
        });
        continue;
      }

      const slot = this.slotAllocator.findBestSlot(candidate, panels, request.duration);

      if (slot) {
        results.push({
          studentId: request.studentId,
          panelId: slot.panelId,
          slotId: slot.slotId,
          scheduledAt: slot.startTime,
          duration: request.duration,
          status: 'scheduled',
        });

        // Update candidate's existing interviews for subsequent conflict checks
        const endTime = new Date(slot.startTime.getTime() + request.duration * 60000);
        candidate.existingInterviews.push({
          startTime: slot.startTime,
          endTime,
          panelId: slot.panelId,
        });

        // Mark slot as booked
        const panel = panels.find((p) => p.id === slot.panelId);
        if (panel) {
          const s = panel.availableSlots.find((s) => s.id === slot.slotId);
          if (s) s.isBooked = true;
        }
      } else {
        results.push({
          studentId: request.studentId,
          panelId: '',
          slotId: '',
          scheduledAt: new Date(),
          duration: request.duration,
          status: 'conflict',
          conflictReason: 'No available slot found without conflicts',
        });
      }
    }

    return results;
  }

  handlePanelDelay(
    affectedInterviews: Parameters<ReschedulingEngine['reschedule']>[0],
    availablePanels: SchedulePanel[]
  ): RescheduleResult {
    return this.reschedulingEngine.reschedule(affectedInterviews, availablePanels);
  }
}
