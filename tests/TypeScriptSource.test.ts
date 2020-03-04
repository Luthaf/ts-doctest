// Dependencies ---------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import {TypeScriptSource} from '../src/TypeScriptSource';

// Mocks ----------------------------------------------------------------------
function fromSource(fileName: string): TypeScriptSource {
    const p = path.join(__dirname, fileName);
    return new TypeScriptSource(fileName, fs.readFileSync(p).toString(), () => {
        return (importPath: string) => {
            throw new TypeError(`Unexpected import resolution in Test: ${importPath}`);
        };
    });
}


// Tests ----------------------------------------------------------------------
test('TypeScriptSource ignores untagged codeblocks in TypeScript Doc Comments', () => {
    const source = fromSource('typescript/HighlightOnly.ts');
    expect(source.hasTests()).toEqual(false);
    expect(source.generateTests()).toEqual([]);
});

test('TypeScriptSource generates DocTests from tagged codeblocks in TypeScript Doc Comments', () => {

    const source = fromSource('typescript/Nested.ts');
    expect(source.hasTests()).toEqual(true);

    const tests = source.generateTests();
    expect(tests).toEqual([{
        name: 'line-4',
        source: '// Auto generated doc test\n\n\ntest(\'typescript/Nested.ts (line 4)\', () => {\n    expect(\'Namespace\').toEqual(\'Namespace\');\n});\n\n'

    }, {
        name: 'line-13',
        source: '// Auto generated doc test\n\n\ntest(\'typescript/Nested.ts (line 13)\', () => {\n    expect(\'Class Foo\').toEqual(\'Class Foo\');\n});\n\n'

    }, {
        name: 'line-22',
        source: '// Auto generated doc test\n\n\ntest(\'typescript/Nested.ts (line 22)\', () => {\n    expect(\'Static Class Member Tag\').toEqual(\'Static Class Member Tag\');\n});\n\n'

    }, {
        name: 'line-31',
        source: '// Auto generated doc test\n\n\ntest(\'typescript/Nested.ts (line 31)\', () => {\n    expect(\'Static Class Method\').toEqual(\'Static Class Method\');\n    expect(\'Static Class Method\').toEqual(\'Static Class Method\');\n});\n\n'

    }, {
        name: 'line-44',
        source: '// Auto generated doc test\n\n\ntest(\'typescript/Nested.ts (line 44)\', () => {\n    expect(\'Class Constructor\').toEqual(\'Class Constructor\');\n});\n\n'
    }]);
});
