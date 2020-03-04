// Dependencies ---------------------------------------------------------------
import {run} from '../src/cli';

// Mocks ----------------------------------------------------------------------
import {loadFile, mockConsole, mockFileSystem, TS_CONFIG_JSON} from './mocks';

// Tests ----------------------------------------------------------------------
test('CLI does handle missing TypeScript configuration files', async () => {

    const fs = mockFileSystem({}, {});
    const console = mockConsole();
    run({
        cwd: () => '/project',
        argv: ['', '', '.', 'tests']

    }, fs, console);

    expect(console.errors).toEqual([
        ['No TypeScript configuration file found: /project/tsconfig.json']
    ]);

    expect(console.logs).toEqual([]);

    expect(fs.filesWritten).toEqual({});
    expect(fs.filesUnlinked).toEqual([]);
    expect(fs.dirsCreated).toEqual([]);
    expect(fs.dirsRemoved).toEqual([]);

});

test('CLI does load TypeScript project from configuration', async () => {

    const fs = mockFileSystem({
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),

    }, {});

    const console = mockConsole();
    run({
        cwd: () => '/project',
        argv: ['', '', '.', 'tests']

    }, fs, console);

    expect(console.errors).toEqual([]);
    expect(console.logs).toEqual([
        ['Using configuration from: /project/tsconfig.json'],
        ['No source files in project!']
    ]);

    expect(fs.filesWritten).toEqual({});
    expect(fs.filesUnlinked).toEqual([]);
    expect(fs.dirsCreated).toEqual([]);
    expect(fs.dirsRemoved).toEqual([]);

});

test('CLI does load TypeScript project from configuration and generate doc tests', async () => {

    const fs = mockFileSystem({
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),
        '/project/README.md': loadFile('./markdown/Single.md'),

    }, {});

    const console = mockConsole();
    run({
        cwd: () => '/project',
        argv: ['', '', '.', 'tests']

    }, fs, console);

    expect(console.errors).toEqual([]);
    expect(console.logs).toEqual([
        ['Using configuration from: /project/tsconfig.json'],
        ['Scanning 1 project file(s) for doc tests...'],
        ['Generated doc test: /project/tests/doc/README.md.Codeblock.line-4.col-1.test.ts'],
        ['Generated 1 doc test(s) in total.']
    ]);

    expect(fs.filesWritten).toEqual({
        '/project/tests/doc/README.md.Codeblock.line-4.col-1.test.ts': '// Auto generated doc test\n\n\ntest(\'Codeblock (line 4, column 1)\', () => {\n    expect(1 + 1).toEqual(2);\n});\n\n'
    });
    expect(fs.filesUnlinked).toEqual([]);
    expect(fs.dirsCreated).toEqual(['/project/tests/doc']);
    expect(fs.dirsRemoved).toEqual([]);

});
