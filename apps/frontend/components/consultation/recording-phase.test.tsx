import { render, screen } from '@testing-library/react';
import { RecordingPhase, type MicCheck } from './recording-phase';

jest.mock('@/lib/api-client', () => ({
  api: { healthAi: () => Promise.resolve({}) },
}));

const baseMic: MicCheck = {
  devices: [
    { deviceId: 'builtin', label: 'MacBook Pro のマイク' },
    { deviceId: 'usb-1', label: '会議用マイク' },
  ],
  deviceId: 'usb-1',
  selectDevice: jest.fn(),
  level: 0.3,
  verdict: 'ok',
  activeLabel: '会議用マイク',
  processingDisabled: true,
  error: null,
};

const baseProps = {
  caseName: '症例',
  seconds: 0,
  preview: '',
  pendingChunks: 0,
  limitReached: false,
  consentGiven: false,
  onConsentChange: jest.fn(),
  onStart: jest.fn(),
  onPause: jest.fn(),
  onResume: jest.fn(),
  onStop: jest.fn(),
};

describe('RecordingPhase のマイク確認', () => {
  it('録音前に、使うマイクを選べて、声が拾えているかが出る', () => {
    render(<RecordingPhase {...baseProps} state="idle" mic={baseMic} />);

    expect(screen.getByText('録音前にマイクを確認する')).toBeInTheDocument();
    expect(screen.getByLabelText('使用するマイク')).toHaveValue('usb-1');
    expect(screen.getByText('会議用マイク', { selector: 'option' })).toBeInTheDocument();
    expect(screen.getByText('声が拾えています。')).toBeInTheDocument();
  });

  it('音が小さいときは、患者さんの位置で確かめるよう促す', () => {
    render(<RecordingPhase {...baseProps} state="idle" mic={{ ...baseMic, verdict: 'faint' }} />);
    expect(screen.getByText(/音が小さすぎます/)).toBeInTheDocument();
  });

  it('ブラウザがノイズ抑制を切れなかったときは警告する（患者の声が削られるため）', () => {
    render(
      <RecordingPhase {...baseProps} state="idle" mic={{ ...baseMic, processingDisabled: false }} />,
    );
    expect(screen.getByText(/ノイズ抑制を切れませんでした/)).toBeInTheDocument();
  });

  it('マイクを開けなかったときは、確認の判定ではなく原因を出す', () => {
    render(
      <RecordingPhase
        {...baseProps}
        state="idle"
        mic={{ ...baseMic, error: 'マイクの使用が許可されていません。' }}
      />,
    );
    expect(screen.getByText('マイクの使用が許可されていません。')).toBeInTheDocument();
    expect(screen.queryByText('声が拾えています。')).not.toBeInTheDocument();
  });

  it('録音中は入力レベルが出続け、無音のままなら診療の最中に気づける', () => {
    const { rerender } = render(
      <RecordingPhase {...baseProps} state="recording" liveLevel={0.4} liveVerdict="ok" liveMicLabel="会議用マイク" />,
    );
    expect(screen.getByText('入力レベル')).toBeInTheDocument();
    expect(screen.queryByText(/音がまったく入っていません/)).not.toBeInTheDocument();

    rerender(
      <RecordingPhase {...baseProps} state="recording" liveLevel={0} liveVerdict="silent" liveMicLabel="会議用マイク" />,
    );
    expect(screen.getByText(/音がまったく入っていません/)).toBeInTheDocument();
  });

  it('録音前のマイク確認は、録音が始まったら画面から消える', () => {
    render(<RecordingPhase {...baseProps} state="recording" liveLevel={0.4} />);
    expect(screen.queryByText('録音前にマイクを確認する')).not.toBeInTheDocument();
  });
});
