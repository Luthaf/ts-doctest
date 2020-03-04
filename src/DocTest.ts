// Dependencies ---------------------------------------------------------------
import {createSourceFile, ScriptTarget, forEachChild, Node, SyntaxKind} from 'typescript';
import {SourceImportResolver} from './Config';


// Doc Test Abstraction -------------------------------------------------------
export interface DocSource {
    path: string;
    hasTests(): boolean;
    generateTests(): DocTestData[];
}

export interface DocTestData {
    name: string;
    source: string;
}

export class DocTest {

    private isAsync: boolean = false;

    private source: string;
    private imports: string[] = [];
    private name: string;
    private line: number;

    constructor(raw: string, line: number, name: string, resolver: SourceImportResolver) {
        this.line = line;
        this.name = name;

        // Strip JS doc remains from source
        let source = raw.split('\n').map(DocTest.extracDocLine).join('\n');

        // Parse AST and extract imports and detect `await` usage
        const imports: Array<ImportPath> = [];
        const testAst = createSourceFile(
            name,
            source,
            ScriptTarget.ES2015,
            true
        );

        this.findImports(testAst, imports);

        if (imports.length > 0) {
            let offset = 0;

            for (const im of imports) {
                const begin = im.pos + offset;
                if (im.moduleSpecifier) {

                    // Resolve import statement paths
                    const importLine = source.substring(begin, im.end + offset);
                    const pathOffset = im.moduleSpecifier.pos + offset - begin + 2;
                    const resolvedPath = resolver(im.moduleSpecifier.text);

                    // Then hoist them out to the top level of the generated test file
                    this.imports.push(
                        importLine.substring(0, pathOffset) +
                        resolvedPath +
                        importLine.substring(pathOffset + im.moduleSpecifier.text.length)
                    );

                    // Remove the original import line
                    source = source.substring(0, begin) + source.substring(im.end + offset);
                    offset -= source.substring(begin, im.end + offset).length;
                } else {
                    // Resolve import(...) expressions paths
                    const resolvedPath = resolver(im.text);
                    source = source.substring(0, begin + 1) // Skip leading quotemark
                        + resolvedPath
                        + source.substring(im.end + offset - 1); // Skip trailing quotemark

                    offset += resolvedPath.length - im.text.length;
                }
            }

        }

        this.source = source;

    }

    public getSource(): string {
        return this.source;
    }

    public generate(): DocTestData {
        const description = `${this.name} (line ${this.line + 1})`;

        const name = 'test';
        const source = `// Auto generated doc test
${this.imports.join('\n')}

${name}('${description}', ${this.isAsync ? 'async ' : ''}() => {
${DocTest.indentSource(this.getSource())}
});

`
        return {
            name: `${this.name}.line-${this.line + 1}`,
            source
        };

    }

    private findImports(node: Node, imports: Array<ImportPath>) {

        // Import Statements
        if (node.kind === SyntaxKind.ImportDeclaration) {
            delete node.parent;
            imports.push(<ImportPath> <unknown> node);
            this.isAsync = true;

        // Import Calls
        } else if (node.kind === SyntaxKind.CallExpression) {
            const call = <ImportCall> <unknown> node;
            if (call.expression.kind === SyntaxKind.ImportKeyword) {
                if (call.arguments.length) {
                    imports.push(call.arguments[0]);
                }
            }

        // Await Keywords
        } else if (node.kind === SyntaxKind.AwaitExpression) {
            this.isAsync = true;
        }

        forEachChild(node, (node) => {
            this.findImports(node, imports);
        });

    }

    private static extracDocLine(line: string) {
        // Remove JS Doc * remains
        return line.replace(/^\s*\*\s?/, '')
            // Unwrap hidden lines
            .replace(/^\s*\#\s?/, '')
            // Unwrap hidden inlines sections
            .replace(/###(.*?)###/g, '$1')
            .trimRight();
    }

    private static indentSource(source: string): string {
        return '    ' + source.split('\n').join('\n    ').replace(/    \n/g, '\n').trim();
    }

};


// Helpers --------------------------------------------------------------------
interface ImportPath {
    pos: number,
    end: number,
    text: string,
    moduleSpecifier?: {
        pos: number,
        end: number,
        text: string
    }
}

interface ImportCall {
    expression: Node,
    arguments: ImportPath[]
}
