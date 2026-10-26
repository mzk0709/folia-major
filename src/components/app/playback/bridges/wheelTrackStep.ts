// src/components/app/playback/bridges/wheelTrackStep.ts
// The wheel on the full-player page switches tracks: a notch down is the next song, a notch up the
// previous one. This file is the decision only - the bridge owns the listener and the DOM questions -
// so a burst of trackpad deltas, the cooldown after a step and the guards that keep the wheel away
// from scroll boxes and sliders can all be unit-tested.

/** Pixels the wheel has to turn, accumulated, before one step is taken. */
export const WHEEL_TRACK_STEP_PX = 60;

/**
 * How long after a step further deltas are ignored. A free-spinning wheel and a trackpad both keep
 * reporting for hundreds of milliseconds after the gesture ends; without this one flick would run
 * through several songs.
 */
export const WHEEL_TRACK_STEP_COOLDOWN_SECONDS = 0.45;

/** What a line-mode delta is worth in pixels. Page-mode deltas are rare and scale up the same way. */
const WHEEL_LINE_HEIGHT_PX = 16;

export type WheelTrackStepDecision = 'none' | 'next' | 'prev';

export type WheelTrackStepInput = {
    deltaY: number;
    deltaMode: number;
    /** Seconds since the last step fired, or null when nothing has stepped yet. */
    elapsedSecondsSinceLastStep: number | null;
    /** Pixels already carried toward the next step, from the previous event. */
    accumulated: number;
    isPlayerView: boolean;
    isPanelOpen: boolean;
    hasOpenSheet: boolean;
    hasBlockingWindow: boolean;
    hasCurrentSong: boolean;
    /** Typing field, expanded dropdown, key-capture box or a slider: the wheel is theirs. */
    isEditableTarget: boolean;
    /** The target sits inside a box that scrolls on its own: that wheel belongs to the box. */
    isScrollableTarget: boolean;
};

export type WheelTrackStepResult = {
    decision: WheelTrackStepDecision;
    /** Signed pixels carried toward the next step; 0 after a step and whenever the wheel was ignored. */
    accumulated: number;
};

/**
 * Wheel deltas arrive in three units: pixels (touchpads, most mice), lines (some mice, Firefox) and
 * pages. Only the first is comparable to a pixel threshold, so the others are scaled up.
 */
export const normalizeWheelDeltaY = (deltaY: number, deltaMode: number) => (
    deltaMode === 0 ? deltaY : deltaY * WHEEL_LINE_HEIGHT_PX
);

export const resolveWheelTrackStep = ({
    deltaY,
    deltaMode,
    elapsedSecondsSinceLastStep,
    accumulated,
    isPlayerView,
    isPanelOpen,
    hasOpenSheet,
    hasBlockingWindow,
    hasCurrentSong,
    isEditableTarget,
    isScrollableTarget,
}: WheelTrackStepInput): WheelTrackStepResult => {
    // Every guard drops what was accumulated: half a notch gathered before a panel opened must not
    // count toward a step taken after it closed.
    if (!isPlayerView || isPanelOpen || hasOpenSheet || hasBlockingWindow || !hasCurrentSong) {
        return { decision: 'none', accumulated: 0 };
    }
    if (isEditableTarget || isScrollableTarget) {
        return { decision: 'none', accumulated: 0 };
    }

    // The cooldown drops the delta rather than banking it, so a flick cannot fire again the instant
    // it expires.
    if (elapsedSecondsSinceLastStep !== null && elapsedSecondsSinceLastStep < WHEEL_TRACK_STEP_COOLDOWN_SECONDS) {
        return { decision: 'none', accumulated: 0 };
    }

    const nextAccumulated = accumulated + normalizeWheelDeltaY(deltaY, deltaMode);
    if (nextAccumulated >= WHEEL_TRACK_STEP_PX) {
        return { decision: 'next', accumulated: 0 };
    }
    if (nextAccumulated <= -WHEEL_TRACK_STEP_PX) {
        return { decision: 'prev', accumulated: 0 };
    }
    return { decision: 'none', accumulated: nextAccumulated };
};
