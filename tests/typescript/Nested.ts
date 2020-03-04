/**
 * # Namespace Example
 *
 * ```typescript doctest
 * expect('Namespace').toEqual('Namespace');
 * ```
 */
namespace Nested {

    /**
     * # Class Example
     *
     * ```typescript doctest
     * expect('Class Foo').toEqual('Class Foo');
     * ```
     */
    class Foo {

        /**
         * # Static Class Member Example
         *
         * ```typescript doctest
         * expect('Static Class Member Tag').toEqual('Static Class Member Tag');
         * ```
         */
        public static tag: string = 'Foo';

        /**
         * # Static Class Method Example
         *
         * ```typescript doctest
         * expect('Static Class Method').toEqual('Static Class Method');
         * ```
         */
        public static bar() {

        }


        /**
         * # Static Constructor Example
         *
         * ```typescript doctest
         * expect('Class Constructor').toEqual('Class Constructor');
         * ```
         */
        constructor() {

        }

    }

}
