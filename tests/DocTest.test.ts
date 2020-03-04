// Dependencies ---------------------------------------------------------------
import {DocTest} from '../src/DocTest';
import {SourceImportResolver} from '../src/Config';


// Mocks ----------------------------------------------------------------------
interface ImportMap {
    [key: string]: string;
}

function errorResolver(): SourceImportResolver {
    return (importPath: string) => {
        throw new TypeError(`Unexpected import resolution in Test: ${importPath}`);
    };
}

function importResolver(map: ImportMap): SourceImportResolver {
    return (importPath: string) => {
        return map[importPath]!;
    };
}


// Formatting -----------------------------------------------------------------
test('DocTest strips remaining * from code', () => {
    const test = new DocTest(' * foo();\n * bar();', 0, 'Mock.Test', errorResolver());
    expect(test.getSource()).toEqual('foo();\nbar();');
});

test('DocTest removes hidding line markers (#) from code', () => {
    const test = new DocTest(' * # foo();\n * # bar();', 0, 'Mock.Test', errorResolver());
    expect(test.getSource()).toEqual('foo();\nbar();');
});

test('DocTest removes hidden section markers (###...###) from code', () => {
    const test = new DocTest(' * # foo(###1###);\n * # bar(###"string"###);', 0, 'Mock.Test', errorResolver());
    expect(test.getSource()).toEqual('foo(1);\nbar("string");');
});

test('DocTest trims trailing whitespace from code lines', () => {
    const test = new DocTest(' * foo();      \n * bar();     ', 0, 'Mock.Test', errorResolver());
    expect(test.getSource()).toEqual('foo();\nbar();');
});

test('DocTest leaves leading whitespace from code lines untouched', () => {
    const test = new DocTest(' *   foo();\n *    bar();', 0, 'Mock.Test', errorResolver());
    expect(test.getSource()).toEqual('  foo();\n   bar();');
});

// Generation -----------------------------------------------------------------
test('DocTest does include the line number in the generated test', () => {
    const test = new DocTest(' * foo();\n * bar();', 31, 'Mock.Test', errorResolver());
    expect(test.generate()).toEqual({
        name: 'Mock.Test.line-32',
        source: '// Auto generated doc test\n\n\ntest(\'Mock.Test (line 32)\', () => {\n    foo();\n    bar();\n});\n\n'
    });
});

test('DocTest does generate sync test functions for code', () => {
    const test = new DocTest(' * foo();\n * bar();', 0, 'Mock.Test', errorResolver());
    expect(test.generate()).toEqual({
        name: 'Mock.Test.line-1',
        source: '// Auto generated doc test\n\n\ntest(\'Mock.Test (line 1)\', () => {\n    foo();\n    bar();\n});\n\n'
    });
});

// Await Detection ------------------------------------------------------------
test('DocTest detect `await` expressions in code and generates a async test function', () => {
    const test = new DocTest(' * foo();\n * await bar();', 0, 'Mock.Test', errorResolver());
    expect(test.generate()).toEqual({
        name: 'Mock.Test.line-1',
        source: '// Auto generated doc test\n\n\ntest(\'Mock.Test (line 1)\', async () => {\n    foo();\n    await bar();\n});\n\n'
    });
});

// Import Statement Hoisting --------------------------------------------------
test('DocTest hoist import statements and resolves them to their new relative targets', () => {
    const test = new DocTest(' * import Foo from "./Foo";\nimport {Bar} from "./bar/Bar";new Foo(new Bar());', 0, 'Mock.Test', importResolver({
        './Foo': 'src/Foo',
        './bar/Bar': 'src/bar/Bar',
    }));

    expect(test.generate()).toEqual({
        name: 'Mock.Test.line-1',
        source: '// Auto generated doc test\nimport Foo from "src/Foo";\n\nimport {Bar} from "src/bar/Bar";\n\ntest(\'Mock.Test (line 1)\', async () => {\n    new Foo(new Bar());\n});\n\n'
    });
});

// Import Expression Rewrite --------------------------------------------------
test('DocTest rewrites dynamic import(...) calls to their new relative targets', () => {
    const test = new DocTest(' * const Bar = import("./bar/Bar"); const Foo = import("./Foo");', 0, 'Mock.Test', importResolver({
        './Foo': 'src/Foo',
        './bar/Bar': 'src/bar/Bar',
    }));

    expect(test.generate()).toEqual({
        name: 'Mock.Test.line-1',
        source: '// Auto generated doc test\n\n\ntest(\'Mock.Test (line 1)\', () => {\n    const Bar = import("src/bar/Bar"); const Foo = import("src/Foo");\n});\n\n'
    });

});

test('DocTest ignore empty import(...) calls', () => {
    const test = new DocTest(' * const Empty = import();', 0, 'Mock.Test', errorResolver());
    expect(test.generate()).toEqual({
        name: 'Mock.Test.line-1',
        source: '// Auto generated doc test\n\n\ntest(\'Mock.Test (line 1)\', () => {\n    const Empty = import();\n});\n\n'
    });
});
