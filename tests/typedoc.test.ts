// Dependencies ---------------------------------------------------------------
import { Application } from 'typedoc/dist/lib/application';
import { RendererEvent } from 'typedoc/dist/lib/output/events';
import { RendererComponent } from 'typedoc/dist/lib/output/components';

// Mocks ----------------------------------------------------------------------
interface MockPlugin {
    load: (host: Application) => void;
}
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

    const TypeDocPlugin = await import('../src/index') as unknown as MockPlugin;

    expect(TypeDocPlugin.load).toBeInstanceOf(Function);

    const application = mockApplication();
    TypeDocPlugin.load(application);
    expect(application.mockRenderer).toBeInstanceOf(RendererComponent);
    expect(application.mockEvents!.beginRender).toBeInstanceOf(Function);

});

test('TypeDoc Plugin not removes hidden line markers (#) from untagged codeblocks', async () => {

    const TypeDocPlugin = await import('../src/index') as unknown as MockPlugin;
    const application = mockApplication();
    TypeDocPlugin.load(application);

    const event = <RendererEvent> <unknown> {
        project: {
            reflections: {
                0: {
                    comment: {
                        text: '```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line\n```',
                        shortText: '```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line\n```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.reflections[0]!.comment!.text).toEqual('```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line\n```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('```typescript\n# Hidden Line\nexpression();\n# Another Hidden Line\n```');

});

test('TypeDoc Plugin updates tagged codeblocks from comments and project readme', async () => {

    const TypeDocPlugin = await import('../src/index') as unknown as MockPlugin;
    const application = mockApplication();
    TypeDocPlugin.load(application);

    const event = <RendererEvent> <unknown> {
        project: {
            readme: '# Example\n```typescript doctest\na();```\n\n```typescript doctest\nb();```',
            reflections: {
                0: {
                    comment: {
                        text: '# Example\n```typescript doctest\na();```\n\n```typescript doctest\nb();\n```',
                        shortText: '# Example\n```typescript doctest\na();```\n\n```typescript doctest\nb();\n```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.readme).toEqual('# Example\n```typescript\na();\n```\n\n```typescript\nb();\n```');
    expect(event.project.reflections[0]!.comment!.text).toEqual('# Example\n```typescript\na();\n```\n\n```typescript\nb();\n```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('# Example\n```typescript\na();\n```\n\n```typescript\nb();\n```');

});

test('TypeDoc Plugin removes hidden line markers (#) from tagged codeblocks', async () => {

    const TypeDocPlugin = await import('../src/index') as unknown as MockPlugin;
    const application = mockApplication();
    TypeDocPlugin.load(application);

    const event = <RendererEvent> <unknown> {
        project: {
            reflections: {
                0: {
                    comment: {
                        text: '```typescript doctest\n# Hidden Line\nexpression();\n# Another Hidden Line\n```',
                        shortText: '```typescript doctest\n# Hidden Line\nexpression();\n# Another Hidden Line\n```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.reflections[0]!.comment!.text).toEqual('```typescript\nexpression();\n```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('```typescript\nexpression();\n```');

});

test('TypeDoc Plugin removes hidden section markers (###...###) from codeblocks', async () => {

    const TypeDocPlugin = await import('../src/index') as unknown as MockPlugin;
    const application = mockApplication();
    TypeDocPlugin.load(application);

    const event = <RendererEvent> <unknown> {
        project: {
            reflections: {
                0: {
                    comment: {
                        text: '```typescript doctest\nexpression(###2###);\nexpression(###"string"###);\n```',
                        shortText: '```typescript doctest\nexpression(###2###);\nexpression(###"string"###);\n```',
                    }
                }
            }
        }
    };

    application.mockEvents!.beginRender.call(application.mockRenderer, event);
    expect(event.project.reflections[0]!.comment!.text).toEqual('```typescript\nexpression();\nexpression();\n```');
    expect(event.project.reflections[0]!.comment!.shortText).toEqual('```typescript\nexpression();\nexpression();\n```');

});
