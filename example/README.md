# Doc Test Example Project

Run `npm test` to generate and run the doc tests.

## Example

The example below is also a doc test.

```typescript doctest
# import Test from './src/index';
const t = new Test();
expect(t).toBeInstanceOf(Test);
expect(t.getValue()).toEqual(42);
```
