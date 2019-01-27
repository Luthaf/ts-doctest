// Dependencies ---------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import {Config, ProjectImportResolver} from '../src/Config';
import {Generator} from '../src/Generator';
import {FileSystem} from '../src/util';

// Mocks ----------------------------------------------------------------------
function loadFile(fileName: string): string {
    const p = path.join(__dirname, fileName);
    return fs.readFileSync(p).toString();
}

interface DirMap {
    [key: string]: FileMap;
}

interface FileMap {
    [key: string]: string;
}

interface MockFileSystem extends FileSystem {
    filesWritten: FileMap,
    filesUnlinked: string[],
    dirsCreated: string[],
    dirsRemoved: string[],
}

function mockFileSystem(
    files: FileMap,
    dirs: DirMap

): MockFileSystem {
    const filesWritten: FileMap = {};
    const dirsRemoved: string[] = [];
    const dirsCreated: string[] = [];
    const filesUnlinked: string[] = [];
    return {

        filesWritten,
        filesUnlinked,
        dirsCreated,
        dirsRemoved,

        readFileSync: (path) => Buffer.from(files[path]!),
        writeFileSync: (path, data) => filesWritten[path] = data,
        readdirSync: (path) => Object.keys(dirs[path]),
        lstatSync: (path) => {
            return {
                isDirectory(): boolean {
                    return dirs.hasOwnProperty(path);
                }
            };
        },
        existsSync: (path) => files.hasOwnProperty(path) || dirs.hasOwnProperty(path),
        mkdirSync: (path) => dirsCreated.push(path),
        rmdirSync: (path) => dirsRemoved.push(path),
        unlinkSync: (path) => filesUnlinked.push(path),

    };
}

interface MockConsole {
    logs: Array<any[]>;
    log(...args: any[]): void;
}

function mockConsole(): MockConsole {
    const logs: Array<any[]> = [];
    return {
        logs,
        log: (...args: any[]) => {
            logs.push(args);
        }
    };
}

function importResolver(): ProjectImportResolver {
    return (sourceFile: string) => {
        return (importPath: string) => {
            throw new TypeError(`Unexpected import resolution in Test: ${importPath}`);
        };
    };
}

// Tests ----------------------------------------------------------------------
test('Generator can be constructed from a Config', () => {
    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [],
        '/project/tests/doc',
        importResolver()
    );
    new Generator(config);
});

test('Generator.run recursively removes the existing doc test directory', () => {

    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [],
        '/project/tests/doc',
        importResolver()
    );
    const generator = new Generator(config);
    const fs = mockFileSystem({}, {
        '/project/tests/doc': {
            'Foo.test.ts': '',
            'src': ''
        },
        '/project/tests/doc/src': {
            'Bar.test.ts': ''
        }
    });
    generator.run(fs, mockConsole());

    expect(fs.filesWritten).toEqual({});
    expect(fs.filesUnlinked).toEqual([
        '/project/tests/doc/Foo.test.ts',
        '/project/tests/doc/src/Bar.test.ts'
    ]);
    expect(fs.dirsCreated).toEqual([]);
    expect(fs.dirsRemoved).toEqual([
        '/project/tests/doc/src',
        '/project/tests/doc'
    ]);

});

test('Generator.run handle missing doc test directory ', () => {

    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [],
        '/project/tests/doc',
        importResolver()
    );
    const generator = new Generator(config);
    const fs = mockFileSystem({}, {});
    generator.run(fs, mockConsole());

    expect(fs.filesWritten).toEqual({});
    expect(fs.filesUnlinked).toEqual([]);
    expect(fs.dirsCreated).toEqual([]);
    expect(fs.dirsRemoved).toEqual([]);

});

test('Generator.run handles empty projects', () => {

    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [],
        '/project/tests/doc',
        importResolver()
    );

    const generator = new Generator(config);
    const fs = mockFileSystem({}, {});
    const console = mockConsole();
    generator.run(fs, console);

    expect(console.logs).toEqual([
        ['Using configuration from: /project/tsconfig.json'],
        ['No source files in project!']
    ]);

});

