// Dependencies ---------------------------------------------------------------
import {createSourceFile, forEachChild, Node, ScriptTarget, SourceFile, SyntaxKind} from 'typescript';
import {ProjectImportResolver} from './Config';
import {DocSource, DocTest, DocTestData} from './DocTest';


// Typescript Source File Abstraction -----------------------------------------
export class TypeScriptSource implements DocSource {

    public path: string;
    private raw: string;
    private file: SourceFile;
    private tests: DocTest[] = [];

    constructor(path: string, raw: string, resolver: ProjectImportResolver) {
        this.path = path;
        this.raw = raw;
        this.file = createSourceFile(
            path,
            this.raw,
            ScriptTarget.ES2015,
            true
        );
        this.scanNodeDocs(this.file, resolver);
    }

    public hasTests(): boolean {
        return this.tests.length > 0;
    }

    public generateTests(): DocTestData[] {
        return this.tests.map((t) => t.generate());
    }

    private scanNodeDocs(node: Node, resolver: ProjectImportResolver) {
        if (isJSDoc(node)) {
            this.extractDocTests(node, resolver);
        }
        forEachChild(node, (node) => {
            this.scanNodeDocs(node, resolver);
        });
    }

    private extractDocTests<T extends HasJSDoc>(node: T, resolver: ProjectImportResolver) {
        for(const doc of node.jsDoc) {
            const expr = /```typescript doctest([^´]+?)```/g;

            let match = null;
            while((match = expr.exec(doc.comment))) {
                const { line } = this.file.getLineAndCharacterOfPosition(doc.pos);
                const offset = countNewline(doc.comment.slice(0, match.index))

                this.tests.push(new DocTest(
                    match[1],
                    line + offset,
                    this.path,
                    resolver(this.path)
                ));
            }
        }
    }

};


// Helpers --------------------------------------------------------------------
function countNewline(value: string): number {
    const matches = value.match(/\n/g);
    if (matches) {
        return matches.length + 1;
    } else {
        return 0;
    }
}

function isJSDoc(object: any): object is HasJSDoc {
    return 'jsDoc' in object;
}

interface HasJSDoc {
    jsDoc: JSDoc[];
    kind: SyntaxKind;
    parent: this;
}

interface JSDoc {
    comment: string;
    pos: number;
}
