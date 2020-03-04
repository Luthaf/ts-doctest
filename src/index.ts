// TypeDoc Plugin for removing Doc Test only lines from Doc Comments
import { Application } from 'typedoc/dist/lib/application';
import { Reflection } from 'typedoc/dist/lib/models';
import { Component, RendererComponent } from 'typedoc/dist/lib/output/components';
import { RendererEvent } from 'typedoc/dist/lib/output/events';

@Component({ name: 'render-component'})
export class RenderComponent extends RendererComponent {

    public initialize() {
        this.listenTo(this.owner, {
            [RendererEvent.BEGIN]: this.onRenderBegin,
        });
    }

    private onRenderBegin(event: RendererEvent) {
        const reflections = event.project.reflections;
        const keys = Object.keys(reflections);
        keys.forEach((key: string) => {
            const reflection = reflections[key as any];
            this.processReflections(reflection);
        });

        if (event.project.readme) {
            event.project.readme = RenderComponent.updateCodeblocks(event.project.readme);
        }

    }

    private processReflections(reflection: Reflection) {
        /* istanbul ignore else */
        if (reflection.comment) {
            reflection.comment.text = RenderComponent.updateCodeblocks(reflection.comment.text);
            reflection.comment.shortText = RenderComponent.updateCodeblocks(reflection.comment.shortText);
        }
    }

    private static updateCodeblocks(text: string): string {
        return text.replace(/```typescript doctest([^]+?)```/g, (_, inner) => {
            return '```typescript\n' + RenderComponent.removeDocTestCode(inner) + '\n```';
        });
    }

    private static removeDocTestCode(text: string) {
        return text
            .split('\n')
            .filter((l) => l[0] !== '#')
            .join('\n')
            .replace(/###(.*?)###\s*/g, '')
            .trim();
    }

}

module.exports = function(PluginHost: Application) {
    // @ts-ignore
    PluginHost.owner.renderer.addComponent('render-component', RenderComponent);
};
