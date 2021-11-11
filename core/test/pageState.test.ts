import { createSession, ITestKoaServer } from '@ulixee/hero-testing/helpers';
import { Helpers } from '@ulixee/hero-testing';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import Core from '../index';

let koaServer: ITestKoaServer;
beforeAll(async () => {
  await Core.start();
  koaServer = await Helpers.runKoaServer(true);
});
afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

test('can wait for page state events', async () => {
  const { tab } = await createSession();
  koaServer.get('/pageState1', ctx => {
    ctx.body = `
  <body>
    <h1>Title 1</h1>
    <script>
      setTimeout(() => {
        const div = document.createElement('div');
        div.id = 'test';
        div.textContent = 'hi'
        document.body.append(div)
      }, 100)
    </script>
  </body>
      `;
  });

  await tab.goto(`${koaServer.baseUrl}/pageState1`);
  const callbackFn = jest.fn();
  const hasDiv = new Resolvable<void>();
  const listener = tab.addPageStateListener('1', {
    callsite: 'callsite',
    states: ['states'],
    commands: {
      url: [1, 'FrameEnvironment.getUrl', []],
      paintStable: [1, 'FrameEnvironment.isPaintingStable', []],
      h1Text: [
        1,
        'FrameEnvironment.execJsPath',
        [['document', ['querySelector', 'h1'], 'textContent']],
      ],
      divText: [
        1,
        'FrameEnvironment.execJsPath',
        [['document', ['querySelector', '#test'], 'textContent']],
      ],
      div2Text: [
        1,
        'FrameEnvironment.execJsPath',
        [['document', ['querySelector', '#notthere'], 'textContent']],
      ],
    },
  });
  listener.on('state', status => {
    callbackFn(status);
    if (status.divText?.value === 'hi' && status.paintStable === true) hasDiv.resolve();
  });
  await hasDiv.promise;
  listener.stop();
  expect(callbackFn.mock.calls.length).toBeGreaterThanOrEqual(1);
  expect(callbackFn.mock.calls[callbackFn.mock.calls.length - 1][0]).toEqual({
    url: `${koaServer.baseUrl}/pageState1`,
    paintStable: true,
    h1Text: { value: 'Title 1' },
    divText: { value: 'hi' },
    div2Text: expect.any(Error),
  });
});

test('can continue to get events as dom changes', async () => {
  const { tab } = await createSession();
  await tab.recordScreen({ jpegQuality: 10, format: 'jpeg' });

  koaServer.get('/pageState2', ctx => {
    ctx.body = `
  <body>
    <h1>Title 1</h1>
    <script>
      setInterval(() => {
        const div = document.createElement('div');
        div.className = 'test';
        div.textContent = 'hi'
        document.body.append(div)
      }, 100)
    </script>
  </body>
      `;
  });

  await tab.goto(`${koaServer.baseUrl}/pageState2`);
  const callbackFn = jest.fn();
  const hasDiv = new Resolvable<void>();
  const listener = tab.addPageStateListener('2', {
    callsite: 'callsite',
    states: ['states'],
    commands: {
      url: [1, 'FrameEnvironment.getUrl', []],
      paintStable: [1, 'FrameEnvironment.isPaintingStable', []],
      divs: [
        1,
        'FrameEnvironment.execJsPath',
        [['document', ['querySelectorAll', '.test'], 'length']],
      ],
    },
  });

  listener.on('state', status => {
    callbackFn(status);
    if (status.divs?.value >= 5) {
      listener.stop();
      hasDiv.resolve();
    }
  });

  await hasDiv.promise;
  listener.stop();
  await tab.stopRecording();
  expect(tab.session.db.screenshots.screenshotTimesByTabId.size).toBeGreaterThanOrEqual(1);
  expect(callbackFn.mock.calls.length).toBeGreaterThanOrEqual(2);
  const lastCall = callbackFn.mock.calls.slice(-1).shift()[0];
  expect(lastCall.url).toBe(`${koaServer.baseUrl}/pageState2`);
  expect(lastCall.paintStable).toBe(true);
  expect(lastCall.divs.value).toBeGreaterThanOrEqual(5);
});