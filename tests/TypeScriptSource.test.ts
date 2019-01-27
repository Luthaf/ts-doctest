// Dependencies ---------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import {TypeScriptSource} from '../src/TypeScriptSource';

// Mocks ----------------------------------------------------------------------
function fromSource(fileName: string): TypeScriptSource {
    const p = path.join(__dirname, fileName);
    return new TypeScriptSource(p, fs.readFileSync(p).toString(), (sourceFile: string) => {
        return (importPath: string) => {
            throw new TypeError(`Unexpected import resolution in Test: ${importPath}`);
        };
    });
}


// Tests ----------------------------------------------------------------------
test('TypeScriptSource ignores untagged codeblocks in TypeScript Doc Comments', () => {
    const source = fromSource('./typescript/HighlightOnly.ts');
    expect(source.hasTests()).toEqual(false);
    expect(source.generateTests()).toEqual([]);
});

test('TypeScriptSource generates DocTests from tagged codeblocks in TypeScript Doc Comments', () => {

    const source = fromSource('./typescript/Nested.ts');
    expect(source.hasTests()).toEqual(true);

    const tests = source.generateTests();
    expect(tests).toEqual([{
        name: 'Nested.line-5.col-2',
        source: '// Auto generated doc test\n\n\ntest(\'Nested (line 5, column 2)\', () => {\n    expect(\'Namespace\').toEqual(\'Namespace\');\n});\n\n'

    }, {
        name: 'Nested.Foo.line-14.col-6',
        source: '// Auto generated doc test\n\n\ntest(\'Nested.Foo (line 14, column 6)\', () => {\n    expect(\'Class Foo\').toEqual(\'Class Foo\');\n});\n\n'

    }, {
        name: 'Nested.Foo.tag.line-23.col-10',
        source: '// Auto generated doc test\n\n\ntest(\'Nested.Foo.tag (line 23, column 10)\', () => {\n    expect(\'Static Class Member Tag\').toEqual(\'Static Class Member Tag\');\n});\n\n'

    }, {
        name: 'Nested.Foo.bar.line-32.col-10',
        source: '// Auto generated doc test\n\n\ntest(\'Nested.Foo.bar (line 32, column 10)\', () => {\n    expect(\'Static Class Method\').toEqual(\'Static Class Method\');\n});\n\n'

    }, {
        name: 'Nested.Foo.constructor.line-44.col-10',
        source: '// Auto generated doc test\n\n\ntest(\'Nested.Foo.constructor (line 44, column 10)\', () => {\n    expect(\'Class Constructor\').toEqual(\'Class Constructor\');\n});\n\n'
    }]);

});

