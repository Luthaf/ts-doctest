// Dependencies ---------------------------------------------------------------
import * as MarkdownIt from 'markdown-it';
import {ProjectImportResolver} from './Config';
import {DocSource, DocTest, DocTestData} from './DocTest';


// Markdown Source File Abstraction -------------------------------------------
export class MarkdownSource implements DocSource {

    public path: string;
    private tests: DocTest[] = [];
    private raw: string;

    constructor(filePath: string, raw: string, resolver: ProjectImportResolver) {
        this.path = filePath;
        this.raw = raw;

        const m = new MarkdownIt();
        const tokens = m.parse(raw, {});
        tokens.filter((t) => t.type === 'fence' && t.info === 'typescript doctest').map((token) => {
            const index = raw.indexOf(token.content);
            const { line } = this.getLineAndCharacterOfPosition(index);
            this.tests.push(new DocTest(
                token.content,
                line,
                'Codeblock',
                resolver(this.path)
            ));
        });

    }

    public hasTests(): boolean {
        return this.tests.length > 0;
    }

    public generateTests(): DocTestData[] {
        return this.tests.map((t) => t.generate());
    }

    private getLineAndCharacterOfPosition(index: number): { line: number, character: number } {
        const leadingText = this.raw.substring(0, index);
        // TODO support other line modes
        const lines = leadingText.split(/\n/g);
        return {
            line: lines.length - 1,
            character: lines[lines.length - 1].length,
        };
    }

};
