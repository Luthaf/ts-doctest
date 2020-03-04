// Dependencies ---------------------------------------------------------------
import {Config} from '../src/Config';

// Mocks ----------------------------------------------------------------------
import {mockHost, TS_CONFIG_JSON} from './mocks';

// Tests ----------------------------------------------------------------------
test('Config.fromArguments prints usage if not supplied exactly 2 arguments or supplied --help as the first argument', () => {
    const host = mockHost('/', {});
    const argCountError = new Error('USAGE:\n\n    ts-doctest PROJECT_DIR TEST_DIR\n');
    expect(Config.fromArguments([], host)).toEqual(argCountError);
    expect(Config.fromArguments([''], host)).toEqual(argCountError);
    expect(Config.fromArguments(['--help', ''], host)).toEqual(argCountError);
    expect(Config.fromArguments(['', '', ''], host)).toEqual(argCountError);
});

test('Config.fromArguments checks for existence of tsconfig.json in projectDir', () => {
    const host = mockHost('/', {});
    expect(Config.fromArguments(['/project', '/project/tests'], host)).toEqual(new Error('No TypeScript configuration file found: /project/tsconfig.json'));
});

test('Config.fromArguments generates Config for absolute paths', () => {

    const host = mockHost('/home', {
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
        expect(resolverIndex('missing')).toEqual('missing');

    } else {
        fail('Expected a Config object');
    }

});
