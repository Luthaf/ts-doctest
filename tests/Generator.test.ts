// Dependencies ---------------------------------------------------------------
import {Config, ProjectImportResolver} from '../src/Config';
import {Generator} from '../src/Generator';

// Mocks ----------------------------------------------------------------------
import {loadFile, mockFileSystem, mockConsole} from './mocks';

function errorResolver(): ProjectImportResolver {
    return () => {
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
        errorResolver()
    );
    new Generator(config);
});

test('Generator.run recursively removes the existing doc test directory', () => {

    const config = new Config(
        '/project',
        '/project/tsconfig.json',
        [],
        '/project/tests/doc',
        errorResolver()
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
        errorResolver()
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
        errorResolver()
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
        errorResolver()
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
        errorResolver()
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
        ['Generated 6 doc test(s) in total.']
    ]);

    expect(fs.filesWritten).toEqual({
        '/project/tests/doc/src/index.ts.line-4.test.ts': '// Auto generated doc test\n\n\ntest(\'src/index.ts (line 4)\', () => {\n    expect(\'Namespace\').toEqual(\'Namespace\');\n});\n\n',
        '/project/tests/doc/src/index.ts.line-13.test.ts': '// Auto generated doc test\n\n\ntest(\'src/index.ts (line 13)\', () => {\n    expect(\'Class Foo\').toEqual(\'Class Foo\');\n});\n\n',
        '/project/tests/doc/src/index.ts.line-22.test.ts': '// Auto generated doc test\n\n\ntest(\'src/index.ts (line 22)\', () => {\n    expect(\'Static Class Member Tag\').toEqual(\'Static Class Member Tag\');\n});\n\n',
        '/project/tests/doc/src/index.ts.line-31.test.ts': '// Auto generated doc test\n\n\ntest(\'src/index.ts (line 31)\', () => {\n    expect(\'Static Class Method\').toEqual(\'Static Class Method\');\n    expect(\'Static Class Method\').toEqual(\'Static Class Method\');\n});\n\n',
        '/project/tests/doc/src/index.ts.line-44.test.ts': '// Auto generated doc test\n\n\ntest(\'src/index.ts (line 44)\', () => {\n    expect(\'Class Constructor\').toEqual(\'Class Constructor\');\n});\n\n',
        '/project/tests/doc/README.md.line-4.test.ts': '// Auto generated doc test\n\n\ntest(\'README.md (line 4)\', () => {\n    expect(1 + 1).toEqual(2);\n});\n\n'
    });

    expect(fs.filesUnlinked).toEqual([]);
    expect(fs.dirsCreated).toEqual([
        '/project/tests/doc/src',
        '/project/tests/doc'
    ]);
    expect(fs.dirsRemoved).toEqual([]);

});