test('Generator.run handle source files without doc tests', () => {

    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [
            '/project/src/Foo.ts',
            '/project/README.md'
        ],
        '/project/tests/doc',
        importResolver()
    );

    const generator = new Generator(config);
    const fs = mockFileSystem({
        '/project/src/Foo.ts': '// Empty TypeScript Source',
        '/project/README.md': '# Empty Markdown Source'
    }, {});

    const console = mockConsole();
    generator.run(fs, console);

    expect(console.logs).toEqual([
        ['Using configuration from: /project/tsconfig.json'],
        ['Scanning 2 project file(s) for doc tests...'],
        ['No doc tests found / generated.']
    ]);

});

test('Generator.run generates doc tests from source files', () => {

    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [
            '/project/src/index.ts',
            '/project/README.md'
        ],
        '/project/tests/doc',
        importResolver()
    );

    const generator = new Generator(config);
    const fs = mockFileSystem({
        '/project/src/index.ts': loadFile('./typescript/Nested.ts'),
        '/project/README.md': loadFile('./markdown/Single.md'),
    }, {});

    const mConsole = mockConsole();
    generator.run(fs, mConsole);

    expect(mConsole.logs).toEqual([
        ['Using configuration from: /project/tsconfig.json'],
        ['Scanning 2 project file(s) for doc tests...'],
        ['Generated doc test: /project/tests/doc/src/index.ts.Nested.line-5.col-2.test.ts'],
        ['Generated doc test: /project/tests/doc/src/index.ts.Nested.Foo.line-14.col-6.test.ts'],
        ['Generated doc test: /project/tests/doc/src/index.ts.Nested.Foo.tag.line-23.col-10.test.ts'],
        ['Generated doc test: /project/tests/doc/src/index.ts.Nested.Foo.bar.line-32.col-10.test.ts'],
        ['Generated doc test: /project/tests/doc/src/index.ts.Nested.Foo.constructor.line-44.col-10.test.ts'],
        ['Generated doc test: /project/tests/doc/README.md.Codeblock.line-4.col-1.test.ts'],
        ['Generated 6 doc test(s) in total.']
    ]);

    expect(fs.filesWritten).toEqual({
        '/project/tests/doc/src/index.ts.Nested.line-5.col-2.test.ts': '// Auto generated doc test\n\n\ntest(\'Nested (line 5, column 2)\', () => {\n    expect(\'Namespace\').toEqual(\'Namespace\');\n});\n\n',
        '/project/tests/doc/src/index.ts.Nested.Foo.line-14.col-6.test.ts': '// Auto generated doc test\n\n\ntest(\'Nested.Foo (line 14, column 6)\', () => {\n    expect(\'Class Foo\').toEqual(\'Class Foo\');\n});\n\n',
        '/project/tests/doc/src/index.ts.Nested.Foo.tag.line-23.col-10.test.ts': '// Auto generated doc test\n\n\ntest(\'Nested.Foo.tag (line 23, column 10)\', () => {\n    expect(\'Static Class Member Tag\').toEqual(\'Static Class Member Tag\');\n});\n\n',
        '/project/tests/doc/src/index.ts.Nested.Foo.bar.line-32.col-10.test.ts': '// Auto generated doc test\n\n\ntest(\'Nested.Foo.bar (line 32, column 10)\', () => {\n    expect(\'Static Class Method\').toEqual(\'Static Class Method\');\n});\n\n',
        '/project/tests/doc/src/index.ts.Nested.Foo.constructor.line-44.col-10.test.ts': '// Auto generated doc test\n\n\ntest(\'Nested.Foo.constructor (line 44, column 10)\', () => {\n    expect(\'Class Constructor\').toEqual(\'Class Constructor\');\n});\n\n',
        '/project/tests/doc/README.md.Codeblock.line-4.col-1.test.ts': '// Auto generated doc test\n\n\ntest(\'Codeblock (line 4, column 1)\', () => {\n    expect(1 + 1).toEqual(2);\n});\n\n'
    });

    expect(fs.filesUnlinked).toEqual([]);
    expect(fs.dirsCreated).toEqual([
        '/project/tests/doc/src',
        '/project/tests/doc'
    ]);
    expect(fs.dirsRemoved).toEqual([]);

});

