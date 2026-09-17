import {
  buildAudioConstraints,
  buildFallbackAudioConstraints,
  computeLevel,
  isDeviceUnavailableError,
  judgeMicLevel,
  readAppliedAudioSettings,
} from './audio-input';

describe('buildAudioConstraints', () => {
  it('turns off the three browser processings that delete the patient voice', () => {
    const audio = buildAudioConstraints().audio as MediaTrackConstraints;
    expect(audio.echoCancellation).toBe(false);
    expect(audio.noiseSuppression).toBe(false);
    expect(audio.autoGainControl).toBe(false);
  });

  it('pins the chosen microphone with exact so the browser cannot fall back to the built-in one', () => {
    const audio = buildAudioConstraints('usb-mic-1').audio as MediaTrackConstraints;
    expect(audio.deviceId).toEqual({ exact: 'usb-mic-1' });
  });

  it('omits deviceId when no microphone has been chosen yet', () => {
    const audio = buildAudioConstraints(null).audio as MediaTrackConstraints;
    expect(audio.deviceId).toBeUndefined();
  });

  it('keeps the processing off in the fallback (the whole point of the fix)', () => {
    const audio = buildFallbackAudioConstraints().audio as MediaTrackConstraints;
    expect(audio.deviceId).toBeUndefined();
    expect(audio.noiseSuppression).toBe(false);
    expect(audio.autoGainControl).toBe(false);
  });
});

describe('isDeviceUnavailableError', () => {
  it('treats a missing/unusable device as recoverable', () => {
    expect(isDeviceUnavailableError({ name: 'OverconstrainedError' })).toBe(true);
    expect(isDeviceUnavailableError({ name: 'NotFoundError' })).toBe(true);
  });

  it('does not swallow a denied permission', () => {
    expect(isDeviceUnavailableError({ name: 'NotAllowedError' })).toBe(false);
    expect(isDeviceUnavailableError(null)).toBe(false);
  });
});

describe('readAppliedAudioSettings', () => {
  it('reports processing as disabled only when the browser actually applied it', () => {
    const track = {
      label: 'USB Microphone',
      getSettings: () => ({
        deviceId: 'usb-mic-1',
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }),
    } as unknown as MediaStreamTrack;
    expect(readAppliedAudioSettings(track)).toEqual({
      deviceId: 'usb-mic-1',
      label: 'USB Microphone',
      processingDisabled: true,
    });
  });

  it('flags a browser that ignored the constraint', () => {
    const track = {
      label: 'Built-in Microphone',
      getSettings: () => ({ noiseSuppression: true }),
    } as unknown as MediaStreamTrack;
    expect(readAppliedAudioSettings(track).processingDisabled).toBe(false);
  });

  it('survives a browser with no getSettings', () => {
    expect(readAppliedAudioSettings(null).processingDisabled).toBe(false);
  });
});

describe('computeLevel', () => {
  it('is zero for digital silence', () => {
    expect(computeLevel(new Uint8Array(128).fill(128))).toBe(0);
  });

  it('grows with amplitude and never exceeds 1', () => {
    const quiet = computeLevel([128, 132, 128, 124]);
    const loud = computeLevel([128, 200, 128, 56]);
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(quiet);
    expect(computeLevel([0, 255, 0, 255])).toBeLessThanOrEqual(1);
  });

  it('does not blow up on an empty buffer', () => {
    expect(computeLevel([])).toBe(0);
  });
});

describe('judgeMicLevel', () => {
  it('tells the doctor what is wrong before the recording starts', () => {
    expect(judgeMicLevel(0)).toBe('silent');
    expect(judgeMicLevel(0.01)).toBe('silent');
    // 空調やタイピングだけが入っている状態。処理は通るが中身が使えない録音になる
    expect(judgeMicLevel(0.05)).toBe('faint');
    expect(judgeMicLevel(0.2)).toBe('ok');
  });
});
