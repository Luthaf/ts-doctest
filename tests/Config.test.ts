// Dependencies ---------------------------------------------------------------
import * as ts from 'typescript';
import * as path from 'path';
import {Config} from '../src/Config';

// Mocks ----------------------------------------------------------------------
interface FileMap {
    [key: string]: string;
}

function mockHost(cwd: string, files: FileMap): ts.ParseConfigFileHost {
    return {
        useCaseSensitiveFileNames: true,
        fileExists: (fileName) => {
            return files.hasOwnProperty(fileName);
        },
        readFile: (fileName) => {
            return files[fileName]!;
        },
        getCurrentDirectory: () => cwd,
        readDirectory: (rootDir: string, exts: ReadonlyArray<string>, excludes: ReadonlyArray<string>, includes: ReadonlyArray<string>, depth?: number): ReadonlyArray<string> => {
            const keys = Object.keys(files).filter((key) => {
                return exts.indexOf(path.parse(key).ext) !== -1;
            });

            // TODO filter by includes
            // TODO filter by excludes
            return keys;
        },
        onUnRecoverableConfigFileDiagnostic: diagnostic => {}

    };
}

const TS_CONFIG_JSON = {
    compilerOptions: {
        target: "es6",
        lib: ["es2017"],
        module: "commonjs",
        strict: true,
        outDir: "lib"
    },
    include: [
        "src/**/*.ts",
        "tests/**/*.test.ts"
    ]
};


// Tests ----------------------------------------------------------------------
test('Config.fromArguments expects exactly 2 arguments', () => {
    const host = mockHost('/', {});
    const argCountError = new Error('Exactly 2 arguments are required: <projectDir> <testDir>');
    expect(Config.fromArguments([], host)).toEqual(argCountError);
    expect(Config.fromArguments([''], host)).toEqual(argCountError);
    expect(Config.fromArguments(['', '', ''], host)).toEqual(argCountError);
});

test('Config.fromArguments checks for existence of tsconfig.json in projectDir', () => {
    const host = mockHost('/', {});
    expect(Config.fromArguments(['/project', '/project/tests'], host)).toEqual(new Error('No TypeScript configuration file found: /project/tsconfig.json'));
});

test('Config.fromArguments generates Config for absolute paths', () => {

    const host = mockHost('/', {
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),
        '/project/src/index.ts': '',
        '/project/src/Bar.ts': '',
        '/project/src/foo/index.ts': ''
    });

    const config = Config.fromArguments(['/project', '/project/tests'], host);
    if (config instanceof Config) {
        expect(config.projectDir).toEqual('/project');
        expect(config.configFile).toEqual('/project/tsconfig.json');
        expect(config.includedFiles).toEqual([
            '/project/src/index.ts',
            '/project/src/Bar.ts',
            '/project/src/foo/index.ts'
        ]);
        expect(config.testBase).toEqual('/project/tests/doc');

    } else {
        fail('Expected a Config object');
    }

});

test('Config.fromArguments generates Config for relative paths', () => {
    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),
        '/project/src/index.ts': '',
        '/project/src/Bar.ts': '',
        '/project/src/foo/index.ts': ''
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        expect(config.projectDir).toEqual('/project');
        expect(config.configFile).toEqual('/project/tsconfig.json');
        expect(config.includedFiles).toEqual([
            '/project/src/index.ts',
            '/project/src/Bar.ts',
            '/project/src/foo/index.ts'
        ]);
        expect(config.testBase).toEqual('/project/tests/doc');

    } else {
        fail('Expected a Config object');
    }

});

test('Config.fromArguments picks up README.md file in project root', () => {
    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),
        '/project/src/README.md': '',
        '/project/README.md': ''
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        expect(config.projectDir).toEqual('/project');
        expect(config.configFile).toEqual('/project/tsconfig.json');
        expect(config.includedFiles).toEqual([
            '/project/README.md'
        ]);
        expect(config.testBase).toEqual('/project/tests/doc');

    } else {
        fail('Expected a Config object');
    }

});

test('Config leverages TSC to resolve relative imports', () => {

    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),
        '/project/src/index.ts': '',
        '/project/src/Bar.ts': '',
        '/project/src/foo/index.ts': ''
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        const resolverBar = config.importResolver('/project/src/Bar.ts');
        expect(resolverBar('./foo')).toEqual('../../../src/foo/index');

        const resolverIndex = config.importResolver('/project/src/index.ts');
        expect(resolverIndex('./Bar')).toEqual('../../../src/Bar');

    } else {
        fail('Expected a Config object');
    }

});

test('Config leverages TSC to resolve imports via baseUrl', () => {

    const tsconfig = Object.assign({}, TS_CONFIG_JSON);
    const compilerOptions: any = tsconfig.compilerOptions;
    compilerOptions.baseUrl = './';
    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(tsconfig),
        '/project/src/index.ts': '',
        '/project/src/Bar.ts': '',
        '/project/src/foo/index.ts': ''
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        const resolverBar = config.importResolver('/project/src/Bar.ts');
        expect(resolverBar('src/foo')).toEqual('../../../src/foo/index');

        const resolverIndex = config.importResolver('/project/src/index.ts');
        expect(resolverIndex('src/Bar')).toEqual('../../../src/Bar');

    } else {
        fail('Expected a Config object');
    }

});

test('Config leverages TSC to resolve imports via paths', () => {

    const tsconfig = Object.assign({}, TS_CONFIG_JSON);
    const compilerOptions: any = tsconfig.compilerOptions;
    compilerOptions.paths = {
        '@src/*': ['src/*'],
        '@Foo/*': ['src/foo/*']
    }
    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(tsconfig),
        '/project/src/index.ts': '',
        '/project/src/Bar.ts': '',
        '/project/src/foo/Foo.ts': ''
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        const resolverBar = config.importResolver('/project/src/Bar.ts');
        expect(resolverBar('@Foo/Foo')).toEqual('../../../src/foo/Foo');

        const resolverIndex = config.importResolver('/project/src/index.ts');
        expect(resolverIndex('@src/Bar')).toEqual('../../../src/Bar');

    } else {
        fail('Expected a Config object');
    }

});

test('Config leverages TSC to resolve imports via paths', () => {

    const tsconfig = Object.assign({}, TS_CONFIG_JSON);
    const compilerOptions: any = tsconfig.compilerOptions;
    compilerOptions.paths = {
        '@src/*': ['src/*'],
        '@Foo/*': ['src/foo/*']
    }
    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(tsconfig),
        '/project/src/index.ts': '',
        '/project/src/Bar.ts': '',
        '/project/src/foo/Foo.ts': ''
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        const resolverBar = config.importResolver('/project/src/Bar.ts');
        expect(resolverBar('@Foo/Foo')).toEqual('../../../src/foo/Foo');

        const resolverIndex = config.importResolver('/project/src/index.ts');
        expect(resolverIndex('@src/Bar')).toEqual('../../../src/Bar');

    } else {
        fail('Expected a Config object');
    }

});

test('Config does throw in case import cannot be resolved', () => {

    const host = mockHost('/project', {
        '/project/tsconfig.json': JSON.stringify(TS_CONFIG_JSON),
        '/project/src/index.ts': '',
    });

    const config = Config.fromArguments(['.', 'tests'], host);
    if (config instanceof Config) {
        const resolverIndex = config.importResolver('/project/src/index.ts');
        expect(() => {
            resolverIndex('missing')

        }).toThrow(new TypeError(
            'Failed to resolve import: "missing" from within "/project/src/index.ts"'
        ));

    } else {
        fail('Expected a Config object');
    }

});

