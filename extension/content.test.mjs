import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const BROWSER_TIMEOUT_MS = 30_000;
const VIRTUAL_TIME_BUDGET_MS = 10_000;

test('플레이어 생성·교체와 자막 텍스트 노드 갱신이 분석에 반영됩니다.', async () => {
    const browserNames = ['chrome', 'chromium', 'chromium-browser', 'google-chrome', 'msedge'];
    const browserCandidates = (process.env.PATH || '').split(delimiter).filter(Boolean).flatMap(directory =>
        browserNames.map(name => join(directory, process.platform === 'win32' ? `${name}.exe` : name))
    );
    if (process.platform === 'win32') {
        for (const directory of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
            browserCandidates.push(
                join(directory, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                join(directory, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
            );
        }
    }
    const browserPath = process.env.CHROME_PATH || browserCandidates.find(path => existsSync(path));
    assert.ok(browserPath, 'Chrome 또는 Edge가 필요합니다. CHROME_PATH에 브라우저 실행 파일 경로를 지정해 주세요.');

    const resources = new Map();
    for (const [path, filename, contentType] of [
        ['/content.test.html', 'content.test.html', 'text/html'],
        ['/content.css', 'content.css', 'text/css'],
        ['/content.ts', 'content.ts', 'text/javascript'],
        ['/api', 'api.ts', 'text/javascript'],
        ['/scoring', 'scoring.ts', 'text/javascript']
    ]) {
        const source = await readFile(new URL(filename, import.meta.url), 'utf8');
        resources.set(path, {
            contentType,
            body: filename.endsWith('.ts') ? stripTypeScriptTypes(source) : source
        });
    }
    const server = createServer((request, response) => {
        const resource = resources.get(request.url?.split('?')[0]);
        if (!resource) {
            response.writeHead(404);
            response.end();
            return;
        }
        response.writeHead(200, { 'Content-Type': `${resource.contentType}; charset=utf-8` });
        response.end(resource.body);
    });
    const listening = once(server, 'listening');
    server.listen(0, '127.0.0.1');
    await listening;
    let profileDirectory;
    try {
        profileDirectory = await mkdtemp(join(tmpdir(), 'nocap-caption-test-'));
        const { stdout } = await promisify(execFile)(browserPath, [
            '--headless',
            '--disable-gpu',
            '--no-first-run',
            `--user-data-dir=${profileDirectory}`,
            '--dump-dom',
            `--virtual-time-budget=${VIRTUAL_TIME_BUDGET_MS}`,
            `http://127.0.0.1:${server.address().port}/content.test.html`
        ], { timeout: BROWSER_TIMEOUT_MS, windowsHide: true });
        const result = stdout.match(/<pre id="result" data-status="([^"]+)">([\s\S]*?)<\/pre>/);
        assert.equal(result?.[1], 'passed', result?.[2] || '회귀 확인 결과를 받지 못했습니다.');
    } finally {
        try {
            await promisify(server.close.bind(server))();
        } finally {
            if (profileDirectory) await rm(profileDirectory, { recursive: true, force: true });
        }
    }
});
