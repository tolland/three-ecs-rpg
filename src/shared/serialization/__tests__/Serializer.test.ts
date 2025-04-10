import { Serializer } from '../Serializer';
import * as THREE from 'three';

describe('Serializer', () => {
    describe('basic types', () => {
        it('should serialize primitive values', () => {
            expect(Serializer.serialize(null)).toBeNull();
            expect(Serializer.serialize(undefined)).toBeUndefined();
            expect(Serializer.serialize(42)).toBe(42);
            expect(Serializer.serialize('hello')).toBe('hello');
            expect(Serializer.serialize(true)).toBe(true);
        });

        it('should serialize arrays', () => {
            const input = [1, 'two', true, null];
            const output = Serializer.serialize(input);
            expect(output).toEqual([1, 'two', true, null]);
        });

        it('should serialize plain objects', () => {
            const input = {
                number: 42,
                string: 'hello',
                boolean: true,
                null: null,
                array: [1, 2, 3],
                nested: { a: 1, b: 2 },
            };
            const output = Serializer.serialize(input);
            expect(output).toEqual(input);
        });
    });

    describe('special types', () => {
        it('should serialize Map', () => {
            const input = new Map([
                ['a', 1],
                ['b', 2],
                ['c', 3],
            ]);
            const output = Serializer.serialize(input);
            expect(output).toEqual({
                a: 1,
                b: 2,
                c: 3,
            });
        });

        it('should serialize Set', () => {
            const input = new Set([1, 2, 3, 4, 5]);
            const output = Serializer.serialize(input);
            expect(output).toEqual([1, 2, 3, 4, 5]);
        });

        it('should serialize nested special types', () => {
            const input = {
                map: new Map([['a', new Set([1, 2, 3])]]),
                set: new Set([new Map([['b', 2]])]),
            };
            const output = Serializer.serialize(input);
            expect(output).toEqual({
                map: { a: [1, 2, 3] },
                set: [{ b: 2 }],
            });
        });
    });

    describe('Three.js types', () => {
        it('should serialize Vector3', () => {
            const input = new THREE.Vector3(1, 2, 3);
            const output = Serializer.serialize(input);
            expect(output).toEqual({ x: 1, y: 2, z: 3 });
        });

        it('should serialize Vector4', () => {
            const input = new THREE.Vector4(1, 2, 3, 4);
            const output = Serializer.serialize(input);
            expect(output).toEqual({ x: 1, y: 2, z: 3, w: 4 });
        });

        it('should serialize Color', () => {
            const input = new THREE.Color(0xff0000);
            const output = Serializer.serialize(input);
            expect(output).toBe('ff0000');
        });

        it('should serialize Object3D', () => {
            const input = new THREE.Object3D();
            input.name = 'TestObject';
            const output = Serializer.serialize(input);
            expect(output).toMatch(/\[Object3D: TestObject ID:\d+\]/);
        });
    });

    describe('class instances with decorators', () => {
        class TestComponent {
            @Serializer.Serialize()
            public number: number;

            @Serializer.Serialize()
            public string: string;

            @Serializer.Serialize()
            public map: Map<string, number>;

            constructor() {
                this.number = 42;
                this.string = 'hello';
                this.map = new Map([['a', 1]]);
            }
        }

        it('should serialize class instances with decorators', () => {
            const input = new TestComponent();
            const output = Serializer.serialize(input);
            expect(output).toEqual({
                number: 42,
                string: 'hello',
                map: { a: 1 },
            });
        });

        it('should handle nested class instances', () => {
            class NestedComponent {
                @Serializer.Serialize()
                public test: TestComponent;

                constructor() {
                    this.test = new TestComponent();
                }
            }

            const input = new NestedComponent();
            const output = Serializer.serialize(input);
            expect(output).toEqual({
                test: {
                    number: 42,
                    string: 'hello',
                    map: { a: 1 },
                },
            });
        });
    });

    describe('serialization context', () => {
        it('should respect serialization mode', () => {
            class TestComponent {
                @Serializer.Serialize()
                public data: string;

                constructor() {
                    this.data = 'test';
                }
            }

            const input = new TestComponent();
            const fullOutput = Serializer.serialize(input, {
                mode: 'full',
                depth: 0,
            });
            expect(fullOutput).toEqual({ data: 'test' });

            const summaryOutput = Serializer.serialize(input, {
                mode: 'summary',
                depth: 0,
            });
            expect(summaryOutput).toEqual('[TestComponent]');
        });
    });
});
