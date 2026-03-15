import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`;
const SESSION_ID = 'e2e-proctoring-session';

type FaceStatus = 'ok' | 'no_face' | 'face_away' | 'error';
type CameraState = 'live' | 'muted' | 'ended';
type CameraPermission = 'granted' | 'denied' | 'not_found' | 'error';

interface CompletionPayload {
  terminatedByProctor?: boolean;
  tabSwitchCount?: number;
  proctoringSummary?: {
    violationsTotal?: number;
    terminatedByProctor?: boolean;
    terminationReason?: 'tab_switch' | 'fullscreen_exit' | 'camera_off' | 'no_face' | 'face_away';
  };
  proctoringEvents?: Array<{ type: string }>;
}

const quizData = {
  id: SESSION_ID,
  timerMins: 20,
  questions: [
    {
      type: 'MCQ',
      skill: 'SQL',
      content: 'Which clause filters rows?',
      options: ['WHERE', 'GROUP BY', 'ORDER BY', 'JOIN'],
      correctAnswer: 'WHERE',
      difficulty: 'easy',
    },
    {
      type: 'MCQ',
      skill: 'SQL',
      content: 'Which clause sorts rows?',
      options: ['WHERE', 'ORDER BY', 'LIMIT', 'HAVING'],
      correctAnswer: 'ORDER BY',
      difficulty: 'easy',
    },
  ],
};

async function installQuizFetchMock(page: Page) {
  await page.route(`**/api/quiz/${SESSION_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: quizData.id,
        timerMins: quizData.timerMins,
        totalQuestions: quizData.questions.length,
        questions: quizData.questions,
      }),
    });
  });
}

async function seedQuizSession(page: Page) {
  await page.context().addCookies([
    {
      name: '__session',
      value: 'e2e-session',
      url: BASE,
    },
  ]);
}

async function openQuiz(page: Page) {
  await page.addInitScript(() => {
    (window as any).__PW_E2E_PROCTORING__ = true;
  });
  await installQuizFetchMock(page);
  await seedQuizSession(page);
  await page.goto(`${BASE}/quiz/${SESSION_ID}`);
  await expect(page.getByTestId('proctor-start-btn')).toBeVisible();
}

async function setProctorState(
  page: Page,
  patch: Partial<{
    faceStatus: FaceStatus;
    cameraState: CameraState;
    cameraPermission: CameraPermission;
    yaw: number;
    pitch: number;
    roll: number;
    confidence: number;
  }>,
) {
  await page.evaluate((statePatch) => {
    const controller = (window as any).__quizProE2EProctoring;
    if (!controller) {
      throw new Error('E2E proctoring controller is not available. Check NEXT_PUBLIC_E2E_PROCTORING.');
    }
    controller.setState(statePatch);
  }, patch);
}

async function resetProctorState(page: Page) {
  await page.evaluate(() => {
    const controller = (window as any).__quizProE2EProctoring;
    if (!controller) {
      throw new Error('E2E proctoring controller is not available. Check NEXT_PUBLIC_E2E_PROCTORING.');
    }
    controller.reset();
  });
}

test.skip(({ browserName }) => browserName !== 'chromium');

