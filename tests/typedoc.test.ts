// Dependencies ---------------------------------------------------------------
import { Application } from 'typedoc/dist/lib/application';
import { RendererEvent } from 'typedoc/dist/lib/output/events';
import { RendererComponent } from 'typedoc/dist/lib/output/components';

// Mocks ----------------------------------------------------------------------
type MockPlugin = (host: Application) => void;
type MockEvents = {
    beginRender: (event: RendererEvent) => {}
};

interface MockApplication extends Application {
    mockRenderer: RendererComponent | null;
    mockEvents: MockEvents | null;
}

function mockApplication(): MockApplication {

    const application = <MockApplication> <unknown> {
        mockRenderer: null,
        mockEvents: null,
        owner: {
            renderer: {
                addComponent(name: string, comp: RendererComponent) {
                    // @ts-ignore
                    application.mockRenderer = new comp({
                        internalOn: (renderEvents: MockEvents) => {
                            application.mockEvents = renderEvents;
                        }
                    });
                    // @ts-ignore
                    application.mockRenderer!.initialize();
                }
            }
        }
    };

    return application;

}

// Tests ----------------------------------------------------------------------
test('Does register as a TypeDoc Plugin', async () => {

    const TypeDocPlugin = <MockPlugin> <unknown> (await import('../src/index'));
    expect(TypeDocPlugin).toBeInstanceOf(Function);

    const application = mockApplication();
    TypeDocPlugin(application);
    expect(application.mockRenderer).toBeInstanceOf(RendererComponent);
    expect(application.mockEvents!.beginRender).toBeInstanceOf(Function);

});

test('TypeDoc Plugin not removes hidden line markers (#) from untagged codeblocks', async () => {

    const TypeDocPlugin = <MockPlugin> <unknown> (await import('../src/index'));
    const application = mockApplication();
    TypeDocPlugin(application);

    const event = <RendererEvent> <unknown> {
        project: {
            reflections: {
                0: {
                    comment: {
                        text: '```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line```',
                        shortText: '```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.reflections[0]!.comment!.text).toEqual('```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line```');

});

test('TypeDoc Plugin updates tagged codeblocks from comments and project readme', async () => {

    const TypeDocPlugin = <MockPlugin> <unknown> (await import('../src/index'));
    const application = mockApplication();
    TypeDocPlugin(application);

    const event = <RendererEvent> <unknown> {
        project: {
            readme: '# Example\n```typescript doctest\na();```\n\n```typescript doctest\nb();```',
            reflections: {
                0: {
                    comment: {
                        text: '# Example\n```typescript doctest\na();```\n\n```typescript doctest\nb();```',
                        shortText: '# Example\n```typescript doctest\na();```\n\n```typescript doctest\nb();```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.readme).toEqual('# Example\n```typescript\na();```\n\n```typescript\nb();```');
    expect(event.project.reflections[0]!.comment!.text).toEqual('# Example\n```typescript\na();```\n\n```typescript\nb();```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('# Example\n```typescript\na();```\n\n```typescript\nb();```');

});

test('TypeDoc Plugin removes hidden line markers (#) from tagged codeblocks', async () => {

    const TypeDocPlugin = <MockPlugin> <unknown> (await import('../src/index'));
    const application = mockApplication();
    TypeDocPlugin(application);

    const event = <RendererEvent> <unknown> {
        project: {
            reflections: {
                0: {
                    comment: {
                        text: '```typescript doctest\n# Hidden Line\nexpression();\n# Another Hidden Line```',
                        shortText: '```typescript doctest\n# Hidden Line\nexpression();\n# Another Hidden Line```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.reflections[0]!.comment!.text).toEqual('```typescript\nexpression();```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('```typescript\nexpression();```');

});

test('TypeDoc Plugin removes hidden section markers (###...###) from codeblocks', async () => {

    const TypeDocPlugin = <MockPlugin> <unknown> (await import('../src/index'));
    const application = mockApplication();
    TypeDocPlugin(application);

    const event = <RendererEvent> <unknown> {
        project: {
            reflections: {
                0: {
                    comment: {
                        text: '```typescript doctest\nexpression(###2###);\nexpression(###"string"###);```',
                        shortText: '```typescript doctest\nexpression(###2###);\nexpression(###"string"###);```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.reflections[0]!.comment!.text).toEqual('```typescript\nexpression();\nexpression();```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('```typescript\nexpression();\nexpression();```');

});

