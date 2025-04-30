let myMap = new Map<string, number>();
myMap.set('one', 1);
myMap.set('two', 2);
myMap.set('three', 3);

const { one, four }: Record<string, any> = ['one', 'four'].reduce(
    (result, key) => {
        result[key] = myMap.has(key) ? myMap.get(key)! : null;
        return result;
    },
    {} as Record<string, number | null>,
);

console.log(one);
console.log(four);
