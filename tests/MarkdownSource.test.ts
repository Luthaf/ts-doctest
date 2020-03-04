// Dependencies ---------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';
import {MarkdownSource} from '../src/MarkdownSource';

// Mocks ----------------------------------------------------------------------
function fromSource(fileName: string): MarkdownSource {
    const p = path.join(__dirname, fileName);
    return new MarkdownSource(p, fs.readFileSync(p).toString(), (sourceFile: string) => {
        return (importPath: string) => {
            throw new TypeError(`Unexpected import resolution in Test: ${importPath}`);
        };
    });
}

// Tests ----------------------------------------------------------------------
test('MarkdownSource ignores highlight only Codeblocks', () => {
    const source = fromSource('./markdown/HighlightOnly.md');
    expect(source.hasTests()).toEqual(false);
    expect(source.generateTests()).toEqual([]);
});

test('MarkdownSource generates DocTest from tagged Codeblock in Markdown file', () => {

    const source = fromSource('./markdown/Single.md');
    expect(source.hasTests()).toEqual(true);

    const tests = source.generateTests();
    expect(tests).toEqual([{
        name: 'Codeblock.line-4',
        source: '// Auto generated doc test\n\n\ntest(\'Codeblock (line 4)\', () => {\n    expect(1 + 1).toEqual(2);\n});\n\n'
    }]);

});

test('MarkdownSource generates DocTests from multiple tagged Codeblock in Markdown file', () => {

    const source = fromSource('./markdown/Double.md');
    expect(source.hasTests()).toEqual(true);

    const tests = source.generateTests();
    expect(tests).toEqual([{
        name: 'Codeblock.line-4',
        source: '// Auto generated doc test\n\n\ntest(\'Codeblock (line 4)\', () => {\n    expect(1 + 1).toEqual(2);\n});\n\n'

    }, {
        name: 'Codeblock.line-10',
        source: '// Auto generated doc test\n\n\ntest(\'Codeblock (line 10)\', () => {\n    expect(2 * 2).toEqual(4);\n});\n\n'
    }]);

});

test('MarkdownSource generates DocTest from tagged Codeblock with Doc Comment in Markdown file', () => {

    const source = fromSource('./markdown/Nested.md');
    expect(source.hasTests()).toEqual(true);

    const tests = source.generateTests();
    expect(tests).toEqual([{
        name: 'Codeblock.line-6',
        source: '// Auto generated doc test\n\n\ntest(\'Codeblock (line 6)\', () => {\n    /**\n    ```typescript doctest\n    expect(2 - 2).toEqual(0);\n    ```\n    /\n    expect(1 + 1).toEqual(2);\n});\n\n'
    }]);

});
