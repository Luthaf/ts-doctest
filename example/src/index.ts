/**
 * Doc Test Example Class
 */
class Test {

    private value: number;

    /**
     * ```typescript doctest
     * # import Test from './index';
     * const t = new Test();
     * expect(t).toBeInstanceOf(Test);
     * expect(t.getValue()).toEqual(42);
     * ```
     */
    constructor() {
        this.value = 42;
    }

    public getValue(): number {
        return this.value;
    }

}

export default Test;