test.describe('proctoring e2e', () => {
  test.describe.configure({ mode: 'serial' });

  test('camera denied shows error and blocks start', async ({ page }) => {
    await openQuiz(page);
    await setProctorState(page, { cameraPermission: 'denied' });
    await page.getByTestId('proctor-start-btn').click();
    await expect(page.getByTestId('proctor-camera-error')).toContainText('Camera permission denied');
    await expect(page.getByTestId('proctor-start-btn')).toBeVisible();
  });

  test('camera not found shows error and blocks start', async ({ page }) => {
    await openQuiz(page);
    await setProctorState(page, { cameraPermission: 'not_found' });
    await page.getByTestId('proctor-start-btn').click();
    await expect(page.getByTestId('proctor-camera-error')).toContainText('No camera found');
    await expect(page.getByTestId('proctor-start-btn')).toBeVisible();
  });

  test('short no-face flicker does not raise warning', async ({ page }) => {
    await openQuiz(page);
    await resetProctorState(page);
    await page.getByTestId('proctor-start-btn').click();
    await expect(page.getByTestId('proctor-start-btn')).toHaveCount(0);

    await setProctorState(page, { faceStatus: 'no_face' });
    await page.waitForTimeout(400);
    await setProctorState(page, { faceStatus: 'ok' });
    await page.waitForTimeout(900);
    await expect(page.getByTestId('proctor-warning-dialog')).toHaveCount(0);
  });

  test('camera off warning first, second camera off terminates and posts payload', async ({ page }) => {
    let completionPayload: any = null;
    await page.context().route('**/api/quiz/complete', async (route) => {
      completionPayload = route.request().postDataJSON() as CompletionPayload;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attemptId: 'attempt_1',
          score: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          wrongCount: 0,
          gradedAnswers: [],
        }),
      });
    });

    await openQuiz(page);
    await resetProctorState(page);
    await page.getByTestId('proctor-start-btn').click();
    await expect(page.getByTestId('proctor-start-btn')).toHaveCount(0);

    await setProctorState(page, { cameraState: 'muted' });
    await expect(page.getByTestId('proctor-warning-dialog')).toBeVisible();
    await expect(page.getByTestId('proctor-warning-message')).toContainText('Camera feed was interrupted');
    await page.getByTestId('proctor-warning-dismiss').click();
    await setProctorState(page, { cameraState: 'live' });
    await page.waitForTimeout(500);

    await setProctorState(page, { cameraState: 'muted' });
    await expect(page.getByTestId('proctor-warning-title')).toContainText('Quiz Terminated');
    await expect(page.getByTestId('proctor-terminated-note')).toBeVisible();
    await page.waitForURL(`**/quiz/results/${SESSION_ID}`);

    if (!completionPayload) throw new Error('Expected /api/quiz/complete payload to be captured');
    const payload = completionPayload;
    expect(payload.terminatedByProctor).toBe(true);
    expect(payload.proctoringSummary?.terminationReason).toBe('camera_off');
    expect(payload.proctoringSummary?.violationsTotal).toBeGreaterThanOrEqual(2);
    expect(
      payload.proctoringEvents?.some((event: { type: string }) => event.type === 'camera_off'),
    ).toBe(true);
  });

  test('second sustained face violation terminates with face_away reason', async ({ page }) => {
    let completionPayload: any = null;
    await page.context().route('**/api/quiz/complete', async (route) => {
      completionPayload = route.request().postDataJSON() as CompletionPayload;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attemptId: 'attempt_2',
          score: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          wrongCount: 0,
          gradedAnswers: [],
        }),
      });
    });

    await openQuiz(page);
    await resetProctorState(page);
    await page.getByTestId('proctor-start-btn').click();
    await expect(page.getByTestId('proctor-start-btn')).toHaveCount(0);

    await setProctorState(page, { faceStatus: 'no_face' });
    await expect(page.getByTestId('proctor-warning-dialog')).toBeVisible();
    await expect(page.getByTestId('proctor-warning-message')).toContainText('face is not visible');
    await page.getByTestId('proctor-warning-dismiss').click();
    await setProctorState(page, { faceStatus: 'ok' });
    await page.waitForTimeout(2800);

    await setProctorState(page, { faceStatus: 'face_away', yaw: 30, pitch: 8, confidence: 0.92 });
    await expect(page.getByTestId('proctor-warning-title')).toContainText('Quiz Terminated');
    await page.waitForURL(`**/quiz/results/${SESSION_ID}`);

    if (!completionPayload) throw new Error('Expected /api/quiz/complete payload to be captured');
    const payload = completionPayload;
    expect(payload.proctoringSummary?.terminationReason).toBe('face_away');
    expect(
      payload.proctoringEvents?.some((event: { type: string }) => event.type === 'no_face'),
    ).toBe(true);
    expect(
      payload.proctoringEvents?.some((event: { type: string }) => event.type === 'face_away'),
    ).toBe(true);
  });

  test('tab switch warns once then terminates on second', async ({ page }) => {
    let completionPayload: any = null;
    await page.context().route('**/api/quiz/complete', async (route) => {
      completionPayload = route.request().postDataJSON() as CompletionPayload;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          attemptId: 'attempt_3',
          score: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          wrongCount: 0,
          gradedAnswers: [],
        }),
      });
    });

    await openQuiz(page);
    await resetProctorState(page);
    await page.getByTestId('proctor-start-btn').click();
    await expect(page.getByTestId('proctor-start-btn')).toHaveCount(0);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByTestId('proctor-warning-dialog')).toBeVisible();
    await expect(page.getByTestId('proctor-warning-message')).toContainText('Tab switch detected');
    await expect(page.getByTestId('proctor-tab-badge')).toContainText('Tab Switches: 1');
    await page.getByTestId('proctor-warning-dismiss').click();

    await page.waitForTimeout(250);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.getByTestId('proctor-warning-title')).toContainText('Quiz Terminated');
    await page.waitForURL(`**/quiz/results/${SESSION_ID}`);
    if (!completionPayload) throw new Error('Expected /api/quiz/complete payload to be captured');
    const payload = completionPayload;
    expect(payload.proctoringSummary?.terminationReason).toBe('tab_switch');
    expect(payload.tabSwitchCount).toBeGreaterThanOrEqual(2);
  });
});
