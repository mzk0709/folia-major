import { describe, expect, it } from 'vitest';
import { WHEEL_TRACK_STEP_COOLDOWN_SECONDS, WHEEL_TRACK_STEP_PX, normalizeWheelDeltaY, resolveWheelTrackStep } from '@/components/app/playback/bridges/wheelTrackStep';

// test/unit/playback/wheelTrackStep.test.ts

const resolveStep = (overrides: Partial<Parameters<typeof resolveWheelTrackStep>[0]> = {}) => (
    resolveWheelTrackStep({
        deltaY: 0,
        deltaMode: 0,
        elapsedSecondsSinceLastStep: null,
        accumulated: 0,
        isPlayerView: true,
        isPanelOpen: false,
        hasOpenSheet: false,
        hasBlockingWindow: false,
        hasCurrentSong: true,
        isEditableTarget: false,
        isScrollableTarget: false,
        ...overrides,
    })
);

describe('wheel track step', () => {
    it('carries a delta short of the threshold without switching', () => {
        expect(resolveStep({ deltaY: WHEEL_TRACK_STEP_PX - 1 })).toEqual({ decision: 'none', accumulated: WHEEL_TRACK_STEP_PX - 1 });
        expect(resolveStep({ deltaY: 20, accumulated: 30 })).toEqual({ decision: 'none', accumulated: 50 });
    });

    it('steps to the next track once downward deltas reach the threshold, resetting the accumulator', () => {
        expect(resolveStep({ deltaY: WHEEL_TRACK_STEP_PX })).toEqual({ decision: 'next', accumulated: 0 });
        expect(resolveStep({ deltaY: 25, accumulated: 40 })).toEqual({ decision: 'next', accumulated: 0 });
    });

    it('steps to the previous track on an upward delta', () => {
        expect(resolveStep({ deltaY: -WHEEL_TRACK_STEP_PX })).toEqual({ decision: 'prev', accumulated: 0 });
        expect(resolveStep({ deltaY: -100 })).toEqual({ decision: 'prev', accumulated: 0 });
    });

    it('suppresses deltas during the cooldown and drops them instead of banking them', () => {
        expect(resolveStep({ deltaY: 500, elapsedSecondsSinceLastStep: 0.1 })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 500, elapsedSecondsSinceLastStep: WHEEL_TRACK_STEP_COOLDOWN_SECONDS - 0.01 })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: WHEEL_TRACK_STEP_PX, elapsedSecondsSinceLastStep: WHEEL_TRACK_STEP_COOLDOWN_SECONDS })).toEqual({ decision: 'next', accumulated: 0 });
    });

    it('ignores the wheel unless the full player is the only thing on screen with a song in it', () => {
        expect(resolveStep({ deltaY: 200, isPlayerView: false })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 200, isPanelOpen: true })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 200, hasOpenSheet: true })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 200, hasBlockingWindow: true })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 200, hasCurrentSong: false })).toEqual({ decision: 'none', accumulated: 0 });
    });

    it('leaves the wheel to editable targets and to boxes that scroll on their own', () => {
        expect(resolveStep({ deltaY: 200, isEditableTarget: true })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 200, isScrollableTarget: true })).toEqual({ decision: 'none', accumulated: 0 });
    });

    it('does not carry a partial step across a period of ignored wheel events', () => {
        expect(resolveStep({ deltaY: 40 })).toEqual({ decision: 'none', accumulated: 40 });
        expect(resolveStep({ deltaY: 40, isPanelOpen: true })).toEqual({ decision: 'none', accumulated: 0 });
        expect(resolveStep({ deltaY: 20 })).toEqual({ decision: 'none', accumulated: 20 });
    });

    it('normalizes line- and page-mode deltas to pixels', () => {
        expect(normalizeWheelDeltaY(4, 0)).toBe(4);
        expect(normalizeWheelDeltaY(4, 1)).toBe(64);
        expect(normalizeWheelDeltaY(1, 2)).toBe(16);
        expect(resolveStep({ deltaY: 4, deltaMode: 1 })).toEqual({ decision: 'next', accumulated: 0 });
        expect(resolveStep({ deltaY: 2, deltaMode: 1 })).toEqual({ decision: 'none', accumulated: 32 });
    });
});
